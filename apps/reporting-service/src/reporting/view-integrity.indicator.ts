import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { Prisma } from '@my-project/db-client';
import { PrismaService } from '@analytics-event-platform/persistence';

@Injectable()
export class ViewIntegrityIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.prisma.$queryRaw(
        Prisma.sql`SELECT 1 FROM daily_campaign_stats LIMIT 1`,
      );

      return indicator.up({
        view: 'daily_campaign_stats',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({
        view: 'daily_campaign_stats',
        message,
      });
    }
  }
}
