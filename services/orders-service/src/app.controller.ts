import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Get application info',
    description: 'Returns basic information about the E-Commerce Async Resilient System',
  })
  @ApiResponse({
    status: 200,
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'E-Commerce Async Resilient System' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string' },
        status: { type: 'string', example: 'running' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 1234.56 },
        environment: { type: 'string', example: 'development' },
        docs: { type: 'string', example: '/api/v1/docs' },
      },
    },
  })
  getHello() {
    return this.appService.getAppInfo();
  }

  @Get('version')
  @ApiOperation({
    summary: 'Get application version',
    description: 'Returns the current version of the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '1.0.0' },
        build: { type: 'string', example: 'dev-build' },
        commit: { type: 'string', example: 'abc123' },
      },
    },
  })
  getVersion() {
    return this.appService.getVersion();
  }
}
