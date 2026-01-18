import { NestFactory } from '@nestjs/core';
import { PinoLogger, Logger } from 'nestjs-pino';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const logger = app.get(Logger);
  app.useLogger(logger);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableShutdownHooks();
  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');

  const pino = app.get(PinoLogger);
  pino.info({
    msg: 'reporting_service_started',
    url: `http://localhost:${port}/${globalPrefix}`,
  });
}

bootstrap();
