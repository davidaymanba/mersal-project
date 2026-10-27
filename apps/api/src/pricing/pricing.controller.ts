import { Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuoteRequestSchema, SavePricingDraftSchema, SimulatePricingSchema } from '@mersal/shared';
import type { Request } from 'express';
import type { z } from 'zod';
import { CurrentUser, Public, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly pricing: PricingService) {}

  /** Prices a parcel with the corridor's active tariff. Works signed-out (public calculator). */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @ApiZodBody(QuoteRequestSchema)
  create(
    @ZodBody(QuoteRequestSchema) body: z.output<typeof QuoteRequestSchema>,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.pricing.quote(body, user?.id);
  }

  /** Quote ids are unguessable; reading one back lets the shipment form resume from a price. */
  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.pricing.getQuote(id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  overview() {
    return this.pricing.overview();
  }

  @Get('versions/:id')
  version(@Param('id') id: string) {
    return this.pricing.getVersion(id);
  }

  @Post('corridors/:corridorId/versions')
  @ApiZodBody(SavePricingDraftSchema)
  createDraft(
    @Param('corridorId') corridorId: string,
    @ZodBody(SavePricingDraftSchema) body: z.output<typeof SavePricingDraftSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    return this.pricing.createDraft(corridorId, body.rules, body.notes, admin.id, requestMeta(req));
  }

  @Patch('versions/:id')
  @ApiZodBody(SavePricingDraftSchema)
  updateDraft(
    @Param('id') id: string,
    @ZodBody(SavePricingDraftSchema) body: z.output<typeof SavePricingDraftSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    return this.pricing.updateDraft(id, body.rules, body.notes, admin.id, requestMeta(req));
  }

  @Post('versions/:id/activate')
  activate(@Param('id') id: string, @CurrentUser() admin: AuthUser, @Req() req: Request) {
    return this.pricing.activate(id, admin.id, requestMeta(req));
  }

  /** Prices a parcel with unsaved rules — the "try before you publish" simulator. */
  @Post('simulate')
  @HttpCode(200)
  @ApiZodBody(SimulatePricingSchema)
  simulate(@ZodBody(SimulatePricingSchema) body: z.output<typeof SimulatePricingSchema>) {
    return this.pricing.calculate(body.rules, body.parcel);
  }
}
