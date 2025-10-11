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
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
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
    private readonly googleLoggingService: GoogleLoggingService,
  ) {}

  async getTypes() {
    const purchases = await this.purchaseTypeRepository.find({
      order: {
        id: 'ASC',
      },
    });

    await this.googleLoggingService.log(
      'Tipos de compra obtenidos exitosamente',
      { count: purchases.length },
      'INFO',
      'getTypes',
      'purchases',
    );

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

    await this.googleLoggingService.log(
      'Compras obtenidas exitosamente',
      { month: dto.month, year: dto.year, count: purchases.length },
      'INFO',
      'getAllPurchases',
      'purchases',
    );

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
      };
      responseData = await axios.post(url, body, {
        headers: { Authorization: process.env.SIMPLE_API_PASS },
      });
    } catch (error) {
      await this.googleLoggingService.log(
        'Error al obtener datos de la API',
        { errorCode: error.code },
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
      delete error.request;
      delete error.response.config;
      delete error.response.request;
      await this.googleLoggingService.log(
        'Error detallado al obtener datos de la API',
        { error },
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
      console.log(error.response.data);
      return;
    }
    if (!responseData) {
      await this.googleLoggingService.log(
        'No se obtuvieron datos de la API',
        {},
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
      return;
    }
    if (responseData.data.error) {
      await this.googleLoggingService.log(
        'Error en la respuesta de la API',
        { apiError: responseData.data.error },
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
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
        await this.googleLoggingService.log(
          'Tipo de documento no encontrado',
          { tipoDTE: purchase.tipoDTE },
          'ERROR',
          'createPurchaseFromApi',
          'purchases',
        );
      }
      const purchaseExists = await this.purchaseRepository.findOne({
        where: { documento: purchase.folio, tipo_documento: tipoDocumento },
      });
      if (purchaseExists) {
        await this.googleLoggingService.log(
          'La compra ya existe',
          {
            purchaseId: purchaseExists.id,
            documento: purchaseExists.documento,
          },
          'WARN',
          'createPurchaseFromApi',
          'purchases',
        );
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
          await this.googleLoggingService.log(
            'Error al crear la entidad',
            { entityRut: newEntity.rut, error },
            'ERROR',
            'createPurchaseFromApi',
            'purchases',
          );
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
        await this.googleLoggingService.log(
          'Compra guardada correctamente',
          { documento: newPurchase.documento },
          'INFO',
          'createPurchaseFromApi',
          'purchases',
        );
        purchasesCount++;
      } catch (error) {
        await this.googleLoggingService.log(
          'Error al guardar la compra',
          { error },
          'ERROR',
          'createPurchaseFromApi',
          'purchases',
        );
      }
    }
    if (purchasesCount === 0) {
      await this.googleLoggingService.log(
        'No se crearon compras',
        { month: dto.month, year: dto.year },
        'WARN',
        'createPurchaseFromApi',
        'purchases',
      );
    } else {
      await this.googleLoggingService.log(
        'Compras creadas exitosamente',
        { purchasesCount, month: dto.month, year: dto.year },
        'INFO',
        'createPurchaseFromApi',
        'purchases',
      );
    }
  }

  async editPurchase(id: number, dto: UpdatePurchaseDto) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: id },
    });

    if (!purchase) {
      await this.googleLoggingService.log(
        'Compra no encontrada para editar',
        { id },
        'WARN',
        'editPurchase',
        'purchases',
      );
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
      await this.googleLoggingService.log(
        'Compra actualizada exitosamente',
        { id, documento: purchase.documento },
        'INFO',
        'editPurchase',
        'purchases',
      );
      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Purchase updated successfully',
        data: purchase,
      };
    } catch (error) {
      await this.googleLoggingService.log(
        'Error al actualizar compra',
        { id, error },
        'ERROR',
        'editPurchase',
        'purchases',
      );
      return {
        serverResponseCode: 400,
        serverResponseMessage: 'Error updating purchase',
        data: error,
      };
    }
  }

  async getReport(dto: GetPurchasesDto) {
    const startDate = new Date(dto.year, dto.month - 1, 1);
    const endDate = new Date(dto.year, dto.month, 1);
    const currentMonthPurchases = await this.purchaseRepository.find({
      where: {
        fecha_documento: Between(startDate, endDate),
      },
      order: {
        fecha_documento: 'ASC',
      },
      relations: ['proveedor', 'tipo_documento', 'tipo_compra'],
    });

    let previousMonth = dto.month - 1;
    let previousYear = dto.year;
    if (previousMonth == 0) {
      previousYear = dto.year - 1;
      previousMonth = 12;
    }
    const previousMonthStart = new Date(previousYear, previousMonth - 1, 1);
    const previousMonthEnd = new Date(previousYear, previousMonth, 1);
    const previousMonthPurchases = await this.purchaseRepository.find({
      where: {
        fecha_documento: Between(previousMonthStart, previousMonthEnd),
      },
      order: {
        fecha_documento: 'ASC',
      },
    });
    let currentMonthCount = 0;
    let currentMonthTotal = 0;
    let currentMonthTotalCost = 0;

    let previousMonthCount = 0;
    let previousMonthTotal = 0;
    let previousMonthTotalCost = 0;

    currentMonthPurchases.forEach((purchase) => {
      currentMonthCount++;
      currentMonthTotal +=
        purchase.monto_neto_documento + purchase.monto_imp_documento;
      currentMonthTotalCost +=
        purchase.costo_neto_documento + purchase.costo_imp_documento;
    });

    previousMonthPurchases.forEach((purchase) => {
      previousMonthCount++;
      previousMonthTotal +=
        purchase.monto_neto_documento + purchase.monto_imp_documento;
      previousMonthTotalCost +=
        purchase.costo_neto_documento + purchase.costo_imp_documento;
    });

    await this.googleLoggingService.log(
      'Reporte de compras generado exitosamente',
      {
        month: dto.month,
        year: dto.year,
        currentMonthCount,
        currentMonthTotal,
        previousMonthCount,
        previousMonthTotal,
      },
      'INFO',
      'getReport',
      'purchases',
    );

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Report fetched successfully',
      data: {
        purchases: currentMonthPurchases,

        totals: {
          currentMonth: {
            count: currentMonthCount,
            total: currentMonthTotal,
            totalCost: currentMonthTotalCost,
          },
          previousMonth: {
            count: previousMonthCount,
            total: previousMonthTotal,
            totalCost: previousMonthTotalCost,
          },
        },
      },
    };
  }

  async createPurchase(dto: CreatePurchaseDto) {
    try {
      // Validar que el proveedor existe
      const proveedor = await this.entitiesRepository.findOne({
        where: { rut: dto.proveedor },
      });

      if (!proveedor) {
        await this.googleLoggingService.log(
          'Proveedor no encontrado para crear compra',
          { rutProveedor: dto.proveedor },
          'ERROR',
          'createPurchase',
          'purchases',
        );
        throw new BadRequestException('Proveedor no encontrado');
      }

      // Validar que el tipo de documento existe
      const tipoDocumento = await this.documentTypeRepository.findOne({
        where: { id: dto.tipo_documento },
      });

      if (!tipoDocumento) {
        await this.googleLoggingService.log(
          'Tipo de documento no encontrado para crear compra',
          { tipoDocumentoId: dto.tipo_documento },
          'ERROR',
          'createPurchase',
          'purchases',
        );
        throw new BadRequestException('Tipo de documento no encontrado');
      }

      // Validar que el tipo de compra existe
      const tipoCompra = await this.purchaseTypeRepository.findOne({
        where: { id: dto.tipo_compra },
      });

      if (!tipoCompra) {
        await this.googleLoggingService.log(
          'Tipo de compra no encontrado para crear compra',
          { tipoCompraId: dto.tipo_compra },
          'ERROR',
          'createPurchase',
          'purchases',
        );
        throw new BadRequestException('Tipo de compra no encontrado');
      }

      // Verificar que no existe una compra con el mismo documento, tipo de documento y proveedor
      const existingPurchase = await this.purchaseRepository.findOne({
        where: {
          documento: dto.documento,
          tipo_documento: tipoDocumento,
          proveedor: proveedor,
        },
      });

      if (existingPurchase) {
        await this.googleLoggingService.log(
          'Ya existe una compra con el mismo documento, tipo y proveedor',
          {
            documento: dto.documento,
            tipoDocumento: dto.tipo_documento,
            proveedor: dto.proveedor,
          },
          'WARN',
          'createPurchase',
          'purchases',
        );
        throw new BadRequestException(
          'Ya existe una compra con el mismo número de documento, tipo de documento y proveedor',
        );
      }

      // Crear la nueva compra
      const newPurchase = new Purchases();
      newPurchase.proveedor = proveedor;
      newPurchase.tipo_documento = tipoDocumento;
      newPurchase.documento = dto.documento;
      newPurchase.fecha_documento = new Date(dto.fecha_documento);
      newPurchase.monto_neto_documento = dto.monto_neto_documento;
      newPurchase.monto_imp_documento = dto.monto_imp_documento;
      newPurchase.costo_neto_documento = dto.costo_neto_documento;
      newPurchase.costo_imp_documento = dto.costo_imp_documento;
      newPurchase.tipo_compra = tipoCompra;
      newPurchase.observaciones = dto.observaciones || '';

      const savedPurchase = await this.purchaseRepository.save(newPurchase);

      await this.googleLoggingService.log(
        'Compra creada exitosamente',
        {
          purchaseId: savedPurchase.id,
          documento: savedPurchase.documento,
          proveedor: dto.proveedor,
          montoTotal: dto.monto_neto_documento + dto.monto_imp_documento,
          costoTotal: dto.costo_neto_documento + dto.costo_imp_documento,
        },
        'INFO',
        'createPurchase',
        'purchases',
      );

      return {
        serverResponseCode: 201,
        serverResponseMessage: 'Compra creada exitosamente',
        data: savedPurchase,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      await this.googleLoggingService.log(
        'Error inesperado al crear compra',
        { error: error.message, dto },
        'ERROR',
        'createPurchase',
        'purchases',
      );

      throw new BadRequestException('Error al crear la compra');
    }
  }
}
