/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { NatsExceptionFilter } from './app/nats-exception.filter';
import { PayloadTooLargeFilter } from './app/payload-too-large.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 26214400,
    }),
  );

  const bodyLimit = 10_485_760;
  app.useBodyParser('application/json', { bodyLimit });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new PayloadTooLargeFilter(adapterHost),
    new NatsExceptionFilter(),
  );

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log({
    level: 'info',
    message: 'gateway_listening',
    url: `http://localhost:${port}/${globalPrefix}`,
  });
}

bootstrap();
