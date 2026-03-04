<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Llamativo Admin - Backend

Backend de administración para Llamativo, desarrollado con NestJS 11. API REST con integración a Mercado Libre, sistema de logging con Google Cloud y gestión completa de inventario, ventas y compras.

## Versión Actual

**v1.3.2** - Ver [CHANGELOG.md](CHANGELOG.md) para detalles de cambios.

## Tecnologías

- **NestJS**: 11.1.12
- **TypeScript**: 5.9.3
- **TypeORM**: 0.3.28
- **MySQL**: 8.x (con mysql2 driver)
- **JWT**: Para autenticación
- **Google Cloud Logging**: Sistema de logging centralizado
- **Axios**: Cliente HTTP para integraciones
- **bcryptjs**: Encriptación de contraseñas
- **Jest**: Framework de testing

## Características Principales

- 🔐 Autenticación JWT con guards de seguridad
- 📦 Gestión completa de productos e inventario
- 🛒 Módulos de ventas, compras y recepciones
- 📊 Sistema de reportes y estadísticas
- 🏪 Integración con Mercado Libre (OAuth2, sincronización de productos)
- 📝 Logging centralizado con Google Cloud Platform
- 🔔 Sistema de notificaciones
- ✅ Suite de pruebas unitarias (27 tests)
- 🚀 Soporte para productos deprecados
- 📈 Resúmenes de inventario con cálculos de rentabilidad

## Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL 8.x
- Cuenta de Google Cloud Platform (para logging)

## Instalación

```bash
# Instalar dependencias
npm install
```

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_DATABASE=nombre_db

# JWT
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRATION=24h

# Google Cloud Logging
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_CLOUD_PROJECT_ID=tu_proyecto_gcp

# Mercado Libre
ML_CLIENT_ID=tu_client_id
ML_CLIENT_SECRET=tu_client_secret
ML_REDIRECT_URI=tu_redirect_uri
```

### Credenciales de Google Cloud

1. Descarga el archivo de credenciales desde Google Cloud Console
2. Guárdalo como `credentials.json` en la raíz del proyecto
3. Asegúrate de que el proyecto tenga habilitada la API de Cloud Logging

## Ejecución

```bash
# Desarrollo con watch mode
npm run start:dev

# Producción
npm run start:prod

# Debug mode
npm run start:debug
```

La API estará disponible en `http://localhost:3000`

## Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage de tests
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

**Cobertura Actual:**

- **AuthService**: 4 tests (login, validaciones, JWT)
- **ProductsService**: 23 tests (CRUD, inventario, deprecados)
- **Total**: 27 tests unitarios

## Estructura del Proyecto

```
src/
├── common/
│   ├── config/              # Configuración de base de datos
│   ├── dto/                 # DTOs compartidos (paginación, respuestas)
│   ├── exceptions/          # Filtros de excepciones HTTP
│   ├── guards/              # Guards de autenticación JWT
│   ├── jwt/                 # Servicio JWT personalizado
│   └── services/            # Google Cloud Logging
├── modules/
│   ├── auth/               # Autenticación y autorización
│   ├── common/             # Endpoints comunes
│   ├── entities/           # Gestión de entidades (clientes, proveedores)
│   ├── inventory/          # Control de inventario
│   ├── mercado-libre/      # Integración con Mercado Libre
│   ├── notifications/      # Sistema de notificaciones
│   ├── products/           # CRUD de productos (27 tests)
│   ├── products-movements/ # Movimientos de inventario
│   ├── purchases/          # Registro de compras
│   ├── receptions/         # Recepciones de mercancía
│   ├── reports/            # Reportes y estadísticas
│   └── sales/              # Ventas y transacciones
└── main.ts                 # Punto de entrada de la aplicación
```

## Endpoints Principales

### Autenticación

- `POST /auth/login` - Inicio de sesión (genera JWT)

### Productos

- `GET /products` - Listar productos (con filtros y paginación)
- `GET /products/:id` - Obtener producto por ID
- `POST /products` - Crear producto
- `PUT /products` - Actualizar producto
- `GET /products/inventory/resume` - Resumen de inventario
- `POST /products/set-inactive` - Marcar productos sin stock como inactivos
- `POST /products/set-active` - Activar productos con stock

### Entidades

- `GET /entities` - Listar entidades
- `GET /entities/providers` - Listar proveedores (dropdown)
- `POST /entities` - Crear entidad
- `PUT /entities/:id` - Actualizar entidad

### Compras

- `GET /purchases` - Listar compras
- `POST /purchases/create` - Registrar compra manual
- `PUT /purchases/:id` - Actualizar compra

### Ventas

- `GET /sales` - Listar ventas
- `POST /sales` - Registrar venta
- `GET /sales/:id` - Obtener detalle de venta

### Mercado Libre

- `GET /mercado-libre/auth` - Iniciar OAuth2
- `GET /mercado-libre/callback` - Callback de autorización
- `POST /mercado-libre/sync` - Sincronizar productos

## Google Cloud Logging

El sistema utiliza Google Cloud Logging para registrar eventos importantes:

- **INFO**: Operaciones exitosas (CreatedAt, updates, deletes)
- **WARNING**: Situaciones que requieren atención
- **ERROR**: Errores de aplicación

Todos los logs incluyen:

- Timestamp
- Severidad
- Método/función ejecutada
- Módulo de origen
- Datos contextuales

## Convenciones de Código

- **Nomenclatura**: camelCase para variables, PascalCase para clases
- **DTOs**: Validación con class-validator
- **Respuestas**: Formato estandarizado con `serverResponseCode`, `serverResponseMessage`, `data`
- **Errores**: Uso de excepciones de NestJS (`NotFoundException`, `BadRequestException`, etc.)
- **Guards**: Protección de rutas con `@UseGuards(JwtAuthGuard)`

## Mejores Prácticas Implementadas

1. **Inyección de Dependencias**: Uso consistente del contenedor IoC de NestJS
2. **Repository Pattern**: TypeORM con repositorios para acceso a datos
3. **DTOs**: Validación y transformación de datos de entrada
4. **Exception Filters**: Manejo centralizado de errores
5. **Logging**: Registro detallado de operaciones con Google Cloud
6. **Testing**: Suite de tests unitarios para lógica de negocio crítica
7. **Guards**: Protección JWT en endpoints privados

## Versionado

El proyecto sigue [Versionado Semántico](https://semver.org/lang/es/):

- **MAJOR**: Cambios incompatibles (breaking changes)
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Correcciones de bugs

Ver [CHANGELOG.md](CHANGELOG.md) para historial detallado de cambios.

## Contribución

Para contribuir al proyecto:

1. Asegúrate de que el código pase todas las pruebas (`npm test`)
2. Sigue las convenciones de código de NestJS
3. Documenta los cambios en CHANGELOG.md
4. Actualiza el README si agregas nuevas funcionalidades

## Documentación Adicional

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Google Cloud Logging](https://cloud.google.com/logging/docs)

## Licencia

Propietario - Todos los derechos reservados

## Contacto

Danilo Cid - Desarrollador Principal
