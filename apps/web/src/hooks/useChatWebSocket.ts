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
    } catch { /* quota exhausted — give up */ }
  }
}

// ─── Merge + dedup helpers ────────────────────────────────────────────────────

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

// ─── Decode JWT sub without a library ────────────────────────────────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseChatWebSocketOptions {
  disasterId: string;
  /** Called for every inbound message from another user. Use to push a notification. */
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
  // Seed from localStorage so history survives navigation within the TTL window
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatFromStorage(disasterId),
  );
  const [connected, setConnected] = useState(false);

  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);
  const isMounted      = useRef(true);
  const onNewMsgRef    = useRef(onNewMessage);
  onNewMsgRef.current  = onNewMessage;

  const currentUserId = useRef<string | null>(getTokenSub());

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

    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    console.log('[ChatWS] Connecting:', url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
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

        if (frame.type === 'system') {
          // System join/leave messages — currently ignored in UI
          return;
        }

        if (frame.type === 'history') {
          const historyMsgs = frame.messages ?? [];
          setMessages((prev) => {
            const merged = mergeMessages(historyMsgs, prev);
            saveToStorage(disasterId, merged);
            return merged;
          });
          return;
        }

        if (frame.type === 'message') {
          const msg = frame as ChatMessage;
          setMessages((prev) => {
            const merged = mergeMessages(prev, [msg]);
            saveToStorage(disasterId, merged);
            return merged;
          });
          // Only surface a notification for messages sent by someone else
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

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: text }));
    } else {
      console.warn('[ChatWS] Cannot send — socket not open');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectCount.current = MAX_RECONNECTS; // prevent auto-reconnect
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnected(false);
  }, []);

  return { messages, connected, sendMessage, disconnect };
}