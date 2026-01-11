import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestSizeLogger } from './request-size-logger.middleware';
import { HealthController } from './health.controller';

@Module({
  imports: [MessagingModule, TerminusModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestSizeLogger).forRoutes('*');
  }
}
