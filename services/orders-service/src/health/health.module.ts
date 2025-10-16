import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
// import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { HealthService } from './health.service';
import { PrometheusService } from './prometheus.service';
import { DatabaseHealthIndicator } from './indicators';
// TODO: Import when properly configured
// import { RedisHealthIndicator, QueueHealthIndicator } from './indicators';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    // TODO: Import queues to access them in health indicators when properly configured
    // BullModule.registerQueue(
    //   { name: 'order-processing' },
    //   { name: 'payment-processing' },
    // ),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    HealthService,
    PrometheusService,
    DatabaseHealthIndicator,
    // TODO: Add RedisHealthIndicator when Redis client is properly configured
    // RedisHealthIndicator,
    // TODO: Add QueueHealthIndicator when queues are properly accessible
    // QueueHealthIndicator,
  ],
  exports: [HealthService, PrometheusService],
})
export class HealthModule {}
