import { Injectable } from '@nestjs/common';
import { Event } from '@analytics-event-platform/contracts';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  handleEvent(event: Event): { status: string } {
    void event;
    return { status: 'queued' };
  }
}
