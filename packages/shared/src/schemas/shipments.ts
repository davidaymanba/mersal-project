import { z } from 'zod';
import type { ShipmentStatus, Urgency } from '../enums';
import { LocalizedTextSchema, ParcelSchema, PricingRulesSchema, type QuoteLine } from '../pricing';
import { EmailSchema, PhoneSchema } from './auth';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Shipment details without cross-field rules (forms can .omit()/.pick() from it). */
export const ShipmentDetailsSchema = z.object({
  quoteId: z.string().min(1),
  description: z.string().trim().min(3).max(500),
  earliestDate: isoDate,
  latestDate: isoDate,
  recipientName: z.string().trim().min(2).max(120),
  recipientPhone: PhoneSchema,
  recipientEmail: EmailSchema.optional().or(z.literal('').transform(() => undefined)),
  restrictedItemsAck: z.literal(true),
});

export const CreateShipmentSchema = ShipmentDetailsSchema.refine(
  (v) => v.latestDate >= v.earliestDate,
  {
    path: ['latestDate'],
    message: 'latestDate must be on or after earliestDate',
  },
);
export type CreateShipmentInput = z.input<typeof CreateShipmentSchema>;

export const CancelShipmentSchema = z.object({ reason: z.string().trim().max(300).optional() });

// ─── Catalogue ────────────────────────────────────────────────────────────────

export interface CatalogCity {
  id: string;
  countryCode: string;
  slug: string;
  names: z.infer<typeof LocalizedTextSchema>;
}

export interface CatalogCategory {
  id: string;
  code: string;
  names: z.infer<typeof LocalizedTextSchema>;
  icon: string | null;
  requiresPhotos: boolean;
  maxWeightGrams: number | null;
}

export interface CatalogCorridor {
  id: string;
  code: string;
  originCountry: string;
  destinationCountry: string;
  currency: string;
  /** Paid options available on this corridor (from its active tariff). */
  options: { code: string; names: z.infer<typeof LocalizedTextSchema>; price: number }[];
}

/** Platform rules shown publicly (help pages, checkout), editable by admins in settings. */
export interface PlatformPolicies {
  holdHours: number;
  disputeWindowHours: number;
  /** 0 = Sunday … 6 = Saturday. */
  payoutWeekday: number;
}

export interface Catalog {
  corridors: CatalogCorridor[];
  cities: CatalogCity[];
  categories: CatalogCategory[];
  restrictedItems: {
    id: string;
    level: 'PROHIBITED' | 'RESTRICTED';
    names: z.infer<typeof LocalizedTextSchema>;
  }[];
  policies: PlatformPolicies;
}

export const CityInputSchema = z.object({
  countryCode: z.string().trim().length(2).toUpperCase(),
  names: LocalizedTextSchema,
  active: z.boolean().default(true),
});

export const CategoryInputSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z_]{2,40}$/),
  names: LocalizedTextSchema,
  icon: z.string().trim().max(40).optional(),
  requiresPhotos: z.boolean().default(false),
  maxWeightGrams: z.number().int().positive().nullable().default(null),
  active: z.boolean().default(true),
});

export const RestrictedItemInputSchema = z.object({
  level: z.enum(['PROHIBITED', 'RESTRICTED']),
  names: LocalizedTextSchema,
  active: z.boolean().default(true),
});

export const CorridorInputSchema = z.object({
  originCountry: z.string().trim().length(2).toUpperCase(),
  destinationCountry: z.string().trim().length(2).toUpperCase(),
  currency: z.string().trim().length(3).toUpperCase().default('EUR'),
});

export const SavePricingDraftSchema = z.object({
  rules: PricingRulesSchema,
  notes: z.string().trim().max(500).optional(),
});

export const SimulatePricingSchema = z.object({
  rules: PricingRulesSchema,
  parcel: ParcelSchema,
});

// ─── Responses ────────────────────────────────────────────────────────────────

export interface QuoteResponse {
  id: string;
  corridorCode: string;
  currency: string;
  total: number;
  lines: QuoteLine[];
  chargeableGrams: number;
  volumetricGrams: number;
  expiresAt: string;
}

export interface ShipmentEventView {
  id: string;
  fromStatus: ShipmentStatus | null;
  toStatus: ShipmentStatus;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface ShipmentView {
  id: string;
  reference: string;
  status: ShipmentStatus;
  corridorCode: string;
  originCity: CatalogCity;
  destinationCity: CatalogCity;
  category: Pick<CatalogCategory, 'code' | 'names' | 'icon' | 'requiresPhotos'>;
  description: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
  urgency: Urgency;
  options: string[];
  earliestDate: string;
  latestDate: string;
  price: number | null;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string | null;
  photos: string[];
  createdAt: string;
  events: ShipmentEventView[];
  /** Which party the viewer is. */
  viewerRole: 'sender' | 'traveller' | 'admin';
  /** Public profile of the assigned traveller (no contact details). */
  traveller: PublicProfile | null;
  /** Public profile of the sender, shown to the traveller once matched. */
  sender: PublicProfile | null;
  trip: { id: string; departureDate: string; arrivalDate: string | null } | null;
  /** Sender only: code to give the traveller at pickup (while MATCHED). */
  pickupCode: string | null;
  /** Sender only: code the recipient gives at delivery (until delivered). */
  deliveryCode: string | null;
  /** Sender only: public tracking page to share with the recipient. */
  trackingPath: string | null;
  /** Traveller only: wrong codes left before the hand-over is locked. */
  codeAttemptsLeft: number | null;
  /** The viewer's own review of the other party, once delivered. */
  review: { rating: number; comment: string | null; createdAt: string } | null;
  canReview: boolean;
  /** Latest reported problem, if any. */
  dispute: {
    id: string;
    reason: string;
    description: string;
    status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
    resolution: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE_TO_TRAVELLER' | null;
    refundAmount: number | null;
    resolutionNote: string | null;
    createdAt: string;
  } | null;
  /** Sender only: whether a problem can be reported now. */
  canDispute: boolean;
}

export interface PublicProfile {
  id: string;
  firstName: string;
  lastInitial: string;
  verified: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  memberSince: string;
}
