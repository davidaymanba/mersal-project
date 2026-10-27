import { Global, Injectable, Module } from '@nestjs/common';
import { computeReliability } from '@mersal/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Recomputes a traveller's reliability from their actual record (used by matching). */
@Injectable()
export class ReliabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async recompute(userId: string): Promise<number> {
    const [user, delivered, withdrawals, lostDisputes] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.shipment.count({
        where: { travellerId: userId, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
      // A withdrawal is the traveller moving a matched parcel back to matching.
      this.prisma.shipmentEvent.count({
        where: { actorId: userId, fromStatus: 'MATCHED', toStatus: 'MATCHING' },
      }),
      this.prisma.dispute.count({
        where: {
          status: 'RESOLVED',
          resolution: { in: ['FULL_REFUND', 'PARTIAL_REFUND'] },
          shipment: { travellerId: userId },
        },
      }),
    ]);
    const score = computeReliability({
      delivered,
      failed: withdrawals + lostDisputes,
      offersReceived: user.offersReceived,
      offersAnswered: user.offersAnswered,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
    });
    await this.prisma.user.update({ where: { id: userId }, data: { reliabilityScore: score } });
    return score;
  }
}

@Global()
@Module({ providers: [ReliabilityService], exports: [ReliabilityService] })
export class ReliabilityModule {}
