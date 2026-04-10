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
  disconnect: () => void;
  reconnect: () => void;
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
  // Both default to ON — session-only, never persisted, always ON after login
  const [socketEnabled, setSocketEnabled] = useState(true);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const [scrollToId,    setScrollToId]    = useState<string | null>(null);

  const ws = useWebSocket({ onNotification });

  const toggleSocket = useCallback(() => {
    setSocketEnabled((prev) => {
      if (prev) {
        ws.disconnect();
      } else {
        ws.reconnect();
      }
      return !prev;
    });
  }, [ws]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return (
    <NotificationContext.Provider value={{
      ...ws,
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