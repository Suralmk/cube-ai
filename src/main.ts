import './env.loader';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import helmet from 'helmet';
import { ThrottlerModule } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.useGlobalPipes(validationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor(),
  );

  app.use(helmet());
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL!,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
