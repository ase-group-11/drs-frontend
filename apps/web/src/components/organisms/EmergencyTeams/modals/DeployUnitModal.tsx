// NEW FILE
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Button,
  Radio,
  Checkbox,
  Input,
  Tag,
  Typography,
  Space,
  Spin,
  message,
} from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
  LoadingOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
} from '@ant-design/icons';
import { deployUnit, getActiveDisasters } from '../../../../services';
import type { ActiveDisaster } from '../../../../types';

const { TextArea } = Input;
const { Text } = Typography;

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fee2e2', text: '#dc2626' },
  high: { bg: '#ffedd5', text: '#ea580c' },
  medium: { bg: '#fef9c3', text: '#ca8a04' },
};

interface DeployUnitModalProps {
  open: boolean;
  unitId: string;
  unitType: string;
  station: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DeployUnitModal: React.FC<DeployUnitModalProps> = ({
  open,
  unitId,
  unitType,
  station,
  onClose,
  onSuccess,
}) => {
  const [disasters, setDisasters] = useState<ActiveDisaster[]>([]);
  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'standard' | 'emergency' | 'code-red'>('standard');
  const [notes, setNotes] = useState('');
  const [readyConfirmed, setReadyConfirmed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadDisasters();
    }
  }, [open]);

  const loadDisasters = async () => {
    setLoadingDisasters(true);
    try {
      const res = await getActiveDisasters();
      if (res.data) setDisasters(res.data);
    } finally {
      setLoadingDisasters(false);
    }
  };

  const selectedDisaster = disasters.find((d) => d.id === selectedId);

  const handleReset = () => {
    setSelectedId(null);
    setPriority('standard');
    setNotes('');
    setReadyConfirmed(false);
    setExpandedId(null);
    setDeploying(false);
    setSuccess(false);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleDeploy = async () => {
    if (!selectedId) return;
    setDeploying(true);
    await new Promise((r) => setTimeout(r, 2000));
    const result = await deployUnit({ unitId, disasterId: selectedId, priority, notes });
    setDeploying(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3000);
    } else {
      message.error(result.message || 'Deployment failed');
    }
  };

  // Success screen
  if (success && selectedDisaster) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={500} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
          <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 32 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 20, display: 'block' }}>Unit {unitId} Deployed</Text>
            <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
              <Text type="secondary"><EnvironmentOutlined /> En route to {selectedDisaster.location}</Text>
              <Text type="secondary"><ClockCircleOutlined /> ETA: {selectedDisaster.eta} minutes</Text>
            </Space>
          </div>
          <Space>
            <Button type="primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
              Track Deployment
            </Button>
            <Button onClick={handleClose}>Close</Button>
          </Space>
        </div>
      </Modal>
    );
  }

  // Deploying spinner
  if (deploying) {
    return (
      <Modal open={open} onCancel={() => {}} closable={false} footer={null} width={420} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20 }}>
          <LoadingOutlined style={{ fontSize: 40, color: '#7c3aed' }} />
          <Text strong style={{ fontSize: 16 }}>Deploying Unit {unitId}...</Text>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Deploy Unit ${unitId}`}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={650}
      destroyOnClose
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 20 } }}
    >
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        {unitType} – {station}
      </Text>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Map placeholder */}
        <div style={{ height: 180, background: '#1f2937', borderRadius: 10, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <EnvironmentOutlined style={{ fontSize: 40, display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>Interactive Map Preview</Text>
          </div>
          <div style={{ position: 'absolute', top: 16, left: 24, width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.3)' }} />
          <div style={{ position: 'absolute', top: 40, right: 40, width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.3)' }} />
          <div style={{ position: 'absolute', bottom: 32, left: '35%', width: 10, height: 10, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.3)' }} />
        </div>

        {/* Select disaster */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Select Target Disaster</Text>
          {loadingDisasters ? (
            <Spin />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 16 }}>
              {disasters.map((d) => {
                const sevCfg = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.medium;
                const isSelected = selectedId === d.id;
                return (
                  <div key={d.id}>
                    <div
                      onClick={() => setSelectedId(d.id)}
                      style={{
                        padding: 14,
                        border: `2px solid ${isSelected ? '#7c3aed' : '#e5e7eb'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSelected ? '#f5f3ff' : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                          <span style={{ fontSize: 24 }}>{d.typeIcon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <Text strong style={{ fontSize: 13 }}>{d.reportId}</Text>
                              <Tag style={{ background: sevCfg.bg, color: sevCfg.text, border: 0, fontSize: 10, fontWeight: 700 }}>
                                {d.severity.toUpperCase()}
                              </Tag>
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <EnvironmentOutlined style={{ marginRight: 3 }} />{d.location}
                            </Text>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>{d.distance} km away</Text>
                              <Text style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
                                <ClockCircleOutlined style={{ marginRight: 3 }} />Est. {d.eta} mins
                              </Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                2 units responding
                              </Text>
                              <span style={{
                                background: '#dcfce7',
                                color: '#16a34a',
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 20,
                                padding: '2px 10px',
                              }}>
                                Active - In Progress
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? '#7c3aed' : '#d1d5db'}`, background: isSelected ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                          {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #ede9fe' }}>
                          <Button
                            type="text"
                            size="small"
                            style={{ padding: '0 4px', width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                            onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === d.id ? null : d.id); }}
                          >
                            <span style={{ fontSize: 12 }}>View Details</span>
                            {expandedId === d.id ? <CaretUpOutlined /> : <CaretDownOutlined />}
                          </Button>
                          {expandedId === d.id && (
                            <div style={{ marginTop: 8, padding: 12, background: '#eff6ff', borderRadius: 8 }}>
                              <Text style={{ fontSize: 12 }}><strong>Description:</strong> {d.description}</Text>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Reported: {d.timeReported}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>Reporter: {d.reporter}</Text>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Route planning */}
        {selectedDisaster && (
          <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Route Planning</Text>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tag style={{ background: '#dcfce7', color: '#16a34a', border: 0 }}>Fastest Route</Tag>
              <div>
                <Text strong style={{ fontSize: 13 }}>{selectedDisaster.distance} km</Text>
                <Text type="secondary" style={{ margin: '0 8px' }}>·</Text>
                <Text strong style={{ fontSize: 13, color: '#16a34a' }}>{selectedDisaster.eta} minutes</Text>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>Light traffic conditions</Text>
            </div>
          </div>
        )}

        {/* Priority */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Deployment Priority</Text>
          <div className="dum-radio">
          <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)}>
            <Space direction="vertical" size={8}>
              {([['standard', '#3b82f6', 'Standard'], ['emergency', '#f97316', 'Emergency'], ['code-red', '#ef4444', 'Code Red']] as const).map(([val, color, label]) => (
                <Radio key={val} value={val}>
                  <Space size={8}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <Text style={{ fontSize: 13 }}>{label}</Text>
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          </div>
        </div>

        {/* Crew readiness */}
        <div style={{ padding: 14, background: '#f9fafb', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Crew Readiness</Text>
          {['All crew members present', 'Equipment check completed', 'Vehicle fueled'].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CheckCircleOutlined style={{ color: '#10b981' }} />
              <Text type="secondary" style={{ fontSize: 13 }}>{item}</Text>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Special Instructions (Optional)</Text>
          <TextArea rows={2} placeholder="Add any special instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'none', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8 }} />
        </div>

        {/* Pre-deployment checklist */}
        <div style={{ padding: 14, background: '#fffbeb', borderLeft: '4px solid #f97316', borderRadius: '0 8px 8px 0' }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Ensure all crew members are equipped with:</Text>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: 12 }}>
            {['Personal protective equipment (PPE)', 'Communication devices', 'Emergency medical kit', 'Safety protocols reviewed'].map((item) => (
              <li key={item} style={{ marginBottom: 3 }}>{item}</li>
            ))}
          </ul>
          <div style={{ marginTop: 12 }}>
            <Checkbox checked={readyConfirmed} onChange={(e) => setReadyConfirmed(e.target.checked)}>
              <Text style={{ fontSize: 13 }}>I confirm the unit is ready for deployment</Text>
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginTop: 16, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 10 }}>
        <div>
          {selectedDisaster && (
            <>
              <Text strong style={{ fontSize: 13, display: 'block' }}>{unitId} → {selectedDisaster.reportId}</Text>
              <Tag style={{ marginTop: 4, background: '#7c3aed', color: '#fff', border: 0 }}>ETA: {selectedDisaster.eta} mins</Tag>
            </>
          )}
        </div>
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!selectedId || !readyConfirmed}
            onClick={handleDeploy}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Deploy Now
          </Button>
        </Space>
      </div>
    <style>{`
        .dum-radio .ant-radio-checked .ant-radio-inner {
          background-color: #111827 !important;
          border-color: #111827 !important;
        }
        .dum-radio .ant-radio-wrapper .ant-radio-inner::after {
          background-color: #fff !important;
        }
        .dum-radio .ant-radio:hover .ant-radio-inner {
          border-color: #374151 !important;
        }
        .dum-radio .ant-radio-checked::after {
          border-color: #111827 !important;
        }
      `}</style>
    </Modal>
  );
};

export default DeployUnitModal;