import { Disaster } from "../types/disaster";

export const mockDisasters: Disaster[] = [
  {
    id: 1,
    name: "City Center Flood",
    type: "flood",
    severity: 2,
    lat: 53.3498,
    lon: -6.2603,
    radiusMeters: 500,
  },
  {
    id: 2,
    name: "Warehouse Fire",
    type: "fire",
    severity: 3,
    lat: 53.3448,
    lon: -6.2503,
    radiusMeters: 300,
  },
  {
    id: 3,
    name: "Coastal Storm",
    type: "storm",
    severity: 1,
    lat: 53.3548,
    lon: -6.2703,
    radiusMeters: 800,
  },
];
