import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Disaster } from "../../../types/disaster";
import { disasterService } from "../../../services/disasterService";
import { createCirclePolygon, getDisasterColor } from "../../../utils/mapUtils";

// Mapbox access token
mapboxgl.accessToken =
  "pk.eyJ1IjoiMTBlIiwiYSI6ImNtaXdheGJwcjByd3ozZXNic25ob3c5NnEifQ.ZKF86WcNLfN1ODSgMc-pcg";

interface DisasterMapProps {
  height?: string;
  width?: string;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  height = "500px",
  width = "100%",
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-6.2603, 53.3498], // Dublin center
      zoom: 12,
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch disasters from service
  useEffect(() => {
    const fetchDisasters = async () => {
      setLoading(true);
      try {
        const data = await disasterService.getDisasters();
        setDisasters(data);
      } catch (error) {
        console.error("Error loading disasters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisasters();
  }, []);

  // Add disaster markers and impact areas to map
  useEffect(() => {
    if (!map.current || disasters.length === 0) return;

    const addDisastersToMap = () => {
      if (!map.current) return;

      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      disasters.forEach((disaster) => {
        if (!map.current) return;

        // Create circle polygon for impact area
        const circlePolygon = createCirclePolygon(
          disaster.lon,
          disaster.lat,
          disaster.radiusMeters,
          64
        );

        const sourceId = `disaster-area-${disaster.id}`;
        const layerId = `disaster-fill-${disaster.id}`;

        // Add source for this disaster's impact area
        if (!map.current.getSource(sourceId)) {
          map.current.addSource(sourceId, {
            type: "geojson",
            data: circlePolygon as any,
          });
        }

        // Add fill layer for impact area
        if (!map.current.getLayer(layerId)) {
          map.current.addLayer({
            id: layerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": getDisasterColor(disaster.type),
              "fill-opacity": 0.25,
            },
          });

          // Add outline for the area
          map.current.addLayer({
            id: `${layerId}-outline`,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": getDisasterColor(disaster.type),
              "line-width": 2,
              "line-opacity": 0.6,
            },
          });
        }

        // Create marker element
        const markerEl = document.createElement("div");
        markerEl.style.width = "30px";
        markerEl.style.height = "30px";
        markerEl.style.borderRadius = "50%";
        markerEl.style.backgroundColor = getDisasterColor(disaster.type);
        markerEl.style.border = "3px solid white";
        markerEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        markerEl.style.cursor = "pointer";

        // Create popup with disaster info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${disaster.name}</h3>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Type:</strong> ${disaster.type}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Severity:</strong> ${disaster.severity}/3</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Impact Radius:</strong> ${disaster.radiusMeters}m</p>
            </div>
          `
        );

        // Add marker to map
        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([disaster.lon, disaster.lat])
          .setPopup(popup)
          .addTo(map.current);

        markers.current.push(marker);
      });
    };

    // Wait for map to load before adding disasters
    if (map.current.loaded()) {
      addDisastersToMap();
    } else {
      map.current.on("load", addDisastersToMap);
    }

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [disasters]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded-lg">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}
      <div
        ref={mapContainer}
        style={{
          width,
          height,
        }}
        className="rounded-lg shadow-md"
      />
    </div>
  );
};
