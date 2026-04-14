// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/steps/LocationStep.tsx
// IMPROVED: Inline live address search with suggestions (no modal)
//           Type → see results → tap to confirm, just like Google Maps
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, FlatList, Platform, PermissionsAndroid,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import { reportStyles } from '../styles';
import Svg, { Path, Circle } from 'react-native-svg';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

// ─── Types ────────────────────────────────────────────────────────────────
interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}

interface LocationStepProps {
  initialLocation?: Location | null;
  onNext: (location: Location) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1`;
    const res  = await fetch(url);
    const data = await res.json();
    return data?.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
};

const searchAddresses = async (query: string): Promise<Suggestion[]> => {
  if (query.trim().length < 3) return [];
  try {
    // Add "Ireland" if not already present to anchor results
    const anchored = /ireland|dublin|cork|galway|limerick/i.test(query)
      ? query
      : `${query} Ireland`;
    const q = encodeURIComponent(anchored);

    // Run two parallel queries:
    // 1. POI search (landmarks, universities, hospitals etc.)
    // 2. Address search (streets, postcodes)
    const [poiRes, addrRes] = await Promise.all([
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`
        + `?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
        + `&limit=3&country=IE&proximity=-6.2603,53.3498`
        + `&types=poi`
      ),
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`
        + `?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
        + `&limit=4&country=IE&proximity=-6.2603,53.3498`
        + `&types=address,place,locality,neighborhood,postcode`
      ),
    ]);

    const [poiData, addrData] = await Promise.all([poiRes.json(), addrRes.json()]);

    // Merge: POIs first, then addresses, deduplicate by id
    const seen = new Set<string>();
    const merged: Suggestion[] = [];

    for (const f of [...(poiData?.features ?? []), ...(addrData?.features ?? [])]) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        merged.push({ id: f.id, place_name: f.place_name, center: f.center });
      }
    }

    return merged.slice(0, 6);
  } catch {
    return [];
  }
};

// ─── Component ────────────────────────────────────────────────────────────
export const LocationStep: React.FC<LocationStepProps> = ({ initialLocation, onNext }) => {
  const [location, setLocation] = useState<Location>(
    initialLocation ?? {
      latitude:  53.3450,
      longitude: -6.2589,
      address:   'Dublin City Centre, Dublin, Ireland',
    }
  );

  const [gettingLocation, setGettingLocation] = useState(false);

  // Search state
  const [searchText, setSearchText]       = useState('');
  const [suggestions, setSuggestions]     = useState<Suggestion[]>([]);
  const [searching, setSearching]         = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const cameraRef   = useRef<MapboxGL.Camera>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live search with 400ms debounce ──────────────────────────────────
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(text);
      setSuggestions(results);
      setSearching(false);
    }, 400);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const [lon, lat] = suggestion.center;
    const newLoc: Location = {
      latitude:  lat,
      longitude: lon,
      address:   suggestion.place_name,
    };
    setLocation(newLoc);
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    cameraRef.current?.setCamera({
      centerCoordinate: [lon, lat],
      zoomLevel: 16,
      animationDuration: 800,
    });
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Use Current Location ──────────────────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    handleClearSearch();

    const doGet = () => {
      if (!navigator.geolocation) {
        setGettingLocation(false);
        Alert.alert('Location Error', 'Location services are not available on this device.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          const newLoc: Location = {
            latitude:  coords.latitude,
            longitude: coords.longitude,
            address,
          };
          setLocation(newLoc);
          cameraRef.current?.setCamera({
            centerCoordinate: [coords.longitude, coords.latitude],
            zoomLevel: 16,
            animationDuration: 800,
          });
          setGettingLocation(false);
        },
        () => {
          setGettingLocation(false);
          Alert.alert('Location Error', 'Could not get your location. Please search for an address instead.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          doGet();
        } else {
          setGettingLocation(false);
          Alert.alert('Permission Denied', 'Location permission is required to use your current location.');
        }
      } catch {
        setGettingLocation(false);
        doGet();
      }
    } else {
      // iOS triggers the OS prompt automatically on first call
      doGet();
    }
  };

  // ── Map tap → update pin ──────────────────────────────────────────────
  const handleMapPress = async (e: any) => {
    handleClearSearch();
    const [lon, lat] = e.geometry.coordinates;
    const address    = await reverseGeocode(lat, lon);
    setLocation({ latitude: lat, longitude: lon, address });
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={reportStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h2" style={reportStyles.title}>Select Disaster Location</Text>

        {/* ── Live Search Bar ── */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            {/* Search icon */}
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx="11" cy="11" r="8" stroke={colors.textSecondary} strokeWidth="2" />
              <Path d="M21 21l-4.35-4.35" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
            </Svg>

            <TextInput
              style={styles.searchInput}
              placeholder="Search address..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => searchText.length >= 3 && setShowSuggestions(true)}
              returnKeyType="search"
              autoCorrect={false}
            />

            {/* Right: spinner or clear */}
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : searchText.length > 0 ? (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" fill={colors.gray300} />
                  <Path d="M9 9l6 6M15 9l-6 6" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Suggestions dropdown ── */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((s, idx) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.suggestionRow, idx < suggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => handleSelectSuggestion(s)}
                  activeOpacity={0.7}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="10" r="3" stroke={colors.primary} strokeWidth="2" />
                  </Svg>
                  <Text variant="bodyMedium" style={styles.suggestionText} numberOfLines={2}>
                    {s.place_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* No results message */}
          {showSuggestions && !searching && searchText.length >= 3 && suggestions.length === 0 && (
            <View style={styles.noResults}>
              <Text variant="bodySmall" color="textSecondary">No results found — try a different search</Text>
            </View>
          )}
        </View>

        {/* ── Map ── */}
        <View style={reportStyles.mapContainer}>
          <MapboxGL.MapView
            style={reportStyles.map}
            styleURL="mapbox://styles/mapbox/streets-v12"
            logoEnabled={false}
            attributionEnabled={false}
            onPress={handleMapPress}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              centerCoordinate={[location.longitude, location.latitude]}
              zoomLevel={15}
              animationDuration={0}
            />
            <MapboxGL.MarkerView
              id="report-pin"
              coordinate={[location.longitude, location.latitude]}
            >
              <View style={styles.pin}>
                <Svg width={32} height={40} viewBox="0 0 24 30" fill="none">
                  <Path
                    d="M12 0C7.037 0 3 4.037 3 9c0 5.25 7.5 15 9 16.5S21 14.25 21 9c0-4.963-4.037-9-9-9z"
                    fill={colors.error}
                  />
                  <Circle cx="12" cy="9" r="3.5" fill="white" />
                </Svg>
              </View>
            </MapboxGL.MarkerView>
          </MapboxGL.MapView>
          <Text style={styles.mapHint}>Tap map to move pin</Text>
        </View>

        {/* ── Current address display ── */}
        <View style={reportStyles.addressContainer}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
              stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="12" cy="10" r="3" stroke={colors.primary} strokeWidth="2" />
          </Svg>
          <View style={reportStyles.addressText}>
            <Text variant="bodyLarge" color="textPrimary">{location.address}</Text>
            <Text variant="bodySmall" color="success">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
          </View>
        </View>

        {/* ── Use Current Location ── */}
        <TouchableOpacity
          style={reportStyles.actionButton}
          onPress={handleUseCurrentLocation}
          disabled={gettingLocation}
          activeOpacity={0.7}
        >
          {gettingLocation
            ? <ActivityIndicator size="small" color={colors.primary} />
            : (
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="8" stroke={colors.textPrimary} strokeWidth="2" />
                <Circle cx="12" cy="12" r="3" fill={colors.primary} />
                <Path d="M12 2v4M12 18v4M22 12h-4M6 12H2"
                  stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" />
              </Svg>
            )
          }
          <Text variant="bodyLarge" style={reportStyles.actionButtonText}>
            {gettingLocation ? 'Getting location...' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>

        {/* ── Next ── */}
        <Button
          title="Next: Select Type →"
          variant="primary"
          size="large"
          fullWidth
          onPress={() => onNext(location)}
          style={reportStyles.nextButton}
        />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = {
  searchWrapper: {
    position: 'relative' as const,
    zIndex: 10,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginTop: 4,
    ...shadows.md,
    overflow: 'hidden' as const,
  },
  suggestionRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  suggestionText: {
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  noResults: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginTop: 4,
    alignItems: 'center' as const,
  },
  pin: { alignItems: 'center' as const },
  mapHint: {
    position: 'absolute' as const,
    bottom: 8,
    alignSelf: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
};

export default LocationStep;