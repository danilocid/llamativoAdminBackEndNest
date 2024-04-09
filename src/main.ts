import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  SwaggerModule.setup('api-docs', app, document);
  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on port: 3000`);
  console.log(`Swagger is running on: http://localhost:3000/api-docs`);
}
bootstrap();
