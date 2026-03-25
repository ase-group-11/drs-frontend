
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { reportStyles } from '../styles';

const DISASTER_TYPES = [
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'flood', emoji: '🌊', label: 'Flood' },
  { id: 'storm', emoji: '💨', label: 'Storm' },
  { id: 'accident', emoji: '🚧', label: 'Accident' },
  { id: 'power', emoji: '⚡', label: 'Power Outage' },
  { id: 'building', emoji: '🏗️', label: 'Building' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', description: 'Minor incident', color: colors.primary },
  { id: 'medium', label: 'Medium', description: 'Significant impact', color: colors.warning },
  { id: 'high', label: 'High', description: 'Serious situation', color: colors.coral },
  { id: 'critical', label: 'Critical', description: 'Life-threatening', color: colors.error },
];

interface TypeStepProps {
  location: any;
  initialType?: string | null;
  initialSeverity?: string | null;
  onNext: (type: string, severity: string) => void;
}

export const TypeStep: React.FC<TypeStepProps> = ({
  location,
  initialType,
  initialSeverity,
  onNext,
}) => {
  const [selectedType, setSelectedType] = useState(initialType || 'fire');
  const [selectedSeverity, setSelectedSeverity] = useState(initialSeverity || 'medium');

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>
      {/* Disaster Type */}
      <Text variant="h2" style={reportStyles.sectionTitle}>
        What type of disaster?
      </Text>

      <View style={reportStyles.typeGrid}>
        {DISASTER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              reportStyles.typeCard,
              selectedType === type.id && reportStyles.typeCardSelected,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Text style={reportStyles.typeEmoji}>{type.emoji}</Text>
            <Text variant="bodyLarge" weight="semibold">
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <Text variant="h2" style={[reportStyles.sectionTitle, { marginTop: 24 }]}>
        How severe is it?
      </Text>

      <View style={reportStyles.severityList}>
        {SEVERITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              reportStyles.severityCard,
              { borderColor: level.color },
              selectedSeverity === level.id && {
                backgroundColor: level.color + '20',
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedSeverity(level.id)}
          >
            {selectedSeverity === level.id && (
              <View style={[reportStyles.severityDot, { backgroundColor: level.color }]} />
            )}
            <View>
              <Text variant="bodyLarge" weight="bold">
                {level.label}
              </Text>
              <Text variant="bodyMedium" color="textSecondary">
                {level.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next Button */}
      <Button
        title="Next: Add Details →"
        variant="primary"
        size="large"
        fullWidth
        onPress={() => onNext(selectedType, selectedSeverity)}
        style={reportStyles.nextButton}
      />
    </ScrollView>
  );
};