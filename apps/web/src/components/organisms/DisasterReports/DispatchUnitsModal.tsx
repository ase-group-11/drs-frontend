// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Checkbox,
  Switch,
  Input,
  Button,
  Tag,
  Space,
  Badge,
  message,
  Divider,
  Typography,
} from 'antd';
import {
  TeamOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import { dispatchUnits } from '../../../services';

const { TextArea } = Input;
const { Text } = Typography;

// FALLBACK DUMMY DATA — remove or replace when API is live
const AVAILABLE_UNITS = [
  { id: 'u1', unitId: 'F-08', type: 'Fire', station: 'Rathmines Station', crew: '4/4', eta: '6 mins', available: true },
  { id: 'u2', unitId: 'A-04', type: 'Ambulance', station: 'St James Hospital', crew: '2/2', eta: '4 mins', available: true },
  { id: 'u3', unitId: 'P-15', type: 'Police', station: 'Kevin St Station', crew: '2/2', eta: '3 mins', available: true },
  { id: 'u4', unitId: 'F-11', type: 'Fire', station: 'Dolphin\'s Barn', crew: '3/4', eta: '8 mins', available: true },
  { id: 'u5', unitId: 'A-07', type: 'Ambulance', station: 'Crumlin Hospital', crew: '2/2', eta: '10 mins', available: true },
  { id: 'u6', unitId: 'R-02', type: 'Rescue', station: 'Dublin Mountain', crew: '4/6', eta: '15 mins', available: true },
];

const UNIT_TYPE_COLORS: Record<string, string> = {
  Fire: '#ef4444',
  Ambulance: '#3b82f6',
  Police: '#1d4ed8',
  Rescue: '#059669',
};

interface DispatchUnitsModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DispatchUnitsModal: React.FC<DispatchUnitsModalProps> = ({
  open,
  report,
  onClose,
  onSuccess,
}) => {
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [emergencyRouting, setEmergencyRouting] = useState(true);
  const [notifyTeams, setNotifyTeams] = useState(true);
  const [notes, setNotes] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('units');

  const filteredUnits = AVAILABLE_UNITS.filter(
    (u) =>
      u.unitId.toLowerCase().includes(unitSearch.toLowerCase()) ||
      u.type.toLowerCase().includes(unitSearch.toLowerCase()) ||
      u.station.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const handleToggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleReset = () => {
    setSelectedUnitIds([]);
    setEmergencyRouting(true);
    setNotifyTeams(true);
    setNotes('');
    setUnitSearch('');
    setActiveTab('units');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDispatch = async () => {
    if (selectedUnitIds.length === 0) {
      message.warning('Please select at least one unit to dispatch');
      return;
    }
    if (!report) return;

    setSubmitting(true);
    try {
      const result = await dispatchUnits(report.id, selectedUnitIds.length);
      if (result.success) {
        message.success(`${selectedUnitIds.length} unit${selectedUnitIds.length > 1 ? 's' : ''} dispatched to ${report.location}`);
        onSuccess();
        handleClose();
      } else {
        message.error(result.message || 'Failed to dispatch units');
      }
    } catch {
      message.error('Failed to dispatch units');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUnits = AVAILABLE_UNITS.filter((u) => selectedUnitIds.includes(u.id));

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined style={{ color: '#7c3aed' }} />
          <span>Dispatch Units</span>
          {report && (
            <Tag color="default" style={{ fontWeight: 400, marginLeft: 4 }}>
              {report.reportId}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={620}
      destroyOnClose
    >
      {report && (
        <div className="dispatch-incident-info">
          <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 6 }} />
          <Text type="secondary" style={{ fontSize: 13 }}>
            {report.location} · {report.zone}
          </Text>
        </div>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'units',
            label: (
              <span>
                Available Units
                {selectedUnitIds.length > 0 && (
                  <Badge
                    count={selectedUnitIds.length}
                    style={{ marginLeft: 8, background: '#7c3aed' }}
                    size="small"
                  />
                )}
              </span>
            ),
            children: (
              <div>
                <Input
                  placeholder="Search units by ID, type or station..."
                  prefix={<TeamOutlined />}
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <div className="dispatch-units-list">
                  {filteredUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`dispatch-unit-row ${selectedUnitIds.includes(unit.id) ? 'selected' : ''}`}
                      onClick={() => handleToggleUnit(unit.id)}
                    >
                      <Checkbox
                        checked={selectedUnitIds.includes(unit.id)}
                        onChange={() => handleToggleUnit(unit.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="dispatch-unit-icon">
                        <TeamOutlined style={{ color: UNIT_TYPE_COLORS[unit.type] }} />
                      </div>
                      <div className="dispatch-unit-details">
                        <div className="dispatch-unit-header">
                          <Text strong style={{ fontSize: 13 }}>{unit.unitId}</Text>
                          <Tag
                            style={{
                              color: UNIT_TYPE_COLORS[unit.type],
                              background: `${UNIT_TYPE_COLORS[unit.type]}15`,
                              border: `1px solid ${UNIT_TYPE_COLORS[unit.type]}30`,
                              fontSize: 11,
                            }}
                          >
                            {unit.type}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {unit.station} · Crew {unit.crew}
                        </Text>
                      </div>
                      <div className="dispatch-unit-eta">
                        <ClockCircleOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{unit.eta}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'config',
            label: 'Options & Notes',
            children: (
              <div className="dispatch-config">
                <div className="dispatch-config-row">
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 2 }}>
                      <ThunderboltOutlined style={{ marginRight: 6, color: '#f97316' }} />
                      Emergency Routing
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Units will use priority routing with lights & sirens
                    </Text>
                  </div>
                  <Switch
                    checked={emergencyRouting}
                    onChange={setEmergencyRouting}
                    style={emergencyRouting ? { background: '#7c3aed' } : {}}
                  />
                </div>
                <Divider style={{ margin: '14px 0' }} />
                <div className="dispatch-config-row">
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 2 }}>
                      Notify Teams on Dispatch
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Send push notification to selected unit members
                    </Text>
                  </div>
                  <Switch
                    checked={notifyTeams}
                    onChange={setNotifyTeams}
                    style={notifyTeams ? { background: '#7c3aed' } : {}}
                  />
                </div>
                <Divider style={{ margin: '14px 0' }} />
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Dispatch Notes
                  </Text>
                  <TextArea
                    rows={3}
                    placeholder="Any special instructions for responding units..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    showCount
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Footer */}
      <div className="dispatch-footer">
        {selectedUnitIds.length > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <TeamOutlined style={{ marginRight: 4 }} />
            {selectedUnitIds.length} unit{selectedUnitIds.length > 1 ? 's' : ''} selected:{' '}
            {selectedUnits.map((u) => u.unitId).join(', ')}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No units selected
          </Text>
        )}
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            loading={submitting}
            disabled={selectedUnitIds.length === 0}
            onClick={handleDispatch}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Dispatch {selectedUnitIds.length > 0 ? `${selectedUnitIds.length} Unit${selectedUnitIds.length > 1 ? 's' : ''}` : 'Units'}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default DispatchUnitsModal;
