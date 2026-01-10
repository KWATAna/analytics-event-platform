import {
  JetStreamManager,
  NatsError,
  RetentionPolicy,
  StorageType,
} from 'nats';
import { LogFn } from './nats-connection';

const isNatsError = (error: unknown): error is NatsError =>
  error instanceof Error && 'code' in error;

export const ensureEventsStream = async (
  jsm: JetStreamManager,
  log: LogFn
): Promise<void> => {
  try {
    await jsm.streams.info('EVENTS_STREAM');
    log({ level: 'info', message: 'events_stream_exists' });
  } catch (error) {
    if (isNatsError(error) && error.code !== '404') {
      throw error;
    }

    await jsm.streams.add({
      name: 'EVENTS_STREAM',
      subjects: ['events.*'],
      storage: StorageType.File,
      retention: RetentionPolicy.Limits,
      max_age: 24 * 60 * 60 * 1_000_000_000,
    });
    log({ level: 'info', message: 'events_stream_created' });
  }
};
