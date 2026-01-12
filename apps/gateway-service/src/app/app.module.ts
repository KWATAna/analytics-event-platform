import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MessagingModule } from '@analytics-event-platform/messaging';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerModuleOptions } from '@analytics-event-platform/shared/logger';
import { AppController } from './controllers/app.controller';
import { HealthController } from './controllers/health.controller';
import { RequestSizeLogger } from './middleware/request-size-logger.middleware';
import { TraceMiddleware } from './middleware/trace.middleware';
import { AppService } from './services/app.service';

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
