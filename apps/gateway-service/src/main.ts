import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { NatsExceptionFilter } from './app/filters/nats-exception.filter';
import {
  PayloadTooLargeFilter,
  PAYLOAD_LIMIT_BYTES,
} from './app/filters/payload-too-large.filter';

async function bootstrap() {
  const bodyLimitBytes = PAYLOAD_LIMIT_BYTES;
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: bodyLimitBytes,
    }),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new NatsExceptionFilter(), // keep this
    new PayloadTooLargeFilter(adapterHost),
  );

  await app.init();

  await app.listen(3000, '0.0.0.0');
}

bootstrap();
