import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { ReportingController } from './reporting.controller';
import { ReportingRefreshService } from './reporting-refresh.service';
import { ReportingService } from './reporting.service';
import { HealthController } from './health.controller';
import { ViewIntegrityIndicator } from './view-integrity.indicator';
import { FreshnessIndicator } from './freshness.indicator';

@Module({
  imports: [PersistenceModule, ScheduleModule.forRoot(), TerminusModule],
  controllers: [ReportingController, HealthController],
  providers: [
    ReportingService,
    ReportingRefreshService,
    ViewIntegrityIndicator,
    FreshnessIndicator,
  ],
})
export class ReportingModule {}
