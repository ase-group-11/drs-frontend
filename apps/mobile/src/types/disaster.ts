export type DisasterType =
  | 'flood' | 'fire' | 'earthquake' | 'hurricane'
  | 'tornado' | 'tsunami' | 'drought' | 'heatwave'
  | 'coldwave' | 'storm' | 'other';

export type DisasterSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ReportStatus = 'in_progress' | 'evaluating' | 'resolved';

export interface Disaster {
  id: string;
  type: DisasterType;
  severity: DisasterSeverity;
  title: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description?: string;
  reportedAt: Date;
  status?: ReportStatus;
  unitsResponding?: number;
}

export interface Alert {
  id: string;
  type: 'evacuation' | 'warning' | 'advisory';
  severity: DisasterSeverity;
  title: string;
  disasterType: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  distance: string;
  message: string;
  issuedAt: Date;
  isRead: boolean;
}

export interface SavedLocation {
  id: string;
  name: string;
  emoji: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  alertCount: number;
}

export interface Report extends Disaster {
  reportNumber: string;
  status: ReportStatus;
  reportedBy: string;
}

export interface DisasterFilter {
  id: string;
  label: string;
  icon: string;
  type?: DisasterType;
}