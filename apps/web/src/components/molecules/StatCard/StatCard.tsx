import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

/**
 * Molecule — a KPI / metric display card with a coloured left border.
 * Used in EvacuationPlanPage. Can be reused on Dashboard or any summary section.
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color = '#7c3aed' }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 10,
      padding: '14px 16px',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      flex: '1 1 140px',
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>
      {fmt(Number(value))}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

export default StatCard;
