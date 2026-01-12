import { Module } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProcessorService } from '../ingestion-service/processor.service';
import { HealthController } from './health.controller';
import { MemoryBackpressureIndicator } from './memory-backpressure.indicator';
import { BatchLoggingInterceptor } from '../ingestion-service/batch-logging.interceptor';
import { NatsTraceInterceptor } from '../ingestion-service/nats-trace.interceptor';

@Module({
  imports: [
    LoggerModule.forRoot(createLoggerModuleOptions()),
    MessagingModule,
    PersistenceModule,
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ProcessorService,
    BatchLoggingInterceptor,
    NatsTraceInterceptor,
    MemoryBackpressureIndicator,
    PrismaHealthIndicator,
  ],
})
export class AppModule {}
