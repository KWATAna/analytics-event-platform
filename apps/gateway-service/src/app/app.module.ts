import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestSizeLogger } from './request-size-logger.middleware';
import { HealthController } from './health.controller';
import { TraceMiddleware } from './trace.middleware';

@Module({
  imports: [
    LoggerModule.forRoot(createLoggerModuleOptions()),
    MessagingModule,
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware, RequestSizeLogger).forRoutes('*');
  }
}
