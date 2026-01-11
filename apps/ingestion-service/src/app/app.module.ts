import { Module } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { PersistenceModule } from '@analytics-event-platform/persistence';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProcessorService } from '../ingestion-service/processor.service';

@Module({
  imports: [MessagingModule, PersistenceModule],
  controllers: [AppController],
  providers: [AppService, ProcessorService],
})
export class AppModule {}
