import { RouteCoordinate } from "../types/route";

/**
 * Demo route coordinates for Dublin area
 * Disaster is positioned directly in the path between origin and destination
 */
export const DEMO_ROUTE = {
  origin: { lon: -6.2603, lat: 53.3498 } as RouteCoordinate, // Trinity College
  destination: { lon: -6.3297, lat: 53.3558 } as RouteCoordinate, // Phoenix Park
  disasterCenter: { lon: -6.295, lat: 53.3528 } as RouteCoordinate, // Directly in the middle of route
  disasterRadiusKm: 0.8, // Larger radius to force route around
  mapCenter: { lon: -6.295, lat: 53.3528 } as RouteCoordinate,
  mapZoom: 12.5,
} as const;
