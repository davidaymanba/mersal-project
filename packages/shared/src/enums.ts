/**
 * Domain enums shared across API, web and mobile. They mirror the Prisma enums in
 * apps/api/prisma/schema.prisma — keep both in sync.
 */

export const UserRole = { USER: 'USER', ADMIN: 'ADMIN' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const VerificationStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const ShipmentStatus = {
  DRAFT: 'DRAFT',
  QUOTED: 'QUOTED',
  PAID: 'PAID',
  MATCHING: 'MATCHING',
  MATCHED: 'MATCHED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  NO_MATCH: 'NO_MATCH',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
  REFUNDED: 'REFUNDED',
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

/** Allowed status transitions. Anything not listed here is rejected by the API. */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['PAID', 'CANCELLED'],
  PAID: ['MATCHING', 'CANCELLED', 'REFUNDED'],
  MATCHING: ['MATCHED', 'NO_MATCH', 'CANCELLED'],
  MATCHED: ['PICKED_UP', 'MATCHING', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED', 'DISPUTED'],
  IN_TRANSIT: ['DELIVERED', 'DISPUTED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  NO_MATCH: ['MATCHING', 'REFUNDED', 'CANCELLED'],
  CANCELLED: ['REFUNDED'],
  DISPUTED: ['COMPLETED', 'REFUNDED'],
  REFUNDED: [],
};

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return SHIPMENT_TRANSITIONS[from].includes(to);
}

export const Urgency = { STANDARD: 'STANDARD', EXPRESS: 'EXPRESS' } as const;
export type Urgency = (typeof Urgency)[keyof typeof Urgency];

export const TripStatus = {
  PUBLISHED: 'PUBLISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const MatchOfferStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type MatchOfferStatus = (typeof MatchOfferStatus)[keyof typeof MatchOfferStatus];

/** Wallet buckets. A traveller's balance in each bucket is the sum of its ledger entries. */
export const LedgerBucket = {
  PENDING: 'PENDING',
  HELD: 'HELD',
  AVAILABLE: 'AVAILABLE',
  BLOCKED: 'BLOCKED',
  PAID_OUT: 'PAID_OUT',
  REVERSED: 'REVERSED',
} as const;
export type LedgerBucket = (typeof LedgerBucket)[keyof typeof LedgerBucket];

export const PaymentStatus = {
  REQUIRES_PAYMENT: 'REQUIRES_PAYMENT',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PayoutStatus = {
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const DisputeReason = {
  NOT_DELIVERED: 'NOT_DELIVERED',
  DAMAGED: 'DAMAGED',
  ITEM_MISSING: 'ITEM_MISSING',
  LATE: 'LATE',
  OTHER: 'OTHER',
  CHARGEBACK: 'CHARGEBACK',
} as const;
export type DisputeReason = (typeof DisputeReason)[keyof typeof DisputeReason];

export const DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DisputeResolution = {
  FULL_REFUND: 'FULL_REFUND',
  PARTIAL_REFUND: 'PARTIAL_REFUND',
  RELEASE_TO_TRAVELLER: 'RELEASE_TO_TRAVELLER',
} as const;
export type DisputeResolution = (typeof DisputeResolution)[keyof typeof DisputeResolution];

export const Locale = { EN: 'en', FR: 'fr', AR: 'ar' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
export const LOCALES: readonly Locale[] = ['en', 'fr', 'ar'];
export const RTL_LOCALES: readonly Locale[] = ['ar'];
