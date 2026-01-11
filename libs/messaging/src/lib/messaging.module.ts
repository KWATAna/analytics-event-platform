import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { JetStreamClient, NatsConnection } from 'nats';
import { connectWithRetry, LogFn } from './nats-connection';
import { ensureEventsStream } from './jetstream';
import { EventPublisher } from './event-publisher';
import { EventPullConsumer } from './event-consumer';
import { NATS_CONNECTION } from './messaging.constants';
import { NatsHealthIndicator } from './nats-health.indicator';

const log: LogFn = (payload) => {
  console.log({ component: 'messaging', ...payload });
};

const parseServers = (value: string): string[] =>
  value
    .split(',')
    .map((server) => server.trim())
    .filter((server) => server.length > 0);

@Module({
  providers: [
    {
      provide: NATS_CONNECTION,
      useFactory: async () => {
        const envUrl = process.env.NATS_URL?.trim();
        const envServers = process.env.NATS_SERVERS?.trim();
        const servers = envUrl
          ? [envUrl]
          : envServers
            ? parseServers(envServers)
            : [];

        if (servers.length === 0) {
          throw new Error(
            'NATS_URL or NATS_SERVERS must be set to configure the NATS connection.'
          );
        }
        const nc = await connectWithRetry(
          { servers },
          {
            maxRetries: Number(process.env.NATS_MAX_RETRIES ?? 10),
            retryDelayMs: Number(process.env.NATS_RETRY_DELAY_MS ?? 1000),
          },
          log
        );
        const jsm = await nc.jetstreamManager();
        await ensureEventsStream(jsm, log);
        return nc;
      },
    },
    {
      provide: EventPublisher,
      useFactory: (nc: NatsConnection) => {
        const js: JetStreamClient = nc.jetstream();
        return new EventPublisher(js, log);
      },
      inject: [NATS_CONNECTION],
    },
    EventPullConsumer,
    NatsHealthIndicator,
  ],
  exports: [EventPublisher, EventPullConsumer, NatsHealthIndicator],
})
export class MessagingModule implements OnModuleDestroy {
  constructor(@Inject(NATS_CONNECTION) private readonly nc: NatsConnection) {}

  async onModuleDestroy() {
    await this.nc.drain();
    await this.nc.close();
  }
}
