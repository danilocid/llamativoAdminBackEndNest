# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

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
