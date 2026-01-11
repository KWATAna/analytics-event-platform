import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestSizeLogger } from './request-size-logger.middleware';

@Module({
  imports: [MessagingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestSizeLogger).forRoutes('*');
  }
}
