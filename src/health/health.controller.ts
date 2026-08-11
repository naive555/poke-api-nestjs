import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Liveness only: it answers as soon as the process is accepting connections.
   * Deliberately does not touch Postgres or Redis - a readiness probe that
   * fails on a brief dependency blip would have the orchestrator restart a
   * process that is perfectly capable of recovering on its own.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        uptime: 12.34,
        timestamp: '2026-08-11T12:00:00.000Z',
      },
    },
  })
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
