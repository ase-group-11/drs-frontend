
import React, { useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { MapPin, Edit } from 'lucide-react-native';
import { reportStyles } from '../styles';
import Svg, { Path, Circle } from 'react-native-svg';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';

// MapboxGL.setAccessToken('');

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
  const [location, setLocation] = useState(
    initialLocation || {
      latitude: 53.3450,
      longitude: -6.2589,
      address: "123 O'Connell Street, Dublin 1, Ireland",
    }
  );
  const [accuracy] = useState('20m');
  const mapRef = useRef<MapView>(null);

  const handleUseCurrentLocation = async () => {
    console.log('Getting current location...');
  };

  const handleManualAddress = () => {
    console.log('Manual address entry');
  };

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>
      <Text variant="h2" style={reportStyles.title}>
        Select Disaster Location
      </Text>

      {/* Map */}
      <View style={reportStyles.mapContainer}>
        <MapView
          ref={mapRef}
          style={reportStyles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor={colors.primary}
          />
        </MapView>

        {/* Zoom Controls */}
        <View style={reportStyles.mapControls}>
          <TouchableOpacity style={reportStyles.mapButton}>
            <Text style={reportStyles.mapButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={reportStyles.mapButton}>
            <Text style={reportStyles.mapButtonText}>−</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Display */}
      <View style={reportStyles.addressContainer}>
        <MapPin size={20} color={colors.primary} />
        <View style={reportStyles.addressText}>
          <Text variant="bodyLarge" weight="semibold">
            {location.address}
          </Text>
          <Text variant="bodySmall" color="success">
            Accurate to {accuracy}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={reportStyles.actionButton}
        onPress={handleUseCurrentLocation}
      >
        <MapPin size={20} color={colors.textPrimary} />
        <Text variant="bodyLarge" style={reportStyles.actionButtonText}>
          Use Current Location
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[reportStyles.actionButton, reportStyles.actionButtonOutline]}
        onPress={handleManualAddress}
      >
        <Edit size={20} color={colors.textPrimary} />
        <Text variant="bodyLarge" style={reportStyles.actionButtonText}>
          Enter Address Manually
        </Text>
      </TouchableOpacity>

      {/* Next Button */}
      <Button
        title="Next: Select Type →"
        variant="primary"
        size="large"
        fullWidth
        onPress={() => onNext(location)}
        style={reportStyles.nextButton}
      />
    </ScrollView>
  );
};