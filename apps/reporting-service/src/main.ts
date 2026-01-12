import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { logger } from '@analytics-event-platform/shared/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const pinoLogger = app.get(Logger);
  app.useLogger(pinoLogger);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableShutdownHooks();
  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.info({
    msg: 'reporting_service_started',
    url: `http://localhost:${port}/${globalPrefix}`,
  });
}

bootstrap();
