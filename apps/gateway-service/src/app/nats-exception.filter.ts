import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { NatsError } from 'nats';
import {
  MessagingPayloadTooLargeException,
  MessagingUnavailableError,
} from '@analytics-event-platform/messaging';

const MAX_NATS_PAYLOAD = 5_000_000;

@Catch(MessagingUnavailableError, MessagingPayloadTooLargeException, NatsError)
export class NatsExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    console.log({
      level: 'error',
      message: 'nats_unavailable',
      error: exception.message,
    });

    const response = host.switchToHttp().getResponse<FastifyReply>();
    if (exception instanceof MessagingPayloadTooLargeException) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).send({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        code: 'ERR_PAYLOAD_EXCEEDS_LIMIT',
        message: exception.message,
        details: { limit: MAX_NATS_PAYLOAD, unit: 'bytes' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    response.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      message: 'Message queue unavailable',
    });
  }
}
