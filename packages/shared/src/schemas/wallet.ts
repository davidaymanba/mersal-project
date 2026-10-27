import { z } from 'zod';
import type { LedgerBucket, PaymentStatus, PayoutStatus } from '../enums';

/** Demo-mode bank details. With Stripe, travellers onboard on Stripe's hosted page instead. */
export const PayoutAccountSchema = z.object({
  holderName: z.string().trim().min(2).max(120),
  iban: z
    .string()
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/)),
});

export const RefundSchema = z.object({
  /** Minor units; omit for a full refund. */
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(300),
});

export interface PaymentStart {
  paymentId: string;
  provider: 'stripe' | 'demo';
  amount: number;
  currency: string;
  /** Stripe Checkout URL; absent for the demo provider. */
  redirectUrl?: string;
}

export interface WalletEntryView {
  id: string;
  type: string;
  bucket: LedgerBucket;
  amount: number;
  currency: string;
  releaseAt: string | null;
  createdAt: string;
  shipment: { id: string; reference: string } | null;
}

export interface PayoutView {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface WalletView {
  currency: string;
  balances: {
    /** Earnings for parcels currently being carried (not yet delivered). */
    expected: number;
    /** Delivered, inside the complaint window. */
    held: number;
    /** Ready for the next weekly payout. */
    available: number;
    /** Frozen while a dispute is open. */
    blocked: number;
    paidOut: number;
  };
  holdHours: number;
  nextPayoutAt: string;
  payoutAccount: { provider: 'stripe' | 'demo'; ready: boolean; label: string | null };
  entries: WalletEntryView[];
  payouts: PayoutView[];
}

export interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  provider: string;
  createdAt: string;
}
