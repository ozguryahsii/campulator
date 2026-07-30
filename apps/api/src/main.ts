import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Yerel depolama sağlayıcısının dosyaları /storage altından servis edilir
  app.useStaticAssets(join(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? './storage'), {
    prefix: '/storage/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Güvenlik başlıkları (docs/07 Faz 11)
  app.use(
    helmet({
      // Yerel depolamadaki fotoğrafların farklı origin'den yüklenmesine izin ver
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Campulator API')
    .setDescription('Kamp, karavan, piknik ve mangal noktaları platformu REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3399);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Campulator API: http://localhost:${port} (Swagger: /docs)`);
}

void bootstrap();
