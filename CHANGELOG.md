# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

## [1.7.0] - 2026-04-21

### Agregado

- **`WoocommerceModule`: sincronización de productos con la base de datos**
  - `ListWoocommerceProductsDto`: `status` ahora tiene default `'any'` (devuelve todos los estados) y valida valores permitidos: `any`, `publish`, `draft`, `pending`, `private`
  - `WoocommerceService`: inyecta repositorio `Products` para relacionar cada producto de WooCommerce con la BD por `sku` → `cod_interno` o `cod_barras` (con `TRIM`)
  - Objeto `sync` en cada producto de la respuesta con: `found_in_db`, `db_id`, `price_match`, `woo_price`, `db_price`, `stock_match`, `woo_stock`, `db_stock`
  - Actualización automática en WooCommerce de precio (`regular_price`) y stock (`stock_quantity`) cuando no coinciden con la BD
  - Requests de escritura enviados como `POST` con header `X-HTTP-Method-Override: PUT` para compatibilidad con servidores Apache que bloquean el método PUT
  - Logs con `Logger` de NestJS en cada paso: consulta, SKUs buscados, productos encontrados, desincronizaciones, actualizaciones y resumen final
- **`WoocommerceModule`**: importa `TypeOrmModule.forFeature([Products])`

## [1.6.0] - 2026-04-13

### Agregado

- **Módulo de conteo aleatorio de inventario**
  - Endpoint `GET /inventories/random-count`: obtiene el próximo producto a contar (el de menor `last_cont`)
  - Endpoint `POST /inventories/random-count`: registra el conteo físico, crea ajuste de inventario si hay diferencia
  - Campo `last_cont: Date` actualizado en la entidad `Products` tras cada conteo
  - Pantalla frontend "Conteo Aleatorio" bajo el módulo de Inventario
  - Enlace en sidebar agregado bajo Inventario → Conteo Aleatorio
- **Reporte mensual: sección de ajustes de inventario**
  - Endpoint `GET /inventories/report/:month/:year`: totales de ajustes del mes
  - Tarjeta en el reporte mensual con: cantidad de ajustes, ingresos (u.), egresos (u.), costo neto, IVA y costo total
  - Sección incluida en el PDF del reporte mensual

### Corregido

- **Orden de rutas en `InventoryController`**: `GET random-count` y `GET report/:month/:year` movidos antes de `GET :id` para evitar que la ruta parametrizada capture rutas estáticas (error 404)
- **Interfaz `Product` (frontend)**: propiedad `last_cont: Date` faltante agregada a `product.model.ts`

### Actualizado

- **Dependencias (major bumps):**
  - `@types/node`: 22.19.15 → 25.6.0
  - `class-validator`: 0.14.4 → 0.15.1
  - `bcryptjs`: 2.4.3 → 3.0.3
  - `typescript`: 5.9.3 → 6.0.2
- **Dependencias (minor/patch):**
  - NestJS (`common`, `core`, `platform-express`, `testing`): 11.1.17 → 11.1.19
  - `@nestjs/cli`: 11.0.16 → 11.0.19
  - `@nestjs/config`: 4.0.3 → 4.0.4
  - `@nestjs/schematics`: 11.0.9 → 11.0.10
  - `@nestjs/swagger`: 11.2.6 → 11.2.7
  - `@nestjs/typeorm`: 11.0.0 → 11.0.1
  - `axios`: 1.13.6 → 1.15.0
  - `mysql2`: 3.20.0 → 3.22.0
  - `eslint`: 10.1.0 → 10.2.0
  - `prettier`: 3.8.1 → 3.8.2
  - `ts-jest`: 29.4.6 → 29.4.9
  - `ts-loader`: 9.5.4 → 9.5.7
  - `@typescript-eslint/*`: 8.57.2 → 8.58.2

### Técnico

- `tsconfig.build.json`: agregado `"rootDir": "./src"` (requerido por TypeScript 6)
- `tsconfig.json`: `ignoreDeprecations` actualizado a `"6.0"` (silencia advertencia de `baseUrl`)
- Bloques `catch` en `mercado-libre.service.ts` y `product-sync.service.ts` tipados como `(error: any)` (TypeScript 6 estricto con tipo `unknown`)

## [1.5.1] - 2026-04-07

### Agregado

- **Tests unitarios para `PurchasesService`** (24 tests, cobertura completa)
  - `getTypes`: retorno de tipos ordenados
  - `getAllPurchases`: filtro por mes y año
  - `editPurchase`: compra no encontrada, actualización exitosa, error de BD
  - `getReport`: totales mes actual/anterior, rollback a diciembre
  - `createPurchase`: validaciones de proveedor, tipo documento, tipo compra, duplicado y creación exitosa
  - `createPurchaseFromApi`: error axios, API failure, lista vacía, tipo doc no encontrado, ya existe, creación exitosa
  - `syncCurrentMonthPurchases`: todos los flujos de notificaciones

### Corregido

- `PurchasesService`: 3 ocurrencias de `error.message` en bloques `catch` tipados como `unknown` → `(error as any).message`
- `tsconfig.json`: `ignoreDeprecations` actualizado a `"5.0"` (TypeScript 5.9.3)

## [1.5.0] - 2026-03-25

### Agregado

- **Endpoint de sincronización automática de compras del SII**
  - Nuevo endpoint `POST /purchases/sync-current-month` sin autenticación
  - Obtiene automáticamente el mes y año actual (no requiere parámetros)
  - Crea una notificación por cada compra sincronizada con detalles (N° factura, proveedor, monto)
  - Crea notificación informativa cuando no hay compras nuevas
  - Crea notificación de error si falla la sincronización
  - Ideal para ejecución automática mediante cron jobs o webhooks
- **Sistema de notificaciones automáticas para compras**
  - Integración del repositorio de notificaciones en `PurchasesModule`
  - Notificaciones con formato amigable:
    - Nueva compra sincronizada
    - Sin compras nuevas
    - Error en sincronización
  - Enlaces directos a la sección de compras en cada notificación

### Modificado

- Método `createPurchaseFromApi()` ahora retorna datos estructurados:
  - `success`: indicador de éxito
  - `count`: número de compras creadas
  - `totalRegistros`: total de registros en la API
  - `purchases`: array de compras creadas
- Tracking de compras creadas para generar notificaciones individuales
- Mejor manejo de errores con notificaciones de respaldo

### Técnico

- Inyección de `notificationRepository` en `PurchasesService`
- Agregada entidad `Notification` a `PurchasesModule`
- Total de tests continúa en 63/63 pasando
- Build y linter sin errores

## [1.4.0] - 2026-03-25

### Agregado

- Suite completa de pruebas unitarias para módulo de Mercado Libre (36 tests)
  - `mercado-libre.controller.spec.ts` (8 tests): Tests para endpoints y manejo de códigos de autorización
  - `mercado-libre-auth.service.spec.ts` (10 tests): Tests para autenticación, refresh de tokens y persistencia
  - `mercado-libre.service.spec.ts` (9 tests): Tests para sincronización de productos, manejo de variaciones y notificaciones
  - `product-sync.service.spec.ts` (9 tests): Tests para validación y sincronización de productos con/sin variaciones
- Configuración `cross-env` para manejo multiplataforma de variables de entorno
- Migración a ESLint 10 con flat config (`eslint.config.js`)
- Archivo `.env.example` con todas las variables de entorno necesarias
- Nueva integración con BaseAPI para obtención de compras del SII
  - Endpoint: `https://api.baseapi.cl/api/v1/sii/rcv/{year}-{month}/compra`
  - Autenticación mediante API Key en header `x-api-key`
  - Formato de respuesta actualizado con nuevas interfaces TypeScript

### Actualizado

- **API de Compras del SII:**
  - Migrado de SimpleAPI a BaseAPI para mejor confiabilidad
  - Método HTTP: POST con body `{ rut, password }`
  - Mejoras en parseo de fechas (DD/MM/YYYY → Date)
  - Conversión de strings numéricos a tipos correctos
  - Mejor manejo de errores y logging detallado
  - Variables de entorno: `BASE_API_KEY`, `SII_RUT`, `SII_PASSWORD` (reemplazan las anteriores de SimpleAPI)

- **Interfaces de datos:**
  - Nueva interfaz `BaseApiPurchaseResponse` con estructura completa de respuesta
  - Nueva interfaz `PurchaseApiData` con campos de la API de BaseAPI
  - Nueva interfaz `ResumenPorTipo` para totales por tipo de documento
  - Interfaz anterior `PurchaseApiResponse` marcada como deprecated

- **Dependencias principales:**
  - NestJS: 11.1.12 → 11.1.17
  - @nestjs/config: 4.0.2 → 4.0.3
  - @nestjs/swagger: 11.2.5 → 11.2.6
  - axios: 1.13.2 → 1.13.6
  - mysql2: 3.16.1 → 3.20.0
  - class-validator: 0.14.3 → 0.14.4
- **Herramientas de desarrollo:**
  - ESLint: 9.39.2 → 10.1.0 (migración a flat config)
  - Jest: 29.7.0 → 30.3.0
  - @types/jest: 29.5.14 → 30.0.0
  - @types/node: 22.19.7 → 22.19.15
  - @types/supertest: 6.0.3 → 7.2.0
  - @typescript-eslint/\*: 8.53.1 → 8.57.2

- **Engine de Node.js:** Actualizado de >=18.0.0 a >=20.0.0

### Mejorado

- Silenciadas advertencias de deprecación del módulo `punycode` mediante `NODE_OPTIONS`
- Scripts de test configurados con `cross-env` para compatibilidad Windows/Linux/macOS
- Reglas de ESLint ajustadas para permitir variables no usadas con prefijo `_`
- Cambio de `console.log` a `console.warn` en `GoogleLoggingService` para cumplir reglas de linting
- Eliminado import no usado de `Logger` en `ReportsService`

### Técnico

- Total de tests en el proyecto: 63/63 pasando en 6 suites
- Cobertura de código mejorada para módulo de Mercado Libre
- Build exitoso sin errores de TypeScript
- Linter ejecuta sin errores ni warnings
- Configuración ESLint migrada a formato flat (compatibilidad v10+)

## [1.3.3] - 2026-03-12

### Mejorado

- Sincronizacion de productos sin variante en Mercado Libre ahora incluye busqueda por SKU en `validateAndSyncProduct`
  - Cuando un producto no existe en la base de datos y no es variante, se busca el campo `SELLER_SKU` en `productDetails.data.attributes`
  - Si se encuentra coincidencia por `cod_barras`, se actualiza `id_ml`, `enlace_ml` y `publicado` automaticamente
  - Logs diferenciados para el flujo variante (`Buscando producto por SKU (variant)`) y no variante (`Buscando producto por SKU (no variant)`)
  - Logs del servicio sin acentos ni caracteres especiales en todos los mensajes

### Agregado

- Suite de pruebas unitarias para `ProductSyncService` (12 tests)
  - Producto encontrado en BD: retorna directamente por `id_variante_ml` o `id_ml`
  - Caso variante sin producto en BD: busca por SKU en `variation.attributes`, actualiza y retorna
  - Caso variante: retorna `null` si SKU no tiene coincidencia, si no hay `attributes`, o si no hay `SELLER_SKU`
  - Caso no variante sin producto en BD: busca por SKU en `productDetails.data.attributes`, actualiza `id_ml` y `enlace_ml` sin tocar `id_variante_ml`
  - Caso no variante: retorna `null` si SKU no tiene coincidencia, si no hay `attributes`, o si no hay `SELLER_SKU`

### Tecnico

- Total de tests en el proyecto: 39 (23 ProductsService + 4 AuthService + 12 ProductSyncService)
- Todos los tests pasan: 39/39 en 3 suites

## [1.3.2] - 2026-03-03

### Agregado

- Suite de pruebas unitarias para `AuthService` (4 tests)
  - Validación de inicio de sesión con usuario inexistente
  - Validación de contraseña incorrecta
  - Generación exitosa de token JWT
  - Verificación de existencia del servicio

### Corregido

- Error "Empty criteria(s) are not allowed for the delete method" al eliminar todas las notificaciones
  - Reemplazado `delete({})` por `clear()` en `NotificationsService.deleteAllNotifications()`
  - Ahora el endpoint `/products/inactive?clearNotifications=true` funciona correctamente

### Mejorado

- Cobertura de tests incrementada con 4 tests adicionales
- Total de tests en el proyecto: 27 (23 ProductsService + 4 AuthService)

## [1.3.1] - 2026-03-01

### Agregado

- Nuevo endpoint `GET /entities/providers` para obtener listado de proveedores (tipos P y B) para dropdowns
- Método `getProviders()` en `EntitiesService` con selección optimizada de campos (`rut`, `nombre`) y ordenamiento alfabético

### Técnico

- Endpoint protegido con autenticación JWT (`@UseGuards(JwtAuthGuard)`)
- Consulta optimizada con filtro por tipo de entidad y selección específica de columnas

## [1.3.0] - 2026-01-25

### Agregado

- Suite completa de pruebas unitarias para el servicio de productos (23 tests)
- Configuración de `moduleNameMapper` en Jest para resolver paths de TypeScript
- Validación en `UpdateProductDto` para generar código de barras automáticamente cuando está vacío
- Endpoint `POST /purchases/create` para creación manual de compras con validaciones completas
- DTO `CreatePurchaseDto` con validaciones de proveedor, tipo de documento, montos y observaciones
- Soporte para productos deprecados en la gestión de productos y ventas
- Campo `deprecado` en la entidad de productos y DTOs correspondientes
- Integración de Google Cloud Logging en `PurchasesService` y `ReportsService`

### Modificado

- **Actualización mayor a NestJS v11** (desde v10)
  - @nestjs/common, core, platform-express, testing: 10.4.4 → 11.1.12
  - @nestjs/config: 3.2.3 → 4.0.2
  - @nestjs/jwt: 10.2.0 → 11.0.2
  - @nestjs/passport: 10.0.3 → 11.0.5
  - @nestjs/swagger: 7.4.2 → 11.2.5
  - @nestjs/typeorm: 10.0.2 → 11.0.0
  - @nestjs/cli, schematics: v10 → v11

- Actualización completa de dependencias del proyecto:
  - axios: 1.7.7 → 1.13.2
  - class-validator: 0.14.1 → 0.14.3
  - typeorm: 0.3.20 → 0.3.28
  - mysql2: 3.11.3 → 3.16.1
  - prettier: 3.3.3 → 3.8.1
  - typescript: 5.6.2 → 5.9.3
  - eslint: 9.12.0 → 9.39.2
  - @typescript-eslint/eslint-plugin, parser: 8.8.0 → 8.53.1
  - eslint-config-prettier: 9.1.0 → 10.1.8
  - @types/express: 4.17.21 → 5.0.6
  - @types/node: 22.7.4 → 22.19.7
  - Y más actualizaciones menores

- Generación automática de código de barras cuando está vacío (ID + 50000) en método `updateProduct`
- Lógica de notificaciones de productos no publicados para excluir productos deprecados
- `GoogleLoggingService` ajustado para enviar logs a Google Cloud solo en entornos no-dev

### Mejorado

- Reducción de vulnerabilidades de seguridad de 10 a 3 (todas moderadas)
- Testing con cobertura completa del servicio de productos
- Compatibilidad con las últimas versiones de Node.js
- Performance general con dependencias actualizadas
- Validaciones robustas en creación de compras (proveedor, tipo documento, tipo compra, duplicados)
- Trazabilidad completa con Google Cloud Logging en operaciones de compras y reportes

### Corregido

- Configuración de Jest para resolver correctamente los imports con alias `src/`
- Mocks en pruebas unitarias para query builders de TypeORM

### Técnico

- Implementación de mocks completos para repositorios y servicios en tests
- Configuración mejorada de Jest con mapeo de módulos TypeScript
- Migración exitosa a NestJS 11 sin breaking changes
- Todas las pruebas unitarias pasando (23/23)
- Build exitoso con las nuevas versiones
- `GoogleLoggingService` registrado como provider en `PurchasesModule` y `ReportsModule`
- Validación de duplicados en compras por documento, tipo de documento y proveedor

### Seguridad

- Reducción significativa de vulnerabilidades: de 10 a 3 vulnerabilidades moderadas
- Las 3 restantes son de lodash (dependencia transitiva de @nestjs/config y @nestjs/swagger)
- Actualización de paquetes con vulnerabilidades conocidas
- Mejoras generales de seguridad con dependencias actualizadas

## [1.2.2] - 2025-08-16

### Modificado

- Actualización completa de dependencias del proyecto a sus versiones más recientes y estables
- Reorganización de dependencias moviendo herramientas de desarrollo a `devDependencies`
- Reemplazo de `mysql` por `mysql2` para mejor soporte y performance
- Actualización de todas las dependencias de NestJS a la versión 10.4.4

### Mejorado

- Performance mejorada con dependencias actualizadas
- Mejor compatibilidad con Node.js 18+
- Eliminación de dependencias duplicadas y mal organizadas
- Actualización de herramientas de desarrollo (ESLint, TypeScript, Jest)

### Técnico

- Migración de `mysql` a `mysql2` (versión 3.11.3)
- Actualización de `@nestjs/*` packages a versiones 10.4.x
- Actualización de TypeScript a versión 5.6.2
- Reorganización completa del package.json para mejor mantenimiento
- Actualización de herramientas de testing y linting

### Dependencias Actualizadas

- `@nestjs/common`: ^10.4.4
- `@nestjs/core`: ^10.4.4
- `@nestjs/platform-express`: ^10.4.4
- `@nestjs/swagger`: ^7.4.2
- `axios`: ^1.7.7
- `mysql2`: ^3.11.3
- `typescript`: ^5.6.2
- `reflect-metadata`: ^0.2.2

## [1.2.1] - 2025-07-29

### Modificado

- Reemplazados todos los `console.log` y `console.warn` por logs de Google Cloud en `ProductsService`
- Optimización completa del logging en todas las operaciones de productos
- Mejora en la trazabilidad de operaciones críticas como creación, actualización y gestión de inventario

### Mejorado

- Logging más detallado en operaciones de inventario y resumen de productos
- Mejor contextualización de logs con información específica por operación
- Manejo consistente de logs de advertencia para casos edge
- Mayor visibilidad en operaciones de activación/desactivación de productos

### Técnico

- Implementación completa de Google Cloud Logging en el módulo de productos
- Standardización del formato de logging en todo el servicio ProductsService
- Adición de logs informativos y de advertencia contextualizados

## [1.2.0] - 2025-07-28

### Agregado

- Nuevo servicio `ProductSyncService` para manejar la sincronización de productos de Mercado Libre
- Implementación de transacciones en lotes para operaciones de base de datos (`syncProductBatch`)
- Método optimizado `findProductByMLId` con selección específica de campos
- Validación mejorada de diferencias entre productos (stock, precio, enlace)
- Sistema de retorno estructurado para validaciones con detalles de diferencias
- Logging contextual mejorado con información específica por operación

### Modificado

- Refactorización del método `validateProductExistAndDetails` movido a `ProductSyncService`
- Refactorización del método `validateProductStockAndPrice` movido a `ProductSyncService`
- Optimización del método `createProductNotification` con mejor manejo de errores
- Separación de responsabilidades entre `MercadoLibreService` y `ProductSyncService`
- Mejora en la estructura de logging con contextos más específicos

### Mejorado

- Mejor separación de responsabilidades en el código
- Mayor testabilidad mediante servicios independientes
- Manejo más robusto de errores en operaciones de sincronización
- Performance mejorada con consultas optimizadas a la base de datos
- Reutilización de código mediante servicios especializados

### Técnico

- Implementación de transacciones de TypeORM para operaciones en lote
- Optimización de consultas con selección específica de campos
- Mejor arquitectura modular con servicios especializados
- Logging más granular y contextual por operación

## [1.1.0] - 2025-06-30

### Agregado

- Módulo de logging con Google Cloud Logging para centralizar el registro de eventos
- Servicio `GoogleLoggingService` para manejar logs con diferentes niveles de severidad
- Método `deleteAllNotifications()` en `NotificationsService` para eliminar todas las notificaciones
- Parámetro opcional `clearNotifications` en el endpoint `GET /products/inactive` para eliminar notificaciones

### Modificado

- Reemplazados todos los `console.log` por logs de Google Cloud en `MercadoLibreService`
- Reemplazados todos los `console.log` por logs de Google Cloud en `MercadoLibreAuthService`
- Optimizada la cantidad de logs para reducir el ruido, usando un log por función/iteración
- Mejorado el manejo de errores en `getTokenFromDb` para evitar el error "You must provide selection conditions"

### Mejorado

- Documentación Swagger para el nuevo parámetro `clearNotifications`
- Manejo centralizado de logs con información contextual (método, módulo, severidad)
- Integración entre ProductsService y NotificationsService para funcionalidades combinadas

### Técnico

- Agregada dependencia `@google-cloud/logging` para integración con Google Cloud
- Configuración de credenciales de Google Cloud mediante variable de entorno `GOOGLE_APPLICATION_CREDENTIALS`
- Implementación de logging estructurado con metadatos adicionales

## [1.0.0] - 2025-06-01

### Agregado

- Implementación inicial del backend con NestJS
- Módulo de autenticación con JWT
- Integración con API de Mercado Libre
- Sistema de gestión de productos e inventarios
- Sistema de notificaciones
- Documentación Swagger/OpenAPI
- Configuración de TypeORM con MySQL

### Características Iniciales

- CRUD completo para productos
- Sincronización con catálogo de Mercado Libre
- Sistema de autenticación y autorización
- Manejo de excepciones centralizado
- Validación de DTOs con class-validator
- Configuración mediante variables de entorno
