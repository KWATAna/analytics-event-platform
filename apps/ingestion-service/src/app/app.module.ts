import { Module } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProcessorService } from '../ingestion-service/processor.service';
import { HealthController } from './health.controller';
import { MemoryBackpressureIndicator } from './memory-backpressure.indicator';

@Module({
  imports: [MessagingModule, PersistenceModule, TerminusModule],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ProcessorService,
    MemoryBackpressureIndicator,
    PrismaHealthIndicator,
  ],
})
export class AppModule {}
