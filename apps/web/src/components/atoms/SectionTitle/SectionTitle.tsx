import React from 'react';

interface SectionTitleProps {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}

/**
 * Atom — section heading with an icon, title and optional subtitle.
 * Used in EvacuationPlanPage and CreateTeamModal.
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <span style={{ fontSize: 16, color: '#7c3aed' }}>{icon}</span>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

export default SectionTitle;
