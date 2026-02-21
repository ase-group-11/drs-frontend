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
    id: '1', userId: 'U001', fullName: 'Sarah Connor', role: 'admin',
    department: 'it', email: 'sarah.connor@drs.ie', phone: '+353 87 123 4567',
    employeeId: 'EMP001', status: 'active', createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: '2', userId: 'U002', fullName: 'John Murphy', role: 'user',
    department: 'fire', email: 'john.murphy@drs.ie', phone: '+353 86 234 5678',
    employeeId: 'EMP002', status: 'active', createdAt: '2024-11-20T09:00:00Z',
  },
  {
    id: '3', userId: 'U003', fullName: 'Aoife Ryan', role: 'user',
    department: 'medical', email: 'aoife.ryan@drs.ie', phone: '+353 85 345 6789',
    employeeId: 'EMP003', status: 'active', createdAt: '2024-08-10T08:30:00Z',
  },
  {
    id: '4', userId: 'U004', fullName: 'Ciarán Walsh', role: 'user',
    department: 'police', email: 'ciaran.walsh@drs.ie', phone: '+353 83 456 7890',
    employeeId: 'EMP004', status: 'suspended', createdAt: '2025-02-10T11:00:00Z',
  },
  {
    id: '5', userId: 'U005', fullName: 'Niamh Brennan', role: 'admin',
    department: 'fire', email: 'niamh.brennan@drs.ie', phone: '+353 87 567 8901',
    employeeId: 'EMP005', status: 'active', createdAt: '2024-12-15T14:00:00Z',
  },
  {
    id: '6', userId: 'U006', fullName: 'Darragh Kelly', role: 'user',
    department: 'medical', email: 'darragh.kelly@drs.ie', phone: '+353 86 678 9012',
    employeeId: 'EMP006', status: 'pending', createdAt: '2025-03-01T09:15:00Z',
  },
  {
    id: '7', userId: 'U007', fullName: "Fionnuala O'Brien", role: 'user',
    department: 'police', email: 'fionnuala.obrien@drs.ie', phone: '+353 85 789 0123',
    employeeId: 'EMP007', status: 'active', createdAt: '2025-01-05T10:30:00Z',
  },
  {
    id: '8', userId: 'U008', fullName: 'Seán Doherty', role: 'admin',
    department: 'it', email: 'sean.doherty@drs.ie', phone: '+353 83 890 1234',
    employeeId: 'EMP008', status: 'active', createdAt: '2024-10-12T13:00:00Z',
  },
  {
    id: '9', userId: 'U009', fullName: 'Caoimhe Lynch', role: 'user',
    department: 'medical', email: 'caoimhe.lynch@drs.ie', phone: '+353 87 901 2345',
    employeeId: 'EMP009', status: 'active', createdAt: '2025-02-20T08:00:00Z',
  },
  {
    id: '10', userId: 'U010', fullName: 'Pádraig Nolan', role: 'user',
    department: 'fire', email: 'padraig.nolan@drs.ie', phone: '+353 86 012 3456',
    employeeId: 'EMP010', status: 'suspended', createdAt: '2024-09-18T11:30:00Z',
  },
  {
    id: '11', userId: 'U011', fullName: 'Sinéad Farrell', role: 'user',
    department: 'police', email: 'sinead.farrell@drs.ie', phone: '+353 85 123 4568',
    employeeId: 'EMP011', status: 'active', createdAt: '2025-03-10T09:45:00Z',
  },
  {
    id: '12', userId: 'U012', fullName: 'Rónán McCarthy', role: 'admin',
    department: 'it', email: 'ronan.mccarthy@drs.ie', phone: '+353 83 234 5679',
    employeeId: 'EMP012', status: 'active', createdAt: '2024-07-22T14:15:00Z',
  },
  {
    id: '13', userId: 'U013', fullName: 'Áine Gallagher', role: 'user',
    department: 'medical', email: 'aine.gallagher@drs.ie', phone: '+353 87 345 6790',
    employeeId: 'EMP013', status: 'pending', createdAt: '2025-03-15T10:00:00Z',
  },
  {
    id: '14', userId: 'U014', fullName: 'Tadhg Connolly', role: 'user',
    department: 'fire', email: 'tadhg.connolly@drs.ie', phone: '+353 86 456 7891',
    employeeId: 'EMP014', status: 'active', createdAt: '2024-11-05T12:00:00Z',
  },
  {
    id: '15', userId: 'U015', fullName: 'Éabha Sheridan', role: 'user',
    department: 'police', email: 'eabha.sheridan@drs.ie', phone: '+353 85 567 8902',
    employeeId: 'EMP015', status: 'active', createdAt: '2025-01-28T09:30:00Z',
  },
  {
    id: '16', userId: 'U016', fullName: 'Cormac Healy', role: 'user',
    department: 'it', email: 'cormac.healy@drs.ie', phone: '+353 83 678 9013',
    employeeId: 'EMP016', status: 'active', createdAt: '2024-08-30T15:00:00Z',
  },
  {
    id: '17', userId: 'U017', fullName: 'Muireann Flood', role: 'user',
    department: 'medical', email: 'muireann.flood@drs.ie', phone: '+353 87 789 0124',
    employeeId: 'EMP017', status: 'suspended', createdAt: '2025-02-05T11:15:00Z',
  },
  {
    id: '18', userId: 'U018', fullName: 'Diarmuid Burke', role: 'admin',
    department: 'fire', email: 'diarmuid.burke@drs.ie', phone: '+353 86 890 1235',
    employeeId: 'EMP018', status: 'active', createdAt: '2024-06-14T08:45:00Z',
  },
  {
    id: '19', userId: 'U019', fullName: 'Orlaith Quinlan', role: 'user',
    department: 'police', email: 'orlaith.quinlan@drs.ie', phone: '+353 85 901 2346',
    employeeId: 'EMP019', status: 'active', createdAt: '2025-03-18T13:30:00Z',
  },
  {
    id: '20', userId: 'U020', fullName: 'Seámus Higgins', role: 'user',
    department: 'it', email: 'seamus.higgins@drs.ie', phone: '+353 83 012 3457',
    employeeId: 'EMP020', status: 'pending', createdAt: '2025-03-20T10:00:00Z',
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