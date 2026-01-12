import { Module } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { HealthController } from './controllers/health.controller';
import { MemoryBackpressureIndicator } from './indicators/memory-backpressure.indicator';
import { ProcessorService } from '../ingestion-service/processor.service';
import { BatchLoggingInterceptor } from '../ingestion-service/batch-logging.interceptor';
import { NatsTraceInterceptor } from '../ingestion-service/nats-trace.interceptor';

@Module({
  imports: [
    LoggerModule.forRoot(createLoggerModuleOptions()),
    MessagingModule,
    PersistenceModule,
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [
    ProcessorService,
    BatchLoggingInterceptor,
    NatsTraceInterceptor,
    MemoryBackpressureIndicator,
    PrismaHealthIndicator,
  ],
})
export class AppModule {}
