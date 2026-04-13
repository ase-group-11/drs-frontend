import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { AppNotification } from '../hooks/useWebSocket';

// ─── Context shape ────────────────────────────────────────────────────────────

interface NotificationContextType {
  notifications: AppNotification[];
  connected: boolean;
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
  scrollToId: string | null;
  setScrollToId: (id: string | null) => void;
  socketEnabled: boolean;
  soundEnabled: boolean;
  toggleSocket: () => void;
  toggleSound: () => void;
  pushNotification: (n: AppNotification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface NotificationManagerProps {
  children: ReactNode;
  onNotification?: (n: AppNotification) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  children,
  onNotification,
}) => {
  // Default ON when the key is absent (fresh login). If the user explicitly
  // turned a toggle OFF in a previous navigation, localStorage holds 'false'.
  const [socketEnabled, setSocketEnabled] = useState<boolean>(
    () => localStorage.getItem('drs_notif_socket') !== 'false'
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => localStorage.getItem('drs_notif_sound') !== 'false'
  );
  const [scrollToId,    setScrollToId]    = useState<string | null>(null);

  const ws = useWebSocket({ onNotification, socketEnabled });

  const toggleSocket = useCallback(() => {
    // Read current value from closure — callback is recreated whenever socketEnabled changes
    const next = !socketEnabled;
    localStorage.setItem('drs_notif_socket', String(next));
    setSocketEnabled(next);
    // Side effects outside the state updater (updater must be pure)
    if (next) {
      ws.reconnect();
    } else {
      ws.disconnect();
    }
  }, [socketEnabled, ws]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('drs_notif_sound', String(next));
      return next;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{
      // Explicit — don't spread ws so internal ws methods never leak onto the public interface
      notifications:    ws.notifications,
      connected:        ws.connected,
      unreadCount:      ws.unreadCount,
      markAllRead:      ws.markAllRead,
      clearAll:         ws.clearAll,
      pushNotification: ws.pushNotification,
      scrollToId,
      setScrollToId,
      socketEnabled,
      soundEnabled,
      toggleSocket,
      toggleSound,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Keep NotificationProvider as alias for backwards compat
export const NotificationProvider = NotificationManager;

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationManager');
  return ctx;
};