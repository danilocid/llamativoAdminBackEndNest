import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PurchasesTypes } from './entities/purchases-types.entity';
import { Purchases } from './entities/purchases.entity';
import { Entities } from '../entities/entities/entities.entity';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import axios from 'axios';
import {
  BaseApiPurchaseResponse,
  PurchaseApiData,
} from './dto/purchases-api.interface';
import { DocumentType } from '../common/entities/document_type.entity';
import { Notification } from '../notifications/entities/notification.entity';
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
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
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
    const month = dto.month.toString().padStart(2, '0');
    const year = dto.year;
    const url = `https://api.baseapi.cl/api/v1/sii/rcv/${year}-${month}/compra`;

    let responseData: BaseApiPurchaseResponse;
    // get the data from the API using axios
    try {
      const body = {
        rut: process.env.SII_RUT,
        password: process.env.SII_PASSWORD,
      };
      const response = await axios.post(url, body, {
        headers: {
          'x-api-key': process.env.BASE_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      responseData = response.data;
    } catch (error) {
      await this.googleLoggingService.log(
        'Error al obtener datos de la API',
        { errorCode: error.code, errorMessage: error.message },
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
      delete error.request;
      if (error.response) {
        delete error.response.config;
        delete error.response.request;
        await this.googleLoggingService.log(
          'Datos de error de la respuesta de la API',
          error.response.data,
          'ERROR',
          'createPurchaseFromApi',
          'purchases',
        );
      }
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

    if (!responseData.success) {
      await this.googleLoggingService.log(
        'Error en la respuesta de la API',
        { response: responseData },
        'ERROR',
        'createPurchaseFromApi',
        'purchases',
      );
      return;
    }

    const purchasesFromApi: PurchaseApiData[] = responseData.data.datos;

    if (!purchasesFromApi || purchasesFromApi.length === 0) {
      await this.googleLoggingService.log(
        'No se encontraron compras en la respuesta de la API',
        { month, year },
        'WARN',
        'createPurchaseFromApi',
        'purchases',
      );
      return;
    }

    let purchasesCount = 0;
    const createdPurchases: Purchases[] = [];
    for (const purchase of purchasesFromApi) {
      // Convertir tipo de documento string a número
      const tipoDTE = parseInt(purchase['Tipo Doc']);

      //check if the purchase already exists
      const tipoDocumento = await this.documentTypeRepository.findOne({
        where: { id: tipoDTE },
      });

      if (!tipoDocumento) {
        await this.googleLoggingService.log(
          'Tipo de documento no encontrado',
          { tipoDTE, tipoDocString: purchase['Tipo Doc'] },
          'ERROR',
          'createPurchaseFromApi',
          'purchases',
        );
        continue;
      }

      // Convertir folio a número
      const folio = parseInt(purchase.Folio);

      const purchaseExists = await this.purchaseRepository.findOne({
        where: { documento: folio, tipo_documento: tipoDocumento },
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
        where: { rut: purchase['RUT Proveedor'] },
      });

      if (!entity) {
        // create the entity
        const newEntity = new Entities();
        newEntity.rut = purchase['RUT Proveedor'];
        newEntity.nombre = purchase['Razon Social'];
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

      newPurchase.tipo_documento = tipoDocumento;
      newPurchase.tipo_compra = await this.purchaseTypeRepository.findOne({
        where: { tipo_compra: 'Recibido' },
      });
      newPurchase.documento = folio;

      // Convertir fecha de DD/MM/YYYY a Date
      const [day, monthStr, yearStr] = purchase['Fecha Docto'].split('/');
      newPurchase.fecha_documento = new Date(
        parseInt(yearStr),
        parseInt(monthStr) - 1,
        parseInt(day),
      );

      newPurchase.observaciones = purchase['Tipo Compra'] || '';

      // Convertir strings a números
      const montoNeto = parseFloat(purchase['Monto Neto']) || 0;
      const montoExento = parseFloat(purchase['Monto Exento']) || 0;
      const montoIva = parseFloat(purchase['Monto IVA Recuperable']) || 0;

      newPurchase.monto_neto_documento = montoNeto + montoExento;
      newPurchase.monto_imp_documento = montoIva;
      newPurchase.costo_neto_documento = montoNeto + montoExento;
      newPurchase.costo_imp_documento = montoIva;

      try {
        const savedPurchase = await this.purchaseRepository.save(newPurchase);
        createdPurchases.push(savedPurchase);
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
        {
          purchasesCount,
          totalRegistros: responseData.data.totalRegistros,
          month: dto.month,
          year: dto.year,
        },
        'INFO',
        'createPurchaseFromApi',
        'purchases',
      );
    }

    return {
      success: true,
      count: purchasesCount,
      totalRegistros: responseData.data.totalRegistros,
      purchases: createdPurchases,
    };
  }

  async syncCurrentMonthPurchases() {
    const now = new Date();
    const month = now.getMonth() + 1; // Los meses en JavaScript van de 0 a 11
    const year = now.getFullYear();

    await this.googleLoggingService.log(
      'Iniciando sincronización automática de compras del mes actual',
      { month, year },
      'INFO',
      'syncCurrentMonthPurchases',
      'purchases',
    );

    try {
      const result = await this.createPurchaseFromApi({ month, year });

      if (!result) {
        // Si hay un error en la API
        const notification = this.notificationRepository.create({
          title: 'Error al sincronizar compras',
          description: `No se pudo conectar con la API del SII para el mes ${month}/${year}`,
          url: '/compras',
        });
        await this.notificationRepository.save(notification);

        return {
          serverResponseCode: 500,
          serverResponseMessage: 'Error al conectar con la API',
          data: null,
        };
      }

      if (result.count === 0) {
        // No se crearon compras
        const notification = this.notificationRepository.create({
          title: 'Sin compras nuevas',
          description: `No se encontraron compras nuevas del SII para el período ${month}/${year}. Total en API: ${result.totalRegistros}`,
          url: '/compras',
        });
        await this.notificationRepository.save(notification);

        await this.googleLoggingService.log(
          'Sincronización completada sin compras nuevas',
          { month, year, totalEnApi: result.totalRegistros },
          'INFO',
          'syncCurrentMonthPurchases',
          'purchases',
        );

        return {
          serverResponseCode: 200,
          serverResponseMessage: 'No se encontraron compras nuevas',
          data: {
            month,
            year,
            purchasesCreated: 0,
            totalInApi: result.totalRegistros,
          },
        };
      }

      // Crear una notificación por cada compra creada
      const notifications = [];
      for (const purchase of result.purchases) {
        const notification = this.notificationRepository.create({
          title: '✓ Nueva compra sincronizada',
          description: `Factura N° ${purchase.documento} - ${purchase.proveedor?.nombre || 'Proveedor desconocido'} - $${(purchase.monto_neto_documento + purchase.monto_imp_documento).toLocaleString('es-CL')}`,
          url: `/compras`,
        });
        notifications.push(notification);
      }

      await this.notificationRepository.save(notifications);

      await this.googleLoggingService.log(
        'Sincronización completada exitosamente con notificaciones creadas',
        {
          month,
          year,
          purchasesCreated: result.count,
          notificationsCreated: notifications.length,
        },
        'INFO',
        'syncCurrentMonthPurchases',
        'purchases',
      );

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Compras sincronizadas exitosamente',
        data: {
          month,
          year,
          purchasesCreated: result.count,
          totalInApi: result.totalRegistros,
          notificationsCreated: notifications.length,
        },
      };
    } catch (error) {
      await this.googleLoggingService.log(
        'Error en sincronización automática de compras',
        { month, year, error: error.message },
        'ERROR',
        'syncCurrentMonthPurchases',
        'purchases',
      );

      // Crear notificación de error
      const notification = this.notificationRepository.create({
        title: '❌ Error en sincronización de compras',
        description: `Error al sincronizar compras del mes ${month}/${year}: ${error.message}`,
        url: '/compras',
      });
      await this.notificationRepository.save(notification);

      return {
        serverResponseCode: 500,
        serverResponseMessage: 'Error al sincronizar compras',
        data: { error: error.message },
      };
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
