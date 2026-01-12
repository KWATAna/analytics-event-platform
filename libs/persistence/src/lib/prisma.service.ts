import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@my-project/db-client';
import { logger } from '@analytics-event-platform/shared/logger';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const SLOW_QUERY_MS = 200;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter,
      log: [{ emit: 'event', level: 'query' }],
    });

    this.$on('query', (event: Prisma.QueryEvent) => {
      logger.debug({
        msg: 'prisma_query',
        durationMs: event.duration,
        query: event.query,
        params: event.params,
        target: event.target,
      });

      if (event.duration > SLOW_QUERY_MS) {
        logger.warn({
          msg: 'prisma_slow_query',
          durationMs: event.duration,
          query: event.query,
          params: event.params,
          target: event.target,
        });
      }
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ msg: 'prisma_connect_failed', error: message });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
