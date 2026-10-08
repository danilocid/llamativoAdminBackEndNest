import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TimestampsSubscriber } from '../subscribers/timestamps.subscriber';

/**
 * Errores que reintentando no se arreglan: conviene fallar rápido y mostrar
 * en el log el motivo real en lugar de ocultarlo tras los reintentos.
 *
 * - ER_ACCESS_DENIED_ERROR (1045): credenciales incorrectas
 * - ER_DBACCESS_DENIED_ERROR (1044): el usuario no tiene permisos sobre la BD
 * - ER_BAD_DB_ERROR (1049): la base de datos no existe
 */
const ERRORES_FATALES = [
  'ER_ACCESS_DENIED_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
];

/** ¿Vale la pena reintentar este error de conexión? */
const errorEsReintenable = (error: any): boolean => {
  const detalle = [error?.code, error?.errno, error?.message]
    .filter(Boolean)
    .join(' ');
  return !ERRORES_FATALES.some((codigo) => detalle.includes(codigo));
};

/**
 * Reintentos al iniciar la aplicación: 60 intentos cada 5 s => ~5 minutos de
 * margen para que el servicio de base de datos esté disponible
 * (el default de @nestjs/typeorm es 9 intentos cada 3 s => 27 s).
 *
 * Van dentro del objeto que devuelve `useFactory`: en `forRootAsync` esa
 * factory es el proveedor TYPEORM_MODULE_OPTIONS del que `handleRetry` lee
 * `retryAttempts`, `retryDelay` y `toRetry`.
 */
const REINTENTOS_AL_INICIAR = 60;
const ENTRE_REINTENTOS_MS = 5000;

/** Lee un número de ConfigService, con un valor de respaldo. */
const numero = (
  configService: ConfigService,
  clave: string,
  respaldo: number,
): number => {
  const valor = Number(configService.get(clave));
  return Number.isFinite(valor) && valor > 0 ? valor : respaldo;
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const poolSize = numero(configService, 'DB_POOL_SIZE', 10);

        return {
          // Reintentos al iniciar (ver constantes arriba)
          retryAttempts: REINTENTOS_AL_INICIAR,
          retryDelay: ENTRE_REINTENTOS_MS,
          toRetry: errorEsReintenable,

          type: 'mysql',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASS'),
          database: configService.get('DB_NAME'),
          entities: ['dist/**/*.entity{.ts,.js}'],
          subscribers: [TimestampsSubscriber],
          migrations: ['dist/common/migrations/*{.ts,.js}'],
          migrationsRun: true,
          synchronize: configService.get('DB_SYNCHRONIZE') === 'true',

          poolSize,

          // Las opciones de `extra` tienen prioridad sobre las que TypeORM
          // arma por su cuenta, así que acá se fija el comportamiento del pool.
          extra: {
            // Espera máxima por intento de conexión (mysql2: 10000 ms)
            connectTimeout: numero(configService, 'DB_CONNECT_TIMEOUT', 30000),

            // Keep-alive sobre las conexiones ociosas: sin esto, MySQL o un
            // NAT/firewall las cortan en silencio y la siguiente consulta
            // falla con "MySQL server has gone away" o ETIMEDOUT.
            // (mysql2 ya lo trae activo, pero con el delay por defecto del SO)
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,

            // Consultas en cola en vez de error cuando el pool está lleno
            waitForConnections: true,
            queueLimit: 0,

            // maxIdle < connectionLimit es lo que activa la limpieza automática
            // de conexiones ociosas en mysql2. Al default (maxIdle = limit) esa
            // tarea no corre nunca y una conexión muerta queda en el pool.
            maxIdle: Math.max(1, Math.floor(poolSize / 2)),
            idleTimeout: numero(configService, 'DB_IDLE_TIMEOUT', 60000),
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
