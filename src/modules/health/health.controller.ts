import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'cube-ai',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      check: 'liveness',
    };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ok',
      check: 'readiness',
      dependencies: {
        database: 'ok',
        storage: 'ok',
        rag: 'ok',
      },
    };
  }
}
