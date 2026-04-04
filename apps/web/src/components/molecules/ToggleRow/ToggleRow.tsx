import React from 'react';
import { Switch, Typography } from 'antd';

const { Text } = Typography;

interface ToggleRowProps {
  /** Main label shown in bold */
  title: string;
  /** Descriptive text below the title */
  description: string;
  /** Whether the switch is on */
  checked: boolean;
  /** Called when the switch is toggled */
  onChange: (checked: boolean) => void;
  /** Whether to show a bottom border — set false on the last row */
  isLast?: boolean;
}

/**
 * Molecule — a labelled toggle switch row.
 * Composes: title text (atom-level typography) + description + Ant Design Switch.
 * Used in Settings NotificationsTab. Can be reused anywhere a labelled toggle is needed.
 */
const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, checked, onChange, isLast = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
    }}
  >
    <div style={{ flex: 1, marginRight: 24 }}>
      <Text strong style={{ fontSize: 14, display: 'block', color: '#111827' }}>
        {title}
      </Text>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {description}
      </Text>
    </div>
    <Switch
      checked={checked}
      onChange={onChange}
      style={checked ? { background: '#7c3aed' } : {}}
    />
  </div>
);

export default ToggleRow;
