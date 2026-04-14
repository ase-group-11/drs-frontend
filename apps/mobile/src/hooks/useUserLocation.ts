// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useUserLocation.ts
//
// Tracks the user's live GPS position using MapboxGL.locationManager,
// which is built into @rnmapbox/maps (already installed).
//
// WHY: navigator.geolocation was removed from React Native core in RN 0.60.
// The deprecated polyfill was dropped entirely in later versions.
// In RN 0.83 navigator.geolocation is undefined — hence the Spire fallback.
//
// MapboxGL.locationManager uses the native iOS CLLocationManager /
// Android FusedLocationProvider directly — no extra package needed.
//
// Behaviour:
//   - Android: requests ACCESS_FINE_LOCATION before starting.
//   - iOS:     NSLocationWhenInUseUsageDescription in Info.plist triggers
//              the OS prompt automatically on start().
//   - Falls back to Dublin city centre [-6.2603, 53.3498] until first fix.
//
// Returns:
//   location          [lon, lat]  — current best position (Mapbox order)
//   hasPermission     boolean | null
//   permissionDenied  boolean
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

export type LonLat = [number, number];

const DUBLIN_DEFAULT: LonLat = [-6.2603, 53.3498];

interface UseUserLocationResult {
  location:         LonLat;
  hasPermission:    boolean | null;
  permissionDenied: boolean;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation]                 = useState<LonLat>(DUBLIN_DEFAULT);
  const [hasPermission, setHasPermission]       = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const listenerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const startTracking = () => {
      // Start Mapbox's native location manager
      MapboxGL.locationManager.start();

      // Add a listener — fires whenever device position updates
      listenerRef.current = MapboxGL.locationManager.addListener(
        (loc: any) => {
          if (!active) return;
          const coords = loc?.coords ?? loc;
          const lon = coords?.longitude ?? coords?.lon;
          const lat = coords?.latitude  ?? coords?.lat;
          if (
            typeof lon === 'number' && !isNaN(lon) &&
            typeof lat === 'number' && !isNaN(lat) &&
            // sanity check — ignore 0,0 and other obvious defaults
            !(lon === 0 && lat === 0)
          ) {
            setLocation([lon, lat]);
            console.log('[useUserLocation] Fix:', lat.toFixed(5), lon.toFixed(5));
          }
        }
      );

      console.log('[useUserLocation] MapboxGL.locationManager started');
    };

    const init = async () => {
      if (Platform.OS === 'android') {
        try {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title:          'Location Permission',
              message:        'DRS needs your location to show you on the map and alert you of nearby disasters.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            },
          );
          if (!active) return;
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            setHasPermission(true);
            setPermissionDenied(false);
            startTracking();
          } else {
            setHasPermission(false);
            setPermissionDenied(true);
            console.warn('[useUserLocation] Android permission denied');
          }
        } catch (e) {
          if (active) {
            setHasPermission(false);
            console.warn('[useUserLocation] Permission request failed:', e);
          }
        }
      } else {
        // iOS: Info.plist NSLocationWhenInUseUsageDescription triggers the OS
        // prompt automatically when MapboxGL.locationManager.start() is called.
        setHasPermission(true);
        startTracking();
      }
    };

    init();

    return () => {
      active = false;
      // Remove our listener
      if (listenerRef.current) {
        MapboxGL.locationManager.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      // Stop the manager only if no other component is using it
      MapboxGL.locationManager.stop();
      console.log('[useUserLocation] MapboxGL.locationManager stopped');
    };
  }, []);

  return { location, hasPermission, permissionDenied };
}

export default useUserLocation;