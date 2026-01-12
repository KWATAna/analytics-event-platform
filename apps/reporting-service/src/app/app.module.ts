import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [LoggerModule.forRoot(createLoggerModuleOptions()), ReportingModule],
})
export class AppModule {}
