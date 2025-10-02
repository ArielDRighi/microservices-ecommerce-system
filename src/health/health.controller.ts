import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Get application health status',
    description:
      'Returns the overall health status of the application including database, memory, and disk usage',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
  })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Check if application is ready',
    description:
      'Returns readiness status - indicates if the application is ready to receive traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Check if application is alive',
    description: 'Returns liveness status - indicates if the application is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not responding',
  })
  @HealthCheck()
  checkLiveness(): Promise<HealthCheckResult> {
    return this.healthService.checkLiveness();
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Get detailed health information',
    description:
      'Returns comprehensive health status including all components (database, Redis, queues, memory, disk)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health check successful',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more components are unhealthy',
  })
  @HealthCheck()
  checkDetailed(): Promise<HealthCheckResult> {
    return this.healthService.checkDetailed();
  }
}
