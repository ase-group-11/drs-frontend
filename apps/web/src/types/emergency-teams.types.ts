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

export interface EmergencyTeam {
  id: string;
  unitId: string;
  type: TeamType;
  station: string;
  status: TeamStatus;
  statusType: TeamStatusType;
  crewSize: string;
  crewMax: number;
  location: string;
  eta?: string;
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
