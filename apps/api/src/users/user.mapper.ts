import type { MeResponse } from '@mersal/shared';
import type { User } from '@prisma/client';

export function toMe(user: User): MeResponse {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    locale: (['en', 'fr', 'ar'].includes(user.locale) ? user.locale : 'en') as MeResponse['locale'],
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    travellerStatus: user.travellerStatus,
    reliabilityScore: user.reliabilityScore,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    payoutsEnabled: user.payoutsEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Public profile of the other party in a shipment — no contact details. */
export function toPublicProfile(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastInitial: user.lastName.slice(0, 1),
    verified: user.travellerStatus === 'APPROVED',
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    memberSince: user.createdAt.toISOString(),
  };
}
