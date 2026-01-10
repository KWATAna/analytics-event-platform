import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@analytics-event-platform/messaging';
import { Event } from '@analytics-event-platform/contracts';

@Injectable()
export class AppService {
  constructor(private readonly publisher: EventPublisher) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async handleWebhook(event: Event): Promise<{ status: string }> {
    await this.publisher.publish(event);
    return { status: 'accepted' };
  }
}
