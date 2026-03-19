// NEW FILE

export type TeamType = 'Fire' | 'Ambulance' | 'Police' | 'Rescue';

export type TeamStatusType =
  | 'deployed'
  | 'available'
  | 'onscene'
  | 'maintenance'
  | 'enroute';

export type TeamStatus =
  | 'Deployed'
  | 'Available'
  | 'On Scene'
  | 'Maintenance'
  | 'En Route';

// Matches the real API response shape from GET /api/v1/emergency-units/
export interface EmergencyTeam {
  id: string;
  unitId: string;       // mapped from unit_code
  unitName: string;     // mapped from unit_name
  type: TeamType;       // mapped from unit_type + department
  department: string;   // raw department from API (FIRE, POLICE, MEDICAL, etc.)
  station: string;      // mapped from station_name
  status: TeamStatus;
  statusType: TeamStatusType;
  crewSize: string;     // formatted as "crew_count/capacity"
  crewMax: number;      // capacity
  crewCount: number;    // crew_count
  location: string;     // station_name used as location
  eta?: string;
  commanderName?: string | null;
  totalDeployments?: number;
}

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  status: string;
}

export interface EditCrewMember {
  id: string;
  name: string;
  role: string;
  contact: string;
}

export interface CreateTeamPayload {
  teamName: string;
  teamType: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone?: string;
  numberOfMembers?: number;
  location: string;
  contactNumber?: string;
  crewMembers: { name: string; email: string }[];
}

export interface DeployUnitPayload {
  unitId: string;
  disasterId: string;
  priority: 'standard' | 'emergency' | 'code-red';
  notes?: string;
}

export interface ActiveDisaster {
  id: string;
  reportId: string;
  type: 'fire' | 'flood' | 'accident' | 'storm';
  typeIcon: string;
  location: string;
  severity: 'critical' | 'high' | 'medium';
  distance: number;
  eta: number;
  currentUnits: number;
  status: string;
  description: string;
  timeReported: string;
  reporter: string;
}

export interface TeamFilters {
  type?: string;
  search?: string;
}

// API response wrapper from GET /api/v1/emergency-units/
export interface EmergencyUnitsApiResponse {
  units: EmergencyUnitRaw[];
  total_count: number;
  active_count: number;
  deployed_count: number;
  by_department: Record<string, number>;
}

// Raw shape directly from the API
export interface EmergencyUnitRaw {
  id: string;
  unit_code: string;
  unit_name: string;
  unit_type: string;
  department: string;
  unit_status: string;
  station_name: string;
  crew_count: number;
  capacity: number;
  commander_name: string | null;
  total_deployments: number;
  avg_response_time: number | null;
  success_rate: number | null;
}

export interface CrewMember {
  id: string;
  name: string;
  rank: string;
  status: string;
}

export interface EditCrewMember {
  id: string;
  name: string;
  role: string;
  contact: string;
}

export interface CreateTeamPayload {
  teamName: string;
  teamType: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone?: string;
  numberOfMembers?: number;
  location: string;
  contactNumber?: string;
  crewMembers: { name: string; email: string }[];
}

export interface DeployUnitPayload {
  unitId: string;
  disasterId: string;
  priority: 'standard' | 'emergency' | 'code-red';
  notes?: string;
}

export interface ActiveDisaster {
  id: string;
  reportId: string;
  type: 'fire' | 'flood' | 'accident' | 'storm';
  typeIcon: string;
  location: string;
  severity: 'critical' | 'high' | 'medium';
  distance: number;
  eta: number;
  currentUnits: number;
  status: string;
  description: string;
  timeReported: string;
  reporter: string;
}

export interface TeamFilters {
  type?: string;
  search?: string;
}