---
description: 'Use when creating or modifying NestJS controllers, services, modules, DTOs, guards, or entities in the SIVIG backend. Covers module structure, TypeORM patterns, error handling, and API response format.'
applyTo: 'src/**/*.ts'
---

# Convenciones NestJS — SIVIG 2.0 Backend

## Nomenclatura

- Archivos en `kebab-case`: `inventory.controller.ts`, `inventory.service.ts`
- Clases en `PascalCase`: `InventoryController`, `InventoryService`
- Métodos y variables en `camelCase`
- Columnas de BD en `snake_case` en las entidades TypeORM (`@Column()`)

## Estructura de Módulo

Cada módulo sigue la estructura: `module / controller / service / dto/ / entities/`.

```
inventory/
  inventory.module.ts
  inventory.controller.ts
  inventory.service.ts
  dto/
  entities/
```

## Controladores

- Decora con `@ApiTags('nombre')` y `@ApiBearerAuth()` a nivel de clase
- Aplica `@UseGuards(JwtAuthGuard)` a cada endpoint individualmente (no a nivel de clase salvo que todos lo requieran)
- Usa nombres cortos para parámetros de DTO: `t` es el patrón aceptado en este proyecto

```typescript
@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() t: FilterInventoryDto) {
    return this.inventoryService.findAll(t);
  }
}
```

## Servicios

- Inyecta repositorios TypeORM con `@InjectRepository(Entity)`
- Usa `QueryBuilder` para consultas complejas con relaciones, no escribas SQL crudo
- Usa `snake_case` para los alias de columna en `QueryBuilder` si corresponden a columnas de la BD

```typescript
@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(filters: FilterInventoryDto) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .where('p.active = :active', { active: true });
    return qb.getMany();
  }
}
```

## DTOs

- Clases simples con propiedades opcionales cuando son filtros de query
- Usa `class-validator` para validaciones: `@IsString()`, `@IsOptional()`, `@IsNumber()`
- Extiende `PageDto` para endpoints paginados

## Formato de Respuesta

Todas las respuestas deben usar `ResponseDto`. No retornes objetos planos directamente desde el controlador cuando necesites comunicar estado.

```typescript
// ResponseDto estructura:
{
  serverResponseCode: number,   // 1 = éxito, otro = error
  serverResponseMessage: string,
  data: any
}
```

## Manejo de Errores

- El filtro global `HttpExceptionFilter` ya captura todas las excepciones HTTP
- Lanza `HttpException` o sus subclases (`NotFoundException`, `BadRequestException`) desde los servicios, no desde los controladores
- No uses `try/catch` para flujo normal; úsalo solo para operaciones de I/O externas

```typescript
if (!product) {
  throw new NotFoundException('Producto no encontrado');
}
```

## Autenticación

- `JwtAuthGuard` protege los endpoints; la estrategia JWT está en `jwt-strategy/`
- No expongas endpoints sensibles sin `@UseGuards(JwtAuthGuard)`

## Google Logging

- Usa `GoogleLoggingService` para registrar eventos importantes (no `console.log` en producción)
- El módulo `GoogleLoggingModule` debe importarse en el módulo raíz, no en módulos de feature
