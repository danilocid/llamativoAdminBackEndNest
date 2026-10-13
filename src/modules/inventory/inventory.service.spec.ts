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
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(resolvedValue),
    getMany: jest.fn().mockResolvedValue(
      resolvedValue == null ? [] : [resolvedValue],
    ),
    getManyAndCount: jest.fn().mockResolvedValue(
      resolvedValue == null ? [[], 0] : [[resolvedValue], 1],
    ),
  });

  // ─── Repository mocks ────────────────────────────────────────────────────────

  const mockInventoryRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockInventoryDetailsRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  const mockProductsRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    })) as jest.Mock,
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
    userRepository = module.get(getRepositoryToken(User));

    // Estado base conocido: jest.clearAllMocks() limpia las llamadas pero no
    // las implementaciones, así que se reasignan las que los casos siguientes
    // necesitan
    mockInventoryRepository.createQueryBuilder.mockReturnValue(
      buildQueryBuilderMock(null),
    );
    mockInventoryRepository.find.mockResolvedValue([]);
    mockInventoryDetailsRepository.createQueryBuilder.mockReturnValue(
      buildQueryBuilderMock(null),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getNextProductToCount ───────────────────────────────────────────────────

  describe('getNextProductToCount', () => {
    it('should return a random product with stock > 0', async () => {
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
        'No hay productos con stock pendiente de contar',
      );
    });

    it('should filter out products counted in the last week', async () => {
      const qbMock = buildQueryBuilderMock(mockProduct);
      mockProductsRepository.createQueryBuilder.mockReturnValue(qbMock);

      await service.getNextProductToCount();

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'product.last_cont < :oneWeekAgo',
        { oneWeekAgo: expect.any(Date) },
      );
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

  // ─── getAllInventory ─────────────────────────────────────────────────────────

  describe('getAllInventory', () => {
    it('pagina de a 10 y devuelve el total de registros', async () => {
      const qb = buildQueryBuilderMock(mockInventory);
      qb.getManyAndCount.mockResolvedValue([[mockInventory], 42]);
      mockInventoryRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAllInventory({ page: 1 } as any);

      expect(mockInventoryRepository.createQueryBuilder).toHaveBeenCalledWith(
        'inventory',
      );
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual([mockInventory]);
      expect(result.count).toBe(42);
    });

    it('saltea los primeros 10 registros a partir de la pagina 2', async () => {
      const qb = buildQueryBuilderMock(null);
      mockInventoryRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getAllInventory({ page: 2 } as any);

      expect(qb.skip).toHaveBeenCalledWith(10);
    });

    it('ordena por id descendente y trae usuario y tipo de movimiento', async () => {
      const qb = buildQueryBuilderMock(null);
      mockInventoryRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getAllInventory({ page: 1 } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('inventory.id', 'DESC');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'inventory.usuario',
        'User',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'inventory.tipo_movimiento',
        'ProductMovementType',
      );
    });

    it('devuelve una lista vacia cuando no hay ajustes', async () => {
      const qb = buildQueryBuilderMock(null);
      mockInventoryRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAllInventory({ page: 1 } as any);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  // ─── getInventoryById ────────────────────────────────────────────────────────

  describe('getInventoryById', () => {
    it('devuelve 404 cuando el ajuste no existe', async () => {
      mockInventoryRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(null),
      );

      const result = await service.getInventoryById({ id: 99 });

      expect(result.serverResponseCode).toBe(404);
      expect(result.serverResponseMessage).toBe('Inventory not found');
      expect(result.data).toBeNull();
      expect(
        mockInventoryDetailsRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('devuelve el ajuste junto con el detalle de articulos', async () => {
      const qb = buildQueryBuilderMock(mockInventory);
      mockInventoryRepository.createQueryBuilder.mockReturnValue(qb);
      const qbDetails = buildQueryBuilderMock({ id: 7 });
      mockInventoryDetailsRepository.createQueryBuilder.mockReturnValue(
        qbDetails,
      );

      const result = await service.getInventoryById({ id: 1 });

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual(mockInventory);
      expect(result.inventoryDetails).toEqual([{ id: 7 }]);
      expect(qb.where).toHaveBeenCalledWith('inventory.id = :id', { id: 1 });
      expect(qbDetails.where).toHaveBeenCalledWith(
        'ajuste_de_inventario_id = :id',
        { id: 1 },
      );
    });
  });

  // ─── saveInventory ───────────────────────────────────────────────────────────

  describe('saveInventory', () => {
    const dtoCon = (articulos: any[]) =>
      ({
        costo_neto: 100,
        costo_imp: 19,
        entradas: 5,
        salidas: 2,
        obs: 'Recepcion de mercaderia',
        tipo_movimiento: 1,
        articulos,
      }) as any;

    const prepararGuardado = (product: Products) => {
      mockProductMovementTypeRepository.findOne.mockResolvedValue(
        mockMovementType,
      );
      mockProductsRepository.findOne.mockResolvedValue(product);
      // TypeORM rellena el id generado sobre la misma instancia que recibe, por
      // eso el servicio puede leer inventory.id sin reasignar el resultado
      mockInventoryRepository.save.mockImplementation(async (i: any) => {
        i.id = 5;
        return i;
      });
      mockInventoryDetailsRepository.save.mockImplementation(async (d: any) => d);
      mockProductMovementDetailRepository.save.mockImplementation(
        async (d: any) => d,
      );
      mockProductsRepository.save.mockImplementation(async (p: any) => p);
    };

    it('crea el ajuste, su detalle y actualiza el stock del producto', async () => {
      const product = { ...mockProduct, stock: 10, activo: true };
      prepararGuardado(product);

      const result = await service.saveInventory(
        dtoCon([
          { id: 1, costo_neto: 100, costo_imp: 19, entradas: 5, salidas: 2 },
        ]),
      );

      expect(result.serverResponseCode).toBe(201);
      expect(result.serverResponseMessage).toBe('Inventory created');
      expect(mockInventoryRepository.save).toHaveBeenCalledTimes(1);
      expect(mockInventoryDetailsRepository.save).toHaveBeenCalledTimes(1);
      // stock 10 + 5 entradas - 2 salidas = 13
      expect(product.stock).toBe(13);
      expect(mockProductsRepository.save).toHaveBeenCalledTimes(1);
      expect(mockProductMovementDetailRepository.save).toHaveBeenCalledTimes(1);
    });

    it('deja el stock en 0 cuando las salidas lo dejarian negativo', async () => {
      const product = { ...mockProduct, stock: 2, activo: true };
      prepararGuardado(product);

      await service.saveInventory(
        dtoCon([
          { id: 1, costo_neto: 100, costo_imp: 19, entradas: 0, salidas: 10 },
        ]),
      );

      expect(product.stock).toBe(0);
    });

    it('reactiva un producto inactivo al registrar el movimiento', async () => {
      const product = { ...mockProduct, stock: 5, activo: false };
      prepararGuardado(product);

      await service.saveInventory(
        dtoCon([
          { id: 1, costo_neto: 100, costo_imp: 19, entradas: 1, salidas: 0 },
        ]),
      );

      expect(product.activo).toBe(true);
    });

    it('genera un detalle por cada articulo recibido', async () => {
      const product = { ...mockProduct, stock: 5, activo: true };
      prepararGuardado(product);

      await service.saveInventory(
        dtoCon([
          { id: 1, costo_neto: 100, costo_imp: 19, entradas: 1, salidas: 0 },
          { id: 2, costo_neto: 50, costo_imp: 9, entradas: 2, salidas: 1 },
        ]),
      );

      expect(mockInventoryDetailsRepository.save).toHaveBeenCalledTimes(2);
      expect(mockProductMovementDetailRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getInventoryReportByMonth ───────────────────────────────────────────────

  describe('getInventoryReportByMonth', () => {
    it('suma los totales de los ajustes del mes', async () => {
      mockInventoryRepository.find.mockResolvedValue([
        { costo_neto: 100, costo_imp: 19, entradas: 5, salidas: 2 },
        { costo_neto: 200, costo_imp: 38, entradas: 1, salidas: 4 },
      ]);

      const result = await service.getInventoryReportByMonth(3, 2026);

      expect(result.serverResponseCode).toBe(200);
      expect(result.data.totals).toEqual({
        count: 2,
        entradas: 6,
        salidas: 6,
        costoNeto: 300,
        costoImp: 57,
        costoTotal: 357,
      });
    });

    it('consulta ordenado por fecha ascendente con sus relaciones', async () => {
      mockInventoryRepository.find.mockResolvedValue([]);

      await service.getInventoryReportByMonth(3, 2026);

      expect(mockInventoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'ASC' },
          relations: ['tipo_movimiento', 'usuario'],
        }),
      );
    });

    it('devuelve ceros cuando no hubo ajustes en el mes', async () => {
      mockInventoryRepository.find.mockResolvedValue([]);

      const result = await service.getInventoryReportByMonth(1, 2026);

      expect(result.data.totals.count).toBe(0);
      expect(result.data.totals.costoNeto).toBe(0);
      expect(result.data.totals.costoTotal).toBe(0);
    });
  });

  // ─── lookupBySku ─────────────────────────────────────────────────────────────

  describe('lookupBySku', () => {
    it('devuelve 400 cuando el sku viene vacio', async () => {
      const result = await service.lookupBySku('   ');

      expect(result.serverResponseCode).toBe(400);
      expect(result.serverResponseMessage).toBe('SKU requerido');
      expect(result.data).toBeNull();
      expect(mockProductsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando el sku no se envia', async () => {
      const result = await service.lookupBySku(undefined as any);

      expect(result.serverResponseCode).toBe(400);
    });

    it('devuelve 404 cuando no hay producto activo con ese sku', async () => {
      mockProductsRepository.createQueryBuilder.mockReturnValue(
        buildQueryBuilderMock(null),
      );

      const result = await service.lookupBySku('NOEXISTE');

      expect(result.serverResponseCode).toBe(404);
      expect(result.serverResponseMessage).toBe('Producto no encontrado');
      expect(result.data).toBeNull();
    });

    it('busca por codigo interno o de barras, solo activos y sin espacios', async () => {
      const qb = buildQueryBuilderMock(mockProduct);
      mockProductsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.lookupBySku(' 123456 ');

      expect(qb.where).toHaveBeenCalledWith(
        'product.cod_interno = :sku OR product.cod_barras = :sku',
        { sku: '123456' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('product.activo = :activo', {
        activo: true,
      });
      expect(result.serverResponseCode).toBe(200);
      expect(result.serverResponseMessage).toBe('Producto encontrado');
      expect(result.data).toEqual(mockProduct);
    });
  });

  // ─── submitBulkCount ─────────────────────────────────────────────────────────

  describe('submitBulkCount', () => {
    /** Resuelve los productos por id sin depender del orden de las llamadas */
    const resolverPorId = (productos: Record<number, Products>) => {
      mockProductsRepository.findOne.mockImplementation(async (criterio: any) =>
        productos[criterio?.where?.id] ?? null,
      );
    };

    const prepararConteo = () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProductMovementTypeRepository.findOne.mockResolvedValue(
        mockMovementType,
      );
      mockInventoryRepository.save.mockImplementation(async (i: any) => {
        i.id = 9;
        return i;
      });
      mockInventoryDetailsRepository.save.mockImplementation(async (d: any) => d);
      mockProductMovementDetailRepository.save.mockImplementation(
        async (d: any) => d,
      );
      mockProductsRepository.save.mockImplementation(async (p: any) => p);
    };

    it('crea un ajuste con los totales cuando hay diferencias', async () => {
      prepararConteo();
      const p1 = { ...mockProduct, id: 1, stock: 10 };
      const p2 = { ...mockProduct, id: 2, stock: 5, cod_interno: 'COD002' };
      resolverPorId({ 1: p1, 2: p2 });

      const result = await service.submitBulkCount(
        {
          items: [
            { product_id: 1, stock_counted: 12 },
            { product_id: 2, stock_counted: 5 },
          ],
        } as any,
        1,
      );

      expect(result.serverResponseCode).toBe(201);
      expect(result.data.adjustmentCreated).toBe(true);
      expect(result.data.inventoryId).toBe(9);
      expect(result.data.itemsProcessed).toBe(2);

      const guardado = mockInventoryRepository.save.mock.calls[0][0];
      expect(guardado.entradas).toBe(2);
      expect(guardado.salidas).toBe(0);
      expect(guardado.usuario).toEqual(mockUser);
      expect(p1.stock).toBe(12);
      expect(p1.last_cont).toBeInstanceOf(Date);
      expect(p2.last_cont).toBeInstanceOf(Date);
    });

    it('suma salidas y costos cuando el conteo dio de menos', async () => {
      prepararConteo();
      resolverPorId({ 1: { ...mockProduct, id: 1, stock: 10 } });

      const result = await service.submitBulkCount(
        { items: [{ product_id: 1, stock_counted: 6 }] } as any,
        1,
      );

      const guardado = mockInventoryRepository.save.mock.calls[0][0];
      expect(guardado.entradas).toBe(0);
      expect(guardado.salidas).toBe(4);
      expect(guardado.costoNeto ?? guardado.costo_neto).toBe(4000);
      expect(result.data.adjustmentCreated).toBe(true);
    });

    it('no crea ajuste cuando todos los conteos coinciden', async () => {
      prepararConteo();
      const product = { ...mockProduct, id: 1, stock: 10 };
      resolverPorId({ 1: product });

      const result = await service.submitBulkCount(
        { items: [{ product_id: 1, stock_counted: 10 }] } as any,
        1,
      );

      expect(result.data.adjustmentCreated).toBe(false);
      expect(result.data.inventoryId).toBeNull();
      expect(result.data.itemsProcessed).toBe(1);
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
      expect(mockInventoryDetailsRepository.save).not.toHaveBeenCalled();
      // igual se refresca la fecha de ultimo conteo
      expect(product.last_cont).toBeInstanceOf(Date);
    });

    it('omite los productos que no existen', async () => {
      prepararConteo();
      resolverPorId({});

      const result = await service.submitBulkCount(
        { items: [{ product_id: 99, stock_counted: 5 }] } as any,
        1,
      );

      expect(result.data.adjustmentCreated).toBe(false);
      expect(result.data.itemsProcessed).toBe(0);
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    it('clampa el stock a 0 cuando el conteo da negativo', async () => {
      prepararConteo();
      const product = { ...mockProduct, id: 1, stock: 10 };
      resolverPorId({ 1: product });

      await service.submitBulkCount(
        { items: [{ product_id: 1, stock_counted: -3 }] } as any,
        1,
      );

      expect(product.stock).toBe(0);
    });
  });
});
