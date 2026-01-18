import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@analytics-event-platform/persistence';

@Injectable()
export class ReportingRefreshService {
  private refreshInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshMaterializedView(): Promise<void> {
    if (this.refreshInProgress) {
      return;
    }

    this.refreshInProgress = true;
    const startedAt = Date.now();

    try {
      await this.prisma.$executeRawUnsafe(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_campaign_stats',
      );
      this.logger.info({
        msg: 'reporting_view_refreshed',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error({
        msg: 'reporting_view_refresh_failed',
        error: errorMessage,
      });
    } finally {
      this.refreshInProgress = false;
    }
  }
}
