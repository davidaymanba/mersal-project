import { Controller, Injectable, Module, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewSchema, type ReviewView } from '@mersal/shared';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { conflict, notFound } from '../common/errors';
import { ApiZodBody, ZodBody } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';

const REVIEWABLE = ['DELIVERED', 'COMPLETED'];

/** Sender and traveller rate each other once the parcel is delivered. */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reliability: ReliabilityService,
  ) {}

  async create(
    author: AuthUser,
    shipmentId: string,
    input: z.output<typeof ReviewSchema>,
  ): Promise<ReviewView> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || (shipment.senderId !== author.id && shipment.travellerId !== author.id))
      throw notFound('Shipment not found');
    if (!REVIEWABLE.includes(shipment.status) || !shipment.travellerId)
      throw conflict('review_not_allowed', 'You can review after delivery');
    const targetId = author.id === shipment.senderId ? shipment.travellerId : shipment.senderId;

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            shipmentId,
            authorId: author.id,
            targetId,
            rating: input.rating,
            comment: input.comment,
          },
        });
        const stats = await tx.review.aggregate({
          where: { targetId },
          _avg: { rating: true },
          _count: true,
        });
        await tx.user.update({
          where: { id: targetId },
          data: { ratingAvg: stats._avg.rating, ratingCount: stats._count },
        });
        return created;
      });
      if (targetId === shipment.travellerId) await this.reliability.recompute(targetId);
      return {
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw conflict('review_exists', 'You already reviewed this delivery');
      throw error;
    }
  }
}

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('shipments/:id/review')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiZodBody(ReviewSchema)
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(ReviewSchema) body: z.output<typeof ReviewSchema>,
  ) {
    return this.reviews.create(user, id, body);
  }
}

@Module({ controllers: [ReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
