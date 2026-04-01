// NEW FILE

export type TeamType = 'Fire' | 'Ambulance' | 'Police' | 'Rescue';

export type TeamStatusType =
  | 'deployed'
  | 'available'
  | 'onscene'
  | 'maintenance'
  | 'enroute'
  | 'returning'
  | 'offline';

export type TeamStatus =
  | 'Deployed'
  | 'Available'
  | 'On Scene'
  | 'Maintenance'
  | 'En Route'
  | 'Returning'
  | 'Offline';

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
  priority: 'STANDARD' | 'HIGH_PRIORITY' | 'CRITICAL';
  notes?: string;
}

export interface ActiveDisaster {
  id: string;
  tracking_id: string;
  type: string;
  severity: string;
  disaster_status: string;
  description: string;
  location: { lat: number; lon: number };
  location_address: string;
  people_affected: number;
  units_assigned: number;
  report_count: number;
  created_at: string;
  time_ago: string;
}

export interface TeamFilters {
  type?: string;
  search?: string;
}

// Detailed unit response from GET /api/v1/emergency-units/{id}
export interface EmergencyUnitDetail {
  id: string;
  unit_code: string;
  unit_name: string;
  description: string | null;
  unit_type: string;
  department: string;
  unit_status: string;
  station: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  };
  vehicle: {
    model: string;
    license_plate: string;
    year: number;
    equipment: { item: string; present: boolean }[];
  } | null;
  stats: {
    crew_count: number;
    capacity: number;
    total_deployments: number;
    avg_response_time: string | null;
    avg_response_time_seconds: number | null;
    success_rate: number | null;
    last_deployed_at: string | null;
  };
  commander: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  crew_roster: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
  }[];
  current_assignment: {
    deployment_id: string;
    disaster_tracking_id: string;
    disaster_type: string;
    location: string;
    deployment_status: string;
    dispatched_at: string;
  } | null;
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
  station_address: string | null;
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
  priority: 'STANDARD' | 'HIGH_PRIORITY' | 'CRITICAL';
  notes?: string;
}



export interface TeamFilters {
  type?: string;
  search?: string;
}