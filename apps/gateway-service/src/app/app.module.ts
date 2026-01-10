import { Module } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [MessagingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
