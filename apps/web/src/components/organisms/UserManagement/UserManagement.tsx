// UPDATED — wired to real GET /api/v1/users/ API
import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Tooltip,
  message,
  Spin,
  Typography,
  Row,
  Col,
} from 'antd';
import type { TableColumnsType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FireOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { getUsers } from '../../../services';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import type {
  AdminUser,
  ApiUserStatus,
} from '../../../types';
import EditUserStatusModal from './EditUserStatusModal';
import DeleteUserModal from './DeleteUserModal';
import AddUserModal from './AddUserModal';
import UserInitials from '../../atoms/UserInitials';
import './UserManagement.css';

const { Search } = Input;
const { Text } = Typography;

// ─── Config ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    '#7c3aed',
  MANAGER:  '#2563eb',
  STAFF:    '#0891b2',
  RESIDENT: '#6b7280',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE:    { color: '#008236', label: 'Active' },
  INACTIVE:  { color: '#6b7280', label: 'Inactive' },
  SUSPENDED: { color: '#d4183d', label: 'Suspended' },
  PENDING:   { color: '#d97706', label: 'Pending' },
  DELETED:   { color: '#374151', label: 'Deleted' },
};

const DEPT_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  FIRE:    { color: '#ef4444', icon: <FireOutlined /> },
  MEDICAL: { color: '#10b981', icon: <MedicineBoxOutlined /> },
  POLICE:  { color: '#3b82f6', icon: <SafetyOutlined /> },
  IT:      { color: '#f59e0b', icon: <ToolOutlined /> },
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UserManagement: React.FC = () => {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter]   = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter]   = useState<string>('all');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [activelyDeployed, setActivelyDeployed] = useState(false);
  const [deployedUnitCodes, setDeployedUnitCodes] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [bulkDeleteUsers, setBulkDeleteUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<{ citizens: number; team?: number; team_members?: number; active: number; inactive: number } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10);

  // Fetch ALL users once — no filters sent to API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers({ limit: 200 });
      if (result.success && result.data) {
        setAllUsers(result.data.users);
        setTotalCount(result.data.totalCount);
        setSummary(result.data.summary);
      } else {
        message.error(result.message || 'Failed to load users');
      }
    } catch {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeployedUnits = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.TEAMS.LIST);
      const units: { unit_code: string; unit_status: string }[] = res.data?.units ?? [];
      const active = new Set(
        units
          .filter(u => ['DEPLOYED', 'ON_SCENE', 'RETURNING'].includes(u.unit_status))
          .map(u => u.unit_code)
      );
      setDeployedUnitCodes(active);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchUsers(); fetchDeployedUnits(); }, [fetchUsers, fetchDeployedUnits]);

  // Client-side filtering — no API calls
  useEffect(() => {
    let filtered = [...allUsers];

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }
    if (deptFilter !== 'all') {
      filtered = filtered.filter((u) => u.department === deptFilter);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.employeeId?.toLowerCase().includes(q) ?? false)
      );
    }

    setUsers(filtered);
    setCurrentPage(1);
  }, [allUsers, roleFilter, statusFilter, deptFilter, searchText]);

  const handleDeleteSelected = () => {
    const selectedUsers = allUsers.filter((u) => selectedRowKeys.includes(u.id));
    setDeletingUser(null);
    setBulkDeleteUsers(selectedUsers);
    setDeleteModalOpen(true);
  };

  const handleExport = () => {
    const rows = users.map((u) => [
      u.fullName, u.email, u.phone, u.role, u.userType,
      u.department ?? '', u.status, u.createdAt,
    ].join(','));
    const csv = ['Name,Email,Phone,Role,Type,Department,Status,Joined', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Columns ────────────────────────────────────────────────────────────────


  const ACTIVE_DEPLOY_STATUSES = ['DEPLOYED', 'ON_SCENE', 'RETURNING'];

  const checkUserUnitStatus = async (user: AdminUser): Promise<boolean> => {
    if (!user.isAssigned || !user.currentUnitCodes?.length) return false;
    try {
      const res = await apiClient.get(API_ENDPOINTS.TEAMS.LIST);
      const units: { unit_code: string; unit_status: string }[] = res.data?.units ?? [];
      return units.some(
        u => user.currentUnitCodes.includes(u.unit_code) && ACTIVE_DEPLOY_STATUSES.includes(u.unit_status)
      );
    } catch {
      return false;
    }
  };

  const columns: TableColumnsType<AdminUser> = [
    {
      title: 'User',
      key: 'user',
      width: 200,
      render: (_, r) => (
        <div className="um-user-cell">
          <UserInitials name={r.fullName} color={ROLE_COLORS[r.role] ?? '#6b7280'} size={36} />
          <div className="um-user-info">
            <Text strong className="um-user-name">{r.fullName}</Text>
            <Text type="secondary" className="um-user-id">
              {r.userType === 'team' && r.employeeId ? r.employeeId : r.userType === 'citizen' ? 'Citizen' : '—'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Type / Role',
      key: 'role',
      width: 140,
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Tag style={{
            background: `${ROLE_COLORS[r.role] ?? '#6b7280'}18`,
            color: ROLE_COLORS[r.role] ?? '#6b7280',
            border: `1px solid ${ROLE_COLORS[r.role] ?? '#6b7280'}40`,
            borderRadius: 10, fontWeight: 500, fontSize: 11,
            textTransform: 'capitalize', width: 'fit-content',
          }}>
            {r.role === 'RESIDENT' ? 'Citizen' : r.role.charAt(0) + r.role.slice(1).toLowerCase()}
          </Tag>
          {r.department && (
            <span style={{ fontSize: 11, color: DEPT_CONFIG[r.department]?.color ?? '#6b7280', fontWeight: 500 }}>
              {DEPT_CONFIG[r.department]?.icon} {r.department === 'IT' ? 'IT' : r.department.charAt(0) + r.department.slice(1).toLowerCase()}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text style={{ fontSize: 13, color: '#374151' }}>{r.email}</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>{r.phone}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ApiUserStatus) => {
        const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE;
        return (
          <Tag style={{
            background: `${cfg.color}18`, color: cfg.color,
            border: `1px solid ${cfg.color}40`, borderRadius: 10,
            fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Activity',
      key: 'activity',
      width: 150,
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {r.userType === 'citizen' ? (
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              📋 {r.reportsCount} report{r.reportsCount !== 1 ? 's' : ''}
            </Text>
          ) : (
            <>
              {r.currentUnitCodes.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {r.currentUnitCodes.map((code) => (
                    <Tag key={code} style={{ fontSize: 11, borderRadius: 6, margin: 0, padding: '0 6px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
                      {code}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>No unit assigned</Text>
              )}
              {r.commandingUnitsCount > 0 && (
                <Text style={{ fontSize: 11, color: '#7c3aed' }}>
                  ★ Commanding {r.commandingUnitsCount}
                </Text>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) =>
        new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_, record) => {
        const isDeleted = record.status === 'DELETED';
        const isCommanding = (record.commandingUnitsCount ?? 0) > 0;
        const isActivelyDeployed = (record.currentUnitCodes ?? []).some(code => deployedUnitCodes.has(code));
        const cannotModify = isDeleted || isCommanding || isActivelyDeployed;
        return (
          <Space size={4}>
            <Tooltip title={isDeleted ? 'User is deleted' : 'Edit user'}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                className="um-action-btn"
                style={{ color: isDeleted ? '#d1d5db' : '#6b7280' }}
                disabled={isDeleted}
                onClick={async () => { if (!isDeleted) { setActivelyDeployed(false); const deployed = await checkUserUnitStatus(record); setActivelyDeployed(deployed); setEditingUser(record); setEditModalOpen(true); } }}
              />
            </Tooltip>
            <Tooltip title={
                isDeleted ? 'User is deleted' :
                isCommanding ? 'Cannot delete — commanding a unit' :
                isActivelyDeployed ? `Cannot delete — unit is currently deployed (${record.currentUnitCodes?.join(', ')})` :
                'Delete user'
              }>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="um-action-btn um-delete-btn"
                disabled={cannotModify}
                style={{ opacity: cannotModify ? 0.3 : 1 }}
                onClick={() => { if (!cannotModify) { setBulkDeleteUsers([]); setDeletingUser(record); setDeleteModalOpen(true); } }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const rowSelection: TableRowSelection<AdminUser> = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="um-container">
      {/* Header */}
      <div className="um-header">
        <div className="um-header-left">
          <h1 className="um-title">User Management</h1>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="um-add-btn"
          size="large"
          onClick={() => setAddModalOpen(true)}
        >
          Add User
        </Button>
      </div>

      {/* Summary mini-cards */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Users',  value: totalCount,           color: '#7c3aed' },
            { label: 'Citizens',     value: summary.citizens,     color: '#2563eb' },
            { label: 'Team Members', value: summary.team ?? summary.team_members ?? 0, color: '#0891b2' },
            { label: 'Active',       value: summary.active,       color: '#059669' },
          ].map((c) => (
            <div key={c.label} style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{
                background: '#fff', borderRadius: 10, padding: '12px 16px',
                borderLeft: `4px solid ${c.color}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                height: '100%',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  marginBottom: 4, whiteSpace: 'nowrap',
                }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <Card className="um-filter-card">
        <Row gutter={[10, 10]} align="middle">
          <Col flex="120px">
            <Select value={roleFilter} onChange={setRoleFilter} style={{ width: '100%' }} popupClassName="um-filter-dropdown">
              <Select.Option value="all">All Roles</Select.Option>
              <Select.Option value="ADMIN">Admin</Select.Option>
              <Select.Option value="STAFF">Staff</Select.Option>
              <Select.Option value="RESIDENT">Citizen</Select.Option>
            </Select>
          </Col>
          <Col flex="120px">
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }} popupClassName="um-filter-dropdown">
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="ACTIVE">Active</Select.Option>
              <Select.Option value="INACTIVE">Inactive</Select.Option>
              <Select.Option value="SUSPENDED">Suspended</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="DELETED">Deleted</Select.Option>
            </Select>
          </Col>
          <Col flex="130px">
            <Select value={deptFilter} onChange={setDeptFilter} style={{ width: '100%' }} popupClassName="um-filter-dropdown">
              <Select.Option value="all">All Depts</Select.Option>
              <Select.Option value="FIRE">Fire</Select.Option>
              <Select.Option value="MEDICAL">Medical</Select.Option>
              <Select.Option value="POLICE">Police</Select.Option>
              <Select.Option value="IT">IT</Select.Option>
            </Select>
          </Col>
          <Col flex="auto">
            <Search
              placeholder="Search users..."
              allowClear
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="um-search"
            />
          </Col>
          <Col flex="none">
            <Button icon={<DownloadOutlined />} onClick={handleExport} className="um-export-btn">
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Selection banner */}
      {selectedRowKeys.length > 0 && (
        <div className="um-selection-banner">
          <Text>{selectedRowKeys.length} user{selectedRowKeys.length > 1 ? 's' : ''} selected</Text>
          <Space size={10}>
            <Button onClick={() => setSelectedRowKeys([])}>Clear selection</Button>
            <Button danger onClick={handleDeleteSelected}>Delete Selected</Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Card className="um-table-card">
        {loading ? (
          <div className="um-loading"><Spin size="large" /></div>
        ) : (
          <Table<AdminUser>
            rowSelection={rowSelection}
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize,
              total: users.length,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total) => `${total} users`,
              onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
              onShowSizeChange: (_page, size) => { setCurrentPage(1); setPageSize(size); },
            }}
            scroll={{ x: 'max-content' }}
            className="um-table"
            locale={{ emptyText: 'No users found matching your filters' }}
          />
        )}
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Edit Status Modal */}
      <EditUserStatusModal
        open={editModalOpen}
        user={editingUser}
        activelyDeployed={activelyDeployed}
        onClose={() => { setEditModalOpen(false); setEditingUser(null); }}
        onSuccess={fetchUsers}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        open={deleteModalOpen}
        user={bulkDeleteUsers.length === 0 ? deletingUser : null}
        users={bulkDeleteUsers.length > 0 ? bulkDeleteUsers : undefined}
        onClose={() => { setDeleteModalOpen(false); setDeletingUser(null); setBulkDeleteUsers([]); }}
        onSuccess={() => { fetchUsers(); setSelectedRowKeys([]); setBulkDeleteUsers([]); }}
      />
    </div>
  );
};

export default UserManagement;