import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReportingService, ReportFilters } from './reporting.service';

type ReportQuery = {
  source?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  limit?: string;
};

@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('summary')
  async getSummary(@Query() query: ReportQuery) {
    const filters = this.parseFilters(query);
    return this.reportingService.getAggregatedMetrics(filters);
  }

  @Get('top-campaigns')
  async getTopCampaigns(@Query() query: ReportQuery) {
    const filters = this.parseFilters(query);
    const limit = this.parseLimit(query.limit, 10);
    return this.reportingService.getTopEntities(limit, filters);
  }

  @Get('geography')
  async getGeography(@Query() query: ReportQuery) {
    const filters = this.parseFilters(query);
    return this.reportingService.getCountryBreakdown(filters);
  }

  private parseFilters(query: ReportQuery): ReportFilters {
    const source = this.parseSource(query.source);
    const { startDate, endDate } = this.parseDateRange(query);

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    return {
      source,
      startDate,
      endDate,
    };
  }

  private parseSource(
    value?: string,
  ): ReportFilters['source'] | undefined {
    if (!value) {
      return undefined;
    }

    if (value === 'facebook' || value === 'tiktok') {
      return value;
    }

    throw new BadRequestException('source must be facebook or tiktok');
  }

  private parseDateRange(query: ReportQuery): {
    startDate?: Date;
    endDate?: Date;
  } {
    if (query.dateRange) {
      const parts = query.dateRange.split(',');
      if (parts.length !== 2) {
        throw new BadRequestException(
          'dateRange must be in the format startDate,endDate',
        );
      }
      return {
        startDate: this.parseDate(parts[0], 'dateRange start'),
        endDate: this.parseDate(parts[1], 'dateRange end'),
      };
    }

    return {
      startDate: this.parseDate(query.startDate, 'startDate'),
      endDate: this.parseDate(query.endDate, 'endDate'),
    };
  }

  private parseDate(value: string | undefined, label: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is not a valid date`);
    }

    return parsed;
  }

  private parseLimit(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return parsed;
  }
}
