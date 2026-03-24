import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, Tabs, Input, Button, Typography, message, Select, Spin,
} from 'antd';
import {
  SettingOutlined, TeamOutlined, CrownOutlined,
  UsergroupAddOutlined, DeleteOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../lib/axios';
import type { EmergencyUnitDetail } from '../../../../types';

const { Text } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditConfigModalProps {
  open: boolean;
  unitId: string;       // unit_code e.g. "F-1"
  unitUuid: string;     // real UUID for API calls
  unitType: string;
  detail: EmergencyUnitDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnitFormState {
  unit_name: string;
  station_name: string;
  station_address: string;
  station_latitude: string;
  station_longitude: string;
  vehicle_model: string;
  vehicle_license_plate: string;
  vehicle_year: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  department: string;
  employee_id: string | null;
  role: string;
  status: string;
  commanding_units_count: number;
  assigned_units_count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildInitialUnit = (detail: EmergencyUnitDetail | null): UnitFormState => ({
  unit_name:             detail?.unit_name              ?? '',
  station_name:          detail?.station?.name           ?? '',
  station_address:       detail?.station?.address        ?? '',
  station_latitude:      detail?.station?.lat != null    ? String(detail.station.lat)  : '',
  station_longitude:     detail?.station?.lon != null    ? String(detail.station.lon)  : '',
  vehicle_model:         detail?.vehicle?.model          ?? '',
  vehicle_license_plate: detail?.vehicle?.license_plate  ?? '',
  vehicle_year:          detail?.vehicle?.year != null   ? String(detail.vehicle.year) : '',
});

const memberLabel = (m: TeamMember) =>
  `${m.full_name}${m.employee_id ? ` · ${m.employee_id}` : ''} (${m.role})`;

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, height: 42,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: -6,
};

// ─── Component ───────────────────────────────────────────────────────────────

const EditConfigModal: React.FC<EditConfigModalProps> = ({
  open, unitId, unitUuid, unitType, detail, onClose, onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('unit');
  const [saving, setSaving] = useState(false);

  // ── Unit tab state ──
  const [unitForm, setUnitForm] = useState<UnitFormState>(buildInitialUnit(detail));
  const [originalUnit, setOriginalUnit] = useState<UnitFormState>(buildInitialUnit(detail));

  // ── Crew tab state ──
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [capacity, setCapacity] = useState<number>(4);
  const [commanderId, setCommanderId] = useState<string>('');
  const [crewIds, setCrewIds] = useState<string[]>([]);           // includes commander at [0]
  const [origCommanderId, setOrigCommanderId] = useState<string>('');
  const [origCrewIds, setOrigCrewIds] = useState<string[]>([]);

  // Seed state on open
  useEffect(() => {
    if (!open) return;

    // Unit tab
    const initial = buildInitialUnit(detail);
    setUnitForm(initial);
    setOriginalUnit(initial);
    setActiveTab('unit');

    // Crew tab
    const cap = detail?.stats?.capacity ?? 4;
    const cmdId = detail?.commander?.id ?? '';
    const roster = detail?.crew_roster?.map((m) => m.id) ?? [];
    // Ensure commander is at front
    const orderedCrew = cmdId
      ? [cmdId, ...roster.filter((id) => id !== cmdId)]
      : roster;

    setCapacity(cap);
    setCommanderId(cmdId);
    setCrewIds(orderedCrew);
    setOrigCommanderId(cmdId);
    setOrigCrewIds(orderedCrew);
  }, [open, detail]);

  // Fetch team members when crew tab opens
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await apiClient.get('/users/', {
        params: { user_type: 'team', limit: 200 },
      });
      setAllMembers(res.data?.users ?? []);
    } catch {
      message.error('Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === 'crew') fetchMembers();
  }, [open, activeTab, fetchMembers]);

  // Trim crew when capacity decreases (preserve commander at [0])
  useEffect(() => {
    if (crewIds.length > capacity) {
      setCrewIds((prev) => prev.slice(0, capacity));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacity]);

  // ── Derived values ──
  const unitDirty = JSON.stringify(unitForm) !== JSON.stringify(originalUnit);
  const crewDirty = JSON.stringify(crewIds) !== JSON.stringify(origCrewIds);

  const totalSlots = capacity;
  const crewFull = crewIds.length >= totalSlots;

  // Members from same dept as unit
  const dept = detail?.department ?? '';
  const eligibleMembers = allMembers.filter((m) => m.department === dept);

  // Existing crew UUIDs (for eligibility bypass)
  const existingCrewSet = new Set(origCrewIds);

  // Crew add-options: ACTIVE, assigned_units_count === 0 OR already in this unit's roster, exclude already-added
  const crewAddOptions = eligibleMembers.filter(
    (m) =>
      m.status === 'ACTIVE' &&
      (m.assigned_units_count === 0 || existingCrewSet.has(m.id)) &&
      !crewIds.includes(m.id)
  );

  // ── Handlers ──
  const setField = (field: keyof UnitFormState, value: string) =>
    setUnitForm((prev) => ({ ...prev, [field]: value }));

  const handleAddCrewMember = (memberId: string) => {
    if (!crewIds.includes(memberId)) {
      setCrewIds((prev) => [...prev, memberId]);
    }
  };

  const handleRemoveCrewMember = (memberId: string) => {
    if (memberId === commanderId) return; // commander locked
    setCrewIds((prev) => prev.filter((id) => id !== memberId));
  };

  const handleCancel = () => {
    // Reset everything
    setUnitForm(originalUnit);
    setCommanderId(origCommanderId);
    setCrewIds(origCrewIds);
    setCapacity(detail?.stats?.capacity ?? 4);
    onClose();
  };

  // ── Save Unit ──
  const handleSaveUnit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (unitForm.unit_name !== originalUnit.unit_name)
        payload.unit_name = unitForm.unit_name;
      if (unitForm.station_name !== originalUnit.station_name)
        payload.station_name = unitForm.station_name;
      if (unitForm.station_address !== originalUnit.station_address)
        payload.station_address = unitForm.station_address;
      if (unitForm.station_latitude !== originalUnit.station_latitude)
        payload.station_latitude = parseFloat(unitForm.station_latitude);
      if (unitForm.station_longitude !== originalUnit.station_longitude)
        payload.station_longitude = parseFloat(unitForm.station_longitude);
      if (unitForm.vehicle_model !== originalUnit.vehicle_model)
        payload.vehicle_model = unitForm.vehicle_model;
      if (unitForm.vehicle_license_plate !== originalUnit.vehicle_license_plate)
        payload.vehicle_license_plate = unitForm.vehicle_license_plate;
      if (unitForm.vehicle_year !== originalUnit.vehicle_year)
        payload.vehicle_year = parseInt(unitForm.vehicle_year, 10);

      await apiClient.put(`/emergency-units/${unitUuid}`, payload);
      message.success('Unit details updated successfully');
      onSuccess();
    } catch (err: any) {
      const errDetail = err?.response?.data?.detail;
      message.error(typeof errDetail === 'string' ? errDetail : 'Failed to update unit details');
    } finally {
      setSaving(false);
    }
  };

  // ── Save Crew — single PUT /crew call replaces entire roster ──
  const handleSaveCrew = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = { crew_member_ids: crewIds };
      if (commanderId) payload.commander_id = commanderId;

      await apiClient.put(`/emergency-units/${unitUuid}/crew`, payload);
      message.success('Crew updated successfully');
      onSuccess();
    } catch (err: any) {
      const errDetail = err?.response?.data?.detail;
      message.error(typeof errDetail === 'string' ? errDetail : 'Failed to update crew');
    } finally {
      setSaving(false);
    }
  };

  // ── Tab content ──
  const tabItems = [
    {
      key: 'unit',
      label: <span><SettingOutlined /> Unit</span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '52vh', paddingRight: 4 }}>
          <div>
            <Text style={labelStyle}>Unit Name</Text>
            <Input value={unitForm.unit_name} onChange={(e) => setField('unit_name', e.target.value)} style={inputStyle} placeholder="e.g. Fire Unit Alpha 1" />
          </div>
          <Text style={sectionLabelStyle}>Station</Text>
          <div>
            <Text style={labelStyle}>Station Name</Text>
            <Input value={unitForm.station_name} onChange={(e) => setField('station_name', e.target.value)} style={inputStyle} placeholder="e.g. Tara Street Fire Station" />
          </div>
          <div>
            <Text style={labelStyle}>Station Address</Text>
            <Input value={unitForm.station_address} onChange={(e) => setField('station_address', e.target.value)} style={inputStyle} placeholder="e.g. Tara St, Dublin 1" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Text style={labelStyle}>Latitude</Text>
              <Input value={unitForm.station_latitude} onChange={(e) => setField('station_latitude', e.target.value)} style={inputStyle} placeholder="53.3457" />
            </div>
            <div>
              <Text style={labelStyle}>Longitude</Text>
              <Input value={unitForm.station_longitude} onChange={(e) => setField('station_longitude', e.target.value)} style={inputStyle} placeholder="-6.2565" />
            </div>
          </div>
          <Text style={sectionLabelStyle}>Vehicle</Text>
          <div>
            <Text style={labelStyle}>Vehicle Model</Text>
            <Input value={unitForm.vehicle_model} onChange={(e) => setField('vehicle_model', e.target.value)} style={inputStyle} placeholder="e.g. Scania P-Series" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Text style={labelStyle}>License Plate</Text>
              <Input value={unitForm.vehicle_license_plate} onChange={(e) => setField('vehicle_license_plate', e.target.value)} style={inputStyle} placeholder="e.g. 211-D-12345" />
            </div>
            <div>
              <Text style={labelStyle}>Year</Text>
              <Input type="number" value={unitForm.vehicle_year} onChange={(e) => setField('vehicle_year', e.target.value)} style={inputStyle} placeholder="e.g. 2021" />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'crew',
      label: <span><TeamOutlined /> Crew</span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>

          {/* Crew info header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UsergroupAddOutlined style={{ color: '#7c3aed', fontSize: 13 }} />
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                Crew Members ({crewIds.length}/{totalSlots})
              </Text>
            </div>
            {loadingMembers && <Spin size="small" />}
          </div>
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

          <div style={{ marginBottom: 10 }}>
            {/* Read-only Capacity */}
            <div style={{ marginBottom: 14 }}>
              <Text style={labelStyle}>Capacity</Text>
              <Input
                value={`${crewIds.length} / ${totalSlots}`}
                disabled
                style={{ ...inputStyle, width: 120, color: '#6b7280', cursor: 'default' }}
              />
            </div>

            {/* Read-only Commander */}
            <div style={{ marginBottom: 14 }}>
              <Text style={labelStyle}><CrownOutlined style={{ color: '#7c3aed', marginRight: 5 }} />Commander</Text>
              {loadingMembers ? <Spin size="small" /> : (
                <Input
                  value={
                    commanderId
                      ? (allMembers.find((m) => m.id === commanderId)
                          ? memberLabel(allMembers.find((m) => m.id === commanderId)!)
                          : commanderId)
                      : 'No commander assigned'
                  }
                  disabled
                  style={{ ...inputStyle, color: '#6b7280', cursor: 'default' }}
                />
              )}
            </div>

            {crewIds.map((id) => {
              const member = allMembers.find((m) => m.id === id);
              const isCommander = id === commanderId;
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: isCommander ? '#f5f3ff' : '#f9fafb',
                  border: `1px solid ${isCommander ? '#ddd6fe' : '#e5e7eb'}`,
                  borderRadius: 6, padding: '7px 10px', marginBottom: 6, fontSize: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCommander && (
                      <CrownOutlined style={{ color: '#7c3aed', fontSize: 11 }} />
                    )}
                    <Text style={{ fontSize: 12, color: isCommander ? '#7c3aed' : '#374151', fontWeight: isCommander ? 600 : 400 }}>
                      {member ? memberLabel(member) : id}
                    </Text>
                  </div>
                  {isCommander ? (
                    <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Commander</Text>
                  ) : (
                    <button
                      onClick={() => handleRemoveCrewMember(id)}
                      title="Remove from crew"
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: '#ef4444', fontSize: 13, padding: 0,
                      }}
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add crew dropdown — hidden when full */}
            {!crewFull && (
              <Select
                key={`crew-${commanderId}`}
                placeholder="Add crew member..."
                value={undefined}
                onChange={(v: string) => handleAddCrewMember(v)}
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%', height: 40 }}
                popupClassName="ecm-dropdown"
                options={crewAddOptions.map((m) => ({ value: m.id, label: memberLabel(m) }))}
              />
            )}

            {crewFull && (
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#9ca3af', fontSize: 12, background: '#f9fafb', borderRadius: 6, border: '1px dashed #e5e7eb' }}>
                Crew is full ({totalSlots}/{totalSlots}) — increase capacity to add more
              </div>
            )}
          </div>

        </div>
      ),
    },
  ];

  const saveDisabled = activeTab === 'unit' ? !unitDirty : !crewDirty;

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
      onCancel={handleCancel}
      footer={null}
      width={620}
      destroyOnClose
      styles={{ body: { maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarGutter={4}
          renderTabBar={(props) => (
            <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 50, padding: 4, marginBottom: 16 }}>
              {tabItems.map((tab) => {
                const isActive = props.activeKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => props.onTabClick?.(tab.key, {} as any)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '8px 10px', borderRadius: 50,
                      border: isActive ? '1px solid #e5e7eb' : 'none',
                      background: isActive ? '#fff' : 'transparent',
                      cursor: 'pointer', fontWeight: isActive ? 700 : 400, fontSize: 13,
                      color: isActive ? '#111827' : '#6b7280',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                      whiteSpace: 'nowrap', outline: 'none', transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
        <Button
          onClick={handleCancel}
          disabled={saving}
          style={{ height: 44, paddingInline: 24, borderRadius: 8, fontWeight: 600, border: '1.5px solid #e5e7eb', color: '#111827' }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          loading={saving}
          disabled={saveDisabled}
          onClick={activeTab === 'unit' ? handleSaveUnit : handleSaveCrew}
          style={{
            height: 44, paddingInline: 24, borderRadius: 8, fontWeight: 600,
            background: saveDisabled ? '#d1d5db' : '#7c3aed',
            borderColor: saveDisabled ? '#d1d5db' : '#7c3aed',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <style>{`
        .ecm-dropdown .ant-select-item { font-size: 12px !important; color: #374151 !important; }
        .ecm-dropdown .ant-select-item-option-active { background: #f3f4f6 !important; }
        .ecm-dropdown .ant-select-item-option-selected { background: #f3f4f6 !important; font-weight: 500 !important; }
      `}</style>
    </Modal>
  );
};

export default EditConfigModal;