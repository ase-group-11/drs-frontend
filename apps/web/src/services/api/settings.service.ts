// NEW FILE
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  GeneralSettings,
  NotificationSettings,
  SystemStatus,
  AdminApiResponse,
} from '../../types';

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_GENERAL: GeneralSettings = {
  systemName: 'Dublin Disaster Response System',
  adminEmail: 'admin@drs.ie',
  timezone: 'europe-dublin',
  language: 'en',
  dateFormat: 'dd-mm-yyyy',
};

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_NOTIFICATIONS: NotificationSettings = {
  criticalAlerts: true,
  dailySummary: true,
  teamUpdates: false,
  systemMaintenance: true,
  desktopNotifications: true,
  soundAlerts: false,
};

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_SYSTEM_STATUS: SystemStatus = {
  databaseStatus: 'Operational',
  apiStatus: 'Healthy',
  version: 'v1.2.5',
  dbVersion: 'PostgreSQL 14.5',
  serverRegion: 'EU-West (Dublin)',
  lastBackup: '2 hours ago',
  uptime: '99.8%',
};

export const getGeneralSettings = async (): Promise<AdminApiResponse<GeneralSettings>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.GENERAL);
    return { success: true, message: 'Settings fetched', data: response.data };
  } catch (error: any) {
    console.warn('getGeneralSettings API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: { ...DUMMY_GENERAL } };
  }
};

export const saveGeneralSettings = async (
  payload: GeneralSettings
): Promise<AdminApiResponse<GeneralSettings>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.SETTINGS.GENERAL, payload);
    return { success: true, message: 'Settings saved', data: response.data };
  } catch (error: any) {
    console.warn('saveGeneralSettings API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    Object.assign(DUMMY_GENERAL, payload);
    return { success: true, message: 'Settings saved (fallback)', data: { ...DUMMY_GENERAL } };
  }
};

export const getNotificationSettings = async (): Promise<AdminApiResponse<NotificationSettings>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.NOTIFICATIONS);
    return { success: true, message: 'Notification settings fetched', data: response.data };
  } catch (error: any) {
    console.warn('getNotificationSettings API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: { ...DUMMY_NOTIFICATIONS } };
  }
};

export const saveNotificationSettings = async (
  payload: NotificationSettings
): Promise<AdminApiResponse<NotificationSettings>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.SETTINGS.NOTIFICATIONS, payload);
    return { success: true, message: 'Notification settings saved', data: response.data };
  } catch (error: any) {
    console.warn('saveNotificationSettings API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    Object.assign(DUMMY_NOTIFICATIONS, payload);
    return {
      success: true,
      message: 'Notification settings saved (fallback)',
      data: { ...DUMMY_NOTIFICATIONS },
    };
  }
};

export const changeAdminPassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<AdminApiResponse> => {
  try {
    await apiClient.post(API_ENDPOINTS.SETTINGS.CHANGE_PASSWORD, payload);
    return { success: true, message: 'Password changed successfully' };
  } catch (error: any) {
    console.warn('changeAdminPassword API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    if (payload.currentPassword === 'admin123') {
      return { success: true, message: 'Password changed (fallback)' };
    }
    return { success: false, message: 'Current password is incorrect' };
  }
};

export const getSystemStatus = async (): Promise<AdminApiResponse<SystemStatus>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.SETTINGS.SYSTEM_STATUS);
    return { success: true, message: 'System status fetched', data: response.data };
  } catch (error: any) {
    console.warn('getSystemStatus API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: { ...DUMMY_SYSTEM_STATUS } };
  }
};
