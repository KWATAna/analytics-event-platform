import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { Prisma } from '@my-project/db-client';
import { PrismaService } from '@analytics-event-platform/persistence';

const DEFAULT_THRESHOLD_MS = 5 * 60 * 1000;

@Injectable()
export class FreshnessIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(
    key: string,
    thresholdMs: number = DEFAULT_THRESHOLD_MS,
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          latest: Date | string | null;
        }>
      >(Prisma.sql`SELECT MAX("timestamp") AS "latest" FROM events`);

      const latest = rows[0]?.latest ?? null;
      const latestDate = latest ? new Date(latest) : null;
      const ageMs = latestDate ? Date.now() - latestDate.getTime() : null;

      if (!latestDate || Number.isNaN(latestDate.getTime())) {
        return indicator.up({
          status: 'warning',
          reason: 'no_events',
          thresholdMs,
        });
      }

      if (ageMs !== null && ageMs > thresholdMs) {
        return indicator.up({
          status: 'warning',
          latest: latestDate.toISOString(),
          ageMs,
          thresholdMs,
        });
      }

      return indicator.up({
        latest: latestDate.toISOString(),
        ageMs,
        thresholdMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({
        message,
        thresholdMs,
      });
    }
  }
}
