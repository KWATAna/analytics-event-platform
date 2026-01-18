import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { eventSchema } from '@analytics-event-platform/contracts';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: PinoLogger,
  ) {}

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
    const startTime = Date.now();
    let validCount = 0;
    let corruptCount = 0;

    const publishPromises = normalized.map(async (rawEvent) => {
      const result = eventSchema.safeParse(rawEvent);
      if (!result.success) {
        corruptCount++;
        this.logger.warn({
          msg: 'corrupt_event_detected',
          errors: result.error.format(),
          preview: JSON.stringify(rawEvent).substring(0, 100),
        });
        return;
      }

      await this.appService.handleWebhook(result.data);
      validCount++;
    });

    await Promise.allSettled(publishPromises);

    return {
      status: 'processed',
      stats: {
        received: normalized.length,
        published: validCount,
        corrupted: corruptCount,
        durationMs: Date.now() - startTime,
      },
    };
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
