import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { JSONCodec, JsMsg } from 'nats';
import { eventSchema, Event } from '@analytics-event-platform/contracts';
import { logger } from '@analytics-event-platform/observability';
import { EventPullConsumer } from '@analytics-event-platform/messaging';
import { PrismaService } from '@analytics-event-platform/persistence';
import { Prisma } from '@prisma/client';

const BATCH_SIZE = 100;
const BATCH_EXPIRES_MS = 5000;
const BASE_NACK_DELAY_MS = 1000;
const MAX_NACK_DELAY_MS = 30000;
const IDLE_DELAY_MS = 250;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type EventRecord = {
  id: string;
  timestamp: Date;
  source: string;
  funnelStage: string;
  eventType: string;
  purchaseAmount: string | null;
  data: Prisma.InputJsonValue;
};

@Injectable()
export class ProcessorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly codec = JSONCodec<Event>();
  private isShuttingDown = false;
  private loopPromise?: Promise<void>;

  constructor(
    private readonly consumer: EventPullConsumer,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.loopPromise = this.processLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    await this.loopPromise?.catch(() => undefined);
  }

  private async processLoop(): Promise<void> {
    while (!this.isShuttingDown) {
      try {
        const batch = await this.consumer.fetch({
          batch: BATCH_SIZE,
          expires: BATCH_EXPIRES_MS,
        });

        const messages: JsMsg[] = [];
        for await (const msg of batch) {
          messages.push(msg);
        }

        if (messages.length === 0) {
          await delay(IDLE_DELAY_MS);
          continue;
        }

        const validEvents: EventRecord[] = [];
        const validMessages: JsMsg[] = [];

        for (const msg of messages) {
          const decoded = this.decodeMessage(msg);
          if (!decoded) {
            msg.ack();
            continue;
          }

          const result = eventSchema.safeParse(decoded);
          if (!result.success) {
            logger.warn({
              message: 'ingestion_event_invalid',
              errors: result.error.format(),
              deliveryCount: msg.info.deliveryCount,
            });
            msg.ack();
            continue;
          }

          validEvents.push(this.toEventRecord(result.data));
          validMessages.push(msg);
        }

        if (validEvents.length === 0) {
          continue;
        }

        try {
          await this.prisma.event.createMany({
            data: validEvents,
            skipDuplicates: true,
          });

          validMessages.forEach((msg) => msg.ack());
          logger.info({
            message: 'ingestion_batch_persisted',
            persisted: validEvents.length,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error({
            message: 'ingestion_batch_failed',
            error: errorMessage,
          });

          validMessages.forEach((msg) => {
            msg.nak(this.nextBackoffMs(msg));
          });
          await delay(IDLE_DELAY_MS);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error({
          message: 'ingestion_loop_failed',
          error: errorMessage,
        });
        await delay(IDLE_DELAY_MS);
      }
    }
  }

  private decodeMessage(msg: JsMsg): Event | null {
    try {
      return this.codec.decode(msg.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'ingestion_event_decode_failed',
        error: errorMessage,
        deliveryCount: msg.info.deliveryCount,
      });
      return null;
    }
  }

  private toEventRecord(event: Event): EventRecord {
    return {
      id: event.eventId,
      timestamp: this.parseTimestamp(event.timestamp),
      source: event.source,
      funnelStage: event.funnelStage,
      eventType: event.eventType,
      purchaseAmount: this.extractPurchaseAmount(event),
      data: this.toJsonValue(event),
    };
  }

  private toJsonValue(event: Event): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue;
  }

  private parseTimestamp(value: string): Date {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    logger.warn({
      message: 'ingestion_event_invalid_timestamp',
      value,
    });
    return new Date();
  }

  private extractPurchaseAmount(event: Event): string | null {
    const engagement = event.data?.engagement as { purchaseAmount?: string | null };
    const purchaseAmount = engagement?.purchaseAmount;
    return typeof purchaseAmount === 'string' && purchaseAmount.length > 0
      ? purchaseAmount
      : null;
  }

  private nextBackoffMs(msg: JsMsg): number {
    const deliveryCount = Math.max(1, msg.info.deliveryCount ?? 1);
    return Math.min(
      BASE_NACK_DELAY_MS * 2 ** (deliveryCount - 1),
      MAX_NACK_DELAY_MS,
    );
  }
}
