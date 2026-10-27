import type { LocalizedText, OfferView } from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import { toCatalogCity } from '../catalog/catalog.service';

export const offerInclude = {
  trip: { select: { id: true, departureDate: true } },
  shipment: { include: { originCity: true, destinationCity: true, category: true } },
} as const;

type OfferWithRelations = Prisma.MatchOfferGetPayload<{ include: typeof offerInclude }>;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** What a traveller sees about a proposed parcel: no sender or recipient contact details. */
export function toOfferView(o: OfferWithRelations): OfferView {
  const s = o.shipment;
  return {
    id: o.id,
    status: o.status,
    expiresAt: o.expiresAt.toISOString(),
    respondedAt: o.respondedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    trip: { id: o.trip.id, departureDate: isoDay(o.trip.departureDate) },
    shipment: {
      id: s.id,
      reference: s.reference,
      originCity: toCatalogCity(s.originCity),
      destinationCity: toCatalogCity(s.destinationCity),
      category: {
        code: s.category.code,
        names: s.category.names as LocalizedText,
        icon: s.category.icon,
      },
      description: s.description,
      weightGrams: s.weightGrams,
      lengthCm: s.lengthCm,
      widthCm: s.widthCm,
      heightCm: s.heightCm,
      urgency: s.urgency,
      earliestDate: isoDay(s.earliestDate),
      latestDate: isoDay(s.latestDate),
      earning: s.travellerEarning,
      currency: s.currency,
      photos: s.photoKeys.map((k) => `/files?key=${encodeURIComponent(k)}`),
    },
  };
}
