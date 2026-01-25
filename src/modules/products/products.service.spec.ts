import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { Repository } from 'typeorm';
import { Products } from './entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoLibreService } from '../mercado-libre/mercado-libre.service';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';
import { NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: Repository<Products>;
  let notificationRepository: Repository<Notification>;
  let notificationsService: NotificationsService;
  let mercadoLibreService: MercadoLibreService;
  let googleLoggingService: GoogleLoggingService;

  const mockProduct: Products = {
    id: 1,
    cod_interno: 'PROD001',
    cod_barras: '1234567890123',
    descripcion: 'Producto de prueba',
    costo_neto: 1000,
    costo_imp: 190,
    venta_neto: 1500,
    venta_imp: 285,
    stock: 10,
    stock_critico: 5,
    activo: true,
    publicado: false,
    enlace_ml: null,
    id_ml: null,
    id_variante_ml: null,
    publicado_ps: false,
    enlace_ps: null,
    id_ps: null,
    deprecado: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    last_cont: new Date(),
  };

  const mockProductsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
    })),
  };

  const mockNotificationRepository = {
    save: jest.fn(),
  };

  const mockNotificationsService = {
    deleteAllNotifications: jest.fn().mockResolvedValue(undefined),
    deleteReadedNotifications: jest.fn().mockResolvedValue(undefined),
  };

  const mockMercadoLibreService = {
    listProducts: jest.fn().mockResolvedValue(undefined),
  };

  const mockGoogleLoggingService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Products),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MercadoLibreService,
          useValue: mockMercadoLibreService,
        },
        {
          provide: GoogleLoggingService,
          useValue: mockGoogleLoggingService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productsRepository = module.get<Repository<Products>>(
      getRepositoryToken(Products),
    );
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    mercadoLibreService = module.get<MercadoLibreService>(MercadoLibreService);
    googleLoggingService =
      module.get<GoogleLoggingService>(GoogleLoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllProducts', () => {
    it('should return paginated products', async () => {
      const getProductsDto = {
        page: 1,
        sort: 'ASC' as const,
        order: 'id',
        stock: 'false',
        active: 'false',
        includeDeprecated: 'false',
        param: '',
        all: 'false',
      };

      const result = await service.getAllProducts(getProductsDto);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual([mockProduct]);
      expect(result.count).toBe(1);
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should filter by stock when stock is true', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };

      mockProductsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const getProductsDto = {
        page: 1,
        sort: 'ASC' as const,
        order: 'id',
        stock: 'true',
        active: 'false',
        includeDeprecated: 'false',
        param: '',
        all: 'false',
      };

      await service.getAllProducts(getProductsDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should exclude deprecated products by default', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      };

      mockProductsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const getProductsDto = {
        page: 1,
        sort: 'ASC' as const,
        order: 'id',
        stock: 'false',
        active: 'false',
        includeDeprecated: 'false',
        param: '',
        all: 'false',
      };

      await service.getAllProducts(getProductsDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getOneProduct', () => {
    it('should return a product by id', async () => {
      mockProductsRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.getOneProduct(1);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual(mockProduct);
      expect(mockProductsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductsRepository.findOne.mockResolvedValue(null);

      await expect(service.getOneProduct(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProduct', () => {
    const createProductDto: CreateProductDto = {
      cod_interno: 'PROD002',
      cod_barras: undefined,
      descripcion: 'Nuevo producto',
      costo_neto: 2000,
      costo_imp: 380,
      venta_neto: 3000,
      venta_imp: 570,
      stock_critico: 3,
      publicado: false,
      enlace_ml: undefined,
      id_ml: undefined,
      id_variante_ml: undefined,
      publicado_ps: false,
      id_ps: undefined,
      enlace_ps: undefined,
      deprecado: false,
    };

    it('should create a product without barcode', async () => {
      mockProductsRepository.findOne.mockResolvedValue(null);
      const newProduct = { ...mockProduct, id: 2, cod_barras: '' };
      mockProductsRepository.create.mockReturnValue(newProduct);
      mockProductsRepository.save.mockResolvedValue({
        ...newProduct,
        cod_barras: '50002',
      });

      const result = await service.createProduct(createProductDto);

      expect(result.serverResponseCode).toBe(201);
      expect(mockProductsRepository.create).toHaveBeenCalledWith(
        createProductDto,
      );
      expect(mockProductsRepository.save).toHaveBeenCalled();
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should create a product with barcode', async () => {
      mockProductsRepository.findOne.mockResolvedValue(null);
      const createDtoWithBarcode = {
        ...createProductDto,
        cod_barras: '9876543210123',
      };
      const newProduct = {
        ...mockProduct,
        id: 3,
        cod_barras: '9876543210123',
      };
      mockProductsRepository.create.mockReturnValue(newProduct);
      mockProductsRepository.save.mockResolvedValue(newProduct);

      const result = await service.createProduct(createDtoWithBarcode);

      expect(result.serverResponseCode).toBe(201);
      expect(mockProductsRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return error when product already exists', async () => {
      mockProductsRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.createProduct(createProductDto);

      expect(result.serverResponseCode).toBe(400);
      expect(result.serverResponseMessage).toBe('Producto ya existe.');
    });
  });

  describe('updateProduct', () => {
    const updateProductDto: UpdateProductDto = {
      id: 1,
      cod_interno: 'PROD001',
      cod_barras: undefined,
      descripcion: 'Producto actualizado',
      costo_neto: 1200,
      costo_imp: 228,
      venta_neto: 1800,
      venta_imp: 342,
      stock_critico: 5,
      activo: true,
      publicado: false,
      enlace_ml: undefined,
      id_ml: undefined,
      id_variante_ml: undefined,
      publicado_ps: false,
      id_ps: undefined,
      enlace_ps: undefined,
      deprecado: false,
      updatedAt: undefined,
    };

    it('should update a product', async () => {
      mockProductsRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      mockProductsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProduct(updateProductDto);

      expect(result.serverResponseCode).toBe(200);
      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductsRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProduct(updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return error when updating to existing product code', async () => {
      const existingProduct = { ...mockProduct, id: 2 };
      mockProductsRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(existingProduct);

      const result = await service.updateProduct(updateProductDto);

      expect(result.serverResponseCode).toBe(400);
      expect(result.serverResponseMessage).toBe('Producto ya existe.');
    });

    it('should generate barcode when empty', async () => {
      const updateDtoWithoutBarcode = {
        ...updateProductDto,
        cod_barras: '',
      };

      mockProductsRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      mockProductsRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateProduct(updateDtoWithoutBarcode);

      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          cod_barras: '50001',
        }),
      );
    });

    it('should set empty strings to null for marketplace fields', async () => {
      const updateDtoWithEmptyFields = {
        ...updateProductDto,
        enlace_ml: '',
        id_ml: '',
        id_variante_ml: '',
        enlace_ps: '',
        id_ps: '',
      };

      mockProductsRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      mockProductsRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateProduct(updateDtoWithEmptyFields);

      expect(mockProductsRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          enlace_ml: null,
          id_ml: null,
          id_variante_ml: null,
          enlace_ps: null,
          id_ps: null,
        }),
      );
    });
  });

  describe('setInactive', () => {
    it('should set products with stock 0 to inactive', async () => {
      const productsWithoutStock = [
        { ...mockProduct, stock: 0, activo: true },
        { ...mockProduct, id: 2, stock: 0, activo: true },
      ];

      mockProductsRepository.find.mockResolvedValue(productsWithoutStock);
      mockProductsRepository.save.mockResolvedValue(productsWithoutStock);
      mockNotificationRepository.save.mockResolvedValue({});

      const result = await service.setInactive(false);

      expect(result.serverResponseCode).toBe(200);
      expect(
        mockNotificationsService.deleteReadedNotifications,
      ).toHaveBeenCalled();
      expect(mockMercadoLibreService.listProducts).toHaveBeenCalled();
      expect(mockProductsRepository.save).toHaveBeenCalled();
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should delete all notifications when clearNotifications is true', async () => {
      mockProductsRepository.find.mockResolvedValue([]);

      await service.setInactive(true);

      expect(
        mockNotificationsService.deleteAllNotifications,
      ).toHaveBeenCalled();
    });

    it('should return message when no inactive products found', async () => {
      mockProductsRepository.find.mockResolvedValue([]);

      const result = await service.setInactive(false);

      expect(result.serverResponseCode).toBe(200);
      expect(result.serverResponseMessage).toBe('No hay productos inactivos.');
    });
  });

  describe('getInventoryResume', () => {
    it('should calculate inventory resume correctly', async () => {
      const products = [
        {
          ...mockProduct,
          stock: 10,
          costo_neto: 1000,
          costo_imp: 190,
          venta_neto: 1500,
          venta_imp: 285,
        },
        {
          ...mockProduct,
          id: 2,
          stock: 5,
          costo_neto: 2000,
          costo_imp: 380,
          venta_neto: 3000,
          venta_imp: 570,
        },
      ];

      mockProductsRepository.find.mockResolvedValue(products);

      const result = await service.getInventoryResume();

      expect(result.serverResponseCode).toBe(200);
      expect(result.data.totalUnits).toBe(15);
      expect(result.data.totalCost).toBe(10 * 1190 + 5 * 2380);
      expect(result.data.totalSale).toBe(10 * 1785 + 5 * 3570);
      expect(result.data.totalProfit).toBe(10 * 595 + 5 * 1190);
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should exclude deprecated products from inventory', async () => {
      mockProductsRepository.find.mockResolvedValue([]);

      const result = await service.getInventoryResume();

      expect(mockProductsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deprecado: false }),
        }),
      );
    });
  });

  describe('setProductsAsActive', () => {
    it('should set products as active when they have stock', async () => {
      const inactiveProducts = [
        { ...mockProduct, stock: 10, activo: false },
        { ...mockProduct, id: 2, stock: 5, activo: false },
      ];

      mockProductsRepository.save.mockResolvedValue(inactiveProducts);
      mockNotificationRepository.save.mockResolvedValue({});

      const result = await service.setProductsAsActive(inactiveProducts);

      expect(result.serverResponseCode).toBe(200);
      expect(mockProductsRepository.save).toHaveBeenCalled();
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });

    it('should return message when no products to activate', async () => {
      const result = await service.setProductsAsActive([]);

      expect(result.serverResponseCode).toBe(200);
      expect(result.serverResponseMessage).toBe(
        'No hay productos para activar.',
      );
    });

    it('should not activate products without stock', async () => {
      const products = [
        { ...mockProduct, stock: 0, activo: false },
        { ...mockProduct, id: 2, stock: 10, activo: false },
      ];

      mockProductsRepository.save.mockResolvedValue([products[1]]);

      await service.setProductsAsActive(products);

      const savedProducts = mockProductsRepository.save.mock.calls[0][0];
      expect(savedProducts).toHaveLength(1);
      expect(savedProducts[0].id).toBe(2);
    });

    it('should not activate deprecated products', async () => {
      const products = [
        { ...mockProduct, stock: 10, activo: false, deprecado: true },
        { ...mockProduct, id: 2, stock: 10, activo: false, deprecado: false },
      ];

      mockProductsRepository.save.mockResolvedValue([products[1]]);

      await service.setProductsAsActive(products);

      const savedProducts = mockProductsRepository.save.mock.calls[0][0];
      expect(savedProducts).toHaveLength(1);
      expect(savedProducts[0].id).toBe(2);
    });
  });
});
