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
import { NatsExceptionFilter } from './app/nats-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new NatsExceptionFilter());
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log({
    level: 'info',
    message: 'gateway_listening',
    url: `http://localhost:${port}/${globalPrefix}`,
  });
}

bootstrap();
