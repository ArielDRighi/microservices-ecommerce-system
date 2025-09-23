import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: 'E-Commerce Async Resilient System',
      version: '1.0.0',
      description:
        'Sistema resiliente y escalable para procesamiento asíncrono de órdenes de e-commerce',
      status: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      docs: `/api/v1/docs`,
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      build: process.env['NODE_ENV'] === 'production' ? 'prod-build' : 'dev-build',
      commit: process.env['GIT_COMMIT'] || 'local-dev',
    };
  }
}
