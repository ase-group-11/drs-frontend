// File: /web/src/hooks/index.ts
export { useAuth } from '../context/AuthContext';
export { useWebSocket } from './useWebSocket';
export type { AppNotification, WsEvent } from './useWebSocket';
export { useChatWebSocket } from './useChatWebSocket';
export type { ChatMessage } from './useChatWebSocket';