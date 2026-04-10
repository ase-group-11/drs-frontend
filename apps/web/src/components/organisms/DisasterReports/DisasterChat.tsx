// File: /web/src/components/organisms/DisasterReports/DisasterChat.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Button,
  Input,
  Avatar,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  WifiOutlined,
  DisconnectOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useChatWebSocket } from '../../../hooks/useChatWebSocket';
import type { ChatMessage } from '../../../hooks/useChatWebSocket';
import { useNotifications } from '../../../context/NotificationContext';
import type { AppNotification } from '../../../hooks/useWebSocket';
import type { DisasterReport } from '../../../types';
import './DisasterChat.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenSub(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).sub ?? null;
  } catch {
    return null;
  }
}

function formatTime(iso: string): string {
  try {
    // Backend sends UTC timestamps without 'Z' — append it so JS parses as UTC
    // and toLocaleTimeString converts correctly to the browser's local timezone.
    const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
    return new Date(normalized).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(iso: string): string {
  try {
    const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
    const d = new Date(normalized);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function groupByDate(messages: ChatMessage[]): Array<{ date: string; messages: ChatMessage[] }> {
  const groups = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    const key = formatDate(msg.sent_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }
  return Array.from(groups.entries()).map(([date, messages]) => ({ date, messages }));
}

// ─── Sender avatar ────────────────────────────────────────────────────────────

function SenderAvatar({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) {
  const initials = msg.sender_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bg = isSelf ? '#7c3aed' : msg.sender_type === 'unit' ? '#0ea5e9' : '#6b7280';

  return (
    <Tooltip title={msg.sender_name} placement={isSelf ? 'left' : 'right'}>
      <Avatar size={30} style={{ background: bg, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </Avatar>
    </Tooltip>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isSelf,
  showSender,
}: {
  msg: ChatMessage;
  isSelf: boolean;
  showSender: boolean;
}) {
  return (
    <div className={`chat-message-row ${isSelf ? 'self' : 'other'}`}>
      {!isSelf && (
        <div className="chat-avatar-col">
          {showSender && <SenderAvatar msg={msg} isSelf={false} />}
        </div>
      )}

      <div className="chat-bubble-col">
        {!isSelf && showSender && (
          <div className="chat-sender-name">
            {msg.sender_name}
            <Tag className="chat-sender-tag" color={msg.sender_type === 'unit' ? 'blue' : 'default'}>
              {msg.sender_type === 'unit' ? 'Unit' : 'Admin'}
            </Tag>
          </div>
        )}

        <div className={`chat-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`}>
          <span className="bubble-text">{msg.message}</span>
        </div>

        <span className="chat-timestamp">{formatTime(msg.sent_at)}</span>
      </div>

      {isSelf && (
        <div className="chat-avatar-col self-avatar">
          {showSender && <SenderAvatar msg={msg} isSelf />}
        </div>
      )}
    </div>
  );
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="chat-date-divider">
      <span className="chat-date-label">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DisasterChatProps {
  report: DisasterReport;
  onBack: () => void;
}

const HEADER_HEIGHT = 64; // px — matches .admin-header height

const DisasterChat: React.FC<DisasterChatProps> = ({ report, onBack }) => {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending]       = useState(false);
  const [siderLeft, setSiderLeft]   = useState(0);
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<any>(null);
  const currentUserId               = useRef(getTokenSub());
  const { pushNotification }        = useNotifications();

  // ── Read sidebar width so the portal can sit flush to its right edge ─────
  useEffect(() => {
    const measure = () => {
      const sider = document.querySelector<HTMLElement>('.admin-sider');
      setSiderLeft(sider ? sider.offsetWidth : 0);
    };
    measure();

    // Re-measure when sidebar collapses/expands (triggered by transition end)
    const sider = document.querySelector<HTMLElement>('.admin-sider');
    sider?.addEventListener('transitionend', measure);

    // Lock outer scroll on both html and body — browser may route to either
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      sider?.removeEventListener('transitionend', measure);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // ── Chat-message → AppNotification bridge ────────────────────────────────
  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      const notification: AppNotification = {
        id: `chat-${msg.id}`,
        eventType: 'chat.message',
        title: `💬 ${msg.sender_name}`,
        description: msg.message.length > 80 ? msg.message.slice(0, 77) + '…' : msg.message,
        severity: 'low',
        timestamp: msg.sent_at ? new Date(msg.sent_at.endsWith('Z') || msg.sent_at.includes('+') ? msg.sent_at : msg.sent_at + 'Z') : new Date(),
        read: false,
        raw: {
          event_type: 'chat.message',
          service: 'chat',
          severity: 'LOW',
          title: `💬 ${msg.sender_name}`,
          message: msg.message,
          data: { disaster_id: report.id, sender_type: msg.sender_type },
          timestamp: msg.sent_at,
        },
      };
      pushNotification(notification);
    },
    [pushNotification, report.id],
  );

  const { messages, connected, sendMessage } = useChatWebSocket({
    disasterId: report.id,
    onNewMessage: handleNewMessage,
  });

  // ── Auto-scroll to bottom on new messages ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input on mount ─────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || !connected) return;
    setSending(true);
    try {
      sendMessage(text);
      setInputValue('');
    } finally {
      setTimeout(() => setSending(false), 200);
    }
    inputRef.current?.focus();
  }, [inputValue, connected, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groups = groupByDate(messages);

  // ── Portal style — fixed, below header, right of sidebar ─────────────────
  const portalStyle: React.CSSProperties = {
    position: 'fixed',
    top: HEADER_HEIGHT,
    left: siderLeft,
    right: 0,
    bottom: 0,
    zIndex: 80, // above content (1), below header (90) and sidebar (100)
    display: 'flex',
    flexDirection: 'column',
    background: '#f8fafc',
    overflow: 'hidden',
  };

  const content = (
    <div style={portalStyle}>
      {/* ── Header ── */}
      <div className="chat-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="chat-back-btn"
        />

        <div className="chat-header-info">
          <div className="chat-header-title">
            <span className="chat-disaster-name">{report.title}</span>
            <span className="chat-disaster-id">{report.reportId}</span>
          </div>
          <div className="chat-header-meta">
            <TeamOutlined style={{ fontSize: 12, color: '#6b7280' }} />
            <span className="chat-meta-text">
              {report.units} unit{report.units !== 1 ? 's' : ''} assigned
            </span>
          </div>
        </div>

        <div className="chat-connection-status">
          {connected ? (
            <>
              <WifiOutlined style={{ color: '#22c55e', fontSize: 13 }} />
              <span className="status-text live">Live</span>
            </>
          ) : (
            <>
              <DisconnectOutlined style={{ color: '#ef4444', fontSize: 13 }} />
              <span className="status-text offline">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="chat-messages-area">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-text">No messages yet.</p>
            <p className="chat-empty-sub">Start the conversation with your field units.</p>
          </div>
        ) : (
          <>
            {groups.map(({ date, messages: groupMsgs }) => (
              <div key={date}>
                <DateDivider label={date} />
                {groupMsgs.map((msg, idx) => {
                  const isSelf    = msg.sender_id === currentUserId.current;
                  const prevMsg   = groupMsgs[idx - 1];
                  const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isSelf={isSelf}
                      showSender={showSender}
                    />
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <div className="chat-input-avatar">
            <Avatar size={32} icon={<UserOutlined />} style={{ background: '#7c3aed', flexShrink: 0 }} />
          </div>

          <Input.TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connected
                ? 'Type a message… (Enter to send, Shift+Enter for newline)'
                : 'Reconnecting…'
            }
            disabled={!connected}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="chat-textarea"
          />

          <Button
            type="primary"
            icon={sending ? <Spin size="small" /> : <SendOutlined />}
            onClick={handleSend}
            disabled={!connected || !inputValue.trim() || sending}
            className="chat-send-btn"
          />
        </div>

        <div className="chat-input-hint">
          {connected
            ? 'Messages are visible to all connected units for this disaster.'
            : 'Connection lost — attempting to reconnect…'}
        </div>
      </div>
    </div>
  );

  // Portal to document.body so it's outside all layout containers
  return ReactDOM.createPortal(content, document.body);
};

export default DisasterChat;