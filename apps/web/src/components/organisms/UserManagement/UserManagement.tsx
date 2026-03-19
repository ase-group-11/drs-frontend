// NEW FILE
import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Avatar,
  Modal,
  Form,
  Space,
  Tooltip,
  message,
  Spin,
  Popconfirm,
  Typography,
  Row,
  Col,
} from 'antd';
import type { TableColumnsType } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../../../services';
import type {
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  AdminUserDepartment,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../../types';
import './UserManagement.css';

const { Search } = Input;
const { Text } = Typography;

// ─── Role & status config ─────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  user: '#2563eb',
};

const STATUS_COLORS: Record<AdminUserStatus, string> = {
  active: '#008236',
  suspended: '#d4183d',
  pending: '#d97706',
};

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

const DEPARTMENT_OPTIONS: { label: string; value: AdminUserDepartment }[] = [
  { label: 'Medical', value: 'medical' },
  { label: 'Police', value: 'police' },
  { label: 'IT', value: 'it' },
  { label: 'Fire', value: 'fire' },
];

const STATUS_OPTIONS: { label: string; value: AdminUserStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Pending', value: 'pending' },
];

// ─── UserFormModal ────────────────────────────────────────────────────────────

interface UserFormModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  user?: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ open, mode, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        form.setFieldsValue({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, mode, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (mode === 'add') {
        const payload: CreateUserPayload = {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          role: values.role,
          department: 'it',
          password: values.password,
        };
        const result = await createUser(payload);
        if (result.success) {
          message.success('User created successfully');
          onSuccess();
          onClose();
        } else {
          message.error(result.message || 'Failed to create user');
        }
      } else if (mode === 'edit' && user) {
        const payload: UpdateUserPayload = {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          role: values.role,
          status: values.status,
        };
        const result = await updateUser(user.id, payload);
        if (result.success) {
          message.success('User updated successfully');
          onSuccess();
          onClose();
        } else {
          message.error(result.message || 'Failed to update user');
        }
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="um-modal-header">
          <div className="um-modal-title">{mode === 'add' ? 'Add New User' : 'Edit User'}</div>
          {mode === 'add' && (
            <div className="um-modal-subtitle">Create a new user account with the information below.</div>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={mode === 'add' ? 'Create User' : 'Save Changes'}
      okButtonProps={{ loading: submitting, style: { background: '#7c3aed', borderColor: '#7c3aed', borderRadius: '10px', fontWeight: 600, height: 40, padding: '0 24px' } }}
      cancelButtonProps={{ style: { borderRadius: '10px', height: 40, padding: '0 24px' } }}
      width={520}
      destroyOnClose
      className="um-modal"
    >
      <Form form={form} layout="vertical" className="um-modal-form">

        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[
            { required: true, message: 'Please enter the full name' },
            { min: 2, message: 'Full name must be at least 2 characters' },
            { pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/, message: 'Full name can only contain letters' },
          ]}
        >
          <Input placeholder="Enter full name" className="um-modal-input" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter an email address' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input placeholder="user@example.com" className="um-modal-input" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[
            { required: true, message: 'Please enter a phone number' },
            {
              validator: (_: any, value: string) => {
                if (!value) return Promise.resolve();
                const digits = value.replace(/[\s\-\(\)]/g, '');
                // Irish: +353 followed by 8XXXXXXXX (9 digits starting with 8)
                const irish = digits.replace(/^\+353/, '');
                if (/^8\d{8}$/.test(irish)) return Promise.resolve();
                // Indian: +91 followed by 6-9XXXXXXXXX (10 digits starting with 6-9)
                const indian = digits.replace(/^\+91/, '');
                if (/^[6-9]\d{9}$/.test(indian)) return Promise.resolve();
                return Promise.reject(new Error('Enter a valid Irish (+353 8X XXX XXXX) or Indian (+91 XXXXX XXXXX) number'));
              },
            },
          ]}
        >
          <Input placeholder="+353 87 123 4567" className="um-modal-input" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select placeholder="Select role..." className="um-modal-select" popupClassName="um-modal-dropdown">
            {ROLE_OPTIONS.map((r) => (
              <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {mode === 'edit' && (
          <Form.Item name="status" label="Status">
            <Select placeholder="Select status" className="um-modal-select" popupClassName="um-modal-dropdown">
              {STATUS_OPTIONS.map((s) => (
                <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {mode === 'add' && (
          <>
            <Form.Item
              name="password"
              label="Initial Password"
              rules={[
                { required: true, message: 'Please set a password' },
                { min: 8, message: 'Password must be at least 8 characters' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Must contain uppercase, lowercase, number and special character (@,$,!,%,*,?,&)',
                },
              ]}
            >
              <Input.Password placeholder="Enter initial password" className="um-modal-input" />
            </Form.Item>

            <div className="um-modal-checkboxes">
              <Form.Item name="sendWelcomeEmail" valuePropName="checked" noStyle>
                <label className="um-modal-checkbox-label">
                  <input type="checkbox" className="um-modal-checkbox" />
                  <span>Send welcome email with login instructions</span>
                </label>
              </Form.Item>
              <Form.Item name="requirePasswordChange" valuePropName="checked" noStyle>
                <label className="um-modal-checkbox-label">
                  <input type="checkbox" className="um-modal-checkbox" />
                  <span>Require password change on first login</span>
                </label>
              </Form.Item>
            </div>
          </>
        )}

      </Form>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers({
        search: searchText || undefined,
        role: roleFilter !== 'all' ? (roleFilter as AdminUserRole) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as AdminUserStatus) : undefined,
      });
      if (result.data) {
        setUsers(result.data.users);
      }
    } catch {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchText, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: string) => {
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        message.success('User deleted successfully');
        fetchUsers();
      } else {
        message.error(result.message || 'Failed to delete user');
      }
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleDeleteSelected = () => {
    const ids = selectedRowKeys.map((k) => String(k));
    const count = ids.length;

    Modal.confirm({
      title: 'Delete selected users?',
      content: `This will permanently delete ${count} user${count > 1 ? 's' : ''}. This cannot be undone.`,
      okText: 'Delete Selected',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        setDeletingSelected(true);
        try {
          const results = await Promise.allSettled(ids.map((id) => deleteUser(id)));

          const deletedIds: string[] = [];
          const failedIds: string[] = [];

          results.forEach((r, idx) => {
            const id = ids[idx];
            if (r.status === 'fulfilled' && r.value.success) deletedIds.push(id);
            else failedIds.push(id);
          });

          if (deletedIds.length) {
            message.success(`Deleted ${deletedIds.length} user${deletedIds.length > 1 ? 's' : ''}.`);
          }
          if (failedIds.length) {
            message.error(`Failed to delete ${failedIds.length} user${failedIds.length > 1 ? 's' : ''}.`);
          }

          await fetchUsers();
          setSelectedRowKeys(failedIds);
        } finally {
          setDeletingSelected(false);
        }
      },
    });
  };

  const handleExport = () => {
    message.info('Exporting user list...');
    // Wire to API_ENDPOINTS.USER_MANAGEMENT.EXPORT when ready
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const columns: TableColumnsType<AdminUser> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div className="um-user-cell">
          <Avatar
            size={36}
            className="um-avatar"
            style={{ background: ROLE_COLORS[record.role] ?? '#6b7280', flexShrink: 0 }}
          >
            {getInitials(record.fullName)}
          </Avatar>
          <div className="um-user-info">
            <Text strong className="um-user-name">
              {record.fullName}
            </Text>
            <Text type="secondary" className="um-user-id">
              {record.userId}
            </Text>
          </div>
        </div>
      ),
      width: 220,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag
          className="um-role-tag"
          style={{
            background: `${ROLE_COLORS[role] ?? '#6b7280'}28`,
            color: ROLE_COLORS[role] ?? '#6b7280',
            border: `1px solid ${ROLE_COLORS[role] ?? '#6b7280'}50`,
            borderRadius: '10px',
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {role}
        </Tag>
      ),
      width: 110,
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text style={{ fontSize: 13, color: '#374151' }}>{record.email}</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>{record.phone}</Text>
        </div>
      ),
      width: 220,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: AdminUserStatus) => (
        <Tag
          className="um-status-tag"
          style={{
            background: `${STATUS_COLORS[status]}28`,
            color: STATUS_COLORS[status],
            border: `1px solid ${STATUS_COLORS[status]}50`,
            borderRadius: '10px',
            fontWeight: 500,
            textTransform: 'capitalize',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '10px',
              background: STATUS_COLORS[status],
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {status}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) =>
        new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      width: 130,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit user">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="um-action-btn um-edit-btn"
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete user"
            description={
              <>
                Are you sure you want to delete <strong>{record.fullName}</strong>?
                <br />
                This action cannot be undone.
              </>
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            placement="topRight"
          >
            <Tooltip title="Delete user">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="um-action-btn um-delete-btn"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection: TableRowSelection<AdminUser> = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <div className="um-container">
      {/* Header */}
      <div className="um-header">
        <div className="um-header-left">
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">{users.length.toLocaleString()} Total Users</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
          className="um-add-btn"
          size="large"
        >
          Add User
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="um-filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col flex="140px">
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: '100%' }}
              placeholder="All Roles"
              popupClassName="um-filter-dropdown"
            >
              <Select.Option value="all">All Roles</Select.Option>
              {ROLE_OPTIONS.map((r) => (
                <Select.Option key={r.value} value={r.value}>
                  {r.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col flex="140px">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              placeholder="All Status"
              popupClassName="um-filter-dropdown"
            >
              <Select.Option value="all">All Status</Select.Option>
              {STATUS_OPTIONS.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto" style={{ minWidth: 120 }}>
            <Search
              placeholder="Search users..."
              allowClear
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={fetchUsers}
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
          <Text>
            {selectedRowKeys.length} user{selectedRowKeys.length > 1 ? 's' : ''} selected
          </Text>

          <Space size={10} className="um-selection-actions">
            <Button
              className="um-selection-btn-outline"
              onClick={() => setSelectedRowKeys([])}
              disabled={deletingSelected}
            >
              Clear selection
            </Button>

            <Button
              className="um-selection-btn-danger"
              onClick={handleDeleteSelected}
              loading={deletingSelected}
              disabled={deletingSelected}
            >
              Delete Selected
            </Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Card className="um-table-card">
        {loading ? (
          <div className="um-loading">
            <Spin size="large" />
          </div>
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
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} users total`,
            className: 'um-pagination',
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (_page, size) => {
              setCurrentPage(1); // optional: reset to page 1 when size changes
              setPageSize(size);
            },
          }}
            scroll={{ x: 1100 }}
            className="um-table"
            locale={{ emptyText: 'No users found matching your filters' }}
          />
        )}
      </Card>

      {/* Add User Modal */}
      <UserFormModal open={addModalOpen} mode="add" onClose={() => setAddModalOpen(false)} onSuccess={fetchUsers} />

      {/* Edit User Modal */}
      <UserFormModal
        open={editModalOpen}
        mode="edit"
        user={editingUser}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;