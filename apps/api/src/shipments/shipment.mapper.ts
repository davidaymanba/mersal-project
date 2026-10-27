import type { LocalizedText, ShipmentView } from '@mersal/shared';
import type {
  Category,
  City,
  Corridor,
  Dispute,
  Review,
  Shipment,
  ShipmentEvent,
  Trip,
  User,
} from '@prisma/client';
import { toCatalogCity } from '../catalog/catalog.service';
import { toPublicProfile } from '../users/user.mapper';

export const shipmentInclude = {
  corridor: true,
  originCity: true,
  destinationCity: true,
  category: true,
  events: { orderBy: { createdAt: 'asc' } },
  sender: true,
  traveller: true,
  trip: true,
  reviews: true,
  disputes: { orderBy: { createdAt: 'desc' } },
} as const;

export type ShipmentWithRelations = Shipment & {
  corridor: Corridor;
  originCity: City;
  destinationCity: City;
  category: Category;
  events: ShipmentEvent[];
  sender: User;
  traveller: User | null;
  trip: Trip | null;
  reviews: Review[];
  disputes: Dispute[];
};

const fileUrl = (key: string) => `/files?key=${encodeURIComponent(key)}`;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const MAX_CODE_ATTEMPTS = 5;

export function toShipmentView(
  s: ShipmentWithRelations,
  viewerRole: ShipmentView['viewerRole'],
): ShipmentView {
  // Codes belong to the sender's side of the hand-over; support (admin) can see them too.
  const canSeeCodes = viewerRole === 'sender' || viewerRole === 'admin';
  const authorId =
    viewerRole === 'sender' ? s.senderId : viewerRole === 'traveller' ? s.travellerId : null;
  const review = s.reviews.find((r) => r.authorId === authorId);
  const dispute = s.disputes[0];
  return {
    id: s.id,
    reference: s.reference,
    status: s.status,
    corridorCode: s.corridor.code,
    originCity: toCatalogCity(s.originCity),
    destinationCity: toCatalogCity(s.destinationCity),
    category: {
      code: s.category.code,
      names: s.category.names as LocalizedText,
      icon: s.category.icon,
      requiresPhotos: s.category.requiresPhotos,
    },
    description: s.description,
    weightGrams: s.weightGrams,
    lengthCm: s.lengthCm,
    widthCm: s.widthCm,
    heightCm: s.heightCm,
    declaredValue: s.declaredValue,
    urgency: s.urgency,
    options: s.options,
    earliestDate: isoDay(s.earliestDate),
    latestDate: isoDay(s.latestDate),
    // Travellers see what they earn, senders and admins see what was paid.
    price: viewerRole === 'traveller' ? s.travellerEarning : s.price,
    currency: s.currency,
    recipientName: s.recipientName,
    recipientPhone: s.recipientPhone,
    recipientEmail: s.recipientEmail,
    photos: s.photoKeys.map(fileUrl),
    createdAt: s.createdAt.toISOString(),
    events: s.events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorType: e.actorType,
      actorId: e.actorId,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    viewerRole,
    traveller: s.traveller ? toPublicProfile(s.traveller) : null,
    sender: viewerRole !== 'sender' ? toPublicProfile(s.sender) : null,
    trip: s.trip
      ? {
          id: s.trip.id,
          departureDate: isoDay(s.trip.departureDate),
          arrivalDate: s.trip.arrivalDate ? isoDay(s.trip.arrivalDate) : null,
        }
      : null,
    pickupCode: canSeeCodes && s.status === 'MATCHED' ? s.pickupCode : null,
    deliveryCode:
      canSeeCodes && ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(s.status)
        ? s.deliveryCode
        : null,
    trackingPath:
      canSeeCodes && s.status !== 'QUOTED' && s.status !== 'CANCELLED'
        ? `/track/${s.trackingToken}`
        : null,
    codeAttemptsLeft:
      viewerRole === 'traveller' ? Math.max(0, MAX_CODE_ATTEMPTS - s.codeAttempts) : null,
    review: review
      ? {
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
        }
      : null,
    canReview:
      viewerRole !== 'admin' &&
      !review &&
      !!s.travellerId &&
      ['DELIVERED', 'COMPLETED'].includes(s.status),
    dispute: dispute
      ? {
          id: dispute.id,
          reason: dispute.reason,
          description: dispute.description,
          status: dispute.status,
          resolution: dispute.resolution,
          refundAmount: dispute.refundAmount,
          resolutionNote: dispute.resolutionNote,
          createdAt: dispute.createdAt.toISOString(),
        }
      : null,
    canDispute:
      viewerRole === 'sender' &&
      !s.disputes.some((d) => d.status !== 'RESOLVED') &&
      ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(s.status),
  };
}

export function toShipmentSummary(
  s: Shipment & { originCity: City; destinationCity: City; category: Category; corridor: Corridor },
) {
  return {
    id: s.id,
    reference: s.reference,
    status: s.status,
    corridorCode: s.corridor.code,
    originCity: toCatalogCity(s.originCity),
    destinationCity: toCatalogCity(s.destinationCity),
    categoryNames: s.category.names as LocalizedText,
    weightGrams: s.weightGrams,
    price: s.price,
    travellerEarning: s.travellerEarning,
    currency: s.currency,
    earliestDate: isoDay(s.earliestDate),
    latestDate: isoDay(s.latestDate),
    createdAt: s.createdAt.toISOString(),
  };
}
export type ShipmentSummary = ReturnType<typeof toShipmentSummary>;
