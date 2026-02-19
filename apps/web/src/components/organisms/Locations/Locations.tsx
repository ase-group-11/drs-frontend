// NEW FILE
import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  Tabs,
  Typography,
  Spin,
  message,
  Popconfirm,
} from 'antd';
import {
  ApartmentOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
} from '@ant-design/icons';
import { getZones, createZone, updateZone, deleteZone } from '../../../services';
import type { Zone, ZoneType, ZoneStatus } from '../../../types';
import styles from './Locations.module.css';

const { Text, TextArea } = Typography as any;
const { TextArea: AntTextArea } = Input;

const ZONE_TYPE_CONFIG: Record<ZoneType, { bg: string; text: string; border: string }> = {
  response: { bg: '#dbeafe', text: '#1d4ed8', border: '#3b82f6' },
  evacuation: { bg: '#ffedd5', text: '#c2410c', border: '#f97316' },
  restricted: { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
};

const ZONE_STATUS_CONFIG: Record<ZoneStatus, { dot: string; label: string }> = {
  active: { dot: '#16a34a', label: 'Active' },
  inactive: { dot: '#9ca3af', label: 'Inactive' },
  emergency: { dot: '#dc2626', label: 'Emergency' },
};

// Zone Detail Sheet (drawer-style) shown on the right
interface ZoneDetailSheetProps {
  zone: Zone;
  onClose: () => void;
  onEdit: (zone: Zone) => void;
  onDelete: (id: string) => void;
}

const ZoneDetailSheet: React.FC<ZoneDetailSheetProps> = ({ zone, onClose, onEdit, onDelete }) => {
  const typeCfg = ZONE_TYPE_CONFIG[zone.type];
  const statusCfg = ZONE_STATUS_CONFIG[zone.status];

  return (
    <div className={styles.detailSheet}>
      <div className={styles.detailHeader}>
        <div>
          <Text className={styles.detailTitle}>{zone.name}</Text>
          <div className={styles.detailBadges}>
            <Tag style={{ background: typeCfg.bg, color: typeCfg.text, border: 0, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {zone.type.toUpperCase()}
            </Tag>
            <div className={styles.statusDot} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCfg.dot, display: 'inline-block' }} />
              <Text style={{ fontSize: 12 }}>{statusCfg.label}</Text>
            </div>
          </div>
        </div>
        <button className={styles.sheetClose} onClick={onClose}>✕</button>
      </div>

      <div className={styles.detailStats}>
        {[
          ['Area', `${zone.area} km²`],
          ['Population', `~${(zone.population / 1000).toFixed(1)}k`],
          ['Units', `${zone.units} assigned`],
          ['Response', zone.avgResponseTime],
        ].map(([label, val]) => (
          <div key={label} className={styles.detailStatItem}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{label}</Text>
            <Text strong style={{ fontSize: 15 }}>{val}</Text>
          </div>
        ))}
      </div>

      {zone.incidents > 0 && (
        <div className={styles.incidentBanner}>
          <AlertOutlined style={{ color: '#dc2626', fontSize: 14 }} />
          <Text style={{ fontSize: 13, color: '#dc2626' }}>{zone.incidents} active incidents</Text>
        </div>
      )}

      <div className={styles.recentActivity}>
        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Recent Activity</Text>
        {['2 hours ago: Fire reported', '5 hours ago: Unit F-12 deployed', '1 day ago: Zone status updated'].map((item) => (
          <div key={item} className={styles.activityItem}>
            <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 12, flexShrink: 0, marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{item}</Text>
          </div>
        ))}
      </div>

      <div className={styles.detailActions}>
        <Button icon={<EditOutlined />} onClick={() => onEdit(zone)} style={{ flex: 1 }}>
          Edit Zone
        </Button>
        <Popconfirm
          title="Delete this zone?"
          description="This action cannot be undone."
          onConfirm={() => onDelete(zone.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />} style={{ flex: 1 }}>
            Delete
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};

// ─── New Zone Modal ──────────────────────────────────────────────────────────
interface ZoneModalProps {
  open: boolean;
  zone?: Zone | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ZoneModal: React.FC<ZoneModalProps> = ({ open, zone, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!zone;

  useEffect(() => {
    if (open && zone) {
      form.setFieldsValue({ name: zone.name, type: zone.type, area: zone.area });
    } else if (open) {
      form.resetFields();
    }
  }, [open, zone]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isEdit && zone) {
        const res = await updateZone(zone.id, { name: values.name, type: values.type, area: values.area });
        if (res.success) { message.success('Zone updated'); onSuccess(); onClose(); }
        else message.error(res.message);
      } else {
        const res = await createZone({ name: values.name, type: values.type, description: values.description, area: values.area, assignedUnitIds: values.units ? [values.units] : [], priority: values.priority });
        if (res.success) { message.success('Zone created'); onSuccess(); onClose(); }
        else message.error(res.message);
      }
    } catch (err: any) {
      if (!err?.errorFields) message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Form.Item name="name" label="Zone Name" rules={[{ required: true, message: 'Please enter zone name' }]}>
            <Input placeholder="e.g., Zone E – Industrial Area" />
          </Form.Item>
          <Form.Item name="type" label="Zone Type" rules={[{ required: true, message: 'Please select type' }]}>
            <Select placeholder="Select type...">
              <Select.Option value="response">Response Zone</Select.Option>
              <Select.Option value="evacuation">Evacuation Zone</Select.Option>
              <Select.Option value="restricted">Restricted Area</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <AntTextArea rows={3} placeholder="Describe the zone..." />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'boundaries',
      label: 'Boundaries',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 32, background: '#f3f4f6', borderRadius: 10, textAlign: 'center', color: '#9ca3af' }}>
            <EnvironmentOutlined style={{ fontSize: 32, display: 'block', margin: '0 auto 8px' }} />
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>Click points on map to draw zone boundary</Text>
          </div>
          <Form.Item name="area" label="Estimated Area (km²)">
            <Input type="number" placeholder="Area in km²" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'assignments',
      label: 'Assignments',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Form.Item name="units" label="Assign Emergency Units">
            <Select placeholder="Select units...">
              <Select.Option value="f12">Unit F-12 – Fire</Select.Option>
              <Select.Option value="a04">Unit A-04 – Ambulance</Select.Option>
              <Select.Option value="p22">Unit P-22 – Police</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority Level">
            <Select placeholder="Select priority...">
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={isEdit ? `Edit ${zone?.name}` : 'Create New Zone'}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
            {isEdit ? 'Save Changes' : 'Create Zone'}
          </Button>
        </div>
      }
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Tabs items={tabItems} />
      </Form>
    </Modal>
  );
};

// ─── Main Locations Component ────────────────────────────────────────────────
const Locations: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const res = await getZones();
      if (res.data) setZones(res.data);
    } catch {
      message.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    const res = await deleteZone(id);
    if (res.success) {
      message.success('Zone deleted');
      if (selectedZone?.id === id) setSelectedZone(null);
      loadZones();
    } else {
      message.error(res.message || 'Failed to delete zone');
    }
  };

  const handleEditZone = (zone: Zone) => {
    setEditZone(zone);
    setZoneModalOpen(true);
  };

  const filteredZones = zones.filter((z) => {
    const matchType = filterType === 'all' || z.type === filterType;
    const matchSearch = !searchQuery || z.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const stats = {
    total: zones.length,
    alerts: zones.filter((z) => z.status === 'emergency').length,
  };

  const FILTER_TABS = [
    { key: 'all', label: 'All Zones' },
    { key: 'response', label: 'Response' },
    { key: 'evacuation', label: 'Evacuation' },
    { key: 'restricted', label: 'Restricted' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.layoutWrap}>
        {/* ── Left Panel ──────────────────────────────── */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <Text className={styles.panelTitle}>Zone Management</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Manage response and evacuation zones</Text>
          </div>

          {/* Quick stats */}
          <div className={styles.quickStats}>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Zones</Text>
              <Text strong style={{ fontSize: 24, display: 'block' }}>{stats.total}</Text>
            </div>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>Active Alerts</Text>
              <Text strong style={{ fontSize: 24, display: 'block', color: '#dc2626' }}>{stats.alerts}</Text>
            </div>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>Coverage</Text>
              <Text strong style={{ fontSize: 18, display: 'block' }}>85%</Text>
            </div>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>Avg Response</Text>
              <Text strong style={{ fontSize: 18, display: 'block' }}>4.5 mins</Text>
            </div>
          </div>

          {/* Filter tabs */}
          <div className={styles.filterTabs}>
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`${styles.filterTabBtn} ${filterType === key ? styles.filterTabBtnActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ padding: '0 16px 12px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </div>

          {/* New Zone button */}
          <div style={{ padding: '0 16px 16px' }}>
            <Button
              block
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={() => { setEditZone(null); setZoneModalOpen(true); }}
            >
              New Zone
            </Button>
          </div>

          {/* Zone list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : (
            <div className={styles.zoneList}>
              {filteredZones.map((zone) => {
                const typeCfg = ZONE_TYPE_CONFIG[zone.type];
                const statusCfg = ZONE_STATUS_CONFIG[zone.status];
                const isExpanded = expandedZone === zone.id;
                const isSelected = selectedZone?.id === zone.id;

                return (
                  <div
                    key={zone.id}
                    className={`${styles.zoneCard} ${isSelected ? styles.zoneCardSelected : ''}`}
                    onClick={() => setSelectedZone(isSelected ? null : zone)}
                  >
                    <div className={styles.zoneCardTop}>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, display: 'block', color: '#111827' }}>{zone.name}</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <Tag style={{ background: typeCfg.bg, color: typeCfg.text, border: 0, fontSize: 11, borderRadius: 20, fontWeight: 600 }}>
                            {zone.type}
                          </Tag>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: statusCfg.dot,
                                display: 'inline-block',
                                animation: zone.status === 'emergency' ? 'pulse 1.5s infinite' : 'none',
                              }}
                            />
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>{statusCfg.label}</Text>
                          </div>
                        </div>
                      </div>
                      <button
                        className={styles.expandBtn}
                        onClick={(e) => { e.stopPropagation(); setExpandedZone(isExpanded ? null : zone.id); }}
                      >
                        {isExpanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
                      </button>
                    </div>

                    <div className={styles.zoneCardGrid}>
                      {[['Area', `${zone.area} km²`], ['Population', `~${(zone.population / 1000).toFixed(1)}k`], ['Units', `${zone.units} assigned`], ['Response', zone.avgResponseTime]].map(([label, val]) => (
                        <div key={label}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                          <Text strong style={{ fontSize: 12, display: 'block' }}>{val}</Text>
                        </div>
                      ))}
                    </div>

                    {zone.incidents > 0 && (
                      <div className={styles.incidentRow}>
                        <AlertOutlined style={{ color: '#dc2626', fontSize: 12 }} />
                        <Text style={{ fontSize: 11, color: '#dc2626' }}>{zone.incidents} active incidents</Text>
                      </div>
                    )}

                    {isExpanded && (
                      <div className={styles.expandedContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.recentExpandedActivity}>
                          <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Recent Activity</Text>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>2 hours ago: Fire reported</Text>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>5 hours ago: Unit F-12 deployed</Text>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <Button size="small" icon={<EyeOutlined />} style={{ flex: 1 }} onClick={() => setSelectedZone(zone)}>
                            View
                          </Button>
                          <Button size="small" icon={<EditOutlined />} style={{ flex: 1 }} onClick={() => handleEditZone(zone)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          <div className={styles.panelFooter}>
            <Button block icon={<EyeOutlined />} style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              View All Zones
            </Button>
            <Button block icon={<DownloadOutlined />} style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              Export Zone Data
            </Button>
          </div>
        </div>

        {/* ── Map + Detail Area ────────────────────── */}
        <div className={styles.mapArea}>
          {/* Map placeholder */}
          <div className={styles.mapPlaceholder}>
            <div className={styles.mapContent}>
              <EnvironmentOutlined className={styles.mapIcon} />
              <div>
                <Text className={styles.mapTitle}>Interactive Map View</Text>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', maxWidth: 360, margin: '6px auto 0', textAlign: 'center', lineHeight: 1.6 }}>
                  View all disaster response zones on an interactive map with real-time updates
                </Text>
              </div>
              {selectedZone && (
                <div className={styles.mapSelectedCard}>
                  <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>{selectedZone.name}</Text>
                  <Text style={{ color: '#d1d5db', fontSize: 13 }}>
                    Area: {selectedZone.area} km² · Population: ~{(selectedZone.population / 1000).toFixed(1)}k
                  </Text>
                  <Tag style={{ marginTop: 8, background: ZONE_TYPE_CONFIG[selectedZone.type].bg, color: ZONE_TYPE_CONFIG[selectedZone.type].text, border: 0 }}>
                    {selectedZone.type.toUpperCase()}
                  </Tag>
                </div>
              )}
            </div>

            {/* Mock zone pins */}
            <div className={styles.mockPin} style={{ top: '25%', left: '25%', background: '#3b82f6' }} />
            <div className={styles.mockPin} style={{ top: '35%', right: '30%', background: '#f97316' }} />
            <div className={styles.mockPin} style={{ bottom: '25%', left: '33%', background: '#ef4444' }} />
            <div className={styles.mockPin} style={{ top: '55%', right: '45%', background: '#8b5cf6' }} />
          </div>

          {/* Zone detail sheet */}
          {selectedZone && (
            <ZoneDetailSheet
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              onEdit={handleEditZone}
              onDelete={handleDeleteZone}
            />
          )}
        </div>
      </div>

      {/* Zone modal */}
      <ZoneModal
        open={zoneModalOpen}
        zone={editZone}
        onClose={() => { setZoneModalOpen(false); setEditZone(null); }}
        onSuccess={loadZones}
      />
    </div>
  );
};

export default Locations;
