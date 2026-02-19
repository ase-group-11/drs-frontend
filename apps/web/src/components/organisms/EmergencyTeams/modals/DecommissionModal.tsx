// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Radio,
  Checkbox,
  Progress,
  Typography,
  Space,
  Tag,
  message,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  ToolOutlined,
  SyncOutlined,
  DollarOutlined,
  FileTextOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { decommissionUnit } from '../../../../services';

const { TextArea } = Input;
const { Text } = Typography;

const IMPACT_ITEMS = [
  '2 active deployments will need reassignment',
  'Zone A coverage will be reduced by 15%',
  'Average response time may increase by 2 minutes',
  'Scheduled for 3 training sessions',
];

const REASON_OPTIONS = [
  { value: 'end-of-life', label: 'End of Service Life', icon: <CalendarOutlined /> },
  { value: 'damaged', label: 'Vehicle Damaged Beyond Repair', icon: <ToolOutlined /> },
  { value: 'replacing', label: 'Replacing with New Unit', icon: <SyncOutlined /> },
  { value: 'budget', label: 'Budget Constraints', icon: <DollarOutlined /> },
  { value: 'other', label: 'Other', icon: <FileTextOutlined /> },
];

const CHECKLIST_ITEMS = [
  { key: 'permanent', label: 'This unit will be permanently marked as decommissioned' },
  { key: 'transferred', label: 'Active deployments will be transferred to other units' },
  { key: 'archived', label: 'Historical records will be archived but not deleted' },
  { key: 'irreversible', label: 'This action cannot be easily undone' },
];

interface DecommissionModalProps {
  open: boolean;
  unitId: string;
  unitType: string;
  station: string;
  yearsInService: number;
  totalDeployments: number;
  lastDeployment: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DecommissionModal: React.FC<DecommissionModalProps> = ({
  open,
  unitId,
  unitType,
  station,
  yearsInService,
  totalDeployments,
  lastDeployment,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [notes, setNotes] = useState('');
  const [transferUnit, setTransferUnit] = useState('');
  const [autoNotify, setAutoNotify] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [checklist, setChecklist] = useState({ permanent: false, transferred: false, archived: false, irreversible: false });
  const [archiveRecords, setArchiveRecords] = useState(true);
  const [notifyCrew, setNotifyCrew] = useState(true);
  const [generateReport, setGenerateReport] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const allChecked = Object.values(checklist).every(Boolean);
  const canProceed = allChecked && confirmText === 'DECOMMISSION' && password.length > 0 && reason.length > 0;

  const handleReset = () => {
    setReason(''); setOtherReason(''); setNotes(''); setTransferUnit('');
    setAutoNotify(true); setPassword(''); setShowPassword(false); setConfirmText('');
    setChecklist({ permanent: false, transferred: false, archived: false, irreversible: false });
    setArchiveRecords(true); setNotifyCrew(true); setGenerateReport(true);
    setProgress(0); setIsProcessing(false); setSuccess(false);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleDecommission = async () => {
    setIsProcessing(true);
    const steps = [25, 50, 75, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 800));
      setProgress(p);
    }
    const result = await decommissionUnit(unitId, reason);
    setIsProcessing(false);
    if (result.success) {
      setSuccess(true);
    } else {
      message.error(result.message || 'Decommission failed');
    }
  };

  // Processing screen
  if (isProcessing) {
    const stepMessages = ['Transferring active deployments...', 'Notifying crew members...', 'Archiving records...', 'Updating system status...'];
    const stepIdx = Math.floor(progress / 25);
    return (
      <Modal open={open} closable={false} footer={null} width={440} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20 }}>
          <LoadingOutlined style={{ fontSize: 40, color: '#7c3aed' }} />
          <Text strong style={{ fontSize: 16 }}>Decommissioning Unit {unitId}</Text>
          <div style={{ width: '100%' }}>
            <Progress percent={progress} strokeColor="#7c3aed" />
            <Text type="secondary" style={{ fontSize: 13, display: 'block', textAlign: 'center', marginTop: 8 }}>
              {stepMessages[Math.min(stepIdx, 3)]}
            </Text>
          </div>
        </div>
      </Modal>
    );
  }

  // Success screen
  if (success) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={460} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 20 }}>
          <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#374151', fontSize: 32 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 20, display: 'block' }}>Unit {unitId} Decommissioned</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>The unit has been removed from active service</Text>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Deployments transferred', '2'], ['Crew members notified', '4'], ['Records archived', '1,234 files']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
                <Text strong style={{ fontSize: 13 }}>{val}</Text>
              </div>
            ))}
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => message.info('Downloading decommission report...')}>
              Download Report
            </Button>
            <Button type="primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => { onSuccess(); handleClose(); }}>
              Back to Teams
            </Button>
          </Space>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#dc2626', fontSize: 20 }} />
          <div>
            <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}>Decommission Unit</div>
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 400 }}>This action requires authorization</div>
          </div>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={540}
      destroyOnClose
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Warning banner */}
        <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', flexShrink: 0 }} />
            <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              Warning: Decommissioning will remove this unit from active service
            </Text>
          </div>
        </div>

        {/* Unit summary */}
        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <Text strong style={{ fontSize: 22 }}>{unitId}</Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>{unitType}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>{station}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{yearsInService} years in service</Text>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Deployments</Text>
              <Text strong style={{ fontSize: 14, display: 'block' }}>{totalDeployments}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Last Deployment</Text>
              <Text strong style={{ fontSize: 14, display: 'block' }}>{lastDeployment}</Text>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div>
          <Text strong style={{ fontSize: 13, color: '#dc2626', display: 'block', marginBottom: 10 }}>
            Reason for Decommissioning <span style={{ color: '#dc2626' }}>*</span>
          </Text>
          <Radio.Group value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {REASON_OPTIONS.map(({ value, label, icon }) => (
                <Radio key={value} value={value}>
                  <Space size={6}>
                    <span style={{ color: '#6b7280' }}>{icon}</span>
                    <Text style={{ fontSize: 13 }}>{label}</Text>
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          {reason === 'other' && (
            <Input
              style={{ marginTop: 8 }}
              placeholder="Specify reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Additional Details</Text>
          <TextArea rows={2} placeholder="Provide additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'none' }} />
        </div>

        {/* Impact assessment */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Impact Analysis</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {IMPACT_ITEMS.map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', background: '#fffbeb', borderRadius: 6 }}>
                <WarningOutlined style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                <Text style={{ fontSize: 12, color: '#374151' }}>{item}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Reassignment */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Reassign Active Duties</Text>
          <Select value={transferUnit} onChange={setTransferUnit} placeholder="Transfer duties to unit..." style={{ width: '100%' }}>
            <Select.Option value="F-05">F-05 – Tara Street Station (Available)</Select.Option>
            <Select.Option value="F-09">F-09 – North Strand Station (Available)</Select.Option>
            <Select.Option value="F-11">F-11 – Phibsborough Station (Available)</Select.Option>
          </Select>
          <Checkbox style={{ marginTop: 10 }} checked={autoNotify} onChange={(e) => setAutoNotify(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Automatically notify transferred units</Text>
          </Checkbox>
        </div>

        {/* Authorization */}
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 13, color: '#dc2626', display: 'block', marginBottom: 10 }}>Authorization Required</Text>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Admin Password</Text>
          <Input.Password
            placeholder="Enter admin password to confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            style={{ borderColor: '#fecaca' }}
          />
        </div>

        {/* Confirmation checklist */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Confirm you understand:</Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {CHECKLIST_ITEMS.map(({ key, label }) => (
              <Checkbox
                key={key}
                checked={checklist[key as keyof typeof checklist]}
                onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
              >
                <Text style={{ fontSize: 13 }}>{label}</Text>
              </Checkbox>
            ))}
          </Space>
        </div>

        {/* Final confirmation input */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Type 'DECOMMISSION' to confirm
          </Text>
          <Input
            placeholder="Type DECOMMISSION"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            style={{ borderColor: '#fecaca' }}
          />
        </div>

        {/* Archival options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Checkbox checked={archiveRecords} onChange={(e) => setArchiveRecords(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Archive all records and photos</Text>
          </Checkbox>
          <Checkbox checked={notifyCrew} onChange={(e) => setNotifyCrew(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Notify all crew members via email</Text>
          </Checkbox>
          <Checkbox checked={generateReport} onChange={(e) => setGenerateReport(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Generate decommission report (PDF)</Text>
          </Checkbox>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <Text type="secondary" style={{ fontSize: 12, color: '#dc2626', display: 'block', textAlign: 'center', marginBottom: 12 }}>
            This action requires supervisor approval
          </Text>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button block onClick={handleClose}>Cancel</Button>
            <Button
              block
              danger
              disabled={!canProceed}
              onClick={handleDecommission}
              style={canProceed ? { animation: 'pulse 2s infinite' } : {}}
            >
              Decommission Unit
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DecommissionModal;
