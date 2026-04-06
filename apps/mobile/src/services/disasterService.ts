// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/disasterService.ts
// Disaster Service — ALL API methods for both Citizen and ERT Responder
//
// Includes:
//   - Disaster reports (citizen)
//   - Active disasters (ERT Section 4)
//   - Disaster detail + deployments (ERT Section 4)
//   - Active/Completed missions (ERT Sections 5, 8)
//   - Deployment status update (ERT Section 6)
//   - Deployment detail (ERT Section 7)
//   - Reroute status + plans + override (ERT Section 9)
//   - Evacuation (ERT Section 10)
//   - Live map (ERT Section 11)
//   - Vehicle registration (Feature 2 Step 1)
// ═══════════════════════════════════════════════════════════════════════════

import { ApiError, authRequest } from './authService';
import { authService } from './authService';

const apiRequest = <T>(endpoint: string, options: RequestInit = {}) =>
  authRequest<T>(endpoint, options);

// ── Types ─────────────────────────────────────────────────────────────────

export type DisasterType =
  | 'ACCIDENT' | 'BUILDING_COLLAPSE' | 'CRIME' | 'EARTHQUAKE'
  | 'EXPLOSION' | 'FIRE' | 'FLOOD' | 'GAS_LEAK' | 'HAZMAT'
  | 'LANDSLIDE' | 'MEDICAL_EMERGENCY' | 'OTHER' | 'POWER_OUTAGE'
  | 'RIOT' | 'STORM' | 'TERRORIST_ATTACK' | 'WATER_CONTAMINATION';

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

export interface BlobUploadBatchResponse {
  uploaded_files: Array<{
    image_url: string;
    file_size: number;
    mime_type: string;
    original_filename: string;
  }>;
  reference_id: string;
}

// ── Reroute override request shape (from backend OverrideRequest) ─────
export interface RerouteOverrideRequest {
  disaster_id:  string;
  type:         'close_lane' | 'open_lane' | 'pin_detour' | 'corridor_priority';
  operator_id:  string;
  segment_id?:  string;
  route_id?:    string;
  priority?:    string;
}

// ── Vehicle registration request shape ────────────────────────────────
export interface VehicleRegisterRequest {
  user_id:      string;
  current_lat:  number;
  current_lng:  number;
  dest_lat:     number;
  dest_lng:     number;
  vehicle_type: 'general' | 'public_transport' | 'emergency';
}

// ── Deployment status update (ERT Section 6) ──────────────────────────
export interface DeploymentStatusUpdate {
  new_status:               string;
  situation_report?:        string;
  tags?:                    string[];
  minor_injuries?:          number;
  serious_injuries?:        number;
  location_verified?:       boolean;
  request_immediate_backup?: boolean;
  assessment_notes?:        string;
  is_false_alarm?:          boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Disaster Service Class
// ═══════════════════════════════════════════════════════════════════════════

class DisasterService {

  // ═════════════════════════════════════════════════════════════════════
  // Citizen: Disaster Reports
  // ═════════════════════════════════════════════════════════════════════

  async uploadMedia(files: any[]): Promise<BlobUploadBatchResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const authHeader = authService.getAuthHeader();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${require('@constants/index').API_BASE_URL}/disaster-reports/upload-media`,
        { method: 'POST', headers: authHeader, body: formData, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        const data = await response.json();
        throw new ApiError(data.message || data.detail || 'Upload failed', response.status, data);
      }
      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new ApiError('Upload timed out', 408);
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || 'Upload failed', 500);
    }
  }

  async createReport(data: DisasterReportRequest): Promise<DisasterReportResponse> {
    return apiRequest<DisasterReportResponse>('/disaster-reports/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReport(reportId: string): Promise<DisasterReportResponse> {
    return apiRequest<DisasterReportResponse>(`/disaster-reports/${reportId}`);
  }

  async getUserReports(userId: string, limit: number = 20) {
    return apiRequest<{ reports: DisasterReportResponse[]; count: number; user_id: string }>(
      `/disaster-reports/user/${userId}?limit=${limit}`
    );
  }

  async getMyReports(userId: string, limit: number = 20): Promise<DisasterReportResponse[]> {
    const response = await this.getUserReports(userId, limit);
    return response.reports;
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Active Disasters (Section 4)
  //   Only called on disaster.evaluated — result cached in store
  // ═════════════════════════════════════════════════════════════════════

  async getActiveDisasters(limit: number = 50): Promise<any[]> {
    const data = await apiRequest<any>(`/disasters/active?limit=${limit}`);
    return data?.disasters ?? (Array.isArray(data) ? data : []);
  }

  async getDisasterDetail(disasterId: string): Promise<any> {
    return apiRequest<any>(`/disasters/${disasterId}`);
  }

  async getDisasterDeployments(disasterId: string): Promise<any[]> {
    const data = await apiRequest<any>(`/disasters/${disasterId}/deployments`);
    return data?.deployments ?? (Array.isArray(data) ? data : []);
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Missions (Sections 5, 7, 8)
  // ═════════════════════════════════════════════════════════════════════

  async getActiveMissions(unitId: string): Promise<any> {
    return apiRequest<any>(`/deployments/unit/${unitId}/active`);
  }

  async getCompletedMissions(unitId: string, limit: number = 20): Promise<any> {
    return apiRequest<any>(`/deployments/unit/${unitId}/completed?limit=${limit}`);
  }

  async getDeploymentDetail(deploymentId: string): Promise<any> {
    return apiRequest<any>(`/deployments/${deploymentId}`);
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Deployment Status Update (Section 6)
  // ═════════════════════════════════════════════════════════════════════

  async updateDeploymentStatus(
    deploymentId: string,
    payload: DeploymentStatusUpdate
  ): Promise<any> {
    return apiRequest<any>(`/deployments/${deploymentId}/update-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Reroute (Section 9)
  // ═════════════════════════════════════════════════════════════════════

  async getRerouteStatus(disasterId: string): Promise<any> {
    return apiRequest<any>(`/reroute/status/${disasterId}`);
  }

  async getAllReroutePlans(): Promise<any[]> {
    const data = await apiRequest<any>('/reroute/plans');
    return Array.isArray(data) ? data : [];
  }

  async submitRerouteOverride(payload: RerouteOverrideRequest): Promise<any> {
    return apiRequest<any>('/reroute/override', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Evacuation (Section 10)
  // ═════════════════════════════════════════════════════════════════════

  async planEvacuation(disasterId: string): Promise<any> {
    return apiRequest<any>('/evacuations/plan', {
      method: 'POST',
      body: JSON.stringify({ disaster_id: disasterId }),
    });
  }

  async approveEvacuation(planId: string, approvedBy: string): Promise<any> {
    return apiRequest<any>(`/evacuations/${planId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    });
  }

  async activateEvacuation(planId: string): Promise<any> {
    return apiRequest<any>(`/evacuations/${planId}/activate`, { method: 'POST' });
  }

  async getEvacuationProgress(planId: string): Promise<any> {
    return apiRequest<any>(`/evacuations/${planId}/progress`);
  }

  async listEvacuationPlans(): Promise<any[]> {
    const data = await apiRequest<any>('/evacuations/');
    return data?.evacuation_plans ?? [];
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERT: Live Map (Section 11)
  // ═════════════════════════════════════════════════════════════════════

  async getLiveMapData(bounds: string): Promise<any> {
    return apiRequest<any>(`/live-map/data?bounds=${bounds}`);
  }

  // ═════════════════════════════════════════════════════════════════════
  // Vehicle Registration (Feature 2, Step 1)
  // ═════════════════════════════════════════════════════════════════════

  async registerVehicle(payload: VehicleRegisterRequest): Promise<any> {
    return apiRequest<any>('/vehicles/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getVehicleStatus(): Promise<any> {
    return apiRequest<any>('/vehicles/status');
  }

  async deregisterVehicle(userId: string): Promise<any> {
    return apiRequest<any>('/vehicles/deregister', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // Alerts stub — alerts come from WS and are in disasterStore
  // ═════════════════════════════════════════════════════════════════════

  async getAlerts(): Promise<any[]> {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Singleton
// ═══════════════════════════════════════════════════════════════════════════

export const disasterService = new DisasterService();
export default disasterService;