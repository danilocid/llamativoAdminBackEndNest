import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot({ isGlobal: true });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/common/migrations/*{.ts,.js}'],
  synchronize: false,
});
