import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { NatsHealthIndicator } from '@analytics-event-platform/messaging';
import { PrismaService } from '@analytics-event-platform/persistence';
import { MemoryBackpressureIndicator } from '../indicators/memory-backpressure.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly natsHealth: NatsHealthIndicator,
    private readonly memoryHealth: MemoryBackpressureIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.natsHealth.isHealthy('nats', { checkStream: true }),
      () => this.memoryHealth.isHealthy('memory', { threshold: 0.8 }),
    ]);
  }
}
