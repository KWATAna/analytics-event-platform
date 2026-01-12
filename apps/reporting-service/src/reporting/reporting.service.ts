import { Injectable } from '@nestjs/common';
import { Prisma } from '@my-project/db-client';
import { PrismaService } from '@analytics-event-platform/persistence';
import { logger } from '@analytics-event-platform/shared/logger';

export type ReportFilters = {
  source?: 'facebook' | 'tiktok';
  startDate?: Date;
  endDate?: Date;
};

type SummaryRow = {
  day: string;
  totalEvents: number;
  totalRevenue: number;
};

type TopEntityRow = {
  campaignId: string;
  totalRevenue: number;
  adClicks: number;
  totalEvents: number;
};

type CountryBreakdownRow = {
  country: string;
  totalEvents: number;
  totalRevenue: number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ReportingService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly prisma: PrismaService) {}

  async getAggregatedMetrics(filters: ReportFilters): Promise<SummaryRow[]> {
    const cacheKey = this.buildCacheKey('summary', filters);
    return this.getCached(cacheKey, async () => {
      const whereClause = this.buildWhereClause(filters, Prisma.raw('day'));
      const rows = await this.prisma.$queryRaw<
        Array<{
          day: string;
          totalEvents: string | number | bigint;
          totalRevenue: string | number;
        }>
      >(Prisma.sql`
        SELECT
          day::text AS "day",
          SUM(total_events)::bigint AS "totalEvents",
          SUM(total_revenue)::numeric AS "totalRevenue"
        FROM daily_campaign_stats
        ${whereClause}
        GROUP BY day
        ORDER BY day ASC
      `);

      logger.debug({
        msg: 'reporting_summary_query',
        rowCount: rows.length,
        totalRevenueType: typeof rows[0]?.totalRevenue,
      });
      return rows.map((row) => ({
        day: row.day,
        totalEvents: this.toNumber(row.totalEvents),
        totalRevenue: this.toNumber(row.totalRevenue),
      }));
    });
  }

  async getTopEntities(
    limit: number,
    filters: ReportFilters,
  ): Promise<TopEntityRow[]> {
    const cacheKey = this.buildCacheKey('top-entities', { limit, ...filters });
    return this.getCached(cacheKey, async () => {
      const campaignExpr = Prisma.sql`
        COALESCE(
          data->'data'->'engagement'->>'campaignId',
          data->'data'->'engagement'->>'campaign_id',
          data->'engagement'->>'campaignId',
          data->'engagement'->>'campaign_id'
        )
      `;
      const whereClause = this.buildWhereClause(
        filters,
        Prisma.raw('"timestamp"'),
        [Prisma.sql`${campaignExpr} IS NOT NULL`],
      );

      const rows = await this.prisma.$queryRaw<
        Array<{
          campaignId: string;
          totalRevenue: string | number;
          adClicks: string | number | bigint;
          totalEvents: string | number | bigint;
        }>
      >(Prisma.sql`
        SELECT
          ${campaignExpr} AS "campaignId",
          SUM(
            CASE
              WHEN event_type IN ('checkout.complete', 'purchase') THEN COALESCE(purchase_amount, 0)
              ELSE 0
            END
          )::numeric AS "totalRevenue",
          SUM(
            CASE
              WHEN event_type = 'ad.click' THEN 1
              ELSE 0
            END
          )::bigint AS "adClicks",
          COUNT(*)::bigint AS "totalEvents"
        FROM events
        ${whereClause}
        GROUP BY "campaignId"
        ORDER BY "totalRevenue" DESC, "adClicks" DESC
        LIMIT ${limit}
      `);

      return rows.map((row) => ({
        campaignId: row.campaignId,
        totalRevenue: this.toNumber(row.totalRevenue),
        adClicks: this.toNumber(row.adClicks),
        totalEvents: this.toNumber(row.totalEvents),
      }));
    });
  }

  async getCountryBreakdown(
    filters: ReportFilters,
  ): Promise<CountryBreakdownRow[]> {
    const cacheKey = this.buildCacheKey('country-breakdown', filters);
    return this.getCached(cacheKey, async () => {
      const whereClause = this.buildWhereClause(
        filters,
        Prisma.raw('"timestamp"'),
      );
      const rows = await this.prisma.$queryRaw<
        Array<{
          country: string;
          totalEvents: string | number | bigint;
          totalRevenue: string | number;
        }>
      >(Prisma.sql`
        SELECT
          COALESCE(
            data->'data'->'user'->'location'->>'country',
            data->'user'->'location'->>'country',
            data->'data'->'engagement'->>'country',
            data->'engagement'->>'country',
            'unknown'
          ) AS "country",
          COUNT(*)::bigint AS "totalEvents",
          SUM(
            CASE
              WHEN event_type IN ('checkout.complete', 'purchase') THEN COALESCE(purchase_amount, 0)
              ELSE 0
            END
          )::numeric AS "totalRevenue"
        FROM events
        ${whereClause}
        GROUP BY "country"
        ORDER BY "totalEvents" DESC
      `);

      return rows.map((row) => ({
        country: row.country,
        totalEvents: this.toNumber(row.totalEvents),
        totalRevenue: this.toNumber(row.totalRevenue),
      }));
    });
  }

  private buildWhereClause(
    filters: ReportFilters,
    dateColumn: Prisma.Sql,
    extraConditions: Prisma.Sql[] = [],
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [...extraConditions];

    if (filters.source) {
      conditions.push(Prisma.sql`source = ${filters.source}`);
    }

    if (filters.startDate) {
      conditions.push(Prisma.sql`${dateColumn} >= ${filters.startDate}`);
    }

    if (filters.endDate) {
      conditions.push(Prisma.sql`${dateColumn} <= ${filters.endDate}`);
    }

    if (conditions.length === 0) {
      return Prisma.sql``;
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    if (value instanceof Prisma.Decimal) {
      return Number(value.toString());
    }
    if (typeof value === 'object' && 'toString' in value) {
      return Number(String(value));
    }
    return 0;
  }

  private async getCached<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = await loader();
    this.cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  }

  private buildCacheKey(prefix: string, input: unknown): string {
    return `${prefix}:${JSON.stringify(input)}`;
  }
}
