import { API_ENDPOINTS } from '../../../../config';
import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Typography, message, Spin } from 'antd';
import {
  UsergroupAddOutlined, EnvironmentOutlined, DeleteOutlined,
  CarOutlined, CrownOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../lib/axios';

const { Text } = Typography;

// Unit type → department mapping (values must match backend unit_type enum exactly)
// Confirmed: FIRE_ENGINE, AMBULANCE. Police value — check backend enums.py if it fails.
const UNIT_TYPE_OPTIONS = [
  { value: 'FIRE_ENGINE',    label: 'Fire Engine', dept: 'FIRE' },
  { value: 'AMBULANCE',      label: 'Ambulance',   dept: 'MEDICAL' },
  { value: 'PATROL_CAR', label: 'Patrol Car', dept: 'POLICE' },
];

// dept label shown to user
const DEPT_LABEL: Record<string, string> = {
  FIRE: 'Fire', MEDICAL: 'Medical', POLICE: 'Police', IT: 'Rescue / IT',
};

interface TeamMember {
  id: string;
  full_name: string;
  department: string;
  employee_id: string | null;
  role: string;
  status: string;
  is_assigned: boolean;
  commanding_units_count: number;
  assigned_units_count: number;
}

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #e5e7eb',
  borderRadius: 6, fontSize: 12, color: '#374151', height: 34,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 3,
};

const EMPTY_FORM = {
  unitCode: '', unitName: '', unitType: '', capacity: 4,
  stationName: '', stationAddress: '', stationLat: '', stationLon: '',
  vehicleModel: '', vehicleYear: '', licensePlate: '',
  commanderId: '',
  crewIds: [] as string[],
};

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ open, onClose, onSuccess }) => {
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Derive department from selected unit type
  const selectedUnitType = UNIT_TYPE_OPTIONS.find((u) => u.value === form.unitType);
  const requiredDept     = selectedUnitType?.dept ?? null;

  // Filter members by department + availability rules
  const eligibleMembers = teamMembers.filter((m) => {
    if (requiredDept && m.department !== requiredDept) return false;
    return true;
  });

  // Commander: must be ACTIVE and not belong to any unit at all
  const commanderOptions = eligibleMembers.filter((m) =>
    (m.status === 'ACTIVE' && m.commanding_units_count === 0 && m.assigned_units_count === 0) || m.id === form.commanderId
  );

  // Crew: must be ACTIVE and not belong to any unit at all, OR is the selected commander
  const crewOptions = eligibleMembers.filter((m) =>
    (m.status === 'ACTIVE' && m.commanding_units_count === 0 && m.assigned_units_count === 0) || m.id === form.commanderId
  );

  const set = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const resetAll = () => { setForm({ ...EMPTY_FORM }); setErrors({}); };
  const handleClose = () => { resetAll(); onClose(); };

  useEffect(() => {
    if (open) {
      setLoadingMembers(true);
      apiClient.get<{ users: TeamMember[] }>(API_ENDPOINTS.USERS.LIST + '?user_type=team&limit=200')
        .then((res) => setTeamMembers(res.data?.users ?? []))
        .catch(() => message.error('Failed to load team members'))
        .finally(() => setLoadingMembers(false));
    }
  }, [open]);

  // When unit type changes, reset commander + crew
  useEffect(() => {
    setForm((f) => ({ ...f, unitType: f.unitType, commanderId: '', crewIds: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unitType]);

  // When capacity decreases, trim crew to fit — commander always stays (first entry)
  useEffect(() => {
    const cap = Number(form.capacity) || 0;
    if (form.crewIds.length > cap) {
      setForm((f) => ({ ...f, crewIds: f.crewIds.slice(0, cap) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.capacity]);

  const handleCommanderChange = (value: string | undefined) => {
    const newCommander = value ?? '';
    setForm((f) => {
      const prevCommander = f.commanderId;
      // Remove previous commander from crew, add new one at front
      let newCrew = f.crewIds.filter((id) => id !== prevCommander);
      if (newCommander) newCrew = [newCommander, ...newCrew];
      return { ...f, commanderId: newCommander, crewIds: newCrew };
    });
    setErrors((e) => { const n = { ...e }; delete n.commanderId; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.unitCode.trim())        e.unitCode       = 'Unit code is required';
    if (!form.unitName.trim())        e.unitName       = 'Unit name is required';
    if (!form.unitType)               e.unitType       = 'Unit type is required';
    if (!form.capacity || form.capacity < 1) e.capacity = 'Capacity must be at least 1';
    if (!form.commanderId)            e.commanderId    = 'Commander is required';
    if (!form.stationName.trim())     e.stationName    = 'Station name is required';
    if (!form.stationAddress.trim())  e.stationAddress = 'Station address is required';
    if (!form.stationLat)             e.stationLat     = 'Latitude is required';
    if (!form.stationLon)             e.stationLon     = 'Longitude is required';
    if (!form.vehicleModel.trim())    e.vehicleModel   = 'Vehicle model is required';
    if (!form.licensePlate.trim())    e.licensePlate   = 'License plate is required';
    if (!form.vehicleYear)            e.vehicleYear    = 'Vehicle year is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        unit_code:             form.unitCode.trim(),
        unit_name:             form.unitName.trim(),
        unit_type:             form.unitType,
        capacity:              Number(form.capacity),
        station_name:          form.stationName.trim(),
        station_address:       form.stationAddress.trim(),
        station_latitude:      parseFloat(form.stationLat),
        station_longitude:     parseFloat(form.stationLon),
        commander_id:          form.commanderId,
        crew_member_ids:       form.crewIds,
        vehicle_model:         form.vehicleModel.trim(),
        vehicle_license_plate: form.licensePlate.trim(),
        vehicle_year:          parseInt(form.vehicleYear, 10),
      };

      await apiClient.post(API_ENDPOINTS.TEAMS.CREATE, payload);
      message.success(`Unit ${form.unitCode} created successfully`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to create unit');
    } finally {
      setSubmitting(false);
    }
  };

  const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 14 }}>
      <span style={{ color: '#7c3aed', fontSize: 13 }}>{icon}</span>
      <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</Text>
    </div>
  );

  const totalSlots   = Number(form.capacity) || 0;
  const crewFull     = form.crewIds.length >= totalSlots;

  // Member label helper
  const memberLabel = (m: TeamMember) =>
    `${m.full_name}${m.employee_id ? ` (${m.employee_id})` : ''}`;

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={500} destroyOnClose
      closeIcon={<span style={{ fontSize: 16, color: '#9ca3af' }}>✕</span>}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 2 }}>
          Add New Unit
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 12 }}>
          Create a new emergency response unit
        </Text>

        {/* ── Unit Info ── */}
        <SectionTitle icon={<UsergroupAddOutlined />} title="Unit Information" />
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <Text style={labelStyle}>Unit Code <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., F-30" value={form.unitCode} onChange={(e) => set('unitCode', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.unitCode ? '#ef4444' : undefined }} />
            {errors.unitCode && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.unitCode}</Text>}
          </div>
          <div>
            <Text style={labelStyle}>Unit Name <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., Fire Response Alpha" value={form.unitName} onChange={(e) => set('unitName', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.unitName ? '#ef4444' : undefined }} />
            {errors.unitName && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.unitName}</Text>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <Text style={labelStyle}>Unit Type <span style={{ color: '#ef4444' }}>*</span></Text>
            <Select placeholder="Select type" value={form.unitType || undefined} onChange={(v) => set('unitType', v)}
              style={{ width: '100%', height: 34 }} status={errors.unitType ? 'error' : undefined}
              popupClassName="ct-dropdown">
              {UNIT_TYPE_OPTIONS.map((o) => (
                <Select.Option key={o.value} value={o.value}>
                  {o.label} <span style={{ fontSize: 10, color: '#9ca3af' }}>({DEPT_LABEL[o.dept]})</span>
                </Select.Option>
              ))}
            </Select>
            {errors.unitType && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.unitType}</Text>}
          </div>
          <div>
            <Text style={labelStyle}>Capacity <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input type="number" min={1} max={20} placeholder="e.g., 4" value={form.capacity}
              onChange={(e) => set('capacity', parseInt(e.target.value) || 1)}
              style={{ ...inputStyle, borderColor: errors.capacity ? '#ef4444' : undefined }} />
            {errors.capacity && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.capacity}</Text>}
          </div>
        </div>

        {/* ── Commander ── */}
        <SectionTitle icon={<CrownOutlined />} title="Commander" />
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

        <div style={{ marginBottom: 10 }}>
          <Text style={labelStyle}>Select Commander <span style={{ color: '#ef4444' }}>*</span></Text>
          {loadingMembers ? <Spin size="small" /> : (
            <Select
              key={`commander-select-${form.crewIds.join(',')}`}
              placeholder={!form.unitType ? 'Select unit type first' : 'Search commander...'}
              value={form.commanderId || undefined}
              onChange={handleCommanderChange}
              disabled={!form.unitType}
              showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ width: '100%', height: 34 }}
              status={errors.commanderId ? 'error' : undefined}
              popupClassName="ct-dropdown"
              allowClear
              options={commanderOptions.map((m) => ({ value: m.id, label: memberLabel(m) }))}
            />
          )}
          {errors.commanderId && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.commanderId}</Text>}
        </div>

        {/* ── Crew ── */}
        <SectionTitle icon={<UsergroupAddOutlined />} title={`Crew Members (${form.crewIds.length}/${totalSlots})`} />
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

        <div style={{ marginBottom: 10 }}>
          {form.crewIds.map((id, idx) => {
            const member = teamMembers.find((m) => m.id === id);
            const isCommander = id === form.commanderId;
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isCommander ? '#f5f3ff' : '#f9fafb',
                border: `1px solid ${isCommander ? '#ddd6fe' : '#e5e7eb'}`,
                borderRadius: 6, padding: '6px 10px', marginBottom: 6, fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: isCommander ? '#7c3aed' : '#374151', fontWeight: isCommander ? 600 : 400 }}>
                    {idx + 1}. {member ? memberLabel(member) : id}
                  </Text>
                </div>
                <button
                  onClick={() => {
                    if (!isCommander) set('crewIds', form.crewIds.filter((c) => c !== id));
                  }}
                  disabled={isCommander}
                  title={isCommander ? 'Change commander above to remove' : 'Remove'}
                  style={{ border: 'none', background: 'none', cursor: isCommander ? 'not-allowed' : 'pointer', color: isCommander ? '#d1d5db' : '#ef4444', fontSize: 13, padding: 0 }}>
                  <DeleteOutlined />
                </button>
              </div>
            );
          })}

          {!crewFull && (
            <Select
              key={`crew-select-${form.commanderId}`}
              placeholder={!form.unitType ? 'Select unit type first' : !form.commanderId ? 'Select commander first' : 'Add crew member...'}
              value={undefined}
              onChange={(v: string) => {
                if (!form.crewIds.includes(v)) set('crewIds', [...form.crewIds, v]);
              }}
              disabled={!form.unitType || !form.commanderId || crewFull}
              showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ width: '100%', height: 34 }}
              popupClassName="ct-dropdown"
              options={crewOptions
                .filter((m) => m.id !== form.commanderId && !form.crewIds.includes(m.id))
                .map((m) => ({ value: m.id, label: memberLabel(m) }))}
            />
          )}
          {crewFull && null}
        </div>

        {/* ── Station ── */}
        <SectionTitle icon={<EnvironmentOutlined />} title="Station" />
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

        <div style={{ marginBottom: 10 }}>
          <Text style={labelStyle}>Station Name <span style={{ color: '#ef4444' }}>*</span></Text>
          <Input placeholder="e.g., Tara Street Station" value={form.stationName}
            onChange={(e) => set('stationName', e.target.value)}
            style={{ ...inputStyle, borderColor: errors.stationName ? '#ef4444' : undefined }} />
          {errors.stationName && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.stationName}</Text>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <Text style={labelStyle}>Station Address <span style={{ color: '#ef4444' }}>*</span></Text>
          <Input placeholder="e.g., Tara Street, Dublin 2" value={form.stationAddress}
            onChange={(e) => set('stationAddress', e.target.value)}
            style={{ ...inputStyle, borderColor: errors.stationAddress ? '#ef4444' : undefined }} />
          {errors.stationAddress && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.stationAddress}</Text>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <Text style={labelStyle}>Latitude <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., 53.3474" value={form.stationLat}
              onChange={(e) => set('stationLat', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.stationLat ? '#ef4444' : undefined }} />
            {errors.stationLat && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.stationLat}</Text>}
          </div>
          <div>
            <Text style={labelStyle}>Longitude <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., -6.2530" value={form.stationLon}
              onChange={(e) => set('stationLon', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.stationLon ? '#ef4444' : undefined }} />
            {errors.stationLon && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.stationLon}</Text>}
          </div>
        </div>

        {/* ── Vehicle ── */}
        <SectionTitle icon={<CarOutlined />} title="Vehicle" />
        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <Text style={labelStyle}>Vehicle Model <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., Scania P280" value={form.vehicleModel}
              onChange={(e) => set('vehicleModel', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.vehicleModel ? '#ef4444' : undefined }} />
            {errors.vehicleModel && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.vehicleModel}</Text>}
          </div>
          <div>
            <Text style={labelStyle}>License Plate <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., 222-D-11111" value={form.licensePlate}
              onChange={(e) => set('licensePlate', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.licensePlate ? '#ef4444' : undefined }} />
            {errors.licensePlate && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.licensePlate}</Text>}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Vehicle Year <span style={{ color: '#ef4444' }}>*</span></Text>
          <Input type="number" placeholder="e.g., 2023" value={form.vehicleYear}
            onChange={(e) => set('vehicleYear', e.target.value)}
            style={{ ...inputStyle, width: '48%', borderColor: errors.vehicleYear ? '#ef4444' : undefined }} />
          {errors.vehicleYear && <Text style={{ fontSize: 10, color: '#ef4444' }}>{errors.vehicleYear}</Text>}
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose} disabled={submitting}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button type="primary" loading={submitting} onClick={handleSubmit}
          style={{ height: 36, paddingInline: 20, borderRadius: 6, fontWeight: 600, fontSize: 12, background: '#7c3aed', borderColor: '#7c3aed' }}>
          Create Unit
        </Button>
      </div>

      <style>{`
        .ct-dropdown .ant-select-item { font-size: 12px !important; color: #374151 !important; }
        .ct-dropdown .ant-select-item-option-active { background: #f3f4f6 !important; }
        .ct-dropdown .ant-select-item-option-selected { background: #f3f4f6 !important; font-weight: 500 !important; }
      `}</style>
    </Modal>
  );
};

export default CreateTeamModal;