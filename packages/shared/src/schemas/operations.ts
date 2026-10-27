import { z } from 'zod';
import type { DisputeReason, DisputeResolution, DisputeStatus } from '../enums';

export const DISPUTE_REASONS = [
  'NOT_DELIVERED',
  'DAMAGED',
  'ITEM_MISSING',
  'LATE',
  'OTHER',
] as const;

export const OpenDisputeSchema = z.object({
  reason: z.enum(DISPUTE_REASONS),
  description: z.string().trim().min(10).max(2000),
});

export const ResolveDisputeSchema = z
  .object({
    resolution: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'RELEASE_TO_TRAVELLER']),
    /** Minor units, required for PARTIAL_REFUND. */
    refundAmount: z.number().int().positive().optional(),
    note: z.string().trim().min(3).max(1000),
  })
  .refine((v) => v.resolution !== 'PARTIAL_REFUND' || !!v.refundAmount, {
    path: ['refundAmount'],
    message: 'refundAmount is required',
  });

export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const WithdrawSchema = z.object({ reason: z.string().trim().min(3).max(300) });

export const SettingsSchema = z.object({
  'wallet.holdHours': z
    .number()
    .int()
    .min(1)
    .max(24 * 14),
  'wallet.demoHoldMinutes': z.number().int().min(1).max(120),
  'payouts.weekday': z.number().int().min(0).max(6),
  'matching.demoOfferTtlMinutes': z.number().int().min(1).max(120),
  'quotes.ttlMinutes': z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
  'disputes.windowHours': z
    .number()
    .int()
    .min(1)
    .max(24 * 30),
});
export type PlatformSettings = z.output<typeof SettingsSchema>;

export interface DisputeView {
  id: string;
  shipmentId: string;
  reason: DisputeReason;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  refundAmount: number | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReviewView {
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AdminAnalytics {
  currency: string;
  kpis: {
    gmv: number;
    commission: number;
    refunds: number;
    paidShipments: number;
    matchRate: number | null;
    avgHoursToMatch: number | null;
    activeTrips: number;
    openDisputes: number;
    pendingVerifications: number;
    heldFunds: number;
    availableToPay: number;
    users: number;
    verifiedTravellers: number;
  };
  byStatus: { status: string; count: number }[];
  byCorridor: { corridor: string; shipments: number; gmv: number }[];
  daily: { date: string; created: number; paid: number; delivered: number }[];
}
