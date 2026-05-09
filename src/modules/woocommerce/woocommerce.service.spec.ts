import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { WoocommerceService } from './woocommerce.service';
import { Products } from '../products/entities/products.entity';
import { MercadoLibreAuthService } from '../mercado-libre/mercado-libre-auth.service';
import { MercadoLibreService } from '../mercado-libre/mercado-libre.service';
import { Notification } from '../notifications/entities/notification.entity';

describe('WoocommerceService', () => {
  let service: WoocommerceService;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        WOO_BASE_URL: 'https://woo.test',
        WOO_CONSUMER_KEY: 'ck_test',
        WOO_CONSUMER_SECRET: 'cs_test',
        ML_SELLER_ID: '169479376',
      };
      return config[key];
    }),
  };

  const mockMercadoLibreAuthService = {
    getAuthToken: jest.fn(),
  };

  const mockMercadoLibreService = {
    getProductListFromML: jest.fn(),
    getProductDetailsFromMl: jest.fn(),
  };

  const mockProductsRepo = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNotificationRepo = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WoocommerceService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: MercadoLibreAuthService,
          useValue: mockMercadoLibreAuthService,
        },
        { provide: MercadoLibreService, useValue: mockMercadoLibreService },
        { provide: getRepositoryToken(Products), useValue: mockProductsRepo },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
      ],
    }).compile();

    service = module.get<WoocommerceService>(WoocommerceService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe continuar con el siguiente producto ML si el actual ya existe en WooCommerce', async () => {
    mockMercadoLibreService.getProductListFromML.mockImplementation(
      async () => ({
        data: { results: ['ML1', 'ML2'] },
      }),
    );
    mockMercadoLibreService.getProductDetailsFromMl
      .mockImplementationOnce(async () => ({
        data: {
          id: 'ML1',
          title: 'Delantal Azul',
          permalink: 'https://ml.test/ML1',
          available_quantity: 5,
          attributes: [{ id: 'SELLER_SKU', value_name: 'SKU1' }],
          pictures: [],
        },
      }))
      .mockImplementationOnce(async () => ({
        data: {
          id: 'ML2',
          title: 'Jardinera Verde',
          permalink: 'https://ml.test/ML2',
          available_quantity: 8,
          attributes: [{ id: 'SELLER_SKU', value_name: 'SKU2' }],
          pictures: [],
        },
      }));

    const dbProduct1 = {
      id: 10,
      descripcion: 'Prod 1',
      venta_neto: 100,
      venta_imp: 19,
      stock: 5,
      publicado_ps: false,
      id_ps: null,
      enlace_ps: null,
    } as Products;
    const dbProduct2 = {
      id: 11,
      descripcion: 'Prod 2',
      venta_neto: 200,
      venta_imp: 38,
      stock: 8,
      publicado_ps: false,
      id_ps: null,
      enlace_ps: null,
    } as Products;

    jest
      .spyOn(service as any, 'findDbProductBySku')
      .mockImplementationOnce(async () => dbProduct1)
      .mockImplementationOnce(async () => dbProduct2);
    jest
      .spyOn(service as any, 'findWooProductBySku')
      .mockImplementationOnce(async () => ({
        id: 501,
        permalink: 'https://woo.test/p/501',
      }))
      .mockImplementationOnce(async () => null);
    const updateSpy = jest
      .spyOn(service as any, 'updateWooLinkInDb')
      .mockImplementation(async () => undefined);
    const createSpy = jest
      .spyOn(service as any, 'createWooProductFromMl')
      .mockImplementation(async () => ({
        id: 777,
        permalink: 'https://woo.test/p/777',
      }));

    const result = await service.syncPublishedProductFromMercadoLibre();

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      created: true,
      sku: 'SKU2',
      db_id: 11,
      woo_id: 777,
      woo_permalink: 'https://woo.test/p/777',
      ml_id: 'ML2',
      ml_title: 'Jardinera Verde',
    });
  });

  it('debe crear la categoria en WooCommerce si no existe', async () => {
    mockHttpService.get.mockReturnValue(of({ data: [] }));
    mockHttpService.post.mockReturnValue(
      of({ data: { id: 99, name: 'Delantales' } }),
    );

    const result = await (service as any).findWooCategoryByName('Delantales');

    expect(httpService.get).toHaveBeenCalledWith(
      'https://woo.test/wp-json/wc/v3/products/categories',
      expect.objectContaining({
        params: expect.objectContaining({ search: 'Delantales' }),
      }),
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'https://woo.test/wp-json/wc/v3/products/categories',
      { name: 'Delantales' },
      expect.objectContaining({
        params: expect.objectContaining({
          consumer_key: 'ck_test',
          consumer_secret: 'cs_test',
        }),
      }),
    );
    expect(result).toEqual({ id: 99, name: 'Delantales' });
  });

  it('listProducts no debe disparar la sincronizacion desde MercadoLibre', async () => {
    mockHttpService.get.mockReturnValue(
      of({
        data: [],
        headers: { 'x-wp-total': '0', 'x-wp-totalpages': '0' },
      }),
    );
    mockProductsRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => []),
    });
    const syncSpy = jest.spyOn(service, 'syncPublishedProductFromMercadoLibre');

    const result = await service.listProducts({ page: 1, per_page: 10 });

    expect(syncSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      total: '0',
      totalPages: '0',
    });
  });

  it('debe crear notificaciones por actualizar producto y stock', async () => {
    const dbProduct = {
      id: 10,
      cod_interno: 'SKU1',
      cod_barras: 'SKU1',
      descripcion: 'Prod 1',
      venta_neto: 100,
      venta_imp: 19,
      stock: 8,
    } as Products;

    mockProductsRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => [dbProduct]),
    });
    mockHttpService.get.mockReturnValue(
      of({
        data: [
          {
            id: 1,
            name: 'Producto Woo',
            slug: 'producto-woo',
            permalink: 'https://woo.test/p/1',
            type: 'simple',
            status: 'publish',
            description: '',
            short_description: '',
            sku: 'SKU1',
            price: '150',
            regular_price: '150',
            sale_price: '',
            on_sale: false,
            purchasable: true,
            manage_stock: true,
            stock_quantity: 2,
            stock_status: 'instock',
            weight: '',
            dimensions: {},
            categories: [],
            tags: [],
            images: [],
            attributes: [],
            variations: [],
          },
        ],
        headers: { 'x-wp-total': '1', 'x-wp-totalpages': '1' },
      }),
    );
    mockHttpService.post.mockReturnValue(of({ data: { id: 1 } }));
    jest
      .spyOn(service as any, 'findMercadoLibreProductBySku')
      .mockImplementation(async () => null);

    await service.listProducts({ page: 1, per_page: 20, status: 'any' });

    expect(mockNotificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Producto actualizado en WooCommerce',
        description: expect.stringContaining('woo_id=1'),
      }),
    );
    expect(mockNotificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Stock actualizado en WooCommerce',
        description: expect.stringContaining('permalink=https://woo.test/p/1'),
      }),
    );
  });

  it('debe crear una notificación al crear producto en WooCommerce', async () => {
    const dbProduct = {
      id: 20,
      descripcion: 'Prod nuevo',
      venta_neto: 200,
      venta_imp: 38,
      stock: 4,
    } as Products;
    jest
      .spyOn(service as any, 'resolveWooCategoriesByTitle')
      .mockImplementation(async () => []);
    mockHttpService.post.mockReturnValue(
      of({ data: { id: 321, permalink: 'https://woo.test/p/321' } }),
    );

    const result = await (service as any).createWooProductFromMl(
      {
        sku: 'SKU321',
        title: 'Delantal Test',
        description: 'Descripcion ML',
        images: [],
      },
      dbProduct,
    );

    expect(result).toEqual({ id: 321, permalink: 'https://woo.test/p/321' });
    expect(mockNotificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Producto creado en WooCommerce',
        description: expect.stringContaining('woo_id=321'),
        url: 'https://woo.test/p/321',
      }),
    );
  });
});
