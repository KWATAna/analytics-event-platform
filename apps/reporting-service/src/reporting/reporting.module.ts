import { Module } from '@nestjs/common';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [PersistenceModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
