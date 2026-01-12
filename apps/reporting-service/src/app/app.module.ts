import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [LoggerModule.forRoot(createLoggerModuleOptions()), ReportingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
