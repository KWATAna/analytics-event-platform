import { Injectable } from '@nestjs/common';
import { logger } from '@analytics-event-platform/shared/logger';

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
export class BatchLoggingInterceptor {
  async intercept<T extends BatchResult>(
    context: BatchLogContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    logger.info({
      msg: 'ingestion_batch_start',
      ...context,
    });

    const result = await handler();

    logger.info({
      msg: 'ingestion_batch_complete',
      ...context,
      ...result,
      durationMs: Date.now() - startedAt,
    });

    return result;
  }
}
