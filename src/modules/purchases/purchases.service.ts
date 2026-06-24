import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PurchasesTypes } from './entities/purchases-types.entity';
import { Purchases } from './entities/purchases.entity';
import { Entities } from '../entities/entities/entities.entity';
import { GetPurchasesDto } from './dto/get-purchases.dto';
import { PurchaseApiData } from './dto/purchases-api.interface';
import { DocumentType } from '../common/entities/document_type.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SiiScraperService } from './sii-scraper.service';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

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
    private readonly siiScraperService: SiiScraperService,
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

  async scrapeAndSavePurchases(mes: number, anio: number) {
    this.logger.log(`Iniciando sincronización scraping RCV para ${mes}/${anio}`);

    try {
      const scrapedData = await this.siiScraperService.scrapePurchases(mes, anio);

      if (!scrapedData || scrapedData.length === 0) {
        this.logger.warn(`No se obtuvieron datos del scraping para ${mes}/${anio}`);

        const notification = this.notificationRepository.create({
          title: 'Sin compras nuevas (scraping)',
          description: `No se encontraron compras en el RCV del SII para ${mes}/${anio}`,
          url: '/compras',
        });
        await this.notificationRepository.save(notification);

        return {
          serverResponseCode: 200,
          serverResponseMessage: 'No se encontraron compras en el RCV',
          data: { month: mes, year: anio, purchasesCreated: 0 },
        };
      }

      const result = await this.savePurchasesFromData(scrapedData, scrapedData.length, mes, anio, 'scrapeAndSavePurchases');

      const notification = this.notificationRepository.create({
        title: 'Scraping RCV completado',
        description: `Se sincronizaron ${result.count} compras del RCV para ${mes}/${anio}`,
        url: '/compras',
      });
      await this.notificationRepository.save(notification);

      this.logger.log(`Scraping RCV completado: ${result.count} compras guardadas de ${scrapedData.length} registros extraídos`);

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Scraping RCV completado',
        data: {
          month: mes,
          year: anio,
          purchasesCreated: result.count,
          totalScraped: scrapedData.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error en scraping RCV: ${(error as Error).message}`, (error as Error).stack);

      const notification = this.notificationRepository.create({
        title: 'Error en scraping RCV',
        description: `Error al sincronizar compras del RCV para ${mes}/${anio}: ${(error as Error).message}`.substring(0, 255),
        url: '/compras',
      });
      await this.notificationRepository.save(notification);

      return {
        serverResponseCode: 500,
        serverResponseMessage: 'Error al sincronizar compras del RCV',
        data: { error: (error as Error).message },
      };
    }
  }

  private async savePurchasesFromData(
    purchasesFromApi: PurchaseApiData[],
    totalRegistros: number,
    month: number,
    year: number,
    methodName: string,
  ) {
    let purchasesCount = 0;
    const createdPurchases: Purchases[] = [];

    for (const purchase of purchasesFromApi) {
      const tipoDTE = parseInt(purchase['Tipo Doc']);

      if (isNaN(tipoDTE)) {
        await this.googleLoggingService.log(
          'Tipo de documento inválido',
          { tipoDocString: purchase['Tipo Doc'], folio: purchase.Folio },
          'WARN',
          methodName,
          'purchases',
        );
        continue;
      }

      const tipoDocumento = await this.documentTypeRepository.findOne({
        where: { id: tipoDTE },
      });

      if (!tipoDocumento) {
        await this.googleLoggingService.log(
          'Tipo de documento no encontrado',
          { tipoDTE, tipoDocString: purchase['Tipo Doc'] },
          'ERROR',
          methodName,
          'purchases',
        );
        continue;
      }

      const folio = parseInt(purchase.Folio);

      if (isNaN(folio)) {
        await this.googleLoggingService.log(
          'Folio inválido',
          { folioString: purchase.Folio, tipoDoc: purchase['Tipo Doc'] },
          'WARN',
          methodName,
          'purchases',
        );
        continue;
      }

      const purchaseExists = await this.purchaseRepository.findOne({
        where: { documento: folio, tipo_documento: tipoDocumento },
      });

      if (purchaseExists) {
        await this.googleLoggingService.log(
          'La compra ya existe',
          { purchaseId: purchaseExists.id, documento: purchaseExists.documento },
          'WARN',
          methodName,
          'purchases',
        );
        continue;
      }

      const newPurchase = new Purchases();

      const entity = await this.entitiesRepository.findOne({
        where: { rut: purchase['RUT Proveedor'] },
      });

      if (!entity) {
        const newEntity = new Entities();
        newEntity.rut = purchase['RUT Proveedor'];
        newEntity.nombre = purchase['Razon Social'];
        newEntity.comuna = {
          id: 204,
          comuna: 'Quillon',
          region: { id: 10, region: 'Ñuble' },
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
            methodName,
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

      const [day, monthStr, yearStr] = purchase['Fecha Docto'].split('/');
      newPurchase.fecha_documento = new Date(
        parseInt(yearStr),
        parseInt(monthStr) - 1,
        parseInt(day),
      );

      newPurchase.observaciones = purchase['Tipo Compra'] || '';

      const parseChileanNumber = (val: string): number => {
        if (!val || val === '0') return 0;
        return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
      };

      const montoNeto = parseChileanNumber(purchase['Monto Neto']);
      const montoExento = parseChileanNumber(purchase['Monto Exento']);
      const montoIva = parseChileanNumber(purchase['Monto IVA Recuperable']);

      newPurchase.monto_neto_documento = montoNeto + montoExento;
      newPurchase.monto_imp_documento = montoIva;
      newPurchase.costo_neto_documento = montoNeto + montoExento;
      newPurchase.costo_imp_documento = montoIva;

      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const savedPurchase = await this.purchaseRepository.save(newPurchase);
          createdPurchases.push(savedPurchase);
          await this.googleLoggingService.log(
            'Compra guardada correctamente',
            { documento: newPurchase.documento },
            'INFO',
            methodName,
            'purchases',
          );
          purchasesCount++;
          break;
        } catch (error) {
          const err = error as any;
          if (err.code === 'ECONNRESET' && attempt < MAX_RETRIES) {
            this.logger.warn(`ECONNRESET al guardar compra ${newPurchase.documento}, reintento ${attempt}/${MAX_RETRIES}`);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          await this.googleLoggingService.log(
            'Error al guardar la compra',
            { error: err.message || err, documento: newPurchase.documento, attempt },
            'ERROR',
            methodName,
            'purchases',
          );
          break;
        }
      }
    }

    if (purchasesCount === 0) {
      await this.googleLoggingService.log(
        'No se crearon compras',
        { month, year },
        'WARN',
        methodName,
        'purchases',
      );
    } else {
      await this.googleLoggingService.log(
        'Compras creadas exitosamente',
        { purchasesCount, totalRegistros, month, year },
        'INFO',
        methodName,
        'purchases',
      );
    }

    return {
      success: true,
      count: purchasesCount,
      totalRegistros,
      purchases: createdPurchases,
    };
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
        { error: (error as any).message, dto },
        'ERROR',
        'createPurchase',
        'purchases',
      );

      throw new BadRequestException('Error al crear la compra');
    }
  }
}
