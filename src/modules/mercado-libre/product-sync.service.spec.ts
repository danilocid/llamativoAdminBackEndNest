import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSyncService } from './product-sync.service';
import { Products } from '../products/entities/products.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { GoogleLoggingService } from 'src/common/services/google-logging.service';

describe('ProductSyncService', () => {
  let service: ProductSyncService;
  let productsRepository: Repository<Products>;
  let notificationRepository: Repository<Notification>;

  const mockProduct: Partial<Products> = {
    id: 1,
    cod_barras: '50211',
    descripcion: 'Delantal Profesora Sarah',
    stock: 5,
    venta_neto: 22000,
    venta_imp: 4990,
    publicado: false,
    enlace_ml: null,
    id_ml: null,
    id_variante_ml: null,
  };

  const mockProductsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockNotificationRepository = {
    save: jest.fn(),
  };

  const mockGoogleLoggingService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSyncService,
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

    service = module.get<ProductSyncService>(ProductSyncService);
    productsRepository = module.get<Repository<Products>>(
      getRepositoryToken(Products),
    );
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // validateAndSyncProduct
  // ---------------------------------------------------------------------------
  describe('validateAndSyncProduct', () => {
    const productDetails = {
      data: {
        id: 'MLC3745949028',
        permalink:
          'https://articulo.mercadolibre.cl/MLC-3745949028-delantal-_JM',
        attributes: [
          { id: 'BRAND', value_name: 'Wiltex' },
          { id: 'SELLER_SKU', value_name: '50211' },
          { id: 'SIZE', value_name: 'XXL' },
        ],
      },
    };

    const variation = {
      id: 'VAR001',
      attributes: [
        { id: 'COLOR', value_name: 'verde botella' },
        { id: 'SELLER_SKU', value_name: '50211' },
      ],
    };

    describe('cuando el producto existe en la base de datos', () => {
      it('retorna el producto directamente si es variante', async () => {
        mockProductsRepository.findOne.mockResolvedValue(mockProduct);

        const result = await service.validateAndSyncProduct(
          productDetails,
          variation,
          true,
        );

        expect(result).toEqual(mockProduct);
        expect(productsRepository.findOne).toHaveBeenCalledWith({
          where: { id_variante_ml: variation.id },
        });
      });

      it('retorna el producto directamente si no es variante', async () => {
        mockProductsRepository.findOne.mockResolvedValue(mockProduct);

        const result = await service.validateAndSyncProduct(
          productDetails,
          variation,
          false,
        );

        expect(result).toEqual(mockProduct);
        expect(productsRepository.findOne).toHaveBeenCalledWith({
          where: { id_ml: productDetails.data.id },
        });
      });
    });

    describe('cuando el producto NO existe en la base de datos', () => {
      describe('caso variante - busqueda por SKU', () => {
        it('actualiza y retorna el producto encontrado por SKU en la variante', async () => {
          const savedProduct = {
            ...mockProduct,
            id_variante_ml: variation.id,
            id_ml: productDetails.data.id,
            enlace_ml: productDetails.data.permalink,
            publicado: true,
          };

          mockProductsRepository.findOne
            .mockResolvedValueOnce(null) // busqueda por id_variante_ml
            .mockResolvedValueOnce(mockProduct); // busqueda por cod_barras
          mockProductsRepository.save.mockResolvedValue(savedProduct);

          const result = await service.validateAndSyncProduct(
            productDetails,
            variation,
            true,
          );

          expect(result).toMatchObject({
            id_variante_ml: variation.id,
            id_ml: productDetails.data.id,
            enlace_ml: productDetails.data.permalink,
            publicado: true,
          });
          expect(productsRepository.save).toHaveBeenCalledTimes(1);
        });

        it('retorna null cuando la variante tiene SKU pero no hay coincidencia en la BD', async () => {
          mockProductsRepository.findOne
            .mockResolvedValueOnce(null) // busqueda por id_variante_ml
            .mockResolvedValueOnce(null); // busqueda por cod_barras

          const result = await service.validateAndSyncProduct(
            productDetails,
            variation,
            true,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });

        it('retorna null cuando la variante no tiene atributos', async () => {
          mockProductsRepository.findOne.mockResolvedValueOnce(null);

          const result = await service.validateAndSyncProduct(
            productDetails,
            { id: 'VAR001' }, // sin attributes
            true,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });

        it('retorna null cuando la variante no tiene SELLER_SKU en sus atributos', async () => {
          mockProductsRepository.findOne.mockResolvedValueOnce(null);

          const variationSinSku = {
            id: 'VAR001',
            attributes: [{ id: 'COLOR', value_name: 'verde botella' }],
          };

          const result = await service.validateAndSyncProduct(
            productDetails,
            variationSinSku,
            true,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });
      });

      describe('caso no variante - busqueda por SKU en productDetails.data.attributes', () => {
        it('actualiza y retorna el producto encontrado por SKU en los atributos del producto', async () => {
          const freshProduct = { ...mockProduct };

          mockProductsRepository.findOne
            .mockResolvedValueOnce(null) // busqueda por id_ml
            .mockResolvedValueOnce(freshProduct); // busqueda por cod_barras
          mockProductsRepository.save.mockImplementation((p) =>
            Promise.resolve(p),
          );

          const result = await service.validateAndSyncProduct(
            productDetails,
            variation,
            false,
          );

          expect(result).toMatchObject({
            id_ml: productDetails.data.id,
            enlace_ml: productDetails.data.permalink,
            publicado: true,
          });
          expect(productsRepository.save).toHaveBeenCalledTimes(1);
        });

        it('no asigna id_variante_ml al producto no-variante encontrado por SKU', async () => {
          const freshProduct = { ...mockProduct, id_variante_ml: null };
          mockProductsRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(freshProduct);
          mockProductsRepository.save.mockImplementation((p) =>
            Promise.resolve(p),
          );

          await service.validateAndSyncProduct(
            productDetails,
            variation,
            false,
          );

          const savedArg = mockProductsRepository.save.mock.calls[0][0];
          // El servicio no toca id_variante_ml en el flujo no-variante
          expect(savedArg.id_variante_ml).toBeNull();
          expect(savedArg.id_ml).toBe(productDetails.data.id);
          expect(savedArg.enlace_ml).toBe(productDetails.data.permalink);
          expect(savedArg.publicado).toBe(true);
        });

        it('retorna null cuando el producto no-variante tiene SKU pero no hay coincidencia en la BD', async () => {
          mockProductsRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

          const result = await service.validateAndSyncProduct(
            productDetails,
            variation,
            false,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });

        it('retorna null cuando productDetails no tiene atributos', async () => {
          mockProductsRepository.findOne.mockResolvedValueOnce(null);

          const productDetailsSinAtributos = {
            data: {
              id: 'MLC3745949028',
              permalink: 'https://articulo.mercadolibre.cl/MLC-3745949028-_JM',
            },
          };

          const result = await service.validateAndSyncProduct(
            productDetailsSinAtributos,
            variation,
            false,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });

        it('retorna null cuando productDetails no tiene SELLER_SKU en sus atributos', async () => {
          mockProductsRepository.findOne.mockResolvedValueOnce(null);

          const productDetailsSinSku = {
            data: {
              id: 'MLC3745949028',
              permalink: 'https://articulo.mercadolibre.cl/MLC-3745949028-_JM',
              attributes: [
                { id: 'BRAND', value_name: 'Wiltex' },
                { id: 'SIZE', value_name: 'XXL' },
              ],
            },
          };

          const result = await service.validateAndSyncProduct(
            productDetailsSinSku,
            variation,
            false,
          );

          expect(result).toBeNull();
          expect(productsRepository.save).not.toHaveBeenCalled();
        });
      });
    });
  });
});
