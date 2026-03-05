import React, { useState } from 'react';
import {
  Modal,
  Switch,
  Input,
  Button,
  Select,
  Typography,
  message,
} from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import { dispatchUnits } from '../../../services';

const { TextArea } = Input;
const { Text } = Typography;

const AVAILABLE_UNITS = [
  { id: 'u1', unitId: 'F-05', type: 'Fire',      emoji: '🚒', station: 'Tara Street Station', crew: '4/4', location: 'Tara Street',   eta: 5,  km: 2.3 },
  { id: 'u2', unitId: 'A-08', type: 'Ambulance',  emoji: '🚑', station: 'St James Hospital',   crew: '2/2', location: 'St James',       eta: 7,  km: 3.1 },
  { id: 'u3', unitId: 'F-11', type: 'Fire',        emoji: '🚒', station: 'North Strand Station',crew: '4/4', location: 'North Strand',   eta: 4,  km: 1.8 },
  { id: 'u4', unitId: 'P-15', type: 'Police',      emoji: '🚓', station: 'Pearse Street Station',crew: '2/2', location: 'Pearse Street', eta: 6,  km: 2.7 },
  { id: 'u5', unitId: 'A-12', type: 'Ambulance',  emoji: '🚑', station: 'Mater Hospital',      crew: '2/2', location: 'Mater',          eta: 9,  km: 4.2 },
  { id: 'u6', unitId: 'R-02', type: 'Rescue',      emoji: '🚁', station: 'Dublin Airport',      crew: '3/4', location: 'Airport',        eta: 15, km: 8.5 },
];

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  Fire:      { text: '#dc2626', bg: '#fef2f2' },
  Ambulance: { text: '#2563eb', bg: '#eff6ff' },
  Police:    { text: '#7c3aed', bg: '#f5f3ff' },
  Rescue:    { text: '#d97706', bg: '#fffbeb' },
};

const PRIORITY_OPTIONS = [
  { value: 'emergency',     label: 'Emergency',    dot: '#dc2626' },
  { value: 'high_priority', label: 'High Priority', dot: '#f97316' },
  { value: 'standard',      label: 'Standard',     dot: '#2563eb' },
];

type FilterTab = 'all' | 'Fire' | 'Ambulance' | 'Police' | 'Rescue';

interface DispatchUnitsModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DispatchUnitsModal: React.FC<DispatchUnitsModalProps> = ({
  open, report, onClose, onSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('standard');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Units' },
    { key: 'Fire', label: 'Fire Teams' },
    { key: 'Ambulance', label: 'Ambulance' },
    { key: 'Police', label: 'Police' },
    { key: 'Rescue', label: 'Rescue' },
  ];

  const filtered = AVAILABLE_UNITS.filter((u) => {
    const matchesTab = filterTab === 'all' || u.type === filterTab;
    const matchesSearch =
      !search ||
      u.unitId.toLowerCase().includes(search.toLowerCase()) ||
      u.type.toLowerCase().includes(search.toLowerCase()) ||
      u.station.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleClose = () => {
    setSelectedIds([]); setFilterTab('all'); setSearch('');
    setPriority('standard'); setInstructions('');
    onClose();
  };

  const handleDispatch = async () => {
    if (selectedIds.length === 0) { message.warning('Select at least one unit'); return; }
    if (!report) return;
    setSubmitting(true);
    try {
      const result = await dispatchUnits(report.id, selectedIds.length);
      if (result.success) {
        message.success(`${selectedIds.length} unit${selectedIds.length > 1 ? 's' : ''} dispatched`);
        onSuccess(); handleClose();
      } else { message.error(result.message || 'Failed to dispatch'); }
    } catch { message.error('Failed to dispatch units'); }
    finally { setSubmitting(false); }
  };

  const priorityDot = PRIORITY_OPTIONS.find((p) => p.value === priority)?.dot ?? '#2563eb';

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnClose
      title={null}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '24px 24px 0' }}>
        {/* Title */}
        <Text strong style={{ fontSize: 18, color: '#111827', display: 'block', marginBottom: 4 }}>
          Dispatch Emergency Units
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 16 }}>
          Select units to deploy to {report?.reportId}
        </Text>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                background: filterTab === tab.key ? '#7c3aed' : '#f3f4f6',
                color: filterTab === tab.key ? '#fff' : '#374151',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Available Only toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Switch
            checked={availableOnly}
            onChange={setAvailableOnly}
            style={{ background: availableOnly ? '#111827' : '#d1d5db' }}
          />
          <Text style={{ fontSize: 13, color: '#374151' }}>Available Only</Text>
        </div>

        {/* Section header */}
        <Text strong style={{ fontSize: 15, color: '#111827', display: 'block', marginBottom: 12 }}>
          Available Units
        </Text>
      </div>

      {/* Scrollable unit grid + deployment details */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {filtered.map((unit) => {
            const selected = selectedIds.includes(unit.id);
            const colors = TYPE_COLORS[unit.type];
            return (
              <div
                key={unit.id}
                onClick={() => toggle(unit.id)}
                style={{
                  border: `1.5px solid ${selected ? '#7c3aed' : '#e5e7eb'}`,
                  borderRadius: 12,
                  padding: 14,
                  cursor: 'pointer',
                  background: selected ? '#faf5ff' : '#fff',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {/* Checkbox top-right */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22,
                  border: `2px solid ${selected ? '#7c3aed' : '#d1d5db'}`,
                  borderRadius: 6,
                  background: selected ? '#7c3aed' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Emoji + ID + type tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{unit.emoji}</span>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#111827' }}>{unit.unitId}</Text>
                    <div>
                      <span style={{
                        background: colors.bg, color: colors.text,
                        borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 500,
                      }}>
                        {unit.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Station */}
                <Text style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                  {unit.station}
                </Text>

                {/* Crew */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <TeamOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{unit.crew} crew</Text>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <EnvironmentOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{unit.location}</Text>
                </div>

                {/* ETA + km */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockCircleOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Est. {unit.eta} mins</Text>
                  </div>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{unit.km} km away</Text>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deployment Details */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, color: '#111827', display: 'block', marginBottom: 16 }}>
            Deployment Details
          </Text>

          <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8 }}>
            Priority Level
          </Text>
          <div className="dispatch-priority-select">
            <Select
              value={priority}
              onChange={setPriority}
              style={{ width: '100%', marginBottom: 16 }}
              optionLabelProp="label"
              variant="filled"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <Select.Option key={p.value} value={p.value} label={
                  <span><span style={{ color: p.dot, fontSize: 10, marginRight: 8 }}>●</span>{p.label}</span>
                }>
                  <span><span style={{ color: p.dot, fontSize: 10, marginRight: 8 }}>●</span>{p.label}</span>
                </Select.Option>
              ))}
            </Select>
          </div>

          <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8 }}>
            Special Instructions
          </Text>
          <TextArea
            placeholder="Add special instructions for the response team..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, resize: 'none' }}
          />

          {/* Selected summary box */}
          {selectedIds.length > 0 && (() => {
            const fastestEta = Math.min(...AVAILABLE_UNITS.filter(u => selectedIds.includes(u.id)).map(u => u.eta));
            return (
              <div style={{
                marginTop: 16,
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <EnvironmentOutlined style={{ color: '#7c3aed', fontSize: 18, flexShrink: 0 }} />
                <div>
                  <Text strong style={{ fontSize: 14, color: '#111827', display: 'block' }}>
                    {selectedIds.length} unit{selectedIds.length > 1 ? 's' : ''} selected
                  </Text>
                  <Text style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500 }}>
                    Fastest arrival: {fastestEta} mins
                  </Text>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        padding: '14px 24px', borderTop: '1px solid #f3f4f6',
      }}>
        <div style={{ minWidth: 0, flexShrink: 1 }}>
          <Text style={{ fontSize: 13, color: '#374151', display: 'block', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {selectedIds.length === 0 ? 'No units selected' : `${selectedIds.length} unit${selectedIds.length > 1 ? 's' : ''} selected`}
          </Text>
          {selectedIds.length > 0 && (() => {
            const fastestEta = Math.min(...AVAILABLE_UNITS.filter(u => selectedIds.includes(u.id)).map(u => u.eta));
            return (
              <Text style={{ fontSize: 12, color: '#7c3aed', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Earliest arrival: {fastestEta} mins
              </Text>
            );
          })()}
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Button onClick={handleClose} style={{ borderRadius: 10, height: 42, padding: '0 20px' }}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={handleDispatch}
            style={{
              background: '#7c3aed',
              borderColor: '#7c3aed',
              borderRadius: 10,
              height: 42,
              padding: '0 22px',
              fontWeight: 600,
              opacity: selectedIds.length === 0 ? 0.45 : 1,
            }}
          >
            Dispatch Units
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DispatchUnitsModal;