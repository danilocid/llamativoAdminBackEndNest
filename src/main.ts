import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { version } from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ejecutar migraciones automáticamente al iniciar
  const dataSource = app.get(DataSource);
  if (process.env.DB_SYNCHRONIZE !== 'true') {
    Logger.log('Ejecutando migraciones...', 'Bootstrap');
    await dataSource.runMigrations();
    Logger.log('Migraciones completadas', 'Bootstrap');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://localhost:4200',
      'https://llamativo-admin.web.app',
      'http://192.168.2.41:4200',
    ],
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle('Llamativo API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        bearerFormat: 'JWT',
        type: 'http',
      },
      'jwt',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
  });
  await app.listen(process.env.PORT || 3000);
  const url = await app.getUrl();
  Logger.log(`Version: ${version}`, 'Bootstrap');
  Logger.log(
    `Application is running on port: ${process.env.PORT || '3000 - default'}`,
    'Bootstrap',
  );
  Logger.log(`Swagger is running on: ${url}/api-docs`, 'Bootstrap');
}
bootstrap();
