import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

/**
 * Atom — a single label/value row separated by a bottom border.
 * Used in DeployedUnits unit cards for displaying unit metadata (status, location, crew, etc.).
 */
const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 0',
      borderBottom: '1px solid #f3f4f6',
    }}
  >
    <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginRight: 12 }}>
      {label}
    </Text>
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#374151',
        textAlign: 'right',
        wordBreak: 'break-word',
        maxWidth: '65%',
      }}
    >
      {value}
    </span>
  </div>
);

export default DetailRow;
