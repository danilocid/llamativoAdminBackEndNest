import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginAuthDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    user: 'testuser',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    email: 'test@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginAuthDto = {
      user: 'testuser',
      password: 'testpassword',
    };

    it('should return error when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        serverResponseCode: 401,
        serverResponseMessage: 'Usuario no encontrado.',
        data: null,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { user: loginDto.user },
      });
    });

    it('should return error when password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const result = await service.login(loginDto);

      expect(result).toEqual({
        serverResponseCode: 401,
        serverResponseMessage: 'Contraseña incorrecta.',
        data: null,
      });
    });

    it('should return JWT token when login is successful', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const result = await service.login(loginDto);

      expect(result.serverResponseCode).toBe(200);
      expect(result.serverResponseMessage).toBe('Login exitoso.');
      expect(result.data).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalled();
    });
  });
});
