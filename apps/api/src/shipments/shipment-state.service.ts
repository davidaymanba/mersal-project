import { Injectable } from '@nestjs/common';
import { canTransition } from '@mersal/shared';
import type { ActorType, Prisma, ShipmentStatus } from '@prisma/client';
import { conflict } from '../common/errors';

export interface Actor {
  type: ActorType;
  id?: string | null;
}

const TIMESTAMP_FOR: Partial<
  Record<ShipmentStatus, keyof Prisma.ShipmentUncheckedUpdateManyInput>
> = {
  PAID: 'paidAt',
  MATCHED: 'matchedAt',
  PICKED_UP: 'pickedUpAt',
  DELIVERED: 'deliveredAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
};

/**
 * The only place shipment status changes. Enforces the transition table from
 * @mersal/shared, guards against concurrent updates and appends a ShipmentEvent.
 */
@Injectable()
export class ShipmentStateService {
  async transition(
    tx: Prisma.TransactionClient,
    shipment: { id: string; status: ShipmentStatus },
    to: ShipmentStatus,
    actor: Actor,
    options: {
      note?: string;
      meta?: Record<string, unknown>;
      data?: Prisma.ShipmentUncheckedUpdateManyInput;
    } = {},
  ): Promise<void> {
    if (!canTransition(shipment.status, to)) {
      throw conflict('invalid_status', `Cannot move a shipment from ${shipment.status} to ${to}`);
    }
    const timestampField = TIMESTAMP_FOR[to];
    const result = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status },
      data: {
        ...options.data,
        status: to,
        ...(timestampField && { [timestampField]: new Date() }),
      },
    });
    if (result.count === 0) {
      throw conflict('invalid_status', 'The shipment changed in the meantime. Please retry.');
    }
    await tx.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: to,
        actorType: actor.type,
        actorId: actor.id ?? null,
        note: options.note,
        meta: options.meta as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
