import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MatchingConfigSchema, RejectOfferSchema, WithdrawSchema } from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { notFound } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { JobsService } from '../jobs/jobs.module';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from './matching.service';
import { offerInclude, toOfferView } from './offer.mapper';

@ApiTags('offers')
@ApiBearerAuth()
@Controller('offers')
export class OffersController {
  constructor(
    private readonly matching: MatchingService,
    private readonly prisma: PrismaService,
  ) {}

  /** Proposals for the signed-in traveller. `status=open` (default) or `history`. */
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('status') status = 'open') {
    const offers = await this.prisma.matchOffer.findMany({
      where: {
        travellerId: user.id,
        status: status === 'history' ? { not: 'PENDING' } : 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: offerInclude,
    });
    return offers.map(toOfferView);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const offer = await this.prisma.matchOffer.findUnique({ where: { id }, include: offerInclude });
    if (!offer || offer.travellerId !== user.id) throw notFound('Offer not found');
    return toOfferView(offer);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.matching.accept(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @ApiZodBody(RejectOfferSchema)
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(RejectOfferSchema) body: z.output<typeof RejectOfferSchema>,
  ) {
    await this.matching.reject(user.id, id, body.reason);
  }
}

@ApiTags('offers')
@ApiBearerAuth()
@Controller('shipments/:id/withdraw')
export class WithdrawController {
  constructor(private readonly matching: MatchingService) {}

  /** Traveller hands back a parcel they accepted, before pickup. */
  @Post()
  @HttpCode(204)
  @ApiZodBody(WithdrawSchema)
  async withdraw(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(WithdrawSchema) body: z.output<typeof WithdrawSchema>,
  ) {
    await this.matching.withdraw(user, id, body.reason);
  }
}

const ProposeSchema = z.object({ tripId: z.string().min(1) });

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/matching')
export class AdminMatchingController {
  constructor(
    private readonly matching: MatchingService,
    private readonly jobs: JobsService,
  ) {}

  @Get('config')
  config() {
    return this.matching.getConfig();
  }

  @Put('config')
  @ApiZodBody(MatchingConfigSchema)
  updateConfig(
    @ZodBody(MatchingConfigSchema) body: z.output<typeof MatchingConfigSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    return this.matching.updateConfig(body, admin.id, requestMeta(req));
  }

  @Get('shipments/:id')
  log(@Param('id') id: string) {
    return this.matching.shipmentMatchingLog(id);
  }

  @Get('shipments/:id/trips')
  trips(@Param('id') id: string) {
    return this.matching.candidateTrips(id);
  }

  /** Runs matching again now (also restarts a NO_MATCH parcel). */
  @Post('shipments/:id/rerun')
  @HttpCode(200)
  rerun(@Param('id') id: string) {
    return this.matching.run(id, 'RETRY');
  }

  @Post('shipments/:id/propose')
  @HttpCode(200)
  @ApiZodBody(ProposeSchema)
  propose(
    @Param('id') id: string,
    @ZodBody(ProposeSchema) body: z.output<typeof ProposeSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    return this.matching.adminPropose(admin.id, id, body.tripId, requestMeta(req));
  }

  /** Forces the maintenance tick (offer expiry, window sweep) — useful in demos. */
  @Post('tick')
  @HttpCode(200)
  async tick(@Body() _body: unknown) {
    return {
      expired: await this.matching.expireOffers(),
      swept: await this.matching.sweepExpiredWindows(),
    };
  }
}
