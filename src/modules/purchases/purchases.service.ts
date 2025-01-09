import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PurchasesTypes } from './entities/purchases-types.entity';
import { Purchases } from './entities/purchases.entity';
import { Entities } from '../entities/entities/entities.entity';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import axios from 'axios';
import { PurchaseApiResponse } from './dto/purchases-api.interface';
import { DocumentType } from '../common/entities/document_type.entity';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
export class PurchasesService {
  constructor(
    @InjectRepository(PurchasesTypes)
    private purchaseTypeRepository: Repository<PurchasesTypes>,
    @InjectRepository(Purchases)
    private purchaseRepository: Repository<Purchases>,
    @InjectRepository(Entities)
    private entitiesRepository: Repository<Entities>,
    @InjectRepository(DocumentType)
    private documentTypeRepository: Repository<DocumentType>,
  ) {}

  async getTypes() {
    const purchases = await this.purchaseTypeRepository.find({
      order: {
        id: 'ASC',
      },
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Purchases types fetched successfully',
      data: purchases,
    };
  }

  async getAllPurchases(dto: GetPurchasesDto) {
    // get all purchases, from the expecific month and year
    const startDate = new Date(dto.year, dto.month - 1, 1);
    const endDate = new Date(dto.year, dto.month, 1);
    const purchases = await this.purchaseRepository.find({
      where: {
        fecha_documento: Between(startDate, endDate),
      },
      order: {
        fecha_documento: 'ASC',
      },
      relations: ['proveedor', 'tipo_documento', 'tipo_compra'],
    });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Purchases fetched successfully',
      data: purchases,
    };
  }

  async createPurchaseFromApi(dto: GetPurchasesDto) {
    const month = dto.month;
    const year = dto.year;
    const url =
      'https://servicios.simpleapi.cl/api/RCV/compras/' + month + '/' + year;

    let responseData;
    // get the data from the API using axios
    try {
      const body = {
        RutUsuario: process.env.SIMPLE_API_RUT_USUARIO,
        PasswordSII: process.env.SIMPLE_API_PASS_SII,
        RutEmpresa: process.env.SIMPLE_API_RUT_EMPRESA,
        Ambiente: 1,
        Detallado: true,
      };
      responseData = await axios.post(url, body, {
        headers: { Authorization: process.env.SIMPLE_API_PASS },
      });
    } catch (error) {
      console.error('Error fetching data from the API', error);
    }
    if (!responseData) {
      console.error('No data fetched from the API');
      return;
    }
    if (responseData.data.error) {
      console.error('Error from the API', responseData.data.error);
      return;
    }
    const purchasesFromApi: PurchaseApiResponse[] =
      responseData.data.compras.detalleCompras;

    let purchasesCount = 0;
    for (const purchase of purchasesFromApi) {
      //check if the purchase already exists
      const tipoDocumento = await this.documentTypeRepository.findOne({
        where: { id: purchase.tipoDTE },
      });

      if (!tipoDocumento) {
        console.error('Tipo de documento no encontrado' + purchase.tipoDTE);
      }
      const purchaseExists = await this.purchaseRepository.findOne({
        where: { documento: purchase.folio, tipo_documento: tipoDocumento },
      });
      if (purchaseExists) {
        console.error('La compra ya existe', purchaseExists);
        continue;
      }
      const newPurchase = new Purchases();
      //validate if the rutProveedor exists as a proveedor
      const entity = await this.entitiesRepository.findOne({
        where: { rut: purchase.rutProveedor },
      });
      if (!entity) {
        // create the entity
        const newEntity = new Entities();
        newEntity.rut = purchase.rutProveedor;
        newEntity.nombre = purchase.razonSocial;
        newEntity.comuna = {
          id: 204,
          comuna: 'Quillon',
          region: {
            id: 10,
            region: 'Ñuble',
          },
        };
        newEntity.direccion = 'Sin dirección';
        newEntity.telefono = 994679847;
        newEntity.mail = 'cidybadilla@gmail.com';
        newEntity.tipo = 'P';
        newEntity.giro = 'Sin giro';

        try {
          await this.entitiesRepository.save(newEntity);
        } catch (error) {
          console.error('Error al crear la entidad' + newEntity);
        }
        newPurchase.proveedor = newEntity;
      } else {
        newPurchase.proveedor = entity;
      }

      // validate if the tipoDTE exists as a tipo_documento

      newPurchase.tipo_documento = tipoDocumento;
      newPurchase.tipo_compra = await this.purchaseTypeRepository.findOne({
        where: { tipo_compra: 'Recibido' },
      });
      newPurchase.documento = purchase.folio;
      newPurchase.fecha_documento = purchase.fechaEmision;
      newPurchase.observaciones = purchase.estado;
      newPurchase.monto_neto_documento =
        purchase.montoNeto + purchase.montoExento;
      newPurchase.monto_imp_documento = purchase.montoIvaRecuperable;
      newPurchase.costo_neto_documento =
        purchase.montoNeto + purchase.montoExento;
      newPurchase.costo_imp_documento = purchase.montoIvaRecuperable;

      try {
        await this.purchaseRepository.save(newPurchase);
        purchasesCount++;
      } catch (error) {
        console.error('Error al guardar la compra', error);
      }
    }
    if (purchasesCount === 0) {
      console.error('No purchases created');
    } else {
      console.error('Purchases created', purchasesCount);
    }
  }

  async editPurchase(id: number, dto: UpdatePurchaseDto) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: id },
    });

    if (!purchase) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Purchase not found',
        data: null,
      };
    }

    purchase.tipo_compra = await this.purchaseTypeRepository.findOne({
      where: { id: dto.TipoCompra },
    });
    purchase.observaciones = dto.Observaciones;
    purchase.costo_imp_documento = dto.CostoTotal / 1.19;
    purchase.costo_neto_documento = dto.CostoTotal - dto.CostoTotal / 1.19;

    try {
      await this.purchaseRepository.save(purchase);
      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Purchase updated successfully',
        data: purchase,
      };
    } catch (error) {
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Error updating purchase',
        data: error,
      };
    }
  }
}
