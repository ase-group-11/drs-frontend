// NEW FILE
import React, { useEffect, useState } from 'react';
import { Modal, Button, Radio, Input, Tag, Typography, Space, Spin, message } from 'antd';
import {
  EnvironmentOutlined, ClockCircleOutlined, CheckCircleOutlined,
  SendOutlined, LoadingOutlined,
} from '@ant-design/icons';
import { deployUnit, getActiveDisasters } from '../../../../services';
import type { ActiveDisaster } from '../../../../types';

const { TextArea } = Input;
const { Text } = Typography;

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fee2e2', text: '#dc2626' },
  high:     { bg: '#ffedd5', text: '#ea580c' },
  medium:   { bg: '#fef9c3', text: '#ca8a04' },
};

interface DeployUnitModalProps {
  open: boolean;
  unitId: string;     // display code e.g. "F-05"
  unitUuid: string;   // real UUID for API
  unitType: string;
  station: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DeployUnitModal: React.FC<DeployUnitModalProps> = ({ open, unitId, unitUuid, unitType, station, onClose, onSuccess }) => {
  const [disasters, setDisasters] = useState<ActiveDisaster[]>([]);
  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'STANDARD' | 'HIGH_PRIORITY' | 'CRITICAL'>('STANDARD');
  const [notes, setNotes] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (open) loadDisasters(); }, [open]);

  const loadDisasters = async () => {
    setLoadingDisasters(true);
    try {
      const res = await getActiveDisasters();
      if (res.data) setDisasters(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoadingDisasters(false);
    }
  };

  const selectedDisaster = disasters.find((d) => d.id === selectedId);

  const handleReset = () => {
    setSelectedId(null); setPriority('STANDARD'); setNotes('');
    setDeploying(false); setSuccess(false);
  };
  const handleClose = () => { handleReset(); onClose(); };

  const handleDeploy = async () => {
    if (!selectedId) return;
    setDeploying(true);
    const result = await deployUnit({ unitId: unitUuid, disasterId: selectedId, priority, notes });
    setDeploying(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => { onSuccess(); handleClose(); }, 2500);
    } else {
      message.error(result.message || 'Deployment failed');
    }
  };

  // Success screen
  if (success && selectedDisaster) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={400} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0', gap: 14 }}>
          <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 28 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 17, display: 'block', marginBottom: 6 }}>Unit {unitId} Deployed</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />{selectedDisaster.location_address}
            </Text>
          </div>
          <Button onClick={handleClose} style={{ borderRadius: 6 }}>Close</Button>
        </div>
      </Modal>
    );
  }

  // Deploying spinner
  if (deploying) {
    return (
      <Modal open={open} closable={false} footer={null} width={400} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', gap: 16 }}>
          <LoadingOutlined style={{ fontSize: 36, color: '#7c3aed' }} />
          <Text strong style={{ fontSize: 14 }}>Deploying Unit {unitId}...</Text>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={440} destroyOnClose
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      {/* Scrollable body */}
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 2 }}>
          Deploy Unit {unitId}
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 14 }}>
          {unitType} – {station}
        </Text>

        {/* Select disaster */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#111827' }}>
            Select Target Disaster
          </Text>
          {loadingDisasters ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spin /></div>
          ) : disasters.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>No active disasters found</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {disasters.map((d) => {
                const sevCfg = SEVERITY_COLORS[d.severity?.toLowerCase()] || SEVERITY_COLORS.medium;
                const isSelected = selectedId === d.id;
                return (
                  <div key={d.id} onClick={() => setSelectedId(d.id)}
                    style={{
                      padding: '10px 12px', border: `2px solid ${isSelected ? '#7c3aed' : '#e5e7eb'}`,
                      borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? '#f5f3ff' : '#fff', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <Text strong style={{ fontSize: 12 }}>{d.tracking_id}</Text>
                          <Tag style={{ background: sevCfg.bg, color: sevCfg.text, border: 0, fontSize: 10, fontWeight: 700, margin: 0 }}>
                            {d.severity}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <EnvironmentOutlined style={{ marginRight: 3 }} />{d.location_address}
                        </Text>
                        <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{d.type}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <ClockCircleOutlined style={{ marginRight: 2 }} />{d.time_ago}
                          </Text>
                        </div>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${isSelected ? '#7c3aed' : '#d1d5db'}`, background: isSelected ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {isSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#111827' }}>
            Deployment Priority
          </Text>
          <div className="dum-radio">
            <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)}>
              <Space size={16}>
                {([['STANDARD', '#3b82f6', 'Standard'], ['HIGH_PRIORITY', '#f97316', 'High Priority'], ['CRITICAL', '#ef4444', 'Critical']] as const).map(([val, color, label]) => (
                  <Radio key={val} value={val}>
                    <Space size={4}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                    </Space>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: '#111827' }}>
            Special Instructions <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text>
          </Text>
          <TextArea rows={2} placeholder="Add any special instructions..."
            value={notes} onChange={(e) => setNotes(e.target.value)}
            style={{ resize: 'none', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }} />
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button type="primary" icon={<SendOutlined />} disabled={!selectedId} onClick={handleDeploy}
          style={{ height: 36, paddingInline: 20, borderRadius: 6, fontWeight: 600, fontSize: 12, background: '#7c3aed', borderColor: '#7c3aed', flex: 1 }}>
          Deploy Now
        </Button>
      </div>

      <style>{`
        .dum-radio .ant-radio-checked .ant-radio-inner { background-color: #7c3aed !important; border-color: #7c3aed !important; }
        .dum-radio .ant-radio-wrapper .ant-radio-inner::after { background-color: #fff !important; }
        .dum-radio .ant-radio:hover .ant-radio-inner { border-color: #7c3aed !important; }
      `}</style>
    </Modal>
  );
};

export default DeployUnitModal;