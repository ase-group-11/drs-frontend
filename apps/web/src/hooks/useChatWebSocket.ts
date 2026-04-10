import { useEffect, useRef, useCallback, useState } from 'react';

// ─── Message shapes ───────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  seq: number;
  message: string;
  sent_at: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'admin' | 'unit';
  type: 'message';
  disaster_id: string;
}

export type ChatWsFrame =
  | { type: 'ping' }
  | { type: 'system'; disaster_id: string; message: string; sent_at: string }
  | { type: 'history'; disaster_id: string; count: number; messages: ChatMessage[] }
  | ChatMessage;

// ─── Local-storage persistence (10-minute TTL) ────────────────────────────────

const CHAT_TTL_MS       = 10 * 60 * 1000;
const RECONNECT_DELAY   = 3_000;
const MAX_RECONNECTS    = 10;

function storageKey(disasterId: string) {
  return `drs_chat_${disasterId}`;
}

interface StoredChatData {
  messages: ChatMessage[];
  savedAt: number;
}

export function loadChatFromStorage(disasterId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(disasterId));
    if (!raw) return [];
    const data: StoredChatData = JSON.parse(raw);
    if (Date.now() - data.savedAt > CHAT_TTL_MS) {
      localStorage.removeItem(storageKey(disasterId));
      return [];
    }
    return data.messages;
  } catch {
    return [];
  }
}

function saveToStorage(disasterId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(
      storageKey(disasterId),
      JSON.stringify({ messages, savedAt: Date.now() } satisfies StoredChatData),
    );
  } catch {
    try {
      localStorage.setItem(
        storageKey(disasterId),
        JSON.stringify({ messages: messages.slice(-50), savedAt: Date.now() }),
      );
    } catch { /* quota exhausted */ }
  }
}

// ─── Merge + dedup by id ──────────────────────────────────────────────────────

export function mergeMessages(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const result: ChatMessage[] = [];
  for (const msg of [...a, ...b]) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id);
      result.push(msg);
    }
  }
  return result.sort((x, y) => x.seq - y.seq);
}

// ─── Decode JWT sub ───────────────────────────────────────────────────────────

function getTokenSub(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function getTokenFullName(): string {
  try {
    const user = localStorage.getItem('user');
    if (!user) return 'Me';
    const parsed = JSON.parse(user);
    return parsed.fullName ?? parsed.full_name ?? 'Me';
  } catch {
    return 'Me';
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseChatWebSocketOptions {
  disasterId: string;
  onNewMessage?: (msg: ChatMessage) => void;
}

export interface UseChatWebSocketReturn {
  messages: ChatMessage[];
  connected: boolean;
  sendMessage: (text: string) => void;
  disconnect: () => void;
}

export function useChatWebSocket({
  disasterId,
  onNewMessage,
}: UseChatWebSocketOptions): UseChatWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatFromStorage(disasterId),
  );
  const [connected, setConnected] = useState(false);

  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount  = useRef(0);
  const isMounted       = useRef(true);
  const hasConnected    = useRef(false);   // StrictMode guard
  const onNewMsgRef     = useRef(onNewMessage);
  onNewMsgRef.current   = onNewMessage;

  const currentUserId   = useRef<string | null>(getTokenSub());

  const getWsUrl = useCallback((): string | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const base = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1')
      .replace(/^http/, 'ws')
      .replace(/\/api\/v1\/?$/, '');
    return `${base}/api/v1/ws/chat/${disasterId}?token=${token}`;
  }, [disasterId]);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    const url = getWsUrl();
    if (!url) { console.warn('[ChatWS] No token — skipping'); return; }

    // Close any stale socket without triggering the onclose reconnect logic
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log('[ChatWS] Connecting:', url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) { ws.close(); return; }
      console.log('[ChatWS] Connected ✓');
      setConnected(true);
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const frame: ChatWsFrame = JSON.parse(event.data);

        if (frame.type === 'ping') {
          ws.send(JSON.stringify({ type: 'ping' }));
          return;
        }

        if (frame.type === 'system') return;

        if (frame.type === 'history') {
          const historyMsgs = frame.messages ?? [];
          setMessages((prev) => {
            // Replace optimistic messages that now have real server ids
            const merged = mergeMessages(
              historyMsgs,
              prev.filter((m) => m.id.startsWith('optimistic-')),
            );
            saveToStorage(disasterId, merged);
            return merged;
          });
          return;
        }

        if (frame.type === 'message') {
          const msg = frame as ChatMessage;
          setMessages((prev) => {
            // Remove the optimistic placeholder for this message if it exists
            // (match by message text + sender — the server doesn't echo our temp id)
            const withoutOptimistic = prev.filter(
              (m) => !(
                m.id.startsWith('optimistic-') &&
                m.message === msg.message &&
                m.sender_id === msg.sender_id
              )
            );
            const merged = mergeMessages(withoutOptimistic, [msg]);
            saveToStorage(disasterId, merged);
            return merged;
          });
          // Notify only for other users' messages
          if (msg.sender_id !== currentUserId.current) {
            onNewMsgRef.current?.(msg);
          }
        }
      } catch (err) {
        console.error('[ChatWS] Parse error:', err, event.data);
      }
    };

    ws.onclose = (event) => {
      if (!isMounted.current) return;
      console.warn('[ChatWS] Disconnected — code:', event.code);
      setConnected(false);
      if (reconnectCount.current < MAX_RECONNECTS) {
        reconnectCount.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => ws.close();
  }, [disasterId, getWsUrl]);

  // StrictMode-safe: delay connect by 50ms so the cleanup from the first
  // mount can cancel it before a socket opens (same pattern as useWebSocket.ts)
  useEffect(() => {
    isMounted.current = true;
    if (hasConnected.current) return;

    const initTimer = setTimeout(() => {
      if (!isMounted.current) return;
      hasConnected.current = true;
      connect();
    }, 50);

    return () => {
      clearTimeout(initTimer);
      isMounted.current = false;
      hasConnected.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[ChatWS] Cannot send — socket not open (state:', ws?.readyState, ')');
      return;
    }

    // Optimistic update — add immediately so the sender sees it instantly.
    // The real echo from the server will replace this via the dedup logic above.
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      seq: Date.now(),           // high seq so it sorts to the bottom
      message: text,
      sent_at: new Date().toISOString(),
      sender_id: currentUserId.current ?? 'me',
      sender_name: getTokenFullName(),
      sender_type: 'admin',
      type: 'message',
      disaster_id: disasterId,
    };
    setMessages((prev) => {
      const next = mergeMessages(prev, [optimistic]);
      saveToStorage(disasterId, next);
      return next;
    });

    ws.send(JSON.stringify({ message: text }));
  }, [disasterId]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectCount.current = MAX_RECONNECTS;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  return { messages, connected, sendMessage, disconnect };
}