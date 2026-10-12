import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { WoocommerceController } from './woocommerce.controller';
import { WoocommerceService } from './woocommerce.service';

describe('WoocommerceController', () => {
  let controller: WoocommerceController;
  let service: WoocommerceService;
  const listProductsMock = jest.fn();
  const syncPublishedProductFromMercadoLibreMock = jest.fn();
  const notificarCambiosDeSincronizacionMock = jest.fn();

  const mockWoocommerceService = {
    listProducts: listProductsMock,
    syncPublishedProductFromMercadoLibre:
      syncPublishedProductFromMercadoLibreMock,
    notificarCambiosDeSincronizacion: notificarCambiosDeSincronizacionMock,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WoocommerceController],
      providers: [
        {
          provide: WoocommerceService,
          useValue: mockWoocommerceService,
        },
      ],
    }).compile();

    controller = module.get<WoocommerceController>(WoocommerceController);
    service = module.get<WoocommerceService>(WoocommerceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe delegar listProducts al servicio y notificar los cambios', async () => {
    const dto = { page: 1, per_page: 20, sincronizar: true };
    const cambios = { precios: ['A'], stocks: ['B'] };
    const expected = { data: [], total: '0', totalPages: '0', cambios };
    listProductsMock.mockImplementation(async () => expected);

    const result = await controller.listProducts(dto as any);

    // sincronizar viene activado por defecto, así que se escribe en la tienda
    expect(service.listProducts).toHaveBeenCalledWith(dto, {
      soloLectura: false,
    });
    expect(notificarCambiosDeSincronizacionMock).toHaveBeenCalledWith(cambios);
    expect(result).toBe(expected);
  });

  it('debe pedir solo lectura cuando sincronizar viene en false', async () => {
    const dto = { page: 1, per_page: 20, sincronizar: false };
    listProductsMock.mockImplementation(async () => ({
      data: [],
      cambios: { precios: [], stocks: [] },
    }));

    await controller.listProducts(dto as any);

    expect(service.listProducts).toHaveBeenCalledWith(dto, {
      soloLectura: true,
    });
    // sin cambios no hay nada que notificar
    expect(notificarCambiosDeSincronizacionMock).toHaveBeenCalledWith({
      precios: [],
      stocks: [],
    });
  });

  it('debe delegar syncPublishedProductFromMercadoLibre al servicio', async () => {
    const expected = { created: true, woo_id: 123 };
    syncPublishedProductFromMercadoLibreMock.mockImplementation(
      async () => expected,
    );

    const result = await controller.syncPublishedProductFromMercadoLibre();

    expect(service.syncPublishedProductFromMercadoLibre).toHaveBeenCalled();
    expect(result).toBe(expected);
  });
});
