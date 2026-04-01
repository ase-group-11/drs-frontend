// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/disasterService.ts
// Disaster Service - COMPLETE & READY TO USE
// ═══════════════════════════════════════════════════════════════════════════

import { ApiError, authRequest } from './authService';
import { authService } from './authService';

// ── apiRequest alias — uses authRequest which auto-refreshes on 401 ───────
const apiRequest = <T>(endpoint: string, options: RequestInit = {}) =>
  authRequest<T>(endpoint, options);

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type DisasterType =
  | 'ACCIDENT'
  | 'BUILDING_COLLAPSE'
  | 'CRIME'
  | 'EARTHQUAKE'
  | 'EXPLOSION'
  | 'FIRE'
  | 'FLOOD'
  | 'GAS_LEAK'
  | 'HAZMAT'
  | 'LANDSLIDE'
  | 'MEDICAL_EMERGENCY'
  | 'OTHER'
  | 'POWER_OUTAGE'
  | 'RIOT'
  | 'STORM'
  | 'TERRORIST_ATTACK'
  | 'WATER_CONTAMINATION';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PhotoInput {
  image_url: string;
  caption?: string;
  file_size?: number;
  mime_type?: string;
}

export interface DisasterReportRequest {
  user_id: string;
  location_address: string;
  disaster_type: DisasterType;
  severity: SeverityLevel;
  description: string;
  latitude: number;
  longitude: number;
  people_affected?: number;
  multiple_casualties?: boolean;
  structural_damage?: boolean;
  road_blocked?: boolean;
  photos?: PhotoInput[];
  reference_id?: string;
}

export interface DisasterReportResponse {
  id: string;
  user_id: string;
  disaster_type: string;
  severity: string;
  description?: string;
  location_address?: string;
  latitude: number;
  longitude: number;
  people_affected?: number;
  multiple_casualties?: boolean;
  structural_damage?: boolean;
  road_blocked?: boolean;
  status: string;
  created_at: string;
  photos?: PhotoInput[];
}

export interface BlobUploadFileResponse {
  image_url: string;
  file_size: number;
  mime_type: string;
  original_filename: string;
}

export interface BlobUploadBatchResponse {
  uploaded_files: BlobUploadFileResponse[];
  reference_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Disaster Service Class
// ═══════════════════════════════════════════════════════════════════════════

class DisasterService {
  /**
   * Upload media files (requires auth)
   */
  async uploadMedia(files: any[]): Promise<BlobUploadBatchResponse> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const authHeader = authService.getAuthHeader();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/disaster-reports/upload-media`, {
        method: 'POST',
        headers: authHeader,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new ApiError(
          data.message || data.detail || 'Upload failed',
          response.status,
          data
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError('Upload timed out', 408);
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Upload failed', 500);
    }
  }

  /**
   * Create disaster report (requires auth)
   */
  async createReport(data: DisasterReportRequest): Promise<DisasterReportResponse> {
    return apiRequest<DisasterReportResponse>(
      '/disaster-reports/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  /**
   * Submit disaster report (all-in-one with file upload)
   */
  async submitReport(data: {
    user_id: string;
    location_address: string;
    disaster_type: string;
    severity: string;
    description: string;
    latitude: number;
    longitude: number;
    people_affected?: number;
    multiple_casualties?: boolean;
    structural_damage?: boolean;
    road_blocked?: boolean;
    files?: any[];
  }): Promise<DisasterReportResponse> {
    const formData = new FormData();

    // Add all fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'files') {
        if (value && Array.isArray(value)) {
          value.forEach((file) => formData.append('files', file));
        }
      } else {
        formData.append(key, String(value));
      }
    });

    const authHeader = authService.getAuthHeader();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/disaster-reports/submit`, {
        method: 'POST',
        headers: authHeader,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new ApiError(
          data.message || data.detail || 'Submit failed',
          response.status,
          data
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError('Submit timed out', 408);
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Submit failed', 500);
    }
  }

  /**
   * Get disaster report by ID (requires auth)
   */
  async getReport(reportId: string): Promise<DisasterReportResponse> {
    return apiRequest<DisasterReportResponse>(
      `/disaster-reports/${reportId}`,
      { method: 'GET' },
      true
    );
  }

  /**
   * Get user's disaster reports (requires auth)
   */
  async getUserReports(
    userId: string,
    limit: number = 20
  ): Promise<{
    reports: DisasterReportResponse[];
    count: number;
    user_id: string;
  }> {
    return apiRequest<{
      reports: DisasterReportResponse[];
      count: number;
      user_id: string;
    }>(
      `/disaster-reports/user/${userId}?limit=${limit}`,
      { method: 'GET' },
      true
    );
  }

  /**
   * Get user's reports (alias for getUserReports)
   */
  async getMyReports(userId: string, limit: number = 20): Promise<DisasterReportResponse[]> {
    const response = await this.getUserReports(userId, limit);
    return response.reports;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════

export const disasterService = new DisasterService();
export default disasterService;