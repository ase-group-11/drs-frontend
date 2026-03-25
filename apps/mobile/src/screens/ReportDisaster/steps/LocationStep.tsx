
import React, { useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { MapPin, Edit } from 'lucide-react-native';
import { reportStyles } from '../styles';

interface LocationStepProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  onNext: (location: any) => void;
}

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