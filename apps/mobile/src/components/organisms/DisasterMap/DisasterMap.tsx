// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/DisasterMap/DisasterMap.tsx
// FIXED: Layers added after map style loads (no Mapbox errors)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { colors } from '@theme/colors';
import type { Disaster } from '../../../types/disaster';
import Svg, { Path, Circle } from 'react-native-svg';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';
import Geolocation from '@react-native-community/geolocation';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

interface DisasterMapProps {
  disasters: Disaster[];
  loading?: boolean;
  onReport?: () => void;
  selectedFilter?: string;
}

export interface DisasterMapRef {
  flyToDisaster: (disaster: Disaster) => void;
}

const getDisasterIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    fire: '🔥', flood: '🌊', storm: '💨', accident: '🚗',
    earthquake: '🏚️', power: '⚡',
  };
  return icons[type?.toLowerCase()] || '⚠️';
};

const getSeverityColor = (severity: string): string => {
  const c: { [key: string]: string } = {
    critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6',
  };
  return c[severity?.toLowerCase()] || '#6B7280';
};

export const DisasterMap = forwardRef<DisasterMapRef, DisasterMapProps>(({ 
  disasters, 
  loading, 
  onReport,
  selectedFilter = 'all'
}, ref) => {
  const [mapStyle, setMapStyle] = useState('light');
  const [is3D, setIs3D] = useState(true);
  const [zoom, setZoom] = useState(14);
  const [userLocation, setUserLocation] = useState<[number, number]>([-6.2603, 53.3498]);
  const [mapLoaded, setMapLoaded] = useState(false); // ✅ Track map load state
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        console.log('User location:', { latitude, longitude });
        setUserLocation([longitude, latitude]);
      },
      (error) => console.log('Location error:', error),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const validDisasters = disasters.filter(d => {
    const lat = Number(d.location?.latitude);
    const lng = Number(d.location?.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  useImperativeHandle(ref, () => ({
    flyToDisaster: (disaster: Disaster) => {
      const lng = Number(disaster.location.longitude);
      const lat = Number(disaster.location.latitude);
      
      console.log(`Flying to ${disaster.type} at [${lng}, ${lat}]`);
      
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 16,
          pitch: is3D ? 60 : 0,
          animationDuration: 1500,
        });
      }
    }
  }));

  const handleMarkerPress = (disaster: Disaster) => {
    const lng = Number(disaster.location.longitude);
    const lat = Number(disaster.location.latitude);
    
    console.log(`Marker clicked: Zooming to ${disaster.type}`);
    
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: 17,
        pitch: is3D ? 60 : 0,
        animationDuration: 1000,
      });
    }
  };

  const handleCenterMap = () => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 14,
        pitch: is3D ? 60 : 0,
        animationDuration: 1000,
      });
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 1, 20);
    setZoom(newZoom);
    if (cameraRef.current) {
      cameraRef.current.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 1, 10);
    setZoom(newZoom);
    if (cameraRef.current) {
      cameraRef.current.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
    }
  };

  const handle3DToggle = () => {
    const new3D = !is3D;
    setIs3D(new3D);
    if (cameraRef.current) {
      cameraRef.current.setCamera({ pitch: new3D ? 60 : 0, animationDuration: 500 });
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={`mapbox://styles/mapbox/${mapStyle}-v11`}
        logoEnabled={false}
        attributionEnabled={false}
        pitchEnabled={true}
        rotateEnabled={true}
        onDidFinishLoadingMap={() => {
          console.log('Map style loaded');
          setMapLoaded(true); // ✅ Map ready for layers
        }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={userLocation}
          zoomLevel={14}
          pitch={60}
          heading={0}
          animationDuration={0}
        />

        <MapboxGL.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          androidRenderMode="normal"
        />

        {/* ✅ Only add layers after map loads */}
        {mapLoaded && (
          <>
            <MapboxGL.FillExtrusionLayer
              id="building-extrusion"
              sourceID="composite"
              sourceLayerID="building"
              filter={['==', 'extrude', 'true']}
              style={{
                fillExtrusionColor: mapStyle === 'dark' ? '#334155' : '#cbd5e0',
                fillExtrusionHeight: ['get', 'height'],
                fillExtrusionBase: ['get', 'min_height'],
                fillExtrusionOpacity: 0.9,
              }}
            />

            <MapboxGL.FillLayer
              id="water-fill"
              sourceID="composite"
              sourceLayerID="water"
              style={{
                fillColor: mapStyle === 'dark' ? '#1e40af' : '#60a5fa',
                fillOpacity: 0.6,
              }}
            />

            <MapboxGL.FillLayer
              id="park-fill"
              sourceID="composite"
              sourceLayerID="landuse"
              filter={['in', 'class', 'park', 'pitch', 'playground']}
              style={{
                fillColor: mapStyle === 'dark' ? '#166534' : '#86efac',
                fillOpacity: 0.5,
              }}
            />
          </>
        )}

        {validDisasters.map((d) => {
          const icon = getDisasterIcon(d.type);
          const color = getSeverityColor(d.severity);
          const lng = Number(d.location.longitude);
          const lat = Number(d.location.latitude);
          
          return (
            <MapboxGL.MarkerView
              key={d.id}
              id={`marker-${d.id}`}
              coordinate={[lng, lat]}
            >
              <TouchableOpacity 
                style={[styles.marker, { borderColor: color }]}
                onPress={() => handleMarkerPress(d)}
                activeOpacity={0.7}
              >
                <Text style={styles.markerIcon}>{icon}</Text>
              </TouchableOpacity>
            </MapboxGL.MarkerView>
          );
        })}
      </MapboxGL.MapView>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={styles.leftControls}>
        <TouchableOpacity style={styles.btn} onPress={handleCenterMap}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={8} stroke={colors.primary} strokeWidth={2} />
            <Circle cx={12} cy={12} r={3} fill={colors.primary} />
            <Path d="M12 2v4M12 18v4M22 12h-4M6 12H2" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleZoomIn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke="#1F2937" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleZoomOut}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12h14" stroke="#1F2937" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.btn} onPress={() => setMapStyle(prev => prev === 'light' ? 'dark' : 'light')}>
          <Text style={styles.emoji}>{mapStyle === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handle3DToggle}>
          <Text style={styles.btnText}>{is3D ? '2D' : '3D'}</Text>
        </TouchableOpacity>
      </View>

      {onReport && (
        <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
          <Text style={styles.reportText}>⚠️ Report Disaster</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  markerIcon: { fontSize: 32, textAlign: 'center' },
  loading: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
  },
  leftControls: { position: 'absolute', left: 16, bottom: 100, gap: 12 },
  rightControls: { position: 'absolute', top: 16, right: 16, gap: 12 },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  emoji: { fontSize: 20 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  reportBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: colors.error,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reportText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});

export default DisasterMap;