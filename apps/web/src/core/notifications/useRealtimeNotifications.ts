import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/core/auth/store';
import { useNotificationStore, type Notification } from './store';

export function useRealtimeNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    const socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('notification:new', (notification: Notification) => {
      addNotification(notification);
    });

    socket.on('sales:updated', () => fetchNotifications());
    socket.on('inventory:updated', () => fetchNotifications());
    socket.on('inventory:low-stock', () => fetchNotifications());
    socket.on('attendance:updated', () => fetchNotifications());
    socket.on('bookings:updated', () => fetchNotifications());
    socket.on('housekeeping:updated', () => fetchNotifications());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, fetchNotifications, addNotification]);
}
