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

  const mockWoocommerceService = {
    listProducts: listProductsMock,
    syncPublishedProductFromMercadoLibre:
      syncPublishedProductFromMercadoLibreMock,
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

  it('debe delegar listProducts al servicio', async () => {
    const dto = { page: 1, per_page: 20 };
    const expected = { data: [], total: '0', totalPages: '0' };
    listProductsMock.mockImplementation(async () => expected);

    const result = await controller.listProducts(dto as any);

    expect(service.listProducts).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
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
