'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

/** One shared connection per tab, authenticated by the session cookie. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${new URL(API_URL).origin}/realtime`, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionDelayMax: 30_000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Refreshes notification and offer queries as soon as the server pushes a notification. */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    };
    s.on('notification', onNotification);
    return () => {
      s.off('notification', onNotification);
    };
  }, [queryClient]);
}

/** Joins a shipment's conversation room and calls `onMessage` for every pushed message. */
export function useShipmentChannel<T>(shipmentId: string, onMessage: (message: T) => void) {
  useEffect(() => {
    const s = getSocket();
    const join = () => s.emit('join', { shipmentId });
    join();
    s.on('connect', join);
    s.on('message', onMessage);
    return () => {
      s.emit('leave', { shipmentId });
      s.off('connect', join);
      s.off('message', onMessage);
    };
  }, [shipmentId, onMessage]);
}
