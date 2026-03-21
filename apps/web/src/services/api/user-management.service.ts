// UPDATED — wired to real API GET /api/v1/users/
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  AdminUser,
  ApiUser,
  ApiUsersResponse,
  UserListResponse,
  UserManagementFilters,
  UpdateUserStatusPayload,
} from '../../types';
import type { AdminApiResponse } from '../../types';

// Map API user → internal AdminUser shape
const mapUser = (u: ApiUser): AdminUser => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  phone: u.phone_number,
  role: u.role,
  status: u.status,
  userType: u.user_type,
  department: u.department,
  employeeId: u.employee_id,
  reportsCount: u.reports_count ?? 0,
  reviewsCount: u.reviews_count ?? 0,
  isAssigned: u.is_assigned ?? false,
  assignedUnitsCount: u.assigned_units_count ?? 0,
  commandingUnitsCount: u.commanding_units_count ?? 0,
  currentUnitCodes: u.current_unit_codes ?? [],
  createdAt: u.created_at,
});

export const getUsers = async (
  filters?: UserManagementFilters
): Promise<AdminApiResponse<UserListResponse>> => {
  try {
    const params: Record<string, any> = {};
    if (filters?.user_type) params.user_type = filters.user_type;
    if (filters?.department) params.department = filters.department;
    if (filters?.role) params.role = filters.role;
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.limit) params.limit = filters.limit;

    const response = await apiClient.get<ApiUsersResponse>(API_ENDPOINTS.USER_MANAGEMENT.LIST, { params });
    const raw = response.data;

    return {
      success: true,
      message: 'Users fetched successfully',
      data: {
        users: raw.users.map(mapUser),
        totalCount: raw.total_count,
        summary: raw.summary,
        byDepartment: raw.by_department,
      },
    };
  } catch (error: any) {
    console.error('getUsers API failed:', error);
    return {
      success: false,
      message: error?.response?.data?.detail || 'Failed to load users',
    };
  }
};

export const deleteUser = async (id: string, reason?: string): Promise<AdminApiResponse> => {
  try {
    await apiClient.delete(API_ENDPOINTS.USER_MANAGEMENT.DELETE(id), {
      data: reason ? { reason } : undefined,
    });
    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.detail || 'Failed to delete user',
    };
  }
};

export const updateUserStatus = async (
  id: string,
  payload: UpdateUserStatusPayload
): Promise<AdminApiResponse> => {
  try {
    await apiClient.put(API_ENDPOINTS.USER_MANAGEMENT.UPDATE_STATUS(id), payload);
    return { success: true, message: 'User status updated' };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.detail || 'Failed to update status',
    };
  }
};

// Stub — kept for modal compatibility
export const createUser = async (payload: any): Promise<AdminApiResponse<any>> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.CREATE, payload);
    return { success: true, message: 'User created successfully', data: response.data };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.detail || 'Failed to create user',
    };
  }
};

export const updateUser = async (id: string, payload: any): Promise<AdminApiResponse<any>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.USER_MANAGEMENT.UPDATE_STATUS(id), payload);
    return { success: true, message: 'User updated successfully', data: response.data };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.detail || 'Failed to update user',
    };
  }
};