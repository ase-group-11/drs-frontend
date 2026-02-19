// NEW FILE

export type ZoneType = 'response' | 'evacuation' | 'restricted';
export type ZoneStatus = 'active' | 'inactive' | 'emergency';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  area: number;
  population: number;
  units: number;
  incidents: number;
  avgResponseTime: string;
}

export interface CreateZonePayload {
  name: string;
  type: ZoneType;
  description?: string;
  area?: number;
  assignedUnitIds?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateZonePayload {
  name?: string;
  type?: ZoneType;
  status?: ZoneStatus;
  area?: number;
  units?: number;
}

export interface ZoneFilters {
  type?: ZoneType | 'all';
  search?: string;
}
