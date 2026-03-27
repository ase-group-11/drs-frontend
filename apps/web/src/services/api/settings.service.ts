import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  GeneralSettings,
  NotificationSettings,
  SystemStatus,
  AdminApiResponse,
} from '../../types';

export const getGeneralSettings = async (): Promise<AdminApiResponse<GeneralSettings>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.GENERAL);
    return { success: true, message: 'Settings fetched', data: response.data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Failed to load settings' };
  }
};

export const saveGeneralSettings = async (
  payload: GeneralSettings
): Promise<AdminApiResponse<GeneralSettings>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.SETTINGS.GENERAL, payload);
    return { success: true, message: 'Settings saved', data: response.data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Failed to save settings' };
  }
};

export const getNotificationSettings = async (): Promise<AdminApiResponse<NotificationSettings>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.NOTIFICATIONS);
    return { success: true, message: 'Notification settings fetched', data: response.data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Failed to load notification settings' };
  }
};

export const saveNotificationSettings = async (
  payload: NotificationSettings
): Promise<AdminApiResponse<NotificationSettings>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.SETTINGS.NOTIFICATIONS, payload);
    return { success: true, message: 'Notification settings saved', data: response.data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Failed to save notification settings' };
  }
};

export const changeAdminPassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<AdminApiResponse> => {
  try {
    await apiClient.post(API_ENDPOINTS.SETTINGS.CHANGE_PASSWORD, {
      old_password: payload.currentPassword,
      new_password: payload.newPassword,
    });
    return { success: true, message: 'Password changed successfully' };
  } catch (error: any) {
    const detail = error?.response?.data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d.msg).join(', ')
      : detail || 'Failed to change password';
    return { success: false, message: msg };
  }
};

export const getSystemStatus = async (): Promise<AdminApiResponse<SystemStatus>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.SYSTEM_STATUS);
    return { success: true, message: 'System status fetched', data: response.data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Failed to load system status' };
  }
};