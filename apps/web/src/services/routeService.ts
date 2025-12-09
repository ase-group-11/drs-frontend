import mapboxgl from "mapbox-gl";
import { MapboxRoute, RouteCoordinate, RoutePolygon } from "../types/route";

/**
 * Calculate waypoints to route around a disaster area
 * @param origin Starting point
 * @param destination End point
 * @param disasterCenter Center of disaster zone
 * @param radiusKm Radius of disaster zone in kilometers
 */
function calculateAvoidanceWaypoints(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  disasterCenter: RouteCoordinate,
  radiusKm: number
): RouteCoordinate[] {
  // Calculate perpendicular offset to go around the disaster
  const midLon = (origin.lon + destination.lon) / 2;
  const midLat = (origin.lat + destination.lat) / 2;

  // Determine which side to route around based on disaster position
  const offsetDistance = radiusKm * 3.5; // Increased for more visible detour

  // Calculate perpendicular direction
  const dx = destination.lon - origin.lon;
  const dy = destination.lat - origin.lat;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize and rotate 90 degrees
  const perpLon = -dy / length;
  const perpLat = dx / length;

  // Determine which side the disaster is on
  const disasterToMid = {
    lon: midLon - disasterCenter.lon,
    lat: midLat - disasterCenter.lat,
  };

  const dotProduct = disasterToMid.lon * perpLon + disasterToMid.lat * perpLat;

  // Route to the opposite side of the disaster (prefer north/south detour)
  const sign = dotProduct > 0 ? -1 : 1;

  // Convert km offset to degrees (rough approximation)
  const lonOffset = (sign * perpLon * offsetDistance) / 111.32;
  const latOffset = (sign * perpLat * offsetDistance) / 110.574;

  // Create a single waypoint that goes around the disaster
  // Position it at the midpoint with maximum offset
  const waypoint: RouteCoordinate = {
    lon: midLon + lonOffset,
    lat: midLat + latOffset,
  };

  return [waypoint];
}

/**
 * Service for handling Mapbox routing API calls
 */
export const routeService = {
  /**
   * Get route from Mapbox Directions API
   * @param origin Starting point coordinates
   * @param destination End point coordinates
   * @param disasterArea Optional disaster area to route around
   */
  async getRoute(
    origin: RouteCoordinate,
    destination: RouteCoordinate,
    disasterArea?: { polygon: RoutePolygon; center: RouteCoordinate; radiusKm: number }
  ): Promise<MapboxRoute> {
    let waypoints: RouteCoordinate[] = [];

    if (disasterArea) {
      // Calculate waypoints to go around the disaster
      waypoints = calculateAvoidanceWaypoints(
        origin,
        destination,
        disasterArea.center,
        disasterArea.radiusKm
      );
    }

    // Build coordinate string for API
    const allPoints = [origin, ...waypoints, destination];
    const coordString = allPoints
      .map((point) => `${point.lon},${point.lat}`)
      .join(";");

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mapbox API Error:", response.status, errorText);
      throw new Error(`Failed to fetch route: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    return data.routes[0];
  },
};
