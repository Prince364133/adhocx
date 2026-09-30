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

  // CORS (with origin reflection and 24h preflight caching to prevent browser OPTIONS request flooding)
  const allowedOrigins = [
    'https://app.adhocx.com',
    'https://admin.adhocx.com',
    'https://adhocx.com',
    'https://www.adhocx.com',
    'https://api.adhocx.com',
    'http://3.110.42.191',
    'http://localhost:7002',
    'http://localhost:7003',
    'http://localhost:3000',
    'http://localhost:3001',
    ...(configService.get<string[]>('app.corsOrigins') || []),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.adhocx.com') ||
        origin === 'https://adhocx.com' ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-webhook-secret',
      'x-correlation-id',
      'x-requested-with',
      'x-razorpay-signature',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Swagger API documentation (Disabled in production per CERT-In / OWASP API8 guidelines)
  const nodeEnv = configService.get<string>('app.nodeEnv') || process.env.NODE_ENV || 'development';
  const enableSwagger = configService.get<boolean>('app.enableSwagger') || process.env.ENABLE_SWAGGER === 'true' || nodeEnv !== 'production';

  if (enableSwagger) {
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
    logger.log(`📄 Swagger docs enabled at http://localhost:${port}/docs`);
  } else {
    logger.log(`🔒 Swagger docs disabled in production environment (${nodeEnv})`);
  }

  await app.listen(port);
  logger.log(`🚀 AdhocX API running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
