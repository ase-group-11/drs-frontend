// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/steps/ReviewStep.tsx
// FIXED: @atoms imports, lucide removed, submitting prop wired
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { reportStyles } from '../styles';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface ReviewStepProps {
  data: any;
  onSubmit: () => void;
  onEdit: (step: number) => void;
  submitting?: boolean;
}

const getTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    fire:       '🔥',
    flood:      '🌊',
    storm:      '⛈️',
    earthquake: '🏚️',
    hurricane:  '🌀',
    tornado:    '🌪️',
    tsunami:    '🌊',
    drought:    '☀️',
    heatwave:   '🌡️',
    coldwave:   '🥶',
    other:      '⚠️',
  };
  return emojis[type?.toLowerCase()] || '⚠️';
};

// SVG icons (replacing lucide)
const PinIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={colors.primary} strokeWidth="2" />
  </Svg>
);

const FileIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ImageIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" ry="2"
      stroke={colors.primary} strokeWidth="2" />
    <Circle cx="8.5" cy="8.5" r="1.5" stroke={colors.primary} strokeWidth="2" />
    <Path d="M21 15l-5-5L5 21" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UsersIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4" stroke={colors.primary} strokeWidth="2" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WarnIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 9v4M12 17h.01"
      stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, onSubmit, onEdit, submitting = false }) => {
  const [sendAlert, setSendAlert]   = useState(true);
  const [confirmed, setConfirmed]   = useState(false);

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>

      {/* Location */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <PinIcon />
            <Text variant="bodyLarge">Location</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(1)}>
            <Text variant="bodyMedium" color="primary">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">{data.location?.address}</Text>
      </View>

      {/* Type & Severity */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <Text style={reportStyles.typeEmoji}>{getTypeEmoji(data.type)}</Text>
            <Text variant="bodyLarge">
              Type: {data.type?.charAt(0).toUpperCase() + data.type?.slice(1)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(2)}>
            <Text variant="bodyMedium" color="primary">Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={reportStyles.severityBadge}>
          <Text variant="bodySmall" style={reportStyles.severityText}>
            ● {data.severity?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Description */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <FileIcon />
            <Text variant="bodyLarge">Description</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">{data.description || 'No description provided'}</Text>
      </View>

      {/* Media */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <ImageIcon />
            <Text variant="bodyLarge">Media ({data.photos?.length || 0} items)</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">Edit</Text>
          </TouchableOpacity>
        </View>
        {data.photos?.length > 0 && (
          <Text variant="bodySmall" color="textSecondary">{data.photos.length} photo(s) attached</Text>
        )}
      </View>

      {/* Additional Details */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <UsersIcon />
            <Text variant="bodyLarge">Additional Details</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">Edit</Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">
          People Affected: {data.peopleAffected || 'Not specified'}
        </Text>
        {data.additionalDetails?.length > 0 && (
          <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
            {data.additionalDetails.join(' • ')}
          </Text>
        )}
      </View>

      {/* Emergency Alert */}
      <View style={reportStyles.alertBox}>
        <View style={reportStyles.alertHeader}>
          <WarnIcon />
          <Text variant="bodyLarge" color="warning">Emergency Alert Notification</Text>
        </View>
        <Text variant="bodyMedium" color="warning" style={{ marginBottom: spacing.sm }}>
          Your report will be sent to emergency services and nearby residents will be alerted
        </Text>
        <TouchableOpacity
          style={reportStyles.checkbox}
          onPress={() => setSendAlert(!sendAlert)}
          activeOpacity={0.7}
        >
          <View style={[reportStyles.checkboxBox, sendAlert && reportStyles.checkboxBoxChecked]}>
            {sendAlert && <Text style={reportStyles.checkboxCheck}>✓</Text>}
          </View>
          <Text variant="bodyMedium">Send emergency alert</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation */}
      <TouchableOpacity
        style={reportStyles.checkbox}
        onPress={() => setConfirmed(!confirmed)}
        activeOpacity={0.7}
      >
        <View style={[reportStyles.checkboxBox, confirmed && reportStyles.checkboxBoxChecked]}>
          {confirmed && <Text style={reportStyles.checkboxCheck}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">I confirm this information is accurate to the best of my knowledge</Text>
          <Text variant="bodySmall" color="textSecondary">False reports may result in account suspension</Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={reportStyles.actionButtons}>
        <Button
          title="← Back"
          variant="secondary"
          size="large"
          onPress={() => onEdit(3)}
          style={{ flex: 1 }}
          disabled={submitting}
        />
        <TouchableOpacity
          style={[
            {
              flex: 1.5,
              backgroundColor: confirmed && !submitting ? colors.error : colors.gray300,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              height: 56,
            },
          ]}
          onPress={onSubmit}
          disabled={!confirmed || submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator color={colors.white} />
            : <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>Submit Report</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ReviewStep;