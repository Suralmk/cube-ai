import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';

@AllowAnonymous()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return {
        status: 'ok',
        check: 'readiness',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: 'up',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database readiness check failed: ${message}`);
      throw new ServiceUnavailableException({
        status: 'error',
        check: 'readiness',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: 'down',
        },
        error: message,
      });
    }
  }
}
