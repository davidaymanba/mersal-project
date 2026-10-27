import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../auth/guards';
import { TokenService } from '../auth/token.service';
import { AppConfig } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

function readCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

/**
 * Pushes chat messages and notifications to connected clients.
 * Rooms: `user:<id>` (every socket of a user) and `shipment:<id>` (participants of a conversation).
 */
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() private server?: Namespace;

  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async handleConnection(socket: Socket) {
    const origin = socket.handshake.headers.origin;
    if (origin && origin !== this.config.env.WEB_ORIGIN) return socket.disconnect(true);

    const token =
      (socket.handshake.auth as { token?: string } | undefined)?.token ??
      readCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
    const payload = token ? await this.tokens.verifyAccess(token).catch(() => null) : null;
    if (!payload) return socket.disconnect(true);

    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    await socket.join(`user:${payload.sub}`);
  }

  /** Subscribes the socket to a shipment conversation it takes part in. */
  @SubscribeMessage('join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { shipmentId?: string }) {
    const shipmentId = body?.shipmentId;
    if (!shipmentId) return { ok: false };
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { senderId: true, travellerId: true },
    });
    const userId = socket.data.userId as string;
    const allowed =
      socket.data.role === 'ADMIN' ||
      shipment?.senderId === userId ||
      shipment?.travellerId === userId;
    if (!allowed) return { ok: false };
    await socket.join(`shipment:${shipmentId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() socket: Socket, @MessageBody() body: { shipmentId?: string }) {
    if (body?.shipmentId) await socket.leave(`shipment:${body.shipmentId}`);
    return { ok: true };
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  toShipment(shipmentId: string, event: string, payload: unknown) {
    this.server?.to(`shipment:${shipmentId}`).emit(event, payload);
  }
}
