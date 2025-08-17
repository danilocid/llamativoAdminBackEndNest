# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

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
