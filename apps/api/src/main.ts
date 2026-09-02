import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common';
import { TransformInterceptor } from './common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe — enforces DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response transform
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AdhocX API')
    .setDescription(
      'AdhocX — Ad-hoc cab aggregator platform API. ' +
      'Connects vendors with drivers for on-demand fleet dispatch.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and OTP verification')
    .addTag('Vendors', 'Vendor profile and requirement management')
    .addTag('Drivers', 'Driver profile, KYC, and availability')
    .addTag('Requirements', 'Cab requirement lifecycle')
    .addTag('Offers', 'Driver offer accept/decline')
    .addTag('Trips', 'Trip lifecycle — arrive, start (OTP), complete, cancel')
    .addTag('Payments', 'Payment tracking')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 AdhocX API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📄 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
