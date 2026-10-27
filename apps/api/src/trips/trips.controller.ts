import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TripInputSchema } from '@mersal/shared';
import type { Request } from 'express';
import type { z } from 'zod';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @ApiZodBody(TripInputSchema)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(TripInputSchema) body: z.output<typeof TripInputSchema>,
    @Req() req: Request,
  ) {
    return this.trips.create(user, body, requestMeta(req));
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trips.listMine(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trips.get(user, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.trips.cancel(user, id, requestMeta(req));
  }
}
