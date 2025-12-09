import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { routeService } from "../../../services/routeService";
import { DEMO_ROUTE } from "../../../data/routeDemoData";
import {
  createCircularPolygon,
  addRouteToMap,
  addRouteMarkers,
  addDisasterZoneToMap,
  routeIntersectsDisaster,
} from "../../../utils/routeUtils";

mapboxgl.accessToken =
  "pk.eyJ1IjoiMTBlIiwiYSI6ImNtaXdheGJwcjByd3ozZXNic25ob3c5NnEifQ.ZKF86WcNLfN1ODSgMc-pcg";

interface TrafficReroutingDemoProps {
  height?: string;
}

export const TrafficReroutingDemo: React.FC<TrafficReroutingDemoProps> = ({
  height = "500px",
}) => {
  const normalMapContainer = useRef<HTMLDivElement>(null);
  const avoidanceMapContainer = useRef<HTMLDivElement>(null);
  const normalMap = useRef<mapboxgl.Map | null>(null);
  const avoidanceMap = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [normalRouteBlocked, setNormalRouteBlocked] = useState<boolean>(false);
  const [avoidanceRouteBlocked, setAvoidanceRouteBlocked] = useState<boolean>(false);

  useEffect(() => {
    if (!normalMapContainer.current || !avoidanceMapContainer.current) return;
    if (normalMap.current || avoidanceMap.current) return;

    // Initialize maps
    normalMap.current = new mapboxgl.Map({
      container: normalMapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [DEMO_ROUTE.mapCenter.lon, DEMO_ROUTE.mapCenter.lat],
      zoom: DEMO_ROUTE.mapZoom,
    });

    avoidanceMap.current = new mapboxgl.Map({
      container: avoidanceMapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [DEMO_ROUTE.mapCenter.lon, DEMO_ROUTE.mapCenter.lat],
      zoom: DEMO_ROUTE.mapZoom,
    });

    // Load routes when both maps are ready
    const mapsLoaded = [false, false];
    const loadRoutesOnBothMaps = async () => {
      if (mapsLoaded[0] && mapsLoaded[1]) {
        try {
          setLoading(true);

          // Create disaster polygon
          const disasterPolygon = createCircularPolygon(
            DEMO_ROUTE.disasterCenter,
            DEMO_ROUTE.disasterRadiusKm
          );

          // Get routes
          const normalRoute = await routeService.getRoute(
            DEMO_ROUTE.origin,
            DEMO_ROUTE.destination
          );

          const avoidanceRoute = await routeService.getRoute(
            DEMO_ROUTE.origin,
            DEMO_ROUTE.destination,
            {
              polygon: disasterPolygon,
              center: DEMO_ROUTE.disasterCenter,
              radiusKm: DEMO_ROUTE.disasterRadiusKm,
            }
          );

          // Check if routes intersect disaster
          const normalBlocked = routeIntersectsDisaster(
            normalRoute,
            DEMO_ROUTE.disasterCenter,
            DEMO_ROUTE.disasterRadiusKm
          );
          const avoidanceBlocked = routeIntersectsDisaster(
            avoidanceRoute,
            DEMO_ROUTE.disasterCenter,
            DEMO_ROUTE.disasterRadiusKm
          );

          setNormalRouteBlocked(normalBlocked);
          setAvoidanceRouteBlocked(avoidanceBlocked);

          // Add to normal map (with disaster zone shown)
          if (normalMap.current) {
            addDisasterZoneToMap(
              normalMap.current,
              disasterPolygon,
              DEMO_ROUTE.disasterCenter
            );
            addRouteToMap(normalMap.current, normalRoute, "normal-route", "#3b82f6");
            addRouteMarkers(
              normalMap.current,
              DEMO_ROUTE.origin,
              DEMO_ROUTE.destination
            );
          }

          // Add to avoidance map
          if (avoidanceMap.current) {
            addDisasterZoneToMap(
              avoidanceMap.current,
              disasterPolygon,
              DEMO_ROUTE.disasterCenter
            );
            addRouteToMap(
              avoidanceMap.current,
              avoidanceRoute,
              "avoidance-route",
              "#22c55e"
            );
            addRouteMarkers(
              avoidanceMap.current,
              DEMO_ROUTE.origin,
              DEMO_ROUTE.destination
            );
          }

          setLoading(false);
        } catch (err) {
          console.error("Error loading routes:", err);
          setError("Failed to load routes. Please check your internet connection.");
          setLoading(false);
        }
      }
    };

    normalMap.current.on("load", () => {
      mapsLoaded[0] = true;
      loadRoutesOnBothMaps();
    });

    avoidanceMap.current.on("load", () => {
      mapsLoaded[1] = true;
      loadRoutesOnBothMaps();
    });

    return () => {
      if (normalMap.current) {
        normalMap.current.remove();
        normalMap.current = null;
      }
      if (avoidanceMap.current) {
        avoidanceMap.current.remove();
        avoidanceMap.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">Traffic Rerouting - Map Integration</h2>
        <p className="text-sm text-gray-700">
          When a disaster blocks the direct route, our system calculates an alternative path.
          <strong> Left:</strong> Normal direct route (blue) passes through disaster zone.
          <strong> Right:</strong> Smart rerouting (green) goes around the affected area.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Normal Route Map */}
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-white px-3 py-2 rounded shadow-md">
            <h3 className="font-bold text-sm">Direct Route</h3>
            <p className="text-xs text-gray-600">Blue route through disaster zone</p>
            {!loading && (
              <div className={`mt-2 px-2 py-1 rounded text-xs font-semibold ${
                normalRouteBlocked
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {normalRouteBlocked ? 'BLOCKED by disaster' : 'Clear route'}
              </div>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded-lg">
              <div className="text-gray-600">Loading routes...</div>
            </div>
          )}
          <div
            ref={normalMapContainer}
            style={{ height }}
            className="rounded-lg shadow-md"
          />
        </div>

        {/* Avoidance Route Map */}
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-white px-3 py-2 rounded shadow-md">
            <h3 className="font-bold text-sm">Alternative Route</h3>
            <p className="text-xs text-gray-600">Green route avoiding disaster</p>
            {!loading && (
              <div className={`mt-2 px-2 py-1 rounded text-xs font-semibold ${
                avoidanceRouteBlocked
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {avoidanceRouteBlocked ? 'BLOCKED by disaster' : 'Safe route'}
              </div>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded-lg">
              <div className="text-gray-600">Loading routes...</div>
            </div>
          )}
          <div
            ref={avoidanceMapContainer}
            style={{ height }}
            className="rounded-lg shadow-md"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2 text-sm">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
            <span>Point A (Origin)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
            <span>Point B (Destination)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-blue-500"></div>
            <span>Direct Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-green-500"></div>
            <span>Alternative Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 border border-red-600"></div>
            <span>Disaster Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>Disaster Location</span>
          </div>
        </div>
      </div>
    </div>
  );
};
