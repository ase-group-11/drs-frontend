// File: src/components/organisms/DisasterReports/MapView.tsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DisasterReport } from '../../../types';
import './MapView.css';

// Set your Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface MapViewProps {
  reports: DisasterReport[];
}

const MapView: React.FC<MapViewProps> = ({ reports }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [pitch, setPitch] = useState(60); // 3D tilt angle
  const [bearing, setBearing] = useState(0); // Rotation angle

  // Initialize map
  useEffect(() => {
    // Check if token is available
    if (!mapboxgl.accessToken) {
      setMapError('Mapbox token is not configured. Please add REACT_APP_MAPBOX_TOKEN to your .env file.');
      return;
    }

    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    try {
      // Initialize map with 3D settings
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-6.2603, 53.3498], // Dublin, Ireland - default center
        zoom: 15,
        pitch: 60, // Tilt for 3D effect (0-85 degrees)
        bearing: 0, // Rotation (0-360 degrees)
        antialias: true, // Better rendering quality
      });

      // Wait for map to load
      map.current.on('load', () => {
        if (!map.current) return;

        // Add 3D terrain
        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.terrain-rgb',
          tileSize: 512,
          maxzoom: 14,
        });

        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        // Add sky layer for better 3D atmosphere
        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });

        // Add 3D buildings layer
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.current.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, '#e0e0e0',
                50, '#c0c0c0',
                100, '#a0a0a0',
                200, '#808080',
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height'],
              ],
              'fill-extrusion-opacity': 0.8,
            },
          },
          labelLayerId
        );

        setMapLoaded(true);
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Track pitch and bearing changes
      map.current.on('pitch', () => {
        if (map.current) {
          setPitch(map.current.getPitch());
        }
      });

      map.current.on('rotate', () => {
        if (map.current) {
          setBearing(map.current.getBearing());
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    // Cleanup on unmount
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers when map is loaded and reports change
  useEffect(() => {
    if (!mapLoaded || !map.current || !reports.length) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add markers for each report
    reports.forEach((report) => {
      if (!map.current) return;

      // Random coordinates around Dublin
      const lng = -6.2603 + (Math.random() - 0.5) * 0.05;
      const lat = 53.3498 + (Math.random() - 0.5) * 0.05;

      // Create marker color based on severity
      const markerColor = 
        report.severity === 'critical' ? '#ef4444' :
        report.severity === 'high' ? '#f97316' :
        report.severity === 'medium' ? '#eab308' :
        '#10b981';

      // Create custom 3D-style marker element
      const el = document.createElement('div');
      el.className = 'custom-marker-3d';
      el.innerHTML = `
        <div class="marker-pin" style="background-color: ${markerColor}"></div>
        <div class="marker-pulse" style="background-color: ${markerColor}"></div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 35 }).setHTML(`
        <div class="map-popup">
          <div class="popup-header">
            <strong>${report.title}</strong>
            <span class="popup-severity" style="background-color: ${markerColor}">
              ${report.severity.toUpperCase()}
            </span>
          </div>
          <div class="popup-content">
            <p><strong>Type:</strong> ${report.type}</p>
            <p><strong>ID:</strong> ${report.reportId}</p>
            <p><strong>Location:</strong> ${report.location}</p>
            <p><strong>Zone:</strong> ${report.zone}</p>
            <p><strong>Time:</strong> ${report.time}</p>
            <p><strong>Units Assigned:</strong> ${report.units}</p>
            <p class="popup-description">${report.description}</p>
          </div>
        </div>
      `);

      // Create and add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      markers.current.push(marker);
    });

    // Fit map to show all markers
    if (markers.current.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.current.forEach(marker => {
        const lngLat = marker.getLngLat();
        bounds.extend(lngLat);
      });
      map.current.fitBounds(bounds, { padding: 100, pitch: 60 });
    }
  }, [mapLoaded, reports]);

  // Toggle 3D buildings
  const toggle3D = () => {
    if (!map.current) return;
    
    if (is3DEnabled) {
      // Disable 3D
      map.current.setPitch(0);
      if (map.current.getLayer('3d-buildings')) {
        map.current.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
    } else {
      // Enable 3D
      map.current.setPitch(60);
      if (map.current.getLayer('3d-buildings')) {
        map.current.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      }
    }
    setIs3DEnabled(!is3DEnabled);
  };

  // Reset view to default
  const resetView = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [-6.2603, 53.3498],
      zoom: 15,
      pitch: 60,
      bearing: 0,
      duration: 2000,
    });
  };

  // Rotate view
  const rotateView = () => {
    if (!map.current) return;
    map.current.rotateTo((bearing + 90) % 360, { duration: 1000 });
  };

  if (mapError) {
    return (
      <div className="map-error">
        <p>{mapError}</p>
        <p>Get your token from: <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer">mapbox.com</a></p>
      </div>
    );
  }

  return (
    <div className="map-view-container">
      <div ref={mapContainer} className="map-container" />
      
      {!mapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading 3D map...</p>
        </div>
      )}

      {/* 3D Controls */}
      <div className="map-controls-3d">
        <button 
          className={`control-btn ${is3DEnabled ? 'active' : ''}`}
          onClick={toggle3D}
          title={is3DEnabled ? 'Disable 3D' : 'Enable 3D'}
        >
          <span className="control-icon">🏢</span>
          <span className="control-label">{is3DEnabled ? '3D On' : '3D Off'}</span>
        </button>
        <button 
          className="control-btn"
          onClick={rotateView}
          title="Rotate View"
        >
          <span className="control-icon">🔄</span>
          <span className="control-label">Rotate</span>
        </button>
        <button 
          className="control-btn"
          onClick={resetView}
          title="Reset View"
        >
          <span className="control-icon">🎯</span>
          <span className="control-label">Reset</span>
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Severity</div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
          Critical
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f97316' }}></span>
          High
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#eab308' }}></span>
          Medium
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
          Low
        </div>
      </div>

      {/* 3D Info Badge */}
      {is3DEnabled && (
        <div className="map-3d-badge">
          <span>🏔️ 3D Terrain Active</span>
          <span className="badge-details">Pitch: {Math.round(pitch)}° | Bearing: {Math.round(bearing)}°</span>
        </div>
      )}
    </div>
  );
};

export default MapView;