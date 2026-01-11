import { Inject, Injectable } from '@nestjs/common';
import {
  AckPolicy,
  Consumer,
  ConsumerConfig,
  DeliverPolicy,
  ReplayPolicy,
  JetStreamManager,
  NatsError,
  NatsConnection,
} from 'nats';
import { LogFn } from './nats-connection';
import { ensureEventsStream } from './jetstream';
import { NATS_CONNECTION } from './messaging.constants';

const EVENTS_STREAM = 'EVENTS_STREAM';
const EVENTS_SUBJECT = 'events.*';
const DEFAULT_DURABLE = 'ingestion-worker';
const DEFAULT_ACK_WAIT_MS = 30_000;
const DEFAULT_MAX_PENDING = 2_000;

export type FetchBatchOptions = {
  batch: number;
  expires: number;
};

const log: LogFn = (payload) => {
  console.log({ component: 'messaging', ...payload });
};

const isNatsError = (error: unknown): error is NatsError =>
  error instanceof Error && 'code' in error;

const ensureEventsConsumer = async (
  jsm: JetStreamManager,
  durableName: string,
): Promise<void> => {
  try {
    await jsm.consumers.info(EVENTS_STREAM, durableName);
    log({ level: 'info', message: 'events_consumer_exists', durableName });
  } catch (error) {
    if (!isNatsError(error) || error.code !== '404') {
      throw error;
    }

    const ackWaitMs = Number(
      process.env.EVENTS_CONSUMER_ACK_WAIT_MS ?? DEFAULT_ACK_WAIT_MS,
    );
    const maxAckPending = Number(
      process.env.EVENTS_CONSUMER_MAX_PENDING ?? DEFAULT_MAX_PENDING,
    );
    const config: ConsumerConfig = {
      durable_name: durableName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      replay_policy: ReplayPolicy.Instant,
      filter_subject: EVENTS_SUBJECT,
      ack_wait: ackWaitMs * 1_000_000,
      max_ack_pending: maxAckPending,
    };

    await jsm.consumers.add(EVENTS_STREAM, config);
    log({ level: 'info', message: 'events_consumer_created', durableName });
  }
};

@Injectable()
export class EventPullConsumer {
  private consumer?: Consumer;
  private durableName?: string;

  constructor(@Inject(NATS_CONNECTION) private readonly nc: NatsConnection) {}

  async fetch(options: FetchBatchOptions) {
    const consumer = await this.getConsumer();
    return consumer.fetch({
      max_messages: options.batch,
      expires: options.expires,
    });
  }

  private async getConsumer(): Promise<Consumer> {
    const durableName =
      process.env.EVENTS_CONSUMER_DURABLE?.trim() || DEFAULT_DURABLE;

    if (this.consumer && this.durableName === durableName) {
      return this.consumer;
    }

    const jsm = await this.nc.jetstreamManager();
    await ensureEventsStream(jsm, log);
    await ensureEventsConsumer(jsm, durableName);

    const stream = await jsm.streams.get(EVENTS_STREAM);
    this.consumer = await stream.getConsumer(durableName);
    this.durableName = durableName;
    return this.consumer;
  }
}
