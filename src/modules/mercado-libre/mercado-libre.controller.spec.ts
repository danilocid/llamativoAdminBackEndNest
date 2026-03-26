import { Test, TestingModule } from '@nestjs/testing';
import { MercadoLibreController } from './mercado-libre.controller';
import { MercadoLibreService } from './mercado-libre.service';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { GetCodeDto } from './dto/get-code.dto';

describe('MercadoLibreController', () => {
  let controller: MercadoLibreController;
  let mercadoLibreService: MercadoLibreService;
  let mercadoLibreAuthService: MercadoLibreAuthService;

  const mockMercadoLibreService = {
    listProducts: jest.fn(),
  };

  const mockMercadoLibreAuthService = {
    getAuthCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoLibreController],
      providers: [
        {
          provide: MercadoLibreService,
          useValue: mockMercadoLibreService,
        },
        {
          provide: MercadoLibreAuthService,
          useValue: mockMercadoLibreAuthService,
        },
      ],
    }).compile();

    controller = module.get<MercadoLibreController>(MercadoLibreController);
    mercadoLibreService = module.get<MercadoLibreService>(MercadoLibreService);
    mercadoLibreAuthService = module.get<MercadoLibreAuthService>(
      MercadoLibreAuthService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuthCode', () => {
    it('should call mercadoLibreAuthService.getAuthCode with query params', async () => {
      const query: GetCodeDto = { code: 'TG-123456789' };
      const expectedResponse = { code: 'TG-123456789' };

      mockMercadoLibreAuthService.getAuthCode.mockReturnValue(expectedResponse);

      const result = await controller.getAuthCode(query);

      expect(mercadoLibreAuthService.getAuthCode).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle error query params', async () => {
      const query: GetCodeDto = { error: 'access_denied' };
      const expectedResponse = { error: 'access_denied' };

      mockMercadoLibreAuthService.getAuthCode.mockReturnValue(expectedResponse);

      const result = await controller.getAuthCode(query);

      expect(mercadoLibreAuthService.getAuthCode).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('listProducts', () => {
    it('should call mercadoLibreService.listProducts', async () => {
      const mockProducts = {
        data: {
          results: ['MLB123', 'MLB456'],
          details: [],
        },
      };

      mockMercadoLibreService.listProducts.mockResolvedValue(mockProducts);

      const result = await controller.listProducts();

      expect(mercadoLibreService.listProducts).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });

    it('should handle errors from service', async () => {
      const error = new Error('Service error');
      mockMercadoLibreService.listProducts.mockRejectedValue(error);

      await expect(controller.listProducts()).rejects.toThrow('Service error');
    });
  });
});
