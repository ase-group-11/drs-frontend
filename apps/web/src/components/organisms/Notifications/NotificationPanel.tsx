import React from 'react';
import { Drawer, Badge, Typography, Button, Empty } from 'antd';
import {
  BellOutlined, DeleteOutlined,
  WifiOutlined, DisconnectOutlined,
} from '@ant-design/icons';
import type { AppNotification } from '../../../hooks/useWebSocket';
import { NotificationRow } from '../../molecules';

const { Text } = Typography;

// ─── Panel component ──────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (n: AppNotification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open, onClose, notifications, unreadCount, connected, onMarkAllRead, onClearAll, onNotificationClick,
}) => {
  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined style={{ fontSize: 16, color: '#7c3aed' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <Badge
              count={unreadCount}
              style={{ background: '#7c3aed', fontSize: 11 }}
            />
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {connected ? (
              <WifiOutlined style={{ fontSize: 12, color: '#22c55e' }} title="Connected" />
            ) : (
              <DisconnectOutlined style={{ fontSize: 12, color: '#ef4444' }} title="Disconnected" />
            )}
            <Text style={{ fontSize: 11, color: connected ? '#22c55e' : '#ef4444' }}>
              {connected ? 'Live' : 'Offline'}
            </Text>
          </div>
        </div>
      }
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 }, header: { borderBottom: '1px solid #f3f4f6', padding: '14px 16px' } }}
      footer={
        notifications.length > 0 ? (
          <div style={{ padding: '8px 0' }}>
            <Button
              size="small" icon={<DeleteOutlined />}
              onClick={onClearAll} danger block
              style={{ fontSize: 12 }}
            >
              Clear all
            </Button>
          </div>
        ) : null
      }
    >
      {notifications.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                No notifications yet.<br />
                {connected ? '' : ''}
              </span>
            }
          />
        </div>
      ) : (
        <div style={{ overflowY: 'auto', height: '100%' }}>
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onClick={onNotificationClick} />
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default NotificationPanel;
