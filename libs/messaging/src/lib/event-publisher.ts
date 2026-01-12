import { JSONCodec, JetStreamClient, NatsError, headers } from 'nats';
import { eventSchema, Event } from '@analytics-event-platform/contracts';
import { LogFn } from './nats-connection';
import {
  MessagingPayloadTooLargeException,
  MessagingUnavailableError,
} from './messaging.errors';
import {
  getTraceId,
  TRACE_ID_HEADER,
} from '@analytics-event-platform/shared/logger';

const codec = JSONCodec<Event>();
const MAX_NATS_PAYLOAD = 5_000_000;

export class EventPublisher {
  constructor(
    private readonly js: JetStreamClient,
    private readonly log: LogFn,
  ) {}

  async publish(event: Event): Promise<void> {
    const validated = eventSchema.parse(event);
    const subject = `events.${validated.source}`;
    const encoded = codec.encode(validated);
    const traceId = getTraceId();
    const messageHeaders = traceId ? headers() : undefined;

    if (traceId && messageHeaders) {
      messageHeaders.set(TRACE_ID_HEADER, traceId);
    }

    if (encoded.length > MAX_NATS_PAYLOAD) {
      throw new MessagingPayloadTooLargeException(
        `Event size ${encoded.length} exceeds NATS max payload of ${MAX_NATS_PAYLOAD} bytes.`,
      );
    }

    try {
      await this.js.publish(subject, encoded, {
        msgID: validated.eventId,
        headers: messageHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stringified =
        typeof error === 'object' ? JSON.stringify(error) : String(error);
      this.log({ level: 'error', msg: stringified });

      if (error instanceof NatsError) {
        throw new MessagingUnavailableError(message);
      }

      throw error;
    }
  }
}
