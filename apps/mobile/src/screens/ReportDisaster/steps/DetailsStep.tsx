import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { Camera, ChevronDown } from 'lucide-react-native';
import { reportStyles } from '../styles';

const PEOPLE_AFFECTED_RANGES = [
  '0 (Just property damage)',
  '1-5',
  '6-10',
  '10-50',
  '50-100',
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
  onNext: (description: string, photos: any[], peopleAffected: string, additionalDetails: string[]) => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  location,
  type,
  severity,
  initialData,
  onNext,
}) => {
  const [description, setDescription] = useState(initialData.description || '');
  const [photos, setPhotos] = useState(initialData.photos || []);
  const [peopleAffected, setPeopleAffected] = useState(initialData.peopleAffected || '');
  const [additionalDetails, setAdditionalDetails] = useState(initialData.additionalDetails || []);

  const handleAddPhoto = () => {
    console.log('Add photo');
  };

  const toggleDetail = (detail: string) => {
    setAdditionalDetails((prev) =>
      prev.includes(detail) ? prev.filter((d) => d !== detail) : [...prev, detail]
    );
  };

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>
      {/* Description */}
      <Text variant="h2" style={reportStyles.sectionTitle}>
        Describe the situation
      </Text>

      <TextInput
        style={reportStyles.textArea}
        placeholder="What's happening? Be specific..."
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
      <Text variant="h2" style={reportStyles.sectionTitle}>
        Add Photos or Videos
      </Text>
      <Text variant="bodyMedium" color="textSecondary" style={reportStyles.subtitle}>
        Help responders assess the situation
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={reportStyles.photoButton} onPress={handleAddPhoto}>
          <Camera size={32} color={colors.textSecondary} />
          <Text variant="bodySmall" color="textSecondary">
            Add Photo
          </Text>
        </TouchableOpacity>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={reportStyles.photoPlaceholder} />
        ))}
      </ScrollView>
      <Text variant="bodySmall" color="textSecondary" style={reportStyles.photoHint}>
        Max 5 photos/videos • Each up to 10MB
      </Text>

      {/* People Affected */}
      <Text variant="h2" style={reportStyles.sectionTitle}>
        Number of people affected
      </Text>

      <TouchableOpacity style={reportStyles.picker}>
        <Text variant="bodyLarge" color={peopleAffected ? 'textPrimary' : 'textSecondary'}>
          {peopleAffected || 'Select range'}
        </Text>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Additional Details */}
      <Text variant="h2" style={reportStyles.sectionTitle}>
        Additional details (optional)
      </Text>

      {ADDITIONAL_DETAILS.map((detail) => (
        <TouchableOpacity
          key={detail}
          style={reportStyles.checkbox}
          onPress={() => toggleDetail(detail)}
        >
          <View
            style={[
              reportStyles.checkboxBox,
              additionalDetails.includes(detail) && reportStyles.checkboxBoxChecked,
            ]}
          >
            {additionalDetails.includes(detail) && (
              <Text style={reportStyles.checkboxCheck}>✓</Text>
            )}
          </View>
          <Text variant="bodyMedium">{detail}</Text>
        </TouchableOpacity>
      ))}

      {/* Next Button */}
      <Button
        title="Next: Review →"
        variant="primary"
        size="large"
        fullWidth
        onPress={() => onNext(description, photos, peopleAffected, additionalDetails)}
        style={reportStyles.nextButton}
      />
    </ScrollView>
  );
};