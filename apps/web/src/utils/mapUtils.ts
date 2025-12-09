import { CirclePolygon } from "../types/disaster";

/**
 * Create a circle polygon from center point and radius
 */
export function createCirclePolygon(
  lon: number,
  lat: number,
  radiusMeters: number,
  numberOfPoints: number = 64
): CirclePolygon {
  const points: number[][] = [];
  const earthRadius = 6371000; // meters

  for (let i = 0; i <= numberOfPoints; i++) {
    const angle = (i * 360) / numberOfPoints;
    const angleRad = (angle * Math.PI) / 180;

    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const angularDistance = radiusMeters / earthRadius;

    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(angleRad)
    );

    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(angleRad) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
      );

    const newLat = (newLatRad * 180) / Math.PI;
    const newLon = (newLonRad * 180) / Math.PI;

    points.push([newLon, newLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [points],
    },
  };
}

/**
 * Get color based on disaster type
 */
export function getDisasterColor(
  type: string
): string {
  const colors: Record<string, string> = {
    flood: "#3b82f6", // blue
    fire: "#ef4444", // red
    storm: "#8b5cf6", // purple
    gas_leak: "#f59e0b", // amber
    earthquake: "#dc2626", // dark red
  };
  return colors[type] || "#6b7280"; // default gray
}
