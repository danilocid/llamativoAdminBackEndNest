import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryDetails } from './entities/inventory-details.entity';
import { Products } from '../products/entities/products.entity';
import { ProductMovementDetail } from '../products-movements/entities/product_movement_detail.entity';
import { ProductMovementType } from '../products-movements/entities/product_movement_type.entity';
import { User } from '../auth/entities/user.entity';
import { SubmitCountDto } from './dto/submit-count.dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<Repository<Inventory>>;
  let inventoryDetailsRepository: jest.Mocked<Repository<InventoryDetails>>;
  let productsRepository: jest.Mocked<Repository<Products>>;
  let productMovementDetailRepository: jest.Mocked<
    Repository<ProductMovementDetail>
  >;
  let productMovementTypeRepository: jest.Mocked<
    Repository<ProductMovementType>
  >;
  let userRepository: jest.Mocked<Repository<User>>;

  // ─── Mocks ───────────────────────────────────────────────────────────────────

  const mockProduct: Products = {
    id: 1,
    cod_interno: 'COD001',
    cod_barras: '123456',
    descripcion: 'Producto Test',
    costo_neto: 1000,
    costo_imp: 190,
    venta_neto: 1500,
    venta_imp: 285,
    stock: 10,
    stock_critico: 2,
    activo: true,
    deprecado: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    last_cont: new Date('2024-01-01'),
    publicado: false,
    enlace_ml: null,
    id_ml: null,
    id_variante_ml: null,
    publicado_ps: false,
    id_ps: null,
    enlace_ps: null,
  };

  const mockMovementType: ProductMovementType = {
    id: 4,
    tipo_movimiento: 'Ajuste de inventario',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: User = {
    id: 1,
    name: 'Test User',
    user: 'testuser',
    email: 'test@test.com',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventory: Inventory = {
    id: 1,
    costo_neto: 1000,
    costo_imp: 190,
    entradas: 0,
    salidas: 3,
    observaciones: 'Conteo aleatorio - Producto Test',
    tipo_movimiento: mockMovementType,
    usuario: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── Query builder helper ────────────────────────────────────────────────────

  const buildQueryBuilderMock = (resolvedValue: any) => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(resolvedValue),
  });

  // ─── Repository mocks ────────────────────────────────────────────────────────

  const mockInventoryRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockInventoryDetailsRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  const mockProductsRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockProductMovementDetailRepository = {
    save: jest.fn(),
  };

  const mockProductMovementTypeRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  // ─── Setup ───────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: mockInventoryRepository,
        },
        {
          provide: getRepositoryToken(InventoryDetails),
          useValue: mockInventoryDetailsRepository,
        },
        {
          provide: getRepositoryToken(Products),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(ProductMovementDetail),
          useValue: mockProductMovementDetailRepository,
        },
        {
          provide: getRepositoryToken(ProductMovementType),
          useValue: mockProductMovementTypeRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(getRepositoryToken(Inventory));
    inventoryDetailsRepository = module.get(
      getRepositoryToken(InventoryDetails),
    );
    productsRepository = module.get(getRepositoryToken(Products));
    productMovementDetailRepository = module.get(
      getRepositoryToken(ProductMovementDetail),
    );
    productMovementTypeRepository = module.get(
      getRepositoryToken(ProductMovementType),
    );
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getNextProductToCount ───────────────────────────────────────────────────

  describe('getNextProductToCount', () => {
    it('should return the product with the oldest last_cont that has stock > 0', async () => {
      mockProductsRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockProduct),
      );

      const result = await service.getNextProductToCount();

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual(mockProduct);
      expect(mockProductsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'product',
      );
    });

    it('should return 404 when no products with stock > 0 exist', async () => {
      mockProductsRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(null),
      );

      const result = await service.getNextProductToCount();

      expect(result.serverResponseCode).toBe(404);
      expect(result.data).toBeNull();
      expect(result.serverResponseMessage).toBe(
        'No hay productos con stock disponible para contar',
      );
    });

    it('should order results by last_cont ASC', async () => {
      const qbMock = buildQueryBuilderMock(mockProduct);
      mockProductsRepository.createQueryBuilder.mockReturnValue(qbMock);

      await service.getNextProductToCount();

      expect(qbMock.orderBy).toHaveBeenCalledWith('product.last_cont', 'ASC');
    });

    it('should filter products with stock > 0 regardless of activo or deprecado', async () => {
      const qbMock = buildQueryBuilderMock(mockProduct);
      mockProductsRepository.createQueryBuilder.mockReturnValue(qbMock);

      await service.getNextProductToCount();

      expect(qbMock.where).toHaveBeenCalledWith('product.stock > 0');
    });
  });

  // ─── submitRandomCount ───────────────────────────────────────────────────────

  describe('submitRandomCount', () => {
    it('should return 404 when the product does not exist', async () => {
      mockProductsRepository.findOne.mockResolvedValue(null);

      const dto: SubmitCountDto = { product_id: 99, stock_counted: 5 };
      const result = await service.submitRandomCount(dto, 1);

      expect(result.serverResponseCode).toBe(404);
      expect(result.serverResponseMessage).toBe('Producto no encontrado');
    });

    it('should only update last_cont when stock matches', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 10 };
      const result = await service.submitRandomCount(dto, 1);

      expect(result.serverResponseCode).toBe(200);
      expect(result.adjustmentCreated).toBe(false);
      expect(result.data).toBeNull();
      expect(mockProductsRepository.save).toHaveBeenCalledTimes(1);
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    it('should update last_cont to the current date when stock matches', async () => {
      const product = { ...mockProduct, stock: 5 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductsRepository.save.mockImplementation((p) => Promise.resolve(p));

      const before = new Date();
      const dto: SubmitCountDto = { product_id: 1, stock_counted: 5 };
      await service.submitRandomCount(dto, 1);
      const after = new Date();

      const savedProduct = mockProductsRepository.save.mock.calls[0][0];
      expect(savedProduct.last_cont.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(savedProduct.last_cont.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('should create an adjustment when counted stock is less than actual', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue(mockInventory);
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 7 };
      const result = await service.submitRandomCount(dto, 1);

      expect(result.serverResponseCode).toBe(200);
      expect(result.adjustmentCreated).toBe(true);
      expect(result.serverResponseMessage).toBe(
        'Conteo registrado y ajuste de inventario creado',
      );

      // Inventory saved with salidas=3, entradas=0
      const savedInventory = mockInventoryRepository.save.mock.calls[0][0];
      expect(savedInventory.entradas).toBe(0);
      expect(savedInventory.salidas).toBe(3);
    });

    it('should create an adjustment when counted stock is greater than actual', async () => {
      const product = { ...mockProduct, stock: 5 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue({
        ...mockInventory,
        id: 2,
      });
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 8 };
      const result = await service.submitRandomCount(dto, 1);

      expect(result.adjustmentCreated).toBe(true);

      // Inventory saved with entradas=3, salidas=0
      const savedInventory = mockInventoryRepository.save.mock.calls[0][0];
      expect(savedInventory.entradas).toBe(3);
      expect(savedInventory.salidas).toBe(0);
    });

    it('should set product.stock to the counted value after adjustment', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue(mockInventory);
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 4 };
      await service.submitRandomCount(dto, 1);

      const savedProduct = mockProductsRepository.save.mock.calls[0][0];
      expect(savedProduct.stock).toBe(4);
    });

    it('should clamp stock to 0 when counted value is negative', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue(mockInventory);
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: -5 };
      await service.submitRandomCount(dto, 1);

      const savedProduct = mockProductsRepository.save.mock.calls[0][0];
      expect(savedProduct.stock).toBe(0);
    });

    it('should return 404 when no adjustment movement type is found in DB', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(null),
      );

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 3 };
      const result = await service.submitRandomCount(dto, 1);

      expect(result.serverResponseCode).toBe(404);
      expect(result.serverResponseMessage).toBe(
        'No se encontró tipo de movimiento de ajuste en la base de datos',
      );
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    it('should associate the adjustment with the correct user from userId', async () => {
      const product = { ...mockProduct, stock: 10 };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue(mockInventory);
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 5 };
      await service.submitRandomCount(dto, 1);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      const savedInventory = mockInventoryRepository.save.mock.calls[0][0];
      expect(savedInventory.usuario).toEqual(mockUser);
    });

    it('should set the correct observation text in the adjustment', async () => {
      const product = { ...mockProduct, stock: 10, descripcion: 'Tornillo M6' };
      mockProductsRepository.findOne.mockResolvedValue(product);
      mockProductMovementTypeRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(mockMovementType),
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockInventoryRepository.save.mockResolvedValue(mockInventory);
      mockInventoryDetailsRepository.save.mockResolvedValue({});
      mockProductMovementDetailRepository.save.mockResolvedValue({});
      mockProductsRepository.save.mockResolvedValue(product);

      const dto: SubmitCountDto = { product_id: 1, stock_counted: 2 };
      await service.submitRandomCount(dto, 1);

      const savedInventory = mockInventoryRepository.save.mock.calls[0][0];
      expect(savedInventory.observaciones).toBe(
        'Conteo aleatorio - Tornillo M6',
      );
    });
  });
});
