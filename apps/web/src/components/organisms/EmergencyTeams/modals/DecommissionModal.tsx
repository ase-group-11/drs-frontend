// DecommissionModal.tsx
import React, { useEffect, useState } from 'react';
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
  const [confirmText, setConfirmText] = useState('');

  const [checklist, setChecklist] = useState({
    permanent: false,
    transferred: false,
    archived: false,
    irreversible: false,
  });

  const [archiveRecords, setArchiveRecords] = useState(true);
  const [notifyCrew, setNotifyCrew] = useState(true);
  const [generateReport, setGenerateReport] = useState(true);

  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Scoped style overrides to match Figma
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'dcm-modal-styles';
    style.textContent = `
      /* --- RADIO (optional) --- */
      .dcm-modal .dcm-radio .ant-radio-checked .ant-radio-inner {
        background-color: #111827 !important;
        border-color: #111827 !important;
      }
      .dcm-modal .dcm-radio .ant-radio-inner::after {
        background-color: #fff !important;
      }
      .dcm-modal .dcm-radio .ant-radio:hover .ant-radio-inner {
        border-color: #374151 !important;
      }

      /* --- CHECKBOX: black like Figma --- */
      .dcm-modal .ant-checkbox-inner {
        border-color: #d1d5db !important;
        border-radius: 4px;
      }
      .dcm-modal .ant-checkbox-checked .ant-checkbox-inner {
        background-color: #111827 !important;
        border-color: #111827 !important;
      }
      .dcm-modal .ant-checkbox-wrapper:hover .ant-checkbox-inner,
      .dcm-modal .ant-checkbox:hover .ant-checkbox-inner {
        border-color: #111827 !important;
      }

      /* --- INPUTS: grey fill inside --- */
      .dcm-modal .ant-input,
      .dcm-modal .ant-input-affix-wrapper,
      .dcm-modal .ant-input-password,
      .dcm-modal .ant-input-textarea-affix-wrapper {
        background: #f3f4f6 !important;
      }
      .dcm-modal .ant-input-affix-wrapper > input.ant-input {
        background: transparent !important;
      }

      /* --- SELECT: grey fill like Figma --- */
      .dcm-modal .ant-select .ant-select-selector {
        background: #f3f4f6 !important;
        border-color: #e5e7eb !important;
        border-radius: 12px !important;
        height: 44px !important;
      }
      .dcm-modal .ant-select-single .ant-select-selector .ant-select-selection-item,
      .dcm-modal .ant-select-single .ant-select-selector .ant-select-selection-placeholder {
        line-height: 42px !important;
      }

      /* --- FOOTER: single-row alignment like Figma --- */
      .dcm-modal .dcm-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: nowrap; /* IMPORTANT: prevent wrapping */
      }
      .dcm-modal .dcm-footer-text {
        flex: 1;
        min-width: 0; /* allow ellipsis */
        white-space: normal;     /* allow wrap */
        overflow: visible;       /* no clipping */
        text-overflow: clip;     /* no ellipsis */
        line-height: 1.25;
      }

      .dcm-modal .dcm-footer-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-shrink: 0;
        margin-left: auto;
      }

      .dcm-modal .dcm-cancel-btn.ant-btn {
        height: 44px !important;
        padding: 0 28px !important;
        border-radius: 12px !important;
        border: 1px solid #e5e7eb !important;
        background: #fff !important;
        font-weight: 600 !important;
      }

      .dcm-modal .dcm-danger-btn.ant-btn {
        height: 44px !important;
        padding: 0 28px !important;
        border-radius: 12px !important;
        background: #f87171 !important; /* pink/red like Figma */
        border-color: #f87171 !important;
        color: #fff !important;
        font-weight: 600 !important;
        box-shadow: 0 10px 22px rgba(239, 68, 68, 0.18);
      }
      .dcm-modal .dcm-danger-btn.ant-btn:hover {
        background: #ef4444 !important;
        border-color: #ef4444 !important;
        color: #fff !important;
      }
      .dcm-modal .dcm-danger-btn.ant-btn[disabled],
      .dcm-modal .dcm-danger-btn.ant-btn:disabled,
      .dcm-modal .dcm-danger-btn.ant-btn.ant-btn-disabled {
        background: #fca5a5 !important;
        border-color: #fca5a5 !important;
        color: #fff !important;
        opacity: 1 !important;
        box-shadow: none !important;
        cursor: not-allowed !important;
      }
    `;

    if (!document.getElementById('dcm-modal-styles')) {
      document.head.appendChild(style);
    }
    return () => {
      document.getElementById('dcm-modal-styles')?.remove();
    };
  }, []);

  const handleReset = () => {
    setReason('');
    setOtherReason('');
    setNotes('');
    setTransferUnit('');
    setAutoNotify(true);
    setPassword('');
    setConfirmText('');
    setChecklist({ permanent: false, transferred: false, archived: false, irreversible: false });
    setArchiveRecords(true);
    setNotifyCrew(true);
    setGenerateReport(true);
    setProgress(0);
    setIsProcessing(false);
    setSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const canDecommission =
    reason.trim().length > 0 &&
    (reason !== 'other' || otherReason.trim().length > 0) &&
    password.trim().length > 0 &&
    confirmText.trim().toUpperCase() === 'DECOMMISSION' &&
    Object.values(checklist).every(Boolean);

  const handleDecommission = async () => {
    setIsProcessing(true);

    const steps = [25, 50, 75, 100];
    for (const p of steps) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 800));
      setProgress(p);
    }

    const finalReason = reason === 'other' ? (otherReason || 'Other') : reason;

    try {
      const result = await decommissionUnit(unitId, finalReason);
      setIsProcessing(false);

      if (result?.success) {
        setSuccess(true);
      } else {
        message.error(result?.message || 'Decommission failed');
      }
    } catch {
      setIsProcessing(false);
      message.error('Decommission failed');
    }
  };

  // Processing screen
  if (isProcessing) {
    const stepMessages = [
      'Transferring active deployments...',
      'Notifying crew members...',
      'Archiving records...',
      'Updating system status...',
    ];
    const stepIdx = Math.min(Math.floor(progress / 25), 3);

    return (
      <Modal open={open} closable={false} footer={null} width={440} destroyOnClose className="dcm-modal">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 0',
            gap: 20,
          }}
        >
          <LoadingOutlined style={{ fontSize: 40, color: '#7c3aed' }} />
          <Text strong style={{ fontSize: 16 }}>
            Decommissioning Unit {unitId}
          </Text>

          <div style={{ width: '100%' }}>
            <Progress percent={progress} strokeColor="#7c3aed" />
            <Text
              type="secondary"
              style={{ fontSize: 13, display: 'block', textAlign: 'center', marginTop: 8 }}
            >
              {stepMessages[stepIdx]}
            </Text>
          </div>
        </div>
      </Modal>
    );
  }

  // Success screen
  if (success) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={460} destroyOnClose className="dcm-modal">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleOutlined style={{ color: '#374151', fontSize: 32 }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 20, display: 'block' }}>
              Unit {unitId} Decommissioned
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              The unit has been removed from active service
            </Text>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Deployments transferred', '2'],
              ['Crew members notified', '4'],
              ['Records archived', '1,234 files'],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f9fafb',
                  borderRadius: 8,
                }}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {label}
                </Text>
                <Text strong style={{ fontSize: 13 }}>
                  {val}
                </Text>
              </div>
            ))}
          </div>

          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => message.info('Downloading decommission report...')}>
              Download Report
            </Button>
            <Button
              type="primary"
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={() => {
                onSuccess();
                handleClose();
              }}
            >
              Back to Teams
            </Button>
          </Space>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      className="dcm-modal"
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
      styles={{
        body: {
          maxHeight: '75vh',
          overflowY: 'auto',
          paddingRight: 18,
          scrollbarGutter: 'stable',
        },
      }}
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Warning banner */}
        <div
          style={{
            padding: '10px 14px',
            background: '#fef2f2',
            borderLeft: '4px solid #dc2626',
            borderRadius: '0 8px 8px 0',
          }}
        >
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
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                {unitType}
              </Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                {station}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {yearsInService} years in service
              </Text>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              paddingTop: 12,
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total Deployments
              </Text>
              <Text strong style={{ fontSize: 14, display: 'block' }}>
                {totalDeployments}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Last Deployment
              </Text>
              <Text strong style={{ fontSize: 14, display: 'block' }}>
                {lastDeployment}
              </Text>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div>
          <Text strong style={{ fontSize: 13, color: '#dc2626', display: 'block', marginBottom: 10 }}>
            Reason for Decommissioning <span style={{ color: '#dc2626' }}>*</span>
          </Text>

          <Radio.Group
            className="dcm-radio"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {REASON_OPTIONS.map(({ value, label, icon }) => (
                <Radio key={value} value={value} style={{ width: '100%' }}>
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
              placeholder="Specify reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              style={{
                marginTop: 8,
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                height: 44,
              }}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Additional Details
          </Text>
          <TextArea
            rows={3}
            placeholder="Provide additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              resize: 'none',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
            }}
          />
        </div>

        {/* Impact assessment */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
            Impact Analysis
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {IMPACT_ITEMS.map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '6px 10px',
                  background: '#fffbeb',
                  borderRadius: 8,
                }}
              >
                <WarningOutlined style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                <Text style={{ fontSize: 12, color: '#374151' }}>{item}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Reassignment */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Reassign Active Duties
          </Text>

          <Select
            size="large"
            value={transferUnit}
            onChange={setTransferUnit}
            placeholder="Transfer duties to unit..."
            style={{ width: '100%' }}
          >
            <Select.Option value="F-05">F-05 – Tara Street Station (Available)</Select.Option>
            <Select.Option value="F-09">F-09 – North Strand Station (Available)</Select.Option>
            <Select.Option value="F-11">F-11 – Phibsborough Station (Available)</Select.Option>
          </Select>

          <Checkbox style={{ marginTop: 10 }} checked={autoNotify} onChange={(e) => setAutoNotify(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Automatically notify transferred units</Text>
          </Checkbox>
        </div>

        {/* Authorization */}
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
          <Text strong style={{ fontSize: 13, color: '#dc2626', display: 'block', marginBottom: 10 }}>
            Authorization Required
          </Text>

          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Admin Password
          </Text>

          <Input.Password
            size="large"
            placeholder="Enter admin password to confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            style={{
              background: '#f3f4f6',
              borderColor: '#fecaca',
              borderRadius: 12,
              height: 44,
            }}
          />
        </div>

        {/* Confirmation checklist */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
            Confirm you understand:
          </Text>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
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
            Type &apos;DECOMMISSION&apos; to confirm
          </Text>

          <Input
            size="large"
            placeholder="Type DECOMMISSION"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            style={{
              background: '#f3f4f6',
              borderColor: '#fecaca',
              borderRadius: 12,
              height: 44,
            }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

        {/* Footer (fixed alignment) */}
        <div style={{ paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
          <div className="dcm-footer">
            <Text className="dcm-footer-text" style={{ fontSize: 12, color: '#ef4444' }}>
              This action requires supervisor approval
            </Text>

            <div className="dcm-footer-actions">
              <Button className="dcm-cancel-btn" onClick={handleClose}>
                Cancel
              </Button>

              <Button
                className="dcm-danger-btn"
                type="primary"
                disabled={!canDecommission}
                onClick={handleDecommission}
              >
                Decommission Unit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DecommissionModal;