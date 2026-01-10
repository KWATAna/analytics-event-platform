import { JSONCodec, JetStreamClient, NatsError } from 'nats';
import { eventSchema, Event } from '@analytics-event-platform/contracts';
import { LogFn } from './nats-connection';
import { MessagingUnavailableError } from './messaging.errors';

const codec = JSONCodec<Event>();

export class EventPublisher {
  constructor(
    private readonly js: JetStreamClient,
    private readonly log: LogFn
  ) {}

  async publish(event: Event): Promise<void> {
    const validated = eventSchema.parse(event);
    const subject = `events.${validated.source}`;

    try {
      await this.js.publish(subject, codec.encode(validated), {
        msgID: validated.eventId,
      });
      this.log({
        level: 'info',
        message: 'event_published',
        subject,
        eventId: validated.eventId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log({
        level: 'error',
        message: 'event_publish_failed',
        subject,
        eventId: validated.eventId,
        error: message,
      });

      if (error instanceof NatsError) {
        throw new MessagingUnavailableError(message);
      }

      throw error;
    }
  }
}
