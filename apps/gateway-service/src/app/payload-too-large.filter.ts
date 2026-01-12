import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '@analytics-event-platform/shared/logger';

export const PAYLOAD_LIMIT_BYTES = 26_214_400;

export type FastifyBodyTooLargeError = {
  code?: string;
  message?: string;
};

export const isFastifyBodyTooLarge = (
  error: unknown,
): error is FastifyBodyTooLargeError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as FastifyBodyTooLargeError).code === 'FST_ERR_CTP_BODY_TOO_LARGE';

export const buildPayloadTooLargeResponse = (
  message = 'Payload exceeds allowed limit.',
) => ({
  statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
  error: 'Payload Too Large',
  code: 'ERR_PAYLOAD_EXCEEDS_LIMIT',
  message,
  details: { limit: PAYLOAD_LIMIT_BYTES, unit: 'bytes' },
  timestamp: new Date().toISOString(),
});

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
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const message =
      exception instanceof PayloadTooLargeException
        ? exception.message
        : ((exception as FastifyBodyTooLargeError).message ??
          'Payload exceeds allowed limit.');
    logger.error({
      msg: 'payload_too_large',
      method: request?.method,
      path: request?.url,
    });

    response
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .send(buildPayloadTooLargeResponse(message));
  }
}
