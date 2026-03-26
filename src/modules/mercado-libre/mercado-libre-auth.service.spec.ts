import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { MercadoLibreAuthService } from './mercado-libre-auth.service';
import { MercadoLibreToken } from './entities/mercado-libre.entity';
import { GoogleLoggingService } from '../../common/services/google-logging.service';
import { GetCodeDto } from './dto/get-code.dto';

describe('MercadoLibreAuthService', () => {
  let service: MercadoLibreAuthService;
  let httpService: HttpService;
  let tokenRepository: Repository<MercadoLibreToken>;
  let googleLoggingService: GoogleLoggingService;

  const mockToken: MercadoLibreToken = {
    id: '1',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockTokenRepository = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockGoogleLoggingService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    process.env.ML_CLIENT_ID = 'test-client-id';
    process.env.ML_CLIENT_SECRET = 'test-client-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoLibreAuthService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRepositoryToken(MercadoLibreToken),
          useValue: mockTokenRepository,
        },
        {
          provide: GoogleLoggingService,
          useValue: mockGoogleLoggingService,
        },
      ],
    }).compile();

    service = module.get<MercadoLibreAuthService>(MercadoLibreAuthService);
    httpService = module.get<HttpService>(HttpService);
    tokenRepository = module.get<Repository<MercadoLibreToken>>(
      getRepositoryToken(MercadoLibreToken),
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

  describe('getTokenFromDb', () => {
    it('should return the most recent token', async () => {
      mockTokenRepository.find.mockResolvedValue([mockToken]);

      const result = await service.getTokenFromDb();

      expect(tokenRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 1,
      });
      expect(result).toEqual(mockToken);
    });

    it('should throw error when no token is found', async () => {
      mockTokenRepository.find.mockResolvedValue([]);

      await expect(service.getTokenFromDb()).rejects.toThrow(
        'No se encontró el token en la base de datos',
      );

      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'No se encontró el token en la base de datos',
        null,
        'ERROR',
        'getTokenFromDb',
        'mercado-libre-auth',
      );
    });
  });

  describe('saveTokenToDb', () => {
    it('should save a new token to database', async () => {
      const tokenToSave = { ...mockToken };
      const createdToken = { ...mockToken };
      delete createdToken.id;

      mockTokenRepository.create.mockReturnValue(createdToken);
      mockTokenRepository.save.mockResolvedValue(createdToken);

      await service.saveTokenToDb(tokenToSave);

      expect(tokenRepository.create).toHaveBeenCalled();
      expect(tokenRepository.save).toHaveBeenCalledWith(createdToken);
    });
  });

  describe('getAuthToken', () => {
    it('should return cached token if still valid (less than 21500 seconds old)', async () => {
      const freshToken = {
        ...mockToken,
        createdAt: new Date(Date.now() - 10000 * 1000), // 10000 segundos atrás
      };

      mockTokenRepository.find.mockResolvedValue([freshToken]);

      const result = await service.getAuthToken();

      expect(result).toBe(freshToken.accessToken);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should refresh token if older than 21500 seconds', async () => {
      const oldToken = {
        ...mockToken,
        createdAt: new Date(Date.now() - 22000 * 1000), // 22000 segundos atrás
      };

      const refreshResponse = {
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      };

      mockTokenRepository.find.mockResolvedValue([oldToken]);
      mockHttpService.post.mockReturnValue(of(refreshResponse));
      mockTokenRepository.create.mockReturnValue({});
      mockTokenRepository.save.mockResolvedValue({});

      const result = await service.getAuthToken();

      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.mercadolibre.com/oauth/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: oldToken.refreshToken,
        }),
        expect.any(Object),
      );
      expect(result).toBe('new-access-token');
      expect(tokenRepository.save).toHaveBeenCalled();
    });

    it('should throw error when no token exists in database', async () => {
      mockTokenRepository.find.mockResolvedValue([]);

      await expect(service.getAuthToken()).rejects.toThrow(
        'No se encontró el token en la base de datos',
      );

      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'No se encontró el token en la base de datos',
        null,
        'ERROR',
        expect.any(String),
        'mercado-libre-auth',
      );
    });
  });

  describe('getAuthCode', () => {
    it('should return code when code is present in query', () => {
      const query: GetCodeDto = { code: 'TG-123456789' };

      const result = service.getAuthCode(query);

      expect(result).toEqual({ code: 'TG-123456789' });
      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'Query recibida',
        query,
        'INFO',
        'getAuthCode',
        'mercado-libre-auth',
      );
      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'Código de autorización',
        { code: 'TG-123456789' },
        'INFO',
        'getAuthCode',
        'mercado-libre-auth',
      );
    });

    it('should return error when error is present in query', () => {
      const query: GetCodeDto = { error: 'access_denied' };

      const result = service.getAuthCode(query);

      expect(result).toEqual({ error: 'access_denied' });
      expect(googleLoggingService.log).toHaveBeenCalledWith(
        'Query recibida',
        query,
        'INFO',
        'getAuthCode',
        'mercado-libre-auth',
      );
    });
  });
});
