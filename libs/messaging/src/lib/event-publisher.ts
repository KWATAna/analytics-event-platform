import { JSONCodec, JetStreamClient, NatsError } from 'nats';
import { eventSchema, Event } from '@analytics-event-platform/contracts';
import { LogFn } from './nats-connection';
import {
  MessagingPayloadTooLargeException,
  MessagingUnavailableError,
} from './messaging.errors';

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

    if (encoded.length > MAX_NATS_PAYLOAD) {
      throw new MessagingPayloadTooLargeException(
        `Event size ${encoded.length} exceeds NATS max payload of ${MAX_NATS_PAYLOAD} bytes.`,
      );
    }

    try {
      await this.js.publish(subject, encoded, {
        msgID: validated.eventId,
      });
      // this.log({
      //   level: 'info',
      //   message: 'event_published',
      //   subject,
      //   eventId: validated.eventId,
      // });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stringified =
        typeof error === 'object' ? JSON.stringify(error) : String(error);
      this.log({ level: 'error', message: stringified });
      // this.log({
      //   level: 'error',
      //   message: 'event_publish_failed',
      //   subject,
      //   eventId: validated.eventId,
      //   error: message,
      // });

      if (error instanceof NatsError) {
        throw new MessagingUnavailableError(message);
      }

      throw error;
    }
  }
}
