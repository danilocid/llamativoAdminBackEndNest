import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import { MercadoLibreService } from './mercado-libre.service';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { ProductSyncService } from './product-sync.service';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { GoogleLoggingService } from '../../common/services/google-logging.service';

describe('MercadoLibreService', () => {
  let service: MercadoLibreService;
  let httpService: HttpService;
  let mercadoLibreAuthService: MercadoLibreAuthService;
  let productSyncService: ProductSyncService;
  let productsRepository: Repository<Products>;
  let notificationRepository: Repository<Notification>;
  let googleLoggingService: GoogleLoggingService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockAuthService = {
    getAuthToken: jest.fn(),
  };

  const mockProductSyncService = {
    validateAndSyncProduct: jest.fn(),
    validateStockAndPrice: jest.fn(),
    createProductNotification: jest.fn(),
  };

  const mockProductsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockNotificationRepository = {
    save: jest.fn(),
  };

  const mockGoogleLoggingService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoLibreService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: MercadoLibreAuthService,
          useValue: mockAuthService,
        },
        {
          provide: ProductSyncService,
          useValue: mockProductSyncService,
        },
        {
          provide: getRepositoryToken(Products),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: GoogleLoggingService,
          useValue: mockGoogleLoggingService,
        },
      ],
    }).compile();

    service = module.get<MercadoLibreService>(MercadoLibreService);
    httpService = module.get<HttpService>(HttpService);
    mercadoLibreAuthService = module.get<MercadoLibreAuthService>(
      MercadoLibreAuthService,
    );
    productSyncService = module.get<ProductSyncService>(ProductSyncService);
    productsRepository = module.get<Repository<Products>>(
      getRepositoryToken(Products),
    );
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    googleLoggingService =
      module.get<GoogleLoggingService>(GoogleLoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductListFromML', () => {
    it('should fetch product list from Mercado Libre API', async () => {
      const mockToken = 'mock-token';
      const mockResponse = {
        status: 200,
        data: {
          results: ['MLB123', 'MLB456'],
          paging: {},
        },
      };

      mockAuthService.getAuthToken.mockResolvedValue(mockToken);
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getProductListFromML();

      expect(mercadoLibreAuthService.getAuthToken).toHaveBeenCalled();
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/169479376/items/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual({
        status: 200,
        data: mockResponse.data,
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockToken = 'mock-token';
      const error = new Error('API Error');

      mockAuthService.getAuthToken.mockResolvedValue(mockToken);
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getProductListFromML()).rejects.toThrow(
        'Error al listar productos de Mercado Libre: API Error',
      );

      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'Error al listar productos de Mercado Libre',
        expect.objectContaining({ error: 'API Error' }),
        'ERROR',
        expect.any(String),
        'mercado-libre',
      );
    });
  });

  describe('getProductDetailsFromMl', () => {
    it('should fetch product details from Mercado Libre', async () => {
      const mockToken = 'mock-token';
      const productId = 'MLB123';
      const mockResponse = {
        status: 200,
        data: {
          id: productId,
          title: 'Test Product',
          price: 100,
        },
      };

      mockAuthService.getAuthToken.mockResolvedValue(mockToken);
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getProductDetailsFromMl(productId);

      expect(httpService.get).toHaveBeenCalledWith(
        `https://api.mercadolibre.com/items/${productId}?include_attributes=all`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual({
        error: undefined,
        status: 200,
        data: mockResponse.data,
      });
    });

    it('should throw error when fetching product details fails', async () => {
      const mockToken = 'mock-token';
      const productId = 'MLB123';
      const error = new Error('Network error');

      mockAuthService.getAuthToken.mockResolvedValue(mockToken);
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getProductDetailsFromMl(productId)).rejects.toThrow(
        'Error al obtener detalles del producto de Mercado Libre',
      );
    });
  });

  describe('listProducts', () => {
    it('should process products without variations', async () => {
      const mockProductList = {
        status: 200,
        data: {
          results: ['MLB123'],
          paging: {},
          seller_id: 123,
        },
      };

      const mockProductDetails = {
        status: 200,
        data: {
          id: 'MLB123',
          title: 'Test Product',
          variations: [],
          sale_terms: [],
          pictures: [],
          shipping: {},
          seller_address: {},
        },
      };

      const mockProduct = {
        id: 1,
        cod_barras: '123',
        descripcion: 'Test Product',
      };

      mockAuthService.getAuthToken.mockResolvedValue('mock-token');
      mockHttpService.get
        .mockReturnValueOnce(of(mockProductList))
        .mockReturnValueOnce(of(mockProductDetails));
      mockProductSyncService.validateAndSyncProduct.mockResolvedValue(
        mockProduct,
      );
      mockProductSyncService.validateStockAndPrice.mockResolvedValue(undefined);

      const result = await service.listProducts();

      expect(productSyncService.validateAndSyncProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'MLB123' }),
        }),
        expect.objectContaining({ id: 'MLB123' }),
        false,
      );
      expect(productSyncService.validateStockAndPrice).toHaveBeenCalledWith(
        mockProduct,
        expect.any(Object),
      );
      expect(result.data.details).toHaveLength(1);
    });

    it('should process products with variations', async () => {
      const mockProductList = {
        status: 200,
        data: {
          results: ['MLB123'],
        },
      };

      const mockProductDetails = {
        status: 200,
        data: {
          id: 'MLB123',
          title: 'Test Product',
          variations: [
            { id: 'VAR1', price: 100 },
            { id: 'VAR2', price: 150 },
          ],
          sale_terms: [],
          pictures: [],
          shipping: {},
          seller_address: {},
        },
      };

      const mockProduct = {
        id: 1,
        cod_barras: '123',
        descripcion: 'Test Product',
      };

      mockAuthService.getAuthToken.mockResolvedValue('mock-token');
      mockHttpService.get
        .mockReturnValueOnce(of(mockProductList))
        .mockReturnValueOnce(of(mockProductDetails));
      mockProductSyncService.validateAndSyncProduct.mockResolvedValue(
        mockProduct,
      );
      mockProductSyncService.validateStockAndPrice.mockResolvedValue(undefined);

      const result = await service.listProducts();

      expect(productSyncService.validateAndSyncProduct).toHaveBeenCalledTimes(
        2,
      );
      expect(productSyncService.validateStockAndPrice).toHaveBeenCalledTimes(2);
    });

    it('should create notification when product not found in DB', async () => {
      const mockProductList = {
        status: 200,
        data: {
          results: ['MLB123'],
        },
      };

      const mockProductDetails = {
        status: 200,
        data: {
          id: 'MLB123',
          title: 'Test Product',
          variations: [],
          sale_terms: [],
          pictures: [],
          shipping: {},
          seller_address: {},
        },
      };

      mockAuthService.getAuthToken.mockResolvedValue('mock-token');
      mockHttpService.get
        .mockReturnValueOnce(of(mockProductList))
        .mockReturnValueOnce(of(mockProductDetails));
      mockProductSyncService.validateAndSyncProduct.mockResolvedValue(null);

      await service.listProducts();

      expect(notificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Producto no encontrado',
          description: expect.stringContaining('MLB123'),
        }),
      );
    });

    it('should handle errors during product processing', async () => {
      const mockProductList = {
        status: 200,
        data: {
          results: ['MLB123'],
        },
      };

      const error = new Error('Processing error');

      mockAuthService.getAuthToken.mockResolvedValue('mock-token');
      mockHttpService.get
        .mockReturnValueOnce(of(mockProductList))
        .mockReturnValueOnce(throwError(() => error));

      await expect(service.listProducts()).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'Error al obtener detalles del producto de Mercado Libre',
        expect.objectContaining({
          error: expect.stringContaining('Processing error'),
          product: 'MLB123',
        }),
        'ERROR',
        'listProducts',
        'mercado-libre',
      );
    });

    it('should return response when no products found', async () => {
      const mockProductList = {
        status: 200,
        data: {
          results: [],
        },
      };

      mockAuthService.getAuthToken.mockResolvedValue('mock-token');
      mockHttpService.get.mockReturnValueOnce(of(mockProductList));

      const result = await service.listProducts();

      expect(result).toEqual(mockProductList);
      expect(productSyncService.validateAndSyncProduct).not.toHaveBeenCalled();
    });
  });
});
