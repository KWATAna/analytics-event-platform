import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { NatsConnection, NatsError } from 'nats';
import { NATS_CONNECTION } from './messaging.constants';

type NatsHealthOptions = {
  checkStream?: boolean;
  streamName?: string;
};

const DEFAULT_STREAM = 'EVENTS_STREAM';

const isNatsError = (error: unknown): error is NatsError =>
  error instanceof Error && 'code' in error;

@Injectable()
export class NatsHealthIndicator {
  constructor(
    @Inject(NATS_CONNECTION) private readonly nc: NatsConnection,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(
    key: string,
    options: NatsHealthOptions = {},
  ): Promise<HealthIndicatorResult> {
    const streamName = options.streamName ?? DEFAULT_STREAM;
    const checkStream = options.checkStream ?? false;

    const indicator = this.healthIndicatorService.check(key);

    try {
      if (this.nc.isClosed()) {
        throw new Error('NATS connection is closed');
      }

      if (this.nc.isDraining()) {
        throw new Error('NATS connection is draining');
      }

      await this.nc.flush();

      const jsm = await this.nc.jetstreamManager();
      await jsm.getAccountInfo();

      if (checkStream) {
        await jsm.streams.info(streamName);
      }

      return indicator.up({
        checkStream,
        streamName,
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      if (checkStream && isNatsError(error) && error.code === '404') {
        message = `Stream ${streamName} not found`;
      }

      return indicator.down({
        checkStream,
        streamName,
        message,
      });
    }
  }
}
