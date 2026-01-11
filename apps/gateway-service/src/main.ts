import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { NatsExceptionFilter } from './app/nats-exception.filter';
import {
  buildPayloadTooLargeResponse,
  isFastifyBodyTooLarge,
  PayloadTooLargeFilter,
  PAYLOAD_LIMIT_BYTES,
} from './app/payload-too-large.filter';

async function bootstrap() {
  const bodyLimitBytes = PAYLOAD_LIMIT_BYTES;
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: bodyLimitBytes,
    }),
  );

  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', async (req) => {
    const len = req.headers['content-length'];
    if (len) {
      console.log('[REQ SIZE]', req.method, req.url, Number(len));
    }
  });

  app.setGlobalPrefix('api');

  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new NatsExceptionFilter(), // keep this
    new PayloadTooLargeFilter(adapterHost),
  );

  await app.init();

  fastify.setErrorHandler((err, req, reply) => {
    if (isFastifyBodyTooLarge(err)) {
      console.error('[413]', req.method, req.url);
      reply
        .status(413)
        .send(
          buildPayloadTooLargeResponse(
            err.message ?? 'Request body is too large',
          ),
        );
      return;
    }

    reply.send(err);
  });

  await app.listen(3000);
}

bootstrap();
