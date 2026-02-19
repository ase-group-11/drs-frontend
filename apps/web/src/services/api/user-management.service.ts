// NEW FILE
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserManagementFilters,
  UserListResponse,
  AdminApiResponse,
} from '../../types';

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_USERS: AdminUser[] = [
  {
    id: '1',
    userId: 'U001',
    fullName: 'Sarah Connor',
    role: 'admin',
    department: 'it',
    email: 'sarah.connor@drs.ie',
    phone: '+353 87 123 4567',
    employeeId: 'EMP001',
    status: 'active',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    userId: 'U002',
    fullName: 'John Murphy',
    role: 'manager',
    department: 'fire',
    email: 'john.murphy@drs.ie',
    phone: '+353 86 234 5678',
    employeeId: 'EMP002',
    status: 'active',
    createdAt: '2025-01-20T09:00:00Z',
  },
  {
    id: '3',
    userId: 'U003',
    fullName: 'Aoife Ryan',
    role: 'staff',
    department: 'medical',
    email: 'aoife.ryan@drs.ie',
    phone: '+353 85 345 6789',
    employeeId: 'EMP003',
    status: 'active',
    createdAt: '2025-02-01T08:30:00Z',
  },
  {
    id: '4',
    userId: 'U004',
    fullName: 'Ciarán Walsh',
    role: 'staff',
    department: 'police',
    email: 'ciaran.walsh@drs.ie',
    phone: '+353 83 456 7890',
    employeeId: 'EMP004',
    status: 'suspended',
    createdAt: '2025-02-10T11:00:00Z',
  },
  {
    id: '5',
    userId: 'U005',
    fullName: 'Niamh Brennan',
    role: 'manager',
    department: 'fire',
    email: 'niamh.brennan@drs.ie',
    phone: '+353 87 567 8901',
    employeeId: 'EMP005',
    status: 'active',
    createdAt: '2025-02-15T14:00:00Z',
  },
  {
    id: '6',
    userId: 'U006',
    fullName: 'Darragh Kelly',
    role: 'staff',
    department: 'medical',
    email: 'darragh.kelly@drs.ie',
    phone: '+353 86 678 9012',
    employeeId: 'EMP006',
    status: 'pending',
    createdAt: '2025-03-01T09:15:00Z',
  },
  {
    id: '7',
    userId: 'U007',
    fullName: 'Fionnuala O\'Brien',
    role: 'staff',
    department: 'police',
    email: 'fionnuala.obrien@drs.ie',
    phone: '+353 85 789 0123',
    employeeId: 'EMP007',
    status: 'active',
    createdAt: '2025-03-05T10:30:00Z',
  },
  {
    id: '8',
    userId: 'U008',
    fullName: 'Seán Doherty',
    role: 'manager',
    department: 'it',
    email: 'sean.doherty@drs.ie',
    phone: '+353 83 890 1234',
    employeeId: 'EMP008',
    status: 'active',
    createdAt: '2025-03-10T13:00:00Z',
  },
];

export const getUsers = async (
  filters?: UserManagementFilters
): Promise<AdminApiResponse<UserListResponse>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.USER_MANAGEMENT.LIST, {
      params: filters,
    });
    return {
      success: true,
      message: 'Users fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('getUsers API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    let filtered = [...DUMMY_USERS];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.userId.toLowerCase().includes(q)
      );
    }
    if (filters?.role && filters.role !== 'all') {
      filtered = filtered.filter((u) => u.role === filters.role);
    }
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter((u) => u.status === filters.status);
    }
    return {
      success: true,
      message: 'Using fallback data',
      data: { users: filtered, total: filtered.length, page: 1, limit: 50 },
    };
  }
};

export const createUser = async (
  payload: CreateUserPayload
): Promise<AdminApiResponse<AdminUser>> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.CREATE, payload);
    return {
      success: true,
      message: 'User created successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('createUser API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const newUser: AdminUser = {
      id: String(Date.now()),
      userId: `U${String(DUMMY_USERS.length + 1).padStart(3, '0')}`,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      department: payload.department,
      employeeId: `EMP${String(Date.now()).slice(-6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    DUMMY_USERS.push(newUser);
    return {
      success: true,
      message: 'User created successfully (fallback)',
      data: newUser,
    };
  }
};

export const updateUser = async (
  id: string,
  payload: UpdateUserPayload
): Promise<AdminApiResponse<AdminUser>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.USER_MANAGEMENT.UPDATE(id), payload);
    return {
      success: true,
      message: 'User updated successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('updateUser API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const idx = DUMMY_USERS.findIndex((u) => u.id === id);
    if (idx !== -1) {
      DUMMY_USERS[idx] = { ...DUMMY_USERS[idx], ...payload };
      return { success: true, message: 'User updated (fallback)', data: DUMMY_USERS[idx] };
    }
    return { success: false, message: 'User not found' };
  }
};

export const deleteUser = async (id: string): Promise<AdminApiResponse> => {
  try {
    await apiClient.delete(API_ENDPOINTS.USER_MANAGEMENT.DELETE(id));
    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    console.warn('deleteUser API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const idx = DUMMY_USERS.findIndex((u) => u.id === id);
    if (idx !== -1) {
      DUMMY_USERS.splice(idx, 1);
      return { success: true, message: 'User deleted (fallback)' };
    }
    return { success: false, message: 'User not found' };
  }
};
