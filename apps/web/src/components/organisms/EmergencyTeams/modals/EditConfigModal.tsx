// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  Switch,
  Checkbox,
  Slider,
  Button,
  Typography,
  Space,
  message,
} from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  CarOutlined,
  ThunderboltOutlined,
  BellOutlined,
  ToolOutlined,
  PlusOutlined,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface EditCrewMember {
  id: string;
  name: string;
  role: string;
  contact: string;
}

interface EditConfigModalProps {
  open: boolean;
  unitId: string;
  unitType: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EQUIPMENT_FIELDS = [
  { key: 'ladder', label: 'Ladder' },
  { key: 'hose', label: 'Hose' },
  { key: 'firstAid', label: 'First Aid' },
  { key: 'extinguisher', label: 'Extinguisher' },
  { key: 'radio', label: 'Radio' },
  { key: 'gps', label: 'GPS' },
];

const EditConfigModal: React.FC<EditConfigModalProps> = ({
  open,
  unitId,
  unitType,
  onClose,
  onSuccess,
}) => {
  const [saving, setSaving] = useState(false);

  // Basic tab state
  const [unitTypeSelected, setUnitTypeSelected] = useState(unitType);
  const [station, setStation] = useState('Dublin Central Station');
  const [isActive, setIsActive] = useState(true);

  // Crew tab state
  const [crewSize, setCrewSize] = useState(4);
  const [crewMembers, setCrewMembers] = useState<EditCrewMember[]>([
    { id: '1', name: 'John Murphy', role: 'Team Leader', contact: '+353 87 123 4567' },
    { id: '2', name: "Sean O'Brien", role: 'Driver', contact: '+353 87 234 5678' },
    { id: '3', name: 'Mike Walsh', role: 'Responder', contact: '+353 87 345 6789' },
    { id: '4', name: 'Tom Kelly', role: 'Responder', contact: '+353 87 456 7890' },
  ]);

  // Vehicle tab state
  const [vehicleModel, setVehicleModel] = useState('Scania P-Series');
  const [licensePlate, setLicensePlate] = useState('211-D-12345');
  const [equipment, setEquipment] = useState({
    ladder: true, hose: true, firstAid: true, extinguisher: true, radio: true, gps: true,
  });

  // Operations tab state
  const [responseRadius, setResponseRadius] = useState(25);
  const [autoAccept, setAutoAccept] = useState(false);

  // Alerts tab state
  const [notifications, setNotifications] = useState({
    sms: true, push: true, email: false, radio: true,
  });

  // Maintenance notes
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const addCrewMember = () =>
    setCrewMembers((prev) => [...prev, { id: String(Date.now()), name: '', role: 'Responder', contact: '' }]);

  const removeCrewMember = (id: string) =>
    setCrewMembers((prev) => prev.filter((m) => m.id !== id));

  const updateCrewMember = (id: string, field: keyof EditCrewMember, value: string) =>
    setCrewMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const handleSave = async () => {
    setSaving(true);
    // Wire to PUT /api/admin/teams/:id when ready
    await new Promise((r) => setTimeout(r, 1500));
    setSaving(false);
    message.success(`Unit ${unitId} configuration saved`);
    onSuccess();
    onClose();
  };

  const tabItems = [
    {
      key: 'basic',
      label: <span><SettingOutlined /> <span className="et-tab-label">Basic</span></span>,
      children: (
        <div className='ecm-basic-tab' style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Unit ID</Text>
            <Input value={unitId} disabled style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Unit Type</Text>
            <style>{`
              /* Slider - black track + handle like Figma */
        .ant-slider-track, .ant-slider-track-1 {
          background-color: #111827 !important;
          height: 10px !important;
          border-radius: 5px !important;
        }
        .ant-slider-rail {
          height: 10px !important;
          background-color: #e5e7eb !important;
          border-radius: 5px !important;
        }
        .ant-slider-handle, .ant-slider-handle-1 {
          border: 2px solid #111827 !important;
          background-color: #fff !important;
          box-shadow: none !important;
          border-radius: 50% !important;
          width: 18px !important;
          height: 18px !important;
          margin-top: -4px !important;
        }
        .ant-slider-handle::after {
          display: none !important;
        }
        .ant-slider-handle:focus::after,
        .ant-slider-handle:hover::after {
          display: none !important;
        }
        .ant-slider:hover .ant-slider-track {
          background-color: #374151 !important;
        }
        /* Checkboxes - black like Figma */
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #111827 !important;
          border-color: #111827 !important;
          border-radius: 4px !important;
        }
        .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .ant-checkbox:hover .ant-checkbox-inner,
        .ant-checkbox-input:focus + .ant-checkbox-inner {
          border-color: #374151 !important;
        }
        .ant-checkbox-checked::after {
          border-color: #111827 !important;
        }
        .ecm-crew-select .ant-select-selector {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          height: 40px !important;
          align-items: center !important;
        }
        .ecm-crew-select .ant-select-selection-item {
          line-height: 40px !important;
          color: #374151 !important;
        }
        .ecm-basic-tab .ant-select-selector {
                background: #f3f4f6 !important;
                border: 1px solid #e5e7eb !important;
                border-radius: 8px !important;
              }
              .ecm-basic-tab .ant-select-focused .ant-select-selector,
              .ecm-basic-tab .ant-select-selector:focus {
                box-shadow: none !important;
                border-color: #d1d5db !important;
              }
            `}</style>
            <Select value={unitTypeSelected} onChange={setUnitTypeSelected} style={{ width: '100%' }}>
              <Select.Option value="Fire Engine">Fire Engine</Select.Option>
              <Select.Option value="Fire Ladder">Fire Ladder</Select.Option>
              <Select.Option value="Ambulance">Ambulance</Select.Option>
              <Select.Option value="Police Car">Police Car</Select.Option>
              <Select.Option value="Rescue Helicopter">Rescue Helicopter</Select.Option>
            </Select>
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Station Assignment</Text>
            <Select value={station} onChange={setStation} style={{ width: '100%' }}>
              <Select.Option value="Dublin Central Station">Dublin Central Station</Select.Option>
              <Select.Option value="Tara Street Station">Tara Street Station</Select.Option>
              <Select.Option value="North Strand Station">North Strand Station</Select.Option>
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
            <Text style={{ fontSize: 13 }}>Unit Active for Deployment</Text>
            <Switch checked={isActive} onChange={setIsActive} style={isActive ? { background: '#111827' } : {}} />
          </div>
        </div>
      ),
    },
    {
      key: 'crew',
      label: <span><TeamOutlined /> <span className="et-tab-label">Crew</span></span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Maximum Crew Capacity</Text>
            <Input type="number" min={1} max={6} value={crewSize} onChange={(e) => setCrewSize(parseInt(e.target.value) || 1)} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, height: 42 }} />
          </div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#111827' }}>Current Crew Members</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
            {crewMembers.map((member) => (
              <div key={member.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <Input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => updateCrewMember(member.id, 'name', e.target.value)}
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, height: 40 }}
                  />
                  <Select
                    value={member.role}
                    onChange={(v) => updateCrewMember(member.id, 'role', v)}
                    style={{ height: 40, width: '100%' }}
                    className="ecm-crew-select"
                  >
                    <Select.Option value="Team Leader">Team Leader</Select.Option>
                    <Select.Option value="Driver">Driver</Select.Option>
                    <Select.Option value="Responder">Responder</Select.Option>
                    <Select.Option value="Medic">Medic</Select.Option>
                  </Select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Contact number"
                    value={member.contact}
                    onChange={(e) => updateCrewMember(member.id, 'contact', e.target.value)}
                    style={{ flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, height: 40 }}
                  />
                  <button
                    onClick={() => removeCrewMember(member.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                  >
                    <CloseOutlined />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addCrewMember} style={{ borderStyle: 'dashed', height: 44, fontSize: 14, fontWeight: 500, borderRadius: 8, color: '#374151', borderColor: '#d1d5db', background: '#fff' }}>
            Add Crew Member
          </Button>
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: <span><CarOutlined /> <span className="et-tab-label">Vehicle</span></span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Vehicle Model</Text>
              <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, height: 42 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>License Plate</Text>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, height: 42 }} />
            </div>
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>Equipment Checklist</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {EQUIPMENT_FIELDS.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  checked={equipment[key as keyof typeof equipment]}
                  onChange={(e) => setEquipment({ ...equipment, [key]: e.target.checked })}
                >
                  <Text style={{ fontSize: 13 }}>{label}</Text>
                </Checkbox>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'operations',
      label: <span><ThunderboltOutlined /> <span className="et-tab-label">Ops</span></span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Maximum Response Radius: {responseRadius} km
            </Text>
            <Slider min={5} max={50} step={5} value={responseRadius} onChange={(v) => setResponseRadius(v)} trackStyle={{ background: "#111827", height: 10, borderRadius: 5 }} handleStyle={{ borderColor: "#111827", border: "2.5px solid #111827", background: "#fff", width: 18, height: 18, marginTop: -4, boxShadow: "none" }} railStyle={{ background: "#e5e7eb", height: 10, borderRadius: 5 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>5 km</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>50 km</Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#f9fafb', padding: '10px 14px', borderRadius: 8, gap: 12 }}>
            <div>
              <Text style={{ fontSize: 13, display: 'block' }}>Auto-accept standard deployments</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>Unit will be dispatched without manual confirmation</Text>
            </div>
            <Switch checked={autoAccept} onChange={setAutoAccept} style={autoAccept ? { background: '#111827' } : {}} />
          </div>
        </div>
      ),
    },
    {
      key: 'alerts',
      label: <span><BellOutlined /> <span className="et-tab-label">Alerts</span></span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Text strong style={{ fontSize: 12 }}>Alert Preferences</Text>
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
              <Text style={{ fontSize: 13, textTransform: 'capitalize' }}>{key} Notifications</Text>
              <Switch
                checked={value}
                onChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
                style={value ? { background: '#111827' } : {}}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'maintenance',
      label: <span><ToolOutlined /> <span className="et-tab-label">Maint.</span></span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>Performance Stats</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[['Total Deployments', '1,234'], ['Avg Response Time', '4m 30s'], ['Success Rate', '98%'], ['Last Deployment', '2 days ago']].map(([label, val]) => (
                <div key={label}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                  <Text strong style={{ fontSize: 22, display: 'block', color: label === 'Success Rate' ? '#16a34a' : '#111827' }}>{val}</Text>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Maintenance Notes</Text>
            <TextArea
              rows={3}
              placeholder="Add maintenance notes..."
              value={maintenanceNotes}
              onChange={(e) => setMaintenanceNotes(e.target.value)}
              style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, resize: 'none' }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <SettingOutlined style={{ fontSize: 20, color: '#374151', marginTop: 3 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>Edit Unit Configuration</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af', marginTop: 2 }}>Unit {unitId} – {unitType}</div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
      styles={{ body: { maxHeight: '75vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          items={tabItems}
          style={{ flex: 1 }}
          tabBarStyle={{ marginBottom: 16 }}
          tabBarGutter={4}
          renderTabBar={(props, DefaultTabBar) => (
            <div style={{
              display: 'flex',
              gap: 2,
              background: '#f3f4f6',
              borderRadius: 50,
              padding: 4,
              marginBottom: 16,
            }}>
              {tabItems.map((tab) => {
                const isActive = props.activeKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => props.onTabClick?.(tab.key, {} as any)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '8px 10px',
                      borderRadius: 50,
                      border: isActive ? '1px solid #e5e7eb' : 'none',
                      background: isActive ? '#fff' : 'transparent',
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 400,
                      fontSize: 13,
                      color: isActive ? '#111827' : '#6b7280',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                      whiteSpace: 'nowrap',
                      outline: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ color: isActive ? '#7c3aed' : '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: isActive ? '#111827' : '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {tab.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
        <Button type="text" danger onClick={() => message.info('Reset to default — wire to API when ready')}
          style={{ color: '#ef4444', fontWeight: 500, padding: '0 8px' }}>
          Reset to Default
        </Button>
        <Button
          onClick={onClose}
          disabled={saving}
          style={{ height: 44, paddingInline: 24, borderRadius: 8, fontWeight: 600, border: '1.5px solid #e5e7eb', color: '#111827' }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          loading={saving}
          onClick={handleSave}
          style={{ height: 44, paddingInline: 24, borderRadius: 8, fontWeight: 600, background: '#7c3aed', borderColor: '#7c3aed' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};

export default EditConfigModal;