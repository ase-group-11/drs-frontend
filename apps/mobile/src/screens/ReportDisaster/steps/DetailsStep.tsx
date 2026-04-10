// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/steps/DetailsStep.tsx
// FIXED: Added KeyboardAvoidingView + keyboardShouldPersistTaps on ScrollView
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import { reportStyles } from '../styles';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';

const PEOPLE_AFFECTED_RANGES = [
  '0 (Just property damage)',
  '1–5',
  '6–10',
  '11–50',
  '51–100',
  '100+',
];

const ADDITIONAL_DETAILS = [
  'Multiple casualties present',
  'Building structural damage',
  'Hazardous materials involved',
  'Road access blocked',
];

interface DetailsStepProps {
  location: any;
  type: string;
  severity: string;
  initialData: any;
  onNext: (
    description: string,
    photos: any[],
    peopleAffected: string,
    additionalDetails: string[]
  ) => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  location, type, severity, initialData, onNext,
}) => {
  const [description, setDescription]         = useState(initialData.description || '');
  const [photos, setPhotos]                   = useState<string[]>(initialData.photos || []);
  const [peopleAffected, setPeopleAffected]   = useState(initialData.peopleAffected || '');
  const [additionalDetails, setAdditionalDetails] = useState<string[]>(initialData.additionalDetails || []);

  const toggleDetail = (detail: string) => {
    setAdditionalDetails(prev =>
      prev.includes(detail) ? prev.filter(d => d !== detail) : [...prev, detail]
    );
  };

  const handleAddPhoto = () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos.');
      return;
    }
    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', quality: 0.8, maxWidth: 1920, maxHeight: 1080 },
              (response: ImagePickerResponse) => {
                if (!response.didCancel && !response.errorCode && response.assets?.[0]) {
                  const asset: Asset = response.assets[0];
                  setPhotos(prev => [...prev, asset.uri ?? '']);
                }
              }
            );
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', quality: 0.8, maxWidth: 1920, maxHeight: 1080, selectionLimit: 5 - photos.length },
              (response: ImagePickerResponse) => {
                if (!response.didCancel && !response.errorCode && response.assets) {
                  const uris = response.assets
                    .map((a: Asset) => a.uri ?? '')
                    .filter(Boolean);
                  setPhotos(prev => [...prev, ...uris].slice(0, 5));
                }
              }
            );
          },
        },
      ]
    );
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    // ✅ KeyboardAvoidingView prevents inputs being covered by keyboard
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {/* ✅ keyboardShouldPersistTaps="handled" lets taps on list items dismiss keyboard */}
      <ScrollView
        style={reportStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description */}
        <Text variant="h2" style={reportStyles.sectionTitle}>Describe the situation</Text>
        <TextInput
          style={reportStyles.textArea}
          placeholder="What's happening? Be specific about the location, danger level, and any immediate needs..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text variant="bodySmall" color="textSecondary" style={reportStyles.charCount}>
          {description.length}/500
        </Text>

        {/* Photos */}
        <Text variant="h2" style={reportStyles.sectionTitle}>Add Photos or Videos</Text>
        <Text variant="bodyMedium" color="textSecondary" style={reportStyles.subtitle}>
          Help responders assess the situation
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={reportStyles.photoButton} onPress={handleAddPhoto} activeOpacity={0.7}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <Path
                d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <Circle cx="12" cy="13" r="4" stroke={colors.textSecondary} strokeWidth="2" />
            </Svg>
            <Text variant="bodySmall" color="textSecondary">Add Photo</Text>
          </TouchableOpacity>

          {photos.map((uri, idx) => (
            <TouchableOpacity
              key={`${uri}-${idx}`}
              style={reportStyles.photoPlaceholder}
              onPress={() => handleRemovePhoto(idx)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri }}
                style={{ width: 100, height: 100, borderRadius: 8 }}
                resizeMode="cover"
              />
              <View style={{
                position: 'absolute', top: 4, right: 4,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: 10, width: 20, height: 20,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕</Text>
              </View>
            </TouchableOpacity>
          ))}

          {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, i) => (
            <View key={`ph-${i}`} style={reportStyles.photoPlaceholder} />
          ))}
        </ScrollView>
        <Text variant="bodySmall" color="textSecondary" style={reportStyles.photoHint}>
          {photos.length}/5 photos added • Each up to 10MB
        </Text>

        {/* People Affected */}
        <Text variant="h2" style={reportStyles.sectionTitle}>Number of people affected</Text>
        <View style={[reportStyles.picker, { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden', minHeight: 50 }]}>
          <Picker
            selectedValue={peopleAffected || ''}
            onValueChange={(val) => setPeopleAffected(val as string)}
            style={{ color: colors.textPrimary, width: '100%' }}
            itemStyle={{ color: colors.textPrimary, fontSize: 16 }}
            mode="dropdown"
          >
            <Picker.Item label="Select range..." value="" color={colors.textSecondary} />
            {PEOPLE_AFFECTED_RANGES.map(r => (
              <Picker.Item key={r} label={r} value={r} color={colors.textPrimary} />
            ))}
          </Picker>
        </View>

        {/* Additional Details */}
        <Text variant="h2" style={reportStyles.sectionTitle}>Additional details (optional)</Text>
        {ADDITIONAL_DETAILS.map(detail => (
          <TouchableOpacity
            key={detail}
            style={reportStyles.checkbox}
            onPress={() => toggleDetail(detail)}
            activeOpacity={0.7}
          >
            <View style={[
              reportStyles.checkboxBox,
              additionalDetails.includes(detail) && reportStyles.checkboxBoxChecked,
            ]}>
              {additionalDetails.includes(detail) && (
                <Text style={reportStyles.checkboxCheck}>✓</Text>
              )}
            </View>
            <Text variant="bodyMedium">{detail}</Text>
          </TouchableOpacity>
        ))}

        <Button
          title="Next: Review →"
          variant="primary"
          size="large"
          fullWidth
          onPress={() => onNext(description, photos, peopleAffected, additionalDetails)}
          style={reportStyles.nextButton}
        />

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DetailsStep;