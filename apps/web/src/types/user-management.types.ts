// UPDATED — mapped to real API response from GET /api/v1/users/

export type ApiUserType = 'citizen' | 'team';
export type ApiUserRole = 'RESIDENT' | 'ADMIN' | 'MANAGER' | 'STAFF';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'DELETED';
export type ApiDepartment = 'FIRE' | 'MEDICAL' | 'POLICE' | 'IT' | null;

// Raw shape from GET /api/v1/users/
// NOTE: reviews_count, assigned_units_count, commanding_units_count are nested
// under `stats` in the actual API response. Flat top-level aliases kept for safety.
export interface ApiUser {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  user_type: ApiUserType;
  department: ApiDepartment;
  employee_id: string | null;
  // Nested stats (actual API shape)
  stats?: {
    reviews_count?: number;
    assigned_units_count?: number;
    commanding_units_count?: number;
  };
  // Top-level aliases (flat fallback — some API versions return these flat)
  reports_count?: number;
  reviews_count?: number;
  is_assigned?: boolean;
  assigned_units_count?: number;
  commanding_units_count?: number;
  current_unit_codes?: string[];
  created_at: string;
}

export interface ApiUsersResponse {
  users: ApiUser[];
  total_count: number;
  summary: {
    citizens: number;
    team_members: number;
    active: number;
    inactive: number;
  };
  by_department: Record<string, number>;
  filtered_by: Record<string, any>;
}

// Internal shape used by the component
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  userType: ApiUserType;
  department: ApiDepartment;
  employeeId: string | null;
  reportsCount: number;
  reviewsCount: number;
  isAssigned: boolean;
  assignedUnitsCount: number;
  commandingUnitsCount: number;
  currentUnitCodes: string[];
  createdAt: string;
}

export interface UserListResponse {
  users: AdminUser[];
  totalCount: number;
  summary: ApiUsersResponse['summary'];
  byDepartment: Record<string, number>;
}

export interface UserManagementFilters {
  user_type?: ApiUserType;
  department?: string;
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  phone_number: string;
  role: ApiUserRole;
  department?: ApiDepartment;
  password?: string;
  user_type: ApiUserType;
}

export interface UpdateUserStatusPayload {
  status: ApiUserStatus;
  reason?: string;
}

// Legacy aliases
export type AdminUserRole = ApiUserRole;
export type AdminUserStatus = ApiUserStatus;
export type AdminUserDepartment = ApiDepartment;
export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: ApiUserRole;
  department?: ApiDepartment;
  status?: ApiUserStatus;
}
// AdminApiResponse lives in admin.types.ts — imported from there via index.ts