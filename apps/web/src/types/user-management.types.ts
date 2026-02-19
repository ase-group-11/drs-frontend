// NEW FILE
export type AdminUserRole = 'admin' | 'manager' | 'staff';
export type AdminUserStatus = 'active' | 'suspended' | 'pending';
export type AdminUserDepartment = 'medical' | 'police' | 'it' | 'fire';

export interface AdminUser {
  id: string;
  userId: string; // Display ID e.g. "U001"
  fullName: string;
  avatar?: string;
  role: AdminUserRole;
  department: AdminUserDepartment;
  email: string;
  phone: string;
  employeeId: string;
  status: AdminUserStatus;
  createdAt: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  department: AdminUserDepartment;
  password: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: AdminUserRole;
  department?: AdminUserDepartment;
  status?: AdminUserStatus;
}

export interface UserManagementFilters {
  search?: string;
  role?: AdminUserRole | 'all';
  status?: AdminUserStatus | 'all';
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}
