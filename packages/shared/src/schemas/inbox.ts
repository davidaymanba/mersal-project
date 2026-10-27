import { z } from 'zod';
import type { ShipmentStatus, VerificationStatus } from '../enums';
import type { LocalizedText } from '../pricing';
import { PageQuerySchema, type Paginated } from './common';

/** One row of a user's message inbox: the conversation of a shipment they send or carry. */
export interface ConversationSummary {
  shipmentId: string;
  reference: string;
  status: ShipmentStatus;
  /** The viewer's side of the shipment. */
  role: 'sender' | 'traveller';
  counterpart: { id: string; firstName: string; lastInitial: string } | null;
  route: { from: LocalizedText; to: LocalizedText };
  lastMessage: {
    /** For system messages, an i18n key such as "system.pickedUp". */
    body: string;
    isSystem: boolean;
    fromMe: boolean;
    createdAt: string;
  } | null;
  unread: number;
  /** Whether new messages can still be sent. */
  open: boolean;
}

export const NotificationsQuerySchema = PageQuerySchema.extend({
  filter: z.enum(['all', 'unread']).default('all'),
});

export interface NotificationItem {
  id: string;
  /** Dotted i18n key under `notifications.types`, e.g. "shipment.matched". */
  type: string;
  data: Record<string, string | number>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage extends Paginated<NotificationItem> {
  /** Unread count across all pages, for the bell badge. */
  unread: number;
}

export const AdminTravellersQuerySchema = PageQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  sort: z.enum(['recent', 'reliability', 'parcels']).default('recent'),
});

export interface AdminTravellerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  travellerStatus: VerificationStatus;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  reliabilityScore: number;
  ratingAvg: number | null;
  ratingCount: number;
  /** Share of offers answered before expiry, null before the first offer. */
  responseRate: number | null;
  parcels: { delivered: number; active: number; disputed: number };
  trips: { open: number; nextDeparture: string | null };
  /** Minor units, EUR. */
  wallet: { held: number; available: number; blocked: number };
  payoutsEnabled: boolean;
  joinedAt: string;
}

export interface AdminTravellersResponse extends Paginated<AdminTravellerRow> {
  summary: {
    approved: number;
    pending: number;
    rejected: number;
    /** Approved travellers with a published or ongoing trip. */
    withOpenTrips: number;
    avgReliability: number | null;
  };
}
