import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { NatsError } from 'nats';
import { MessagingUnavailableError } from '@analytics-event-platform/messaging';

@Catch(MessagingUnavailableError, NatsError)
export class NatsExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    console.log({
      level: 'error',
      message: 'nats_unavailable',
      error: exception.message,
    });

    const response = host.switchToHttp().getResponse<FastifyReply>();
    response.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      message: 'Message queue unavailable',
    });
  }
}
