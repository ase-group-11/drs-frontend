// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/steps/TypeStep.tsx
// FIXED: @/components/atoms → @atoms, removed lucide-react-native
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import { reportStyles } from '../styles';
import Svg, { Path } from 'react-native-svg';

const DISASTER_TYPES = [
  { id: 'flood',      emoji: '🌊', label: 'Flood' },
  { id: 'fire',       emoji: '🔥', label: 'Fire' },
  { id: 'earthquake', emoji: '🏚️', label: 'Earthquake' },
  { id: 'hurricane',  emoji: '🌀', label: 'Hurricane' },
  { id: 'tornado',    emoji: '🌪️', label: 'Tornado' },
  { id: 'tsunami',    emoji: '🌊', label: 'Tsunami' },
  { id: 'drought',    emoji: '☀️', label: 'Drought' },
  { id: 'heatwave',   emoji: '🌡️', label: 'Heatwave' },
  { id: 'coldwave',   emoji: '🥶', label: 'Coldwave' },
  { id: 'storm',      emoji: '⛈️', label: 'Storm' },
  { id: 'other',      emoji: '⚠️', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { id: 'low',      label: 'Low',      description: 'Minor incident',     color: colors.primary },
  { id: 'medium',   label: 'Medium',   description: 'Significant impact', color: colors.warning },
  { id: 'high',     label: 'High',     description: 'Serious situation',  color: colors.coral },
  { id: 'critical', label: 'Critical', description: 'Life-threatening',   color: colors.error },
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
  const [selectedType, setSelectedType]         = useState(initialType || 'other');
  const [selectedSeverity, setSelectedSeverity] = useState(initialSeverity || 'medium');
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  const selectedTypeObj = DISASTER_TYPES.find(t => t.id === selectedType) ?? DISASTER_TYPES[DISASTER_TYPES.length - 1];

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>

      {/* Disaster Type — dropdown */}
      <Text variant="h2" style={reportStyles.sectionTitle}>
        What type of disaster?
      </Text>

      <TouchableOpacity
        style={typeDropdownStyles.trigger}
        onPress={() => setTypePickerVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 28, lineHeight: 36 }}>{selectedTypeObj.emoji}</Text>
        <Text variant="bodyLarge" style={{ flex: 1, marginLeft: spacing.md, color: colors.textPrimary, fontWeight: '600' }}>
          {selectedTypeObj.label}
        </Text>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9l6 6 6-6" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      {/* Severity */}
      <Text variant="h2" style={[reportStyles.sectionTitle, { marginTop: spacing.xl }]}>
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
            activeOpacity={0.7}
          >
            {selectedSeverity === level.id && (
              <View style={[reportStyles.severityDot, { backgroundColor: level.color }]} />
            )}
            <View>
              <Text variant="bodyLarge">{level.label}</Text>
              <Text variant="bodyMedium" color="textSecondary">{level.description}</Text>
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

      {/* Type Picker Modal */}
      <Modal
        visible={typePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          style={typeDropdownStyles.overlay}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={typeDropdownStyles.sheet}>
            <View style={typeDropdownStyles.sheetHandle} />
            <Text variant="h4" style={{ marginBottom: spacing.md, paddingHorizontal: spacing.lg }}>
              Select Disaster Type
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DISASTER_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    typeDropdownStyles.option,
                    selectedType === type.id && typeDropdownStyles.optionSelected,
                  ]}
                  onPress={() => {
                    setSelectedType(type.id);
                    setTypePickerVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 28, lineHeight: 36, marginRight: spacing.md }}>{type.emoji}</Text>
                  <Text
                    variant="bodyLarge"
                    style={{ flex: 1, color: selectedType === type.id ? colors.primary : colors.textPrimary, fontWeight: selectedType === type.id ? '600' : '400' }}
                  >
                    {type.label}
                  </Text>
                  {selectedType === type.id && (
                    <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: spacing.xxxl }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
};

const typeDropdownStyles = {
  trigger: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    gap: spacing.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    maxHeight: '75%' as const,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center' as const,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  optionSelected: {
    backgroundColor: colors.primary + '08',
  },
};

export default TypeStep;