import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { FreshnessIndicator } from './freshness.indicator';
import { ViewIntegrityIndicator } from './view-integrity.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly viewIntegrity: ViewIntegrityIndicator,
    private readonly freshness: FreshnessIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    const base = await this.health.check([
      () => this.viewIntegrity.isHealthy('viewIntegrity'),
    ]);
    const freshness = await this.freshness.isHealthy('dataFreshness');

    return {
      ...base,
      info: { ...base.info, ...freshness },
      details: { ...base.details, ...freshness },
      warnings: freshness,
    };
  }
}
