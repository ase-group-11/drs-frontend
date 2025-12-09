import mapboxgl from "mapbox-gl";
import { RouteCoordinate, RoutePolygon, MapboxRoute } from "../types/route";

/**
 * Check if a route passes through a disaster zone
 * @param route Route geometry
 * @param disasterCenter Center of disaster zone
 * @param radiusKm Radius in kilometers
 * @returns true if route intersects disaster zone
 */
export function routeIntersectsDisaster(
  route: MapboxRoute,
  disasterCenter: RouteCoordinate,
  radiusKm: number
): boolean {
  const coordinates = route.geometry.coordinates;
  const radiusDegrees = radiusKm / 110.574; // Convert km to rough degrees

  for (const [lon, lat] of coordinates) {
    const distance = Math.sqrt(
      Math.pow(lon - disasterCenter.lon, 2) + Math.pow(lat - disasterCenter.lat, 2)
    );
    if (distance <= radiusDegrees) {
      return true;
    }
  }
  return false;
}

/**
 * Create a circular polygon from center point and radius
 * @param center Center coordinates
 * @param radiusKm Radius in kilometers
 * @returns Polygon feature that can be used to avoid areas
 */
export function createCircularPolygon(
  center: RouteCoordinate,
  radiusKm: number
): RoutePolygon {
  const points = 64;
  const coords: number[][] = [];
  const distanceX =
    radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center.lon + x, center.lat + y]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Add route line to map
 * @param map Mapbox map instance
 * @param route Route data from Mapbox API
 * @param routeId Unique identifier for the route layer
 * @param color Color for the route line
 */
export function addRouteToMap(
  map: mapboxgl.Map,
  route: MapboxRoute,
  routeId: string,
  color: string
): void {
  // Add route source
  if (!map.getSource(routeId)) {
    map.addSource(routeId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      },
    });
  }

  // Add route layer
  if (!map.getLayer(routeId)) {
    map.addLayer({
      id: routeId,
      type: "line",
      source: routeId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": color,
        "line-width": 5,
        "line-opacity": 0.8,
      },
    });
  }
}

/**
 * Add origin and destination markers to map
 * @param map Mapbox map instance
 * @param origin Starting point coordinates
 * @param destination End point coordinates
 */
export function addRouteMarkers(
  map: mapboxgl.Map,
  origin: RouteCoordinate,
  destination: RouteCoordinate
): void {
  // Origin marker (green)
  const originEl = document.createElement("div");
  originEl.style.backgroundColor = "#22c55e";
  originEl.style.width = "20px";
  originEl.style.height = "20px";
  originEl.style.borderRadius = "50%";
  originEl.style.border = "3px solid white";
  originEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

  new mapboxgl.Marker({ element: originEl })
    .setLngLat([origin.lon, origin.lat])
    .setPopup(new mapboxgl.Popup().setHTML("<strong>Point A</strong><br/>Origin"))
    .addTo(map);

  // Destination marker (blue)
  const destEl = document.createElement("div");
  destEl.style.backgroundColor = "#3b82f6";
  destEl.style.width = "20px";
  destEl.style.height = "20px";
  destEl.style.borderRadius = "50%";
  destEl.style.border = "3px solid white";
  destEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

  new mapboxgl.Marker({ element: destEl })
    .setLngLat([destination.lon, destination.lat])
    .setPopup(
      new mapboxgl.Popup().setHTML("<strong>Point B</strong><br/>Destination")
    )
    .addTo(map);
}

/**
 * Add disaster zone visualization to map
 * @param map Mapbox map instance
 * @param polygon Disaster area polygon
 * @param center Center coordinates for disaster marker
 */
export function addDisasterZoneToMap(
  map: mapboxgl.Map,
  polygon: RoutePolygon,
  center: RouteCoordinate
): void {
  // Add disaster zone source
  if (!map.getSource("disaster-zone")) {
    map.addSource("disaster-zone", {
      type: "geojson",
      data: polygon,
    });
  }

  // Add fill layer
  if (!map.getLayer("disaster-zone-fill")) {
    map.addLayer({
      id: "disaster-zone-fill",
      type: "fill",
      source: "disaster-zone",
      paint: {
        "fill-color": "#ef4444",
        "fill-opacity": 0.3,
      },
    });
  }

  // Add outline layer
  if (!map.getLayer("disaster-zone-outline")) {
    map.addLayer({
      id: "disaster-zone-outline",
      type: "line",
      source: "disaster-zone",
      paint: {
        "line-color": "#dc2626",
        "line-width": 2,
      },
    });
  }

  // Add disaster marker
  const disasterEl = document.createElement("div");
  disasterEl.style.backgroundColor = "#dc2626";
  disasterEl.style.width = "30px";
  disasterEl.style.height = "30px";
  disasterEl.style.borderRadius = "50%";
  disasterEl.style.border = "3px solid white";
  disasterEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

  new mapboxgl.Marker({ element: disasterEl })
    .setLngLat([center.lon, center.lat])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        "<strong>Disaster Zone</strong><br/>Flood - Severe"
      )
    )
    .addTo(map);
}
