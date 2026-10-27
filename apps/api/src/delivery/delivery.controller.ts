import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OneTimeCodeSchema } from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { DeliveryService } from './delivery.service';

const CodeSchema = z.object({ code: OneTimeCodeSchema });

@ApiTags('delivery')
@ApiBearerAuth()
@Controller('shipments/:id')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  /** Traveller confirms pickup with the code shown to the sender. */
  @Post('pickup')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodBody(CodeSchema)
  async pickup(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(CodeSchema) body: z.output<typeof CodeSchema>,
    @Req() req: Request,
  ) {
    await this.delivery.pickup(user, id, body.code, requestMeta(req));
  }

  @Post('in-transit')
  @HttpCode(204)
  async inTransit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.delivery.startTransit(user, id);
  }

  /** Traveller confirms delivery with the code held by the recipient. */
  @Post('deliver')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodBody(CodeSchema)
  async deliver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(CodeSchema) body: z.output<typeof CodeSchema>,
    @Req() req: Request,
  ) {
    await this.delivery.deliver(user, id, body.code, requestMeta(req));
  }
}

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly delivery: DeliveryService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':token')
  track(@Param('token') token: string) {
    return this.delivery.track(token);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/shipments/:id')
export class AdminDeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post('reset-code-attempts')
  @HttpCode(204)
  async reset(@Param('id') id: string, @CurrentUser() admin: AuthUser, @Req() req: Request) {
    await this.delivery.resetCodeAttempts(admin.id, id, requestMeta(req));
  }
}
