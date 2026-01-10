import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { eventSchema } from '@analytics-event-platform/contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(@Body() payload: unknown) {
    const normalized = this.normalizePayload(payload);
    if (!Array.isArray(normalized)) {
      throw new BadRequestException({
        message: 'Invalid event payload',
        errors: [{ path: '', message: 'Payload must be an array' }],
      });
    }
    console.log('Received webhook:', normalized);
    const result = eventSchema.array().safeParse(normalized);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid event payload',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const events = result.data;
    await Promise.all(
      events.map((event) => this.appService.handleWebhook(event)),
    );

    return { status: 'accepted' };
  }

  private normalizePayload(payload: unknown): unknown {
    if (Buffer.isBuffer(payload)) {
      return this.parseJson(payload.toString('utf8'));
    }

    if (typeof payload === 'string') {
      return this.parseJson(payload);
    }

    return payload;
  }

  private parseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      throw new BadRequestException({
        message: 'Invalid JSON payload',
        error: message,
      });
    }
  }
}
