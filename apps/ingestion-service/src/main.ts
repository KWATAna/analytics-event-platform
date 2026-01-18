import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

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
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const pino = app.get(PinoLogger);
  pino.info({
    msg: 'ingestion_service_started',
    url: `http://localhost:${port}/${globalPrefix}`,
  });
}

bootstrap();
