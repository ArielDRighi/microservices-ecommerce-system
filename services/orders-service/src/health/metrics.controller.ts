import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrometheusService } from './prometheus.service';

/**
 * Metrics Controller
 * Provides Prometheus-compatible metrics endpoint
 */
@ApiTags('Monitoring')
@Controller()
@Public()
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get('metrics')
  @ApiExcludeEndpoint() // Exclude from Swagger as it returns Prometheus format
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns application metrics in Prometheus format for monitoring and alerting',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP orders_processed_total Total number of orders processed
# TYPE orders_processed_total counter
orders_processed_total 1234

# HELP order_processing_duration_seconds Order processing duration in seconds
# TYPE order_processing_duration_seconds histogram
order_processing_duration_seconds_bucket{le="0.5"} 100
order_processing_duration_seconds_bucket{le="1"} 150
order_processing_duration_seconds_sum 234.5
order_processing_duration_seconds_count 200`,
        },
      },
    },
  })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.prometheusService.getMetrics();
    res.send(metrics);
  }
}
