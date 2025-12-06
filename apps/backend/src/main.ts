import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { version } from '../package.json';
import { AppModule } from './app.module';
import { TrpcRouter } from './trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  const cfg = app.get(ConfigService);

  const prefix = cfg.get('pathPrefix');
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe());

  // General Helmet config, no specifics here
  // but depending on the service, you may want to be more lenient here
  app.use(helmet());

  // General CORS
  const corsUrl = cfg.get('cors');
  if (corsUrl) {
    app.enableCors({
      origin: corsUrl.split(',').map((url: string) => url.trim()),
      methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
      credentials: true,
    });
  }

  // Swagger Configuration
  const swaggerEnabled = cfg.get<boolean>('swagger.enabled') ?? false;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sophon Microservice Template API')
      .setDescription('API description')
      .setVersion(version)
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
          description: 'Partner API key for authentication',
        },
        'partner_api_key',
      )
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(prefix, app, document);
  }

  // TRPC
  const trpc = app.get(TrpcRouter);
  trpc.applyMiddleware(app);

  const port = cfg.get('port');
  const bind = cfg.get('bind');

  Logger.log(
    `Starting application on http://127.0.0.1:${port}/${prefix}`,
    'NestApplication',
  );
  Logger.log(
    `Binding application on http://${bind}:${port}/${prefix}`,
    'NestApplication',
  );
  await app.listen(port, bind);
}
bootstrap();
