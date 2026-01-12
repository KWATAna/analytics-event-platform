import { connect, ConnectionOptions, NatsConnection } from 'nats';
import type { LogPayload } from '@analytics-event-platform/shared/logger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFn = (payload: LogPayload & { level?: LogLevel }) => void;

export interface RetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const startStatusListener = async (
  nc: NatsConnection,
  log: LogFn
): Promise<void> => {
  for await (const status of nc.status()) {
    if (status.type === 'disconnect' || status.type === 'reconnect') {
      log({
        level: 'info',
        msg: 'nats_status',
        type: status.type,
        data: status.data,
      });
    }
  }
};

export const connectWithRetry = async (
  options: ConnectionOptions,
  retry: RetryOptions,
  log: LogFn
): Promise<NatsConnection> => {
  const maxRetries = retry.maxRetries ?? 10;
  const retryDelayMs = retry.retryDelayMs ?? 1000;
  let attempt = 0;

  while (true) {
    try {
      const nc = await connect(options);
      void startStatusListener(nc, log);
      void nc.closed().then((err) => {
        if (err) {
          log({
            level: 'error',
            msg: 'nats_closed',
            error: err.message,
          });
        }
      });
      log({ level: 'info', msg: 'nats_connected', servers: options.servers });
      return nc;
    } catch (error) {
      attempt += 1;
      const message = error instanceof Error ? error.message : String(error);
      log({
        level: 'warn',
        msg: 'nats_connect_failed',
        attempt,
        error: message,
      });

      if (attempt >= maxRetries) {
        throw error;
      }

      const backoff = Math.min(retryDelayMs * 2 ** (attempt - 1), 30000);
      await delay(backoff);
    }
  }
};
