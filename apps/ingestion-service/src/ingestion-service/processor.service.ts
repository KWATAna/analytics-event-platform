import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { JSONCodec, JsMsg } from 'nats';
import { PinoLogger } from 'nestjs-pino';
import { eventSchema, Event } from '@analytics-event-platform/contracts';
import {
  resolveTraceId,
  runWithTraceId,
  traceIdFromNatsHeaders,
} from '@analytics-event-platform/shared/logger';
import { EventPullConsumer } from '@analytics-event-platform/messaging';
import { PrismaService } from '@analytics-event-platform/persistence';
import { InputJsonValue } from '@my-project/db-types';
import { BatchLoggingInterceptor } from './batch-logging.interceptor';
import { NatsTraceInterceptor } from './nats-trace.interceptor';
import { from, lastValueFrom } from 'rxjs';

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
  data: InputJsonValue;
};

type MessageContext = {
  msg: JsMsg;
  traceId: string;
  source: string;
};

type BatchLogContext = {
  batchSize: number;
  source: string;
  sources?: string[];
  traceIds?: string[];
};

type BatchResult = {
  status: 'success' | 'failed' | 'empty';
  persisted: number;
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
    private readonly batchLogger: BatchLoggingInterceptor,
    private readonly natsTrace: NatsTraceInterceptor,
    private readonly logger: PinoLogger,
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

        const messageContexts = messages.map((msg) => ({
          msg,
          traceId: traceIdFromNatsHeaders(msg.headers),
          source: this.extractSource(msg),
        }));
        const { logContext, traceId } = this.buildBatchContext(messageContexts);

        await runWithTraceId(traceId, () =>
          this.batchLogger.intercept(
            logContext,
            async (): Promise<BatchResult> => {
              const validEvents: EventRecord[] = [];
              const validMessages: JsMsg[] = [];

              for (const context of messageContexts) {
                const eventRecord = await lastValueFrom(
                  this.natsTrace.intercept(
                    context.msg,
                    {
                      handle: () => from(this.processMessage(context.msg)),
                    },
                    context.traceId,
                  ),
                );

                if (eventRecord) {
                  validEvents.push(eventRecord);
                  validMessages.push(context.msg);
                }
              }

              if (validEvents.length === 0) {
                return { status: 'empty', persisted: 0 };
              }

              try {
                await this.prisma.event.createMany({
                  data: validEvents,
                  skipDuplicates: true,
                });

                validMessages.forEach((msg) => msg.ack());
                return { status: 'success', persisted: validEvents.length };
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                this.logger.error({
                  msg: 'ingestion_batch_failed',
                  error: errorMessage,
                });

                validMessages.forEach((msg) => {
                  msg.nak(this.nextBackoffMs(msg));
                });
                await delay(IDLE_DELAY_MS);
                return { status: 'failed', persisted: 0 };
              }
            },
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error({
          msg: 'ingestion_loop_failed',
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
      this.logger.warn({
        msg: 'ingestion_event_decode_failed',
        error: errorMessage,
        deliveryCount: msg.info.deliveryCount,
      });
      return null;
    }
  }

  private async processMessage(msg: JsMsg): Promise<EventRecord | null> {
    const decoded = this.decodeMessage(msg);
    if (!decoded) {
      msg.ack();
      return null;
    }

    const result = eventSchema.safeParse(decoded);
    if (!result.success) {
      this.logger.warn({
        msg: 'ingestion_event_invalid',
        errors: result.error.format(),
        deliveryCount: msg.info.deliveryCount,
      });
      msg.ack();
      return null;
    }

    return this.toEventRecord(result.data);
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

  private toJsonValue(event: Event): InputJsonValue {
    return JSON.parse(JSON.stringify(event)) as InputJsonValue;
  }

  private parseTimestamp(value: string): Date {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    this.logger.warn({
      msg: 'ingestion_event_invalid_timestamp',
      value,
    });
    return new Date();
  }

  private extractPurchaseAmount(event: Event): string | null {
    const engagement = event.data?.engagement as {
      purchaseAmount?: string | null;
    };
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

  private extractSource(msg: JsMsg): string {
    if (msg.subject.startsWith('events.')) {
      return msg.subject.slice('events.'.length);
    }
    return msg.subject;
  }

  private buildBatchContext(messages: MessageContext[]): {
    logContext: BatchLogContext;
    traceId: string;
  } {
    const sources = new Set(messages.map((message) => message.source));
    const traceIds = new Set(messages.map((message) => message.traceId));
    const logContext: BatchLogContext = {
      batchSize: messages.length,
      source: sources.size === 1 ? [...sources][0] : 'mixed',
    };

    if (sources.size > 1) {
      logContext.sources = [...sources];
    }
    if (traceIds.size > 1) {
      logContext.traceIds = [...traceIds];
    }

    const traceId = traceIds.values().next().value ?? resolveTraceId();
    return { logContext, traceId };
  }
}
