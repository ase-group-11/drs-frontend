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
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../../../services';
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
  active: '#059669',
  suspended: '#dc2626',
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
          department: user.department,
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
          department: values.department,
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
          department: values.department,
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
      if (err?.errorFields) return; // Validation error — antd handles display
      message.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === 'add' ? 'Add New User' : 'Edit User'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={mode === 'add' ? 'Create User' : 'Save Changes'}
      okButtonProps={{ loading: submitting, style: { background: '#7c3aed', borderColor: '#7c3aed' } }}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter the full name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="e.g. John Murphy" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter an email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="user@drs.ie" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter a phone number' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="+353 87 000 0000" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: 'Please select a role' }]}
            >
              <Select placeholder="Select role">
                {ROLE_OPTIONS.map((r) => (
                  <Select.Option key={r.value} value={r.value}>
                    {r.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="department"
              label="Department"
              rules={[{ required: true, message: 'Please select a department' }]}
            >
              <Select placeholder="Select department">
                {DEPARTMENT_OPTIONS.map((d) => (
                  <Select.Option key={d.value} value={d.value}>
                    {d.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        {mode === 'edit' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select placeholder="Select status">
                  {STATUS_OPTIONS.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      {s.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}
        {mode === 'add' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please set a password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Min. 8 characters" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm the password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" />
              </Form.Item>
            </Col>
          </Row>
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

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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
            borderRadius: '20px',
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
            borderRadius: '20px',
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
              borderRadius: '50%',
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
          <p className="um-subtitle">12,458 Total Users</p>
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
        <Row gutter={[12, 12]} align="middle" style={{ flexWrap: 'nowrap' }}>
          <Col flex="160px">
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
          <Col flex="160px">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              placeholder="All Statuses"
              popupClassName="um-filter-dropdown"
            >
              <Select.Option value="all">All Statuses</Select.Option>
              {STATUS_OPTIONS.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto">
            <Search
              placeholder="Search by name, email or ID..."
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
          <Space>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Clear selection
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
              total: users.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `${total} users total`,
              className: 'um-pagination',
            }}
            scroll={{ x: 1100 }}
            className="um-table"
            locale={{ emptyText: 'No users found matching your filters' }}
          />
        )}
      </Card>

      {/* Add User Modal */}
      <UserFormModal
        open={addModalOpen}
        mode="add"
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

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