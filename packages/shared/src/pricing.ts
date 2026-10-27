import { z } from 'zod';

export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  fr: z.string().min(1),
  ar: z.string().min(1),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

const minor = z.number().int().nonnegative();

/**
 * Tariff rules for one corridor. Stored as JSON on PricingVersion and edited from
 * the admin dashboard — never hard-coded.
 */
export const PricingRulesSchema = z.object({
  currency: z.string().length(3),
  /** cm³ per kg used for volumetric weight (e.g. 5000). */
  volumetricDivisor: z.number().int().positive(),
  /** Hard ceiling for chargeable weight on this corridor. */
  maxWeightGrams: z.number().int().positive(),
  /** Weight brackets, ascending by upToGrams. Price is the bracket's flat price. */
  brackets: z
    .array(z.object({ upToGrams: z.number().int().positive(), price: minor }))
    .min(1)
    .refine((b) => b.every((x, i) => i === 0 || x.upToGrams > b[i - 1]!.upToGrams), {
      message: 'Brackets must be sorted by upToGrams ascending',
    }),
  /** Added per started kilogram above the last bracket (up to maxWeightGrams). */
  extraPerKg: minor,
  /** Multiplier per category code; categories not listed use 1. */
  categoryMultipliers: z.record(z.string(), z.number().positive()),
  declaredValue: z.object({
    /** Declared value covered for free. */
    freeUpTo: minor,
    /** Fee on the part above freeUpTo, in basis points. */
    feeBps: z.number().int().nonnegative(),
  }),
  urgencyMultipliers: z.object({
    STANDARD: z.number().positive(),
    EXPRESS: z.number().positive(),
  }),
  options: z.array(
    z.object({
      code: z.string().regex(/^[A-Z_]+$/),
      names: LocalizedTextSchema,
      price: minor,
    }),
  ),
  minimumPrice: minor,
  /** Platform commission on the final price, in basis points. */
  commissionBps: z.number().int().min(0).max(10000),
  /** Round the final price to this step (minor units), e.g. 50 = €0.50. */
  roundTo: z.number().int().positive(),
});
export type PricingRules = z.infer<typeof PricingRulesSchema>;

/** Parcel attributes that drive the price (canonical units: grams, cm, minor units). */
export const ParcelSchema = z.object({
  categoryCode: z.string().min(1),
  weightGrams: z.number().int().positive().max(50_000),
  lengthCm: z.number().int().positive().max(200),
  widthCm: z.number().int().positive().max(200),
  heightCm: z.number().int().positive().max(200),
  declaredValue: z.number().int().nonnegative().max(10_000_00),
  urgency: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  options: z.array(z.string()).max(10).default([]),
});
export type ParcelInput = z.output<typeof ParcelSchema>;

export const QuoteRequestSchema = ParcelSchema.extend({
  originCityId: z.string().min(1),
  destinationCityId: z.string().min(1),
});
export type QuoteRequest = z.input<typeof QuoteRequestSchema>;

export type QuoteLineCode =
  'base' | 'category' | 'urgency' | 'declaredValue' | 'option' | 'minimum' | 'rounding';

export interface QuoteLine {
  code: QuoteLineCode;
  amount: number;
  /** For options: the option code. */
  ref?: string;
}

export interface QuoteCalculation {
  currency: string;
  total: number;
  commission: number;
  travellerEarning: number;
  actualGrams: number;
  volumetricGrams: number;
  chargeableGrams: number;
  lines: QuoteLine[];
}

export class PricingError extends Error {
  constructor(
    readonly code: 'too_heavy' | 'unknown_option',
    message: string,
  ) {
    super(message);
  }
}

/** cm³ / divisor gives kilograms; returned in grams, rounded up. */
export function volumetricGrams(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number,
): number {
  return Math.ceil(((lengthCm * widthCm * heightCm) / divisor) * 1000);
}

/**
 * Prices a parcel with a corridor's rules. Pure and deterministic, so the admin
 * simulator, the API and tests all agree on the result.
 *
 * Order: weight bracket → category multiplier → urgency multiplier → declared-value fee
 * → options → minimum price → rounding → commission split.
 */
export function calculateQuote(rules: PricingRules, parcel: ParcelInput): QuoteCalculation {
  const volumetric = volumetricGrams(
    parcel.lengthCm,
    parcel.widthCm,
    parcel.heightCm,
    rules.volumetricDivisor,
  );
  const chargeable = Math.max(parcel.weightGrams, volumetric);
  if (chargeable > rules.maxWeightGrams) {
    throw new PricingError(
      'too_heavy',
      `Chargeable weight ${chargeable}g exceeds ${rules.maxWeightGrams}g`,
    );
  }

  const bracket = rules.brackets.find((b) => chargeable <= b.upToGrams);
  const last = rules.brackets[rules.brackets.length - 1]!;
  const base = bracket
    ? bracket.price
    : last.price + Math.ceil((chargeable - last.upToGrams) / 1000) * rules.extraPerKg;

  const lines: QuoteLine[] = [{ code: 'base', amount: base }];
  let running = base;

  const categoryMultiplier = rules.categoryMultipliers[parcel.categoryCode] ?? 1;
  const afterCategory = Math.round(running * categoryMultiplier);
  if (afterCategory !== running) lines.push({ code: 'category', amount: afterCategory - running });
  running = afterCategory;

  const afterUrgency = Math.round(running * rules.urgencyMultipliers[parcel.urgency]);
  if (afterUrgency !== running) lines.push({ code: 'urgency', amount: afterUrgency - running });
  running = afterUrgency;

  const insuredPart = Math.max(0, parcel.declaredValue - rules.declaredValue.freeUpTo);
  const valueFee = Math.round((insuredPart * rules.declaredValue.feeBps) / 10_000);
  if (valueFee > 0) lines.push({ code: 'declaredValue', amount: valueFee });
  running += valueFee;

  for (const code of new Set(parcel.options)) {
    const option = rules.options.find((o) => o.code === code);
    if (!option) throw new PricingError('unknown_option', `Unknown option ${code}`);
    lines.push({ code: 'option', ref: code, amount: option.price });
    running += option.price;
  }

  if (running < rules.minimumPrice) {
    lines.push({ code: 'minimum', amount: rules.minimumPrice - running });
    running = rules.minimumPrice;
  }

  const total = Math.round(running / rules.roundTo) * rules.roundTo;
  if (total !== running) lines.push({ code: 'rounding', amount: total - running });

  const commission = Math.round((total * rules.commissionBps) / 10_000);
  return {
    currency: rules.currency,
    total,
    commission,
    travellerEarning: total - commission,
    actualGrams: parcel.weightGrams,
    volumetricGrams: volumetric,
    chargeableGrams: chargeable,
    lines,
  };
}
