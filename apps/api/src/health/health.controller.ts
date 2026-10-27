import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { Public } from '../common/auth-user';
import { AppConfig } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';

type Check = 'up' | 'down';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: AppConfig,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Service and dependency status' })
  async check() {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then((): Check => 'up').catch((): Check => 'down'),
      this.redis
        .ping()
        .then((): Check => 'up')
        .catch((): Check => 'down'),
    ]);
    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'degraded',
      checks: { db, redis },
      demoMode: this.config.demoMode,
      time: new Date().toISOString(),
    };
  }
}
