import { z } from 'zod';
import type { MatchOfferStatus, TripStatus, Urgency } from '../enums';
import type { CatalogCity, CatalogCategory } from './shipments';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const TripInputSchema = z
  .object({
    originCityId: z.string().min(1),
    destinationCityId: z.string().min(1),
    departureDate: isoDate,
    arrivalDate: isoDate.optional(),
    capacityGrams: z.number().int().min(500).max(32_000),
    maxItems: z.number().int().min(1).max(10).default(3),
    maxLengthCm: z.number().int().min(10).max(200).optional(),
    /** Empty = every category is accepted. */
    categoryCodes: z.array(z.string()).max(20).default([]),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((t) => !t.arrivalDate || t.arrivalDate >= t.departureDate, {
    path: ['arrivalDate'],
    message: 'arrivalDate must be on or after departureDate',
  });
export type TripInput = z.input<typeof TripInputSchema>;

export const RejectOfferSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const MatchingWeightsSchema = z.object({
  reliability: z.number().min(0).max(10),
  dateProximity: z.number().min(0).max(10),
  capacityFit: z.number().min(0).max(10),
  rating: z.number().min(0).max(10),
  responseRate: z.number().min(0).max(10),
  originMatch: z.number().min(0).max(10).default(0.1),
});
export type MatchingWeights = z.output<typeof MatchingWeightsSchema>;

export const MatchingConfigSchema = z.object({
  offerTtlMinutes: z
    .number()
    .int()
    .min(5)
    .max(7 * 24 * 60),
  maxAttempts: z.number().int().min(1).max(20),
  dateToleranceDays: z.number().int().min(0).max(14),
  minReliability: z.number().min(0).max(1),
  weights: MatchingWeightsSchema,
});
export type MatchingConfigInput = z.output<typeof MatchingConfigSchema>;

export interface TripView {
  id: string;
  status: TripStatus;
  corridorCode: string;
  originCity: CatalogCity;
  destinationCity: CatalogCity;
  departureDate: string;
  arrivalDate: string | null;
  capacityGrams: number;
  remainingGrams: number;
  maxItems: number;
  itemsAccepted: number;
  maxLengthCm: number | null;
  categories: Pick<CatalogCategory, 'code' | 'names'>[];
  notes: string | null;
  createdAt: string;
  shipments: {
    id: string;
    reference: string;
    status: string;
    weightGrams: number;
    travellerEarning: number | null;
    currency: string;
  }[];
}

export interface OfferView {
  id: string;
  status: MatchOfferStatus;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
  trip: { id: string; departureDate: string };
  shipment: {
    id: string;
    reference: string;
    originCity: CatalogCity;
    destinationCity: CatalogCity;
    category: Pick<CatalogCategory, 'code' | 'names' | 'icon'>;
    description: string;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    urgency: Urgency;
    earliestDate: string;
    latestDate: string;
    earning: number | null;
    currency: string;
    photos: string[];
  };
}
