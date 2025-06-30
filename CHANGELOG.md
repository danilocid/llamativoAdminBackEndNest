# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere al [Versionado Semántico](https://semver.org/lang/es/).

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
