import React, { useState } from 'react';
import { Modal, Button, Input, Radio, Typography, Space, message } from 'antd';
import {
  WarningOutlined, CalendarOutlined, ToolOutlined, SyncOutlined,
  DollarOutlined, FileTextOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { decommissionUnit } from '../../../../services';

const { Text } = Typography;

const REASON_OPTIONS = [
  { value: 'end-of-life', label: 'End of Service Life',          icon: <CalendarOutlined /> },
  { value: 'damaged',     label: 'Vehicle Damaged Beyond Repair', icon: <ToolOutlined /> },
  { value: 'replacing',   label: 'Replacing with New Unit',       icon: <SyncOutlined /> },
  { value: 'budget',      label: 'Budget Constraints',            icon: <DollarOutlined /> },
  { value: 'other',       label: 'Other',                         icon: <FileTextOutlined /> },
];

interface DecommissionModalProps {
  open: boolean;
  unitId: string;     // display code e.g. "F-20"
  unitUuid: string;   // real UUID for API
  unitType: string;
  station: string;
  totalDeployments: number;
  lastDeployment: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DecommissionModal: React.FC<DecommissionModalProps> = ({
  open, unitId, unitUuid, unitType, station, totalDeployments, lastDeployment, onClose, onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = () => {
    setReason(''); setOtherReason(''); setIsProcessing(false); setSuccess(false);
  };
  const handleClose = () => { handleReset(); onClose(); };

  const canDecommission = reason.trim().length > 0 &&
    (reason !== 'other' || otherReason.trim().length > 0);

  const handleDecommission = async () => {
    setIsProcessing(true);
    const finalReason = reason === 'other' ? (otherReason || 'Other') : reason;
    try {
      const result = await decommissionUnit(unitUuid, finalReason);
      if (result?.success) {
        setSuccess(true);
      } else {
        message.error(result?.message || 'Decommission failed');
      }
    } catch {
      message.error('Decommission failed');
    } finally {
      setIsProcessing(false);
    }
  };


  // Success screen — user must explicitly close to go back
  if (success) {
    return (
      <Modal
        open={open}
        onCancel={() => { onSuccess(); handleClose(); }}
        footer={null}
        width={400}
        destroyOnClose
        styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px 28px', gap: 16 }}>
          <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 28 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>
              Unit {unitId} Decommissioned
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              The unit has been successfully removed from active service.
            </Text>
          </div>
          <Button
            type="primary"
            onClick={() => { onSuccess(); handleClose(); }}
            style={{ background: '#7c3aed', borderColor: '#7c3aed', borderRadius: 6, height: 36, paddingInline: 24, fontWeight: 600, fontSize: 13 }}
          >
            Back to Teams
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={420} destroyOnClose title={null}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningOutlined style={{ color: '#dc2626', fontSize: 16 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 15, color: '#dc2626', display: 'block' }}>Decommission Unit</Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>This action cannot be undone</Text>
          </div>
        </div>

        {/* Unit summary */}
        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <Text strong style={{ fontSize: 18 }}>{unitId}</Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{unitType}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{station}</Text>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Total Deployments</Text>
              <Text strong style={{ fontSize: 13, display: 'block' }}>{totalDeployments}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Last Deployment</Text>
              <Text strong style={{ fontSize: 12, display: 'block' }}>{lastDeployment}</Text>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, color: '#dc2626', display: 'block', marginBottom: 8 }}>
            Reason for Decommissioning <span style={{ color: '#dc2626' }}>*</span>
          </Text>
          <Radio.Group value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {REASON_OPTIONS.map(({ value, label, icon }) => (
                <Radio key={value} value={value}>
                  <Space size={6}>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>{icon}</span>
                    <Text style={{ fontSize: 12 }}>{label}</Text>
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          {reason === 'other' && (
            <Input placeholder="Specify reason..." value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              style={{ marginTop: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, height: 34, fontSize: 12 }} />
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button disabled={!canDecommission} loading={isProcessing} onClick={handleDecommission}
          style={{
            height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 600, fontSize: 12, flex: 1,
            background: canDecommission ? '#dc2626' : undefined,
            borderColor: canDecommission ? '#dc2626' : undefined,
            color: canDecommission ? '#fff' : undefined,
          }}>
          Decommission Unit
        </Button>
      </div>

      <style>{`
        .ant-radio-checked .ant-radio-inner { background-color: #dc2626 !important; border-color: #dc2626 !important; }
        .ant-radio:hover .ant-radio-inner { border-color: #dc2626 !important; }
      `}</style>
    </Modal>
  );
};

export default DecommissionModal;