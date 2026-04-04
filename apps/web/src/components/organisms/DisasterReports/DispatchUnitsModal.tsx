import { API_ENDPOINTS } from '../../../config';
import React, { useState, useEffect } from 'react';
import { Modal, Switch, Input, Button, Select, Typography, message, Spin } from 'antd';
import { EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import { dispatchUnits } from '../../../services';
import apiClient from '../../../lib/axios';

const { TextArea } = Input;
const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitDisplay {
  id: string;
  unitCode: string;
  type: string;
  emoji: string;
  station: string;
  crew: string;
  status: string;
}

const DEPT_EMOJI: Record<string, string> = { FIRE: '🚒', MEDICAL: '🚑', POLICE: '🚓', IT: '🚁' };
const DEPT_LABEL: Record<string, string> = { FIRE: 'Fire', MEDICAL: 'Ambulance', POLICE: 'Police', IT: 'Rescue' };
const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  Fire:      { text: '#dc2626', bg: '#fef2f2' },
  Ambulance: { text: '#2563eb', bg: '#eff6ff' },
  Police:    { text: '#7c3aed', bg: '#f5f3ff' },
  Rescue:    { text: '#d97706', bg: '#fffbeb' },
};
const PRIORITY_OPTIONS = [
  { value: 'CRITICAL',      label: 'Critical',      dot: '#dc2626' },
  { value: 'HIGH_PRIORITY', label: 'High Priority', dot: '#f97316' },
  { value: 'STANDARD',      label: 'Standard',      dot: '#2563eb' },
];

type FilterTab = 'all' | 'FIRE' | 'MEDICAL' | 'POLICE' | 'IT';

interface DispatchUnitsModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DispatchUnitsModal: React.FC<DispatchUnitsModalProps> = ({ open, report, onClose, onSuccess }) => {
  const [units, setUnits] = useState<UnitDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [priority, setPriority] = useState('STANDARD');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Units' }, { key: 'FIRE', label: 'Fire' },
    { key: 'MEDICAL', label: 'Ambulance' }, { key: 'POLICE', label: 'Police' },
    { key: 'IT', label: 'Rescue' },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) fetchUnits(); }, [open]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const listRes = await apiClient.get<{ units: any[] }>(API_ENDPOINTS.EMERGENCY_UNITS.LIST);
      const rawUnits = listRes.data?.units ?? [];

      const resolved: UnitDisplay[] = rawUnits.map((raw) => ({
        id: raw.id, unitCode: raw.unit_code,
        type: DEPT_LABEL[raw.department] ?? 'Rescue',
        emoji: DEPT_EMOJI[raw.department] ?? '🚒',
        station: raw.station_name,
        crew: `${raw.crew_count}/${raw.capacity}`,
        status: raw.unit_status,
      }));

      setUnits(resolved);
    } catch { message.error('Failed to load units'); }
    finally { setLoading(false); }
  };

  const filtered = units.filter((u) => {
    const matchTab = filterTab === 'all' || DEPT_LABEL[filterTab] === u.type;
    const matchAvail = !availableOnly || u.status === 'AVAILABLE';
    return matchTab && matchAvail;
  });

  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleClose = () => {
    setSelectedIds([]); setFilterTab('all'); setAvailableOnly(false);
    setPriority('STANDARD'); setInstructions(''); onClose();
  };

  const handleDispatch = async () => {
    if (selectedIds.length === 0) { message.warning('Select at least one unit'); return; }
    if (!report) return;
    setSubmitting(true);
    try {
      const result = await dispatchUnits(report.id, selectedIds, priority, instructions);
      if (result.success) {
        message.success(`${selectedIds.length} unit${selectedIds.length > 1 ? 's' : ''} dispatched`);
        onSuccess(); handleClose();
      } else { message.error(result.message || 'Failed to dispatch'); }
    } catch { message.error('Failed to dispatch units'); }
    finally { setSubmitting(false); }
  };



  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={480}
      destroyOnClose title={null}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      {/* Scrollable body */}
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 2 }}>
          Dispatch Emergency Units
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 12 }}>
          Select units to deploy to {report?.trackingId}
        </Text>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, transition: 'all 0.15s',
                background: filterTab === tab.key ? '#7c3aed' : '#f3f4f6',
                color: filterTab === tab.key ? '#fff' : '#374151',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Available Only toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Switch checked={availableOnly} onChange={setAvailableOnly}
            style={{ background: availableOnly ? '#111827' : '#d1d5db' }} />
          <Text style={{ fontSize: 12, color: '#374151' }}>Available Only</Text>
        </div>

        <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8 }}>Units</Text>

        {/* Unit grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Spin /></div>
        ) : filtered.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', display: 'block', paddingBottom: 12 }}>No units found</Text>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {filtered.map((unit) => {
              const selected = selectedIds.includes(unit.id);
              const colors = TYPE_COLORS[unit.type] ?? TYPE_COLORS.Rescue;
              const isAvailable = unit.status === 'AVAILABLE';
              return (
                <div key={unit.id} onClick={() => toggle(unit.id)}
                  style={{
                    border: `1.5px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                    borderRadius: 10, padding: '10px 10px 8px', cursor: 'pointer',
                    background: selected ? '#faf5ff' : '#fff',
                    position: 'relative', transition: 'all 0.15s',
                  }}>
                  {/* Status badge */}
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                    background: isAvailable ? '#dcfce7' : '#fee2e2',
                    color: isAvailable ? '#16a34a' : '#dc2626',
                  }}>
                    {unit.status}
                  </span>

                  {/* Checkbox */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, width: 18, height: 18,
                    border: `2px solid ${selected ? '#7c3aed' : '#d1d5db'}`,
                    borderRadius: 4, background: selected ? '#7c3aed' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Emoji + ID + type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 4px' }}>
                    <span style={{ fontSize: 18 }}>{unit.emoji}</span>
                    <div>
                      <Text strong style={{ fontSize: 13, color: '#111827' }}>{unit.unitCode}</Text>
                      <div>
                        <span style={{ background: colors.bg, color: colors.text, borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 500 }}>
                          {unit.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Text style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                    {unit.station}
                  </Text>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <TeamOutlined style={{ color: '#9ca3af', fontSize: 10 }} />
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>{unit.crew} crew</Text>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Deployment Details */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginBottom: 14 }}>
          <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 10 }}>
            Deployment Details
          </Text>

          <Text strong style={{ fontSize: 11, color: '#111827', display: 'block', marginBottom: 4 }}>Priority Level</Text>
          <div className="dispatch-priority-select" style={{ marginBottom: 10 }}>
            <Select value={priority} onChange={setPriority} style={{ width: '100%' }}
              optionLabelProp="label" variant="filled" size="small">
              {PRIORITY_OPTIONS.map((p) => (
                <Select.Option key={p.value} value={p.value}
                  label={<span><span style={{ color: p.dot, fontSize: 9, marginRight: 6 }}>●</span>{p.label}</span>}>
                  <span><span style={{ color: p.dot, fontSize: 9, marginRight: 6 }}>●</span>{p.label}</span>
                </Select.Option>
              ))}
            </Select>
          </div>

          <Text strong style={{ fontSize: 11, color: '#111827', display: 'block', marginBottom: 4 }}>Special Instructions</Text>
          <TextArea placeholder="Add special instructions..." value={instructions}
            onChange={(e) => setInstructions(e.target.value)} rows={2}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, resize: 'none', fontSize: 12 }} />

          {selectedIds.length > 0 && (
            <div style={{ marginTop: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <EnvironmentOutlined style={{ color: '#7c3aed', fontSize: 14, flexShrink: 0 }} />
              <div>
                <Text strong style={{ fontSize: 12, color: '#111827', display: 'block' }}>
                  {selectedIds.length} unit{selectedIds.length > 1 ? 's' : ''} selected
                </Text>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button type="primary" loading={submitting} onClick={handleDispatch}
          style={{ height: 36, paddingInline: 20, borderRadius: 6, fontWeight: 600, fontSize: 12, background: '#7c3aed', borderColor: '#7c3aed', flex: 1, opacity: selectedIds.length === 0 ? 0.5 : 1 }}>
          Dispatch Units
        </Button>
      </div>
    </Modal>
  );
};

export default DispatchUnitsModal;