import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
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

  const mockProductsRepo: any = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockNotificationRepo: any = {
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
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

    // Se reasignan en cada test porque jest.clearAllMocks() limpia las
    // llamadas pero no las implementaciones
    mockProductsRepo.find.mockResolvedValue([]);
    mockNotificationRepo.find.mockResolvedValue([]);
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
    expect(result).toEqual([
      {
        created: false,
        reason: 'already_exists',
        sku: 'SKU1',
        db_id: 10,
        woo_id: 501,
        woo_permalink: 'https://woo.test/p/501',
        ml_id: 'ML1',
        ml_title: 'Delantal Azul',
      },
      {
        created: true,
        sku: 'SKU2',
        db_id: 11,
        woo_id: 777,
        woo_permalink: 'https://woo.test/p/777',
        ml_id: 'ML2',
        ml_title: 'Jardinera Verde',
      },
    ]);
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
      cambios: { precios: [], stocks: [] },
    });
  });

  it('debe acumular los cambios de precio y stock sin notificar por producto', async () => {
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

    const result = await service.listProducts({
      page: 1,
      per_page: 20,
      status: 'any',
    });

    // listProducts acumula los cambios y escribe en la tienda, pero no avisa
    // por producto: la notificación la emite quien lo invoca, en un único
    // resumen, para no acumular avisos con cada ejecución
    expect(mockHttpService.post).toHaveBeenCalled();
    expect(result.cambios.precios).toEqual(['Producto Woo (SKU SKU1)']);
    expect(result.cambios.stocks).toEqual(['Producto Woo (SKU SKU1): 8']);
    expect(mockNotificationRepo.save).not.toHaveBeenCalled();
  });

  it('notificarCambiosDeSincronizacion emite un unico resumen por tipo de cambio', async () => {
    await service.notificarCambiosDeSincronizacion({
      precios: ['Producto Woo (SKU SKU1)', 'Otro (SKU SKU2)'],
      stocks: ['Producto Woo (SKU SKU1): 8'],
    });

    expect(mockNotificationRepo.save).toHaveBeenCalledTimes(2);
    expect(mockNotificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Producto actualizado en WooCommerce',
        description: expect.stringContaining('2 producto(s)'),
      }),
    );
    expect(mockNotificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Stock actualizado en WooCommerce',
        description: expect.stringContaining('Producto Woo (SKU SKU1): 8'),
      }),
    );
  });

  it('notificarCambiosDeSincronizacion no avisa cuando no hubo cambios', async () => {
    await service.notificarCambiosDeSincronizacion({
      precios: [],
      stocks: [],
    });

    expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    expect(mockNotificationRepo.delete).not.toHaveBeenCalled();
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
        description: expect.stringContaining(
          'Se creó el producto Delantal Test (SKU SKU321)',
        ),
        url: 'https://woo.test/p/321',
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // revisarStocksDesdeBaseDeDatos
  // ---------------------------------------------------------------------------
  describe('revisarStocksDesdeBaseDeDatos', () => {
    const resumenVacio = {
      productosBD: 0,
      productosWoo: 0,
      stockActualizado: 0,
      sinGestionDeStock: 0,
      publicacionesFaltantes: 0,
    };

    it('omite la revision si WooCommerce no devuelve productos', async () => {
      mockHttpService.get.mockReturnValue(of({ data: [], headers: {} }));

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result).toEqual(resumenVacio);
      expect(mockProductsRepo.find).not.toHaveBeenCalled();
      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });

    it('empuja el stock real de la base de datos a WooCommerce', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 5 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'Delantal',
        },
      ]);
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.stockActualizado).toBe(1);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://woo.test/wp-json/wc/v3/products/10',
        { stock_quantity: 7 },
        expect.any(Object),
      );
    });

    it('no hace nada cuando el stock de la tienda ya coincide', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 7 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
        },
      ]);

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.stockActualizado).toBe(0);
      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });

    it('identifica el producto por id_ps cuando el SKU no coincide', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [{ id: 42, sku: '', manage_stock: true, stock_quantity: 1 }],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 4,
          publicado_ps: true,
          id_ps: '42',
        },
      ]);
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.stockActualizado).toBe(1);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://woo.test/wp-json/wc/v3/products/42',
        { stock_quantity: 4 },
        expect.any(Object),
      );
    });

    it('omite los productos de WooCommerce sin gestion de stock', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: false, stock_quantity: 5 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
        },
      ]);

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.sinGestionDeStock).toBe(1);
      expect(result.stockActualizado).toBe(0);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('marca como no publicado el producto que ya no existe en la tienda', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [{ id: 10, sku: 'OTRO', manage_stock: true, stock_quantity: 1 }],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 5,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 3,
          publicado_ps: true,
          id_ps: '999',
          descripcion: 'Delantal',
        },
      ]);

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.publicacionesFaltantes).toBe(1);
      expect(mockProductsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, publicado_ps: false }),
      );
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Producto sin publicación en WooCommerce',
          url: '/articulos',
        }),
      );
    });

    it('ignora los productos ausentes que no estaban publicados', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [{ id: 10, sku: 'OTRO', manage_stock: true, stock_quantity: 1 }],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 5,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 3,
          publicado_ps: false,
          id_ps: null,
        },
      ]);

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(result.publicacionesFaltantes).toBe(0);
      expect(mockProductsRepo.save).not.toHaveBeenCalled();
      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });

    it('no detiene la revision si falla una actualizacion', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 5 },
            { id: 11, sku: 'SKU-B', manage_stock: true, stock_quantity: 5 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'A',
        },
        {
          id: 2,
          cod_interno: 'SKU-B',
          cod_barras: '790',
          stock: 9,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'B',
        },
      ]);
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => new Error('fallo')))
        .mockReturnValueOnce(of({ data: {} }));

      const result = await service.revisarStocksDesdeBaseDeDatos();

      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
      expect(result.stockActualizado).toBe(1);
    });

    // --- comportamiento anti-acumulacion de notificaciones ------------------

    it('emite una sola notificacion de resumen por corrida, no una por producto', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 5 },
            { id: 11, sku: 'SKU-B', manage_stock: true, stock_quantity: 5 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'A',
        },
        {
          id: 2,
          cod_interno: 'SKU-B',
          cod_barras: '790',
          stock: 9,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'B',
        },
      ]);
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await service.revisarStocksDesdeBaseDeDatos();

      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Stock actualizado en WooCommerce',
          description: expect.stringContaining('2 producto(s)'),
          readed: false,
        }),
      );
    });

    it('no deja notificacion de resumen cuando no hubo cambios', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 7 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
        },
      ]);

      await service.revisarStocksDesdeBaseDeDatos();

      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
      expect(mockNotificationRepo.delete).not.toHaveBeenCalled();
    });

    it('reemplaza la notificacion anterior no leida del mismo titulo', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            { id: 10, sku: 'SKU-A', manage_stock: true, stock_quantity: 5 },
          ],
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue([
        {
          id: 1,
          cod_interno: 'SKU-A',
          cod_barras: '789',
          stock: 7,
          publicado_ps: true,
          id_ps: null,
          descripcion: 'A',
        },
      ]);
      mockHttpService.post.mockReturnValue(of({ data: {} }));
      mockNotificationRepo.find.mockResolvedValue([{ id: 7 }, { id: 8 }]);

      await service.revisarStocksDesdeBaseDeDatos();

      expect(mockNotificationRepo.find).toHaveBeenCalledWith({
        where: { title: 'Stock actualizado en WooCommerce', readed: false },
      });
      expect(mockNotificationRepo.delete).toHaveBeenCalledWith([7, 8]);
    });

    it('trunca el detalle del resumen para caber en el varchar(255)', async () => {
      const skus = Array.from({ length: 12 }, (_, i) => `SKU-${i}`);
      mockHttpService.get.mockReturnValue(
        of({
          data: skus.map((sku, i) => ({
            id: 100 + i,
            sku,
            manage_stock: true,
            stock_quantity: 0,
          })),
          headers: {},
        }),
      );
      mockProductsRepo.find.mockResolvedValue(
        skus.map((sku, i) => ({
          id: i + 1,
          cod_interno: sku,
          cod_barras: `789${i}`,
          stock: 5,
          publicado_ps: true,
          id_ps: null,
          descripcion: `Producto ${sku}`,
        })),
      );
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await service.revisarStocksDesdeBaseDeDatos();

      const guardada = mockNotificationRepo.save.mock.calls[0][0];
      expect(guardada.description.length).toBeLessThanOrEqual(250);
      expect(guardada.description).toContain('12 producto(s)');
    });
  });
});
