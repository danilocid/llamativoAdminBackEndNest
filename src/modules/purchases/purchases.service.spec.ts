import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchasesTypes } from './entities/purchases-types.entity';
import { Purchases } from './entities/purchases.entity';
import { Entities } from '../entities/entities/entities.entity';
import { DocumentType } from '../common/entities/document_type.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { SiiScraperService } from './sii-scraper.service';
import { BadRequestException } from '@nestjs/common';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let purchaseTypeRepository: jest.Mocked<Repository<PurchasesTypes>>;
  let purchaseRepository: jest.Mocked<Repository<Purchases>>;
  let entitiesRepository: jest.Mocked<Repository<Entities>>;
  let documentTypeRepository: jest.Mocked<Repository<DocumentType>>;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let googleLoggingService: jest.Mocked<GoogleLoggingService>;
  let siiScraperService: jest.Mocked<SiiScraperService>;

  const mockPurchaseType: PurchasesTypes = { id: 1, tipo_compra: 'Recibido' };

  const mockDocumentType: DocumentType = { id: 33 } as DocumentType;

  const mockEntity: Entities = {
    rut: '12345678-9',
    nombre: 'Proveedor Test',
    giro: 'Sin giro',
    tipo: 'P',
    direccion: 'Sin dirección',
    comuna: {
      id: 204,
      comuna: 'Quillon',
      region: { id: 10, region: 'Ñuble' },
    } as any,
    telefono: 994679847,
    mail: 'test@test.com',
  };

  const mockPurchase: Purchases = {
    id: 1,
    proveedor: mockEntity,
    tipo_documento: mockDocumentType,
    documento: 12345,
    fecha_documento: new Date('2025-01-15'),
    monto_neto_documento: 100000,
    monto_imp_documento: 19000,
    costo_neto_documento: 100000,
    costo_imp_documento: 19000,
    tipo_compra: mockPurchaseType,
    observaciones: '',
  };

  const mockPurchaseTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPurchaseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn(),
  };

  const mockEntitiesRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn(),
  };

  const mockDocumentTypeRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockGoogleLoggingService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockSiiScraperService = {
    scrapePurchases: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: getRepositoryToken(PurchasesTypes),
          useValue: mockPurchaseTypeRepository,
        },
        {
          provide: getRepositoryToken(Purchases),
          useValue: mockPurchaseRepository,
        },
        {
          provide: getRepositoryToken(Entities),
          useValue: mockEntitiesRepository,
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: mockDocumentTypeRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: GoogleLoggingService,
          useValue: mockGoogleLoggingService,
        },
        {
          provide: SiiScraperService,
          useValue: mockSiiScraperService,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    purchaseTypeRepository = module.get(getRepositoryToken(PurchasesTypes));
    purchaseRepository = module.get(getRepositoryToken(Purchases));
    entitiesRepository = module.get(getRepositoryToken(Entities));
    documentTypeRepository = module.get(getRepositoryToken(DocumentType));
    notificationRepository = module.get(getRepositoryToken(Notification));
    googleLoggingService = module.get(GoogleLoggingService);
    siiScraperService = module.get(SiiScraperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getTypes ────────────────────────────────────────────────────────────────

  describe('getTypes', () => {
    it('should return all purchase types', async () => {
      mockPurchaseTypeRepository.find.mockResolvedValue([mockPurchaseType]);

      const result = await service.getTypes();

      expect(result).toEqual({
        serverResponseCode: 200,
        serverResponseMessage: 'Purchases types fetched successfully',
        data: [mockPurchaseType],
      });
      expect(purchaseTypeRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
    });
  });

  // ─── getAllPurchases ──────────────────────────────────────────────────────────

  describe('getAllPurchases', () => {
    const dto = { month: 1, year: 2025 };

    it('should return purchases for the given month and year', async () => {
      mockPurchaseRepository.find.mockResolvedValue([mockPurchase]);

      const result = await service.getAllPurchases(dto);

      expect(result).toEqual({
        serverResponseCode: 200,
        serverResponseMessage: 'Purchases fetched successfully',
        data: [mockPurchase],
      });
      expect(purchaseRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { fecha_documento: 'ASC' },
          relations: ['proveedor', 'tipo_documento', 'tipo_compra'],
        }),
      );
    });
  });

  // ─── editPurchase ─────────────────────────────────────────────────────────────

  describe('editPurchase', () => {
    const updateDto = {
      TipoCompra: 1,
      Observaciones: 'nueva obs',
      CostoTotal: 119000,
    };

    it('should return 400 when purchase is not found', async () => {
      mockPurchaseRepository.findOne.mockResolvedValue(null);

      const result = await service.editPurchase(99, updateDto);

      expect(result).toEqual({
        serverResponseCode: 400,
        serverResponseMessage: 'Purchase not found',
        data: null,
      });
    });

    it('should update and return the purchase', async () => {
      mockPurchaseRepository.findOne.mockResolvedValue({ ...mockPurchase });
      mockPurchaseTypeRepository.findOne.mockResolvedValue(mockPurchaseType);
      mockPurchaseRepository.save.mockResolvedValue({ ...mockPurchase });

      const result = await service.editPurchase(1, updateDto);

      expect(result.serverResponseCode).toBe(200);
      expect(result.serverResponseMessage).toBe(
        'Purchase updated successfully',
      );
      expect(purchaseRepository.save).toHaveBeenCalled();
    });

    it('should return 400 when save throws an error', async () => {
      mockPurchaseRepository.findOne.mockResolvedValue({ ...mockPurchase });
      mockPurchaseTypeRepository.findOne.mockResolvedValue(mockPurchaseType);
      const error = new Error('DB error');
      mockPurchaseRepository.save.mockRejectedValue(error);

      const result = await service.editPurchase(1, updateDto);

      expect(result).toEqual({
        serverResponseCode: 400,
        serverResponseMessage: 'Error updating purchase',
        data: error,
      });
    });
  });

  // ─── getReport ────────────────────────────────────────────────────────────────

  describe('getReport', () => {
    const dto = { month: 3, year: 2025 };

    it('should return report with totals for current and previous month', async () => {
      mockPurchaseRepository.find
        .mockResolvedValueOnce([mockPurchase])
        .mockResolvedValueOnce([mockPurchase]);

      const result = await service.getReport(dto);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data.totals.currentMonth.count).toBe(1);
      expect(result.data.totals.previousMonth.count).toBe(1);
      expect(result.data.totals.currentMonth.total).toBe(119000);
    });

    it('should handle month = 1 by rolling back to december of previous year', async () => {
      mockPurchaseRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getReport({ month: 1, year: 2025 });

      expect(result.serverResponseCode).toBe(200);
      expect(purchaseRepository.find).toHaveBeenCalledTimes(2);
    });
  });

  // ─── createPurchase ───────────────────────────────────────────────────────────

  describe('createPurchase', () => {
    const createDto = {
      proveedor: '12345678-9',
      tipo_documento: 33,
      documento: 12345,
      fecha_documento: '2025-01-15',
      monto_neto_documento: 100000,
      monto_imp_documento: 19000,
      costo_neto_documento: 100000,
      costo_imp_documento: 19000,
      tipo_compra: 1,
      observaciones: 'Test',
    };

    it('should throw BadRequestException when proveedor is not found', async () => {
      mockEntitiesRepository.findOne.mockResolvedValue(null);

      await expect(service.createPurchase(createDto)).rejects.toThrow(
        new BadRequestException('Proveedor no encontrado'),
      );
    });

    it('should throw BadRequestException when tipo_documento is not found', async () => {
      mockEntitiesRepository.findOne.mockResolvedValue(mockEntity);
      mockDocumentTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.createPurchase(createDto)).rejects.toThrow(
        new BadRequestException('Tipo de documento no encontrado'),
      );
    });

    it('should throw BadRequestException when tipo_compra is not found', async () => {
      mockEntitiesRepository.findOne.mockResolvedValue(mockEntity);
      mockDocumentTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockPurchaseTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.createPurchase(createDto)).rejects.toThrow(
        new BadRequestException('Tipo de compra no encontrado'),
      );
    });

    it('should throw BadRequestException when purchase already exists', async () => {
      mockEntitiesRepository.findOne.mockResolvedValue(mockEntity);
      mockDocumentTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockPurchaseTypeRepository.findOne.mockResolvedValue(mockPurchaseType);
      mockPurchaseRepository.findOne.mockResolvedValue(mockPurchase);

      await expect(service.createPurchase(createDto)).rejects.toThrow(
        new BadRequestException(
          'Ya existe una compra con el mismo número de documento, tipo de documento y proveedor',
        ),
      );
    });

    it('should create and return the new purchase', async () => {
      mockEntitiesRepository.findOne.mockResolvedValue(mockEntity);
      mockDocumentTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockPurchaseTypeRepository.findOne.mockResolvedValue(mockPurchaseType);
      mockPurchaseRepository.findOne.mockResolvedValue(null);
      mockPurchaseRepository.save.mockResolvedValue(mockPurchase);

      const result = await service.createPurchase(createDto);

      expect(result).toEqual({
        serverResponseCode: 201,
        serverResponseMessage: 'Compra creada exitosamente',
        data: mockPurchase,
      });
      expect(purchaseRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException on unexpected error', async () => {
      mockEntitiesRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.createPurchase(createDto)).rejects.toThrow(
        new BadRequestException('Error al crear la compra'),
      );
    });
  });

  // ─── scrapeAndSavePurchases ──────────────────────────────────────────────────

  describe('scrapeAndSavePurchases', () => {
    it('should return empty result when scraper returns no data', async () => {
      siiScraperService.scrapePurchases.mockResolvedValue([]);
      const mockNotif = { title: '', description: '', url: '' };
      mockNotificationRepository.create.mockReturnValue(mockNotif);
      mockNotificationRepository.save.mockResolvedValue(mockNotif);

      const result = await service.scrapeAndSavePurchases(6, 2026);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data.purchasesCreated).toBe(0);
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should create purchases from scraped data', async () => {
      siiScraperService.scrapePurchases.mockResolvedValue([
        {
          'Tipo Doc': '33',
          Folio: '100',
          'RUT Proveedor': '12345678-9',
          'Razon Social': 'Test',
          'Tipo Compra': 'Del Giro',
          'Fecha Docto': '15/01/2025',
          'Fecha Recepcion': '15/01/2025',
          'Fecha Acuse': '',
          'Monto Exento': '0',
          'Monto Neto': '100000',
          'Monto IVA Recuperable': '19000',
          'Monto Iva No Recuperable': '0',
          'Codigo IVA No Rec.': '0',
          'Monto Total': '119000',
          'Monto Neto Activo Fijo': '0',
          'IVA Activo Fijo': '0',
          'IVA uso Comun': '0',
          'Impto. Sin Derecho a Credito': '0',
          'IVA No Retenido': '0',
          'Tabacos Puros': '0',
          'Tabacos Cigarrillos': '0',
          'Tabacos Elaborados': '0',
          'NCE o NDE sobre Fact. de Compra': '',
          'Codigo Otro Impuesto': '0',
          'Valor Otro Impuesto': '0',
          'Tasa Otro Impuesto': '0',
          Nro: '',
        },
      ]);
      mockDocumentTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockPurchaseRepository.findOne.mockResolvedValue(null);
      mockEntitiesRepository.findOne.mockResolvedValue(mockEntity);
      mockPurchaseTypeRepository.findOne.mockResolvedValue(mockPurchaseType);
      mockPurchaseRepository.save.mockResolvedValue(mockPurchase);
      const mockNotif = { title: '', description: '', url: '' };
      mockNotificationRepository.create.mockReturnValue(mockNotif);
      mockNotificationRepository.save.mockResolvedValue(mockNotif);

      const result = await service.scrapeAndSavePurchases(6, 2026);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data.purchasesCreated).toBe(1);
    });

    it('should skip purchase when tipo_documento is not found', async () => {
      siiScraperService.scrapePurchases.mockResolvedValue([
        {
          'Tipo Doc': '99',
          Folio: '200',
          'RUT Proveedor': '12345678-9',
          'Razon Social': 'Test',
          'Tipo Compra': 'Del Giro',
          'Fecha Docto': '15/01/2025',
          'Fecha Recepcion': '15/01/2025',
          'Fecha Acuse': '',
          'Monto Exento': '0',
          'Monto Neto': '50000',
          'Monto IVA Recuperable': '9500',
          'Monto Iva No Recuperable': '0',
          'Codigo IVA No Rec.': '0',
          'Monto Total': '59500',
          'Monto Neto Activo Fijo': '0',
          'IVA Activo Fijo': '0',
          'IVA uso Comun': '0',
          'Impto. Sin Derecho a Credito': '0',
          'IVA No Retenido': '0',
          'Tabacos Puros': '0',
          'Tabacos Cigarrillos': '0',
          'Tabacos Elaborados': '0',
          'NCE o NDE sobre Fact. de Compra': '',
          'Codigo Otro Impuesto': '0',
          'Valor Otro Impuesto': '0',
          'Tasa Otro Impuesto': '0',
          Nro: '',
        },
      ]);
      mockDocumentTypeRepository.findOne.mockResolvedValue(null);
      const mockNotif = { title: '', description: '', url: '' };
      mockNotificationRepository.create.mockReturnValue(mockNotif);
      mockNotificationRepository.save.mockResolvedValue(mockNotif);

      const result = await service.scrapeAndSavePurchases(6, 2026);

      expect(result.data.purchasesCreated).toBe(0);
    });
  });
});
