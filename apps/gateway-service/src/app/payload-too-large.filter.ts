import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { FastifyReply } from 'fastify';

const PAYLOAD_LIMIT_BYTES = 5_242_880;

type FastifyBodyTooLargeError = {
  code?: string;
  message?: string;
};

const isFastifyBodyTooLarge = (error: unknown): error is FastifyBodyTooLargeError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as FastifyBodyTooLargeError).code === 'FST_ERR_CTP_BODY_TOO_LARGE';

@Catch()
export class PayloadTooLargeFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const isPayloadTooLarge =
      exception instanceof PayloadTooLargeException ||
      isFastifyBodyTooLarge(exception);

    if (!isPayloadTooLarge) {
      super.catch(exception as Error, host);
      return;
    }

    const response = host.switchToHttp().getResponse<FastifyReply>();
    const message =
      exception instanceof PayloadTooLargeException
        ? exception.message
        : (exception as FastifyBodyTooLargeError).message ??
          'Payload exceeds allowed limit.';

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).send({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      code: 'ERR_PAYLOAD_EXCEEDS_LIMIT',
      message,
      details: { limit: PAYLOAD_LIMIT_BYTES, unit: 'bytes' },
      timestamp: new Date().toISOString(),
    });
  }
}
