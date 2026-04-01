// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/steps/SuccessStep.tsx
// FIXED: @atoms imports, lucide removed, SVG icons used instead
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { reportStyles } from '../styles';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

interface SuccessStepProps {
  reportId: string;
  onReturnToMap: () => void;
  onReportAnother: () => void;
  onTrackReport?: () => void;
}

const CheckCircleIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={colors.success} strokeWidth="2" />
    <Polyline points="9,12 11,14 15,10"
      stroke={colors.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BellIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CopyIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 9 20 20 9 20 9 9 20 9"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SuccessStep: React.FC<SuccessStepProps> = ({
  reportId, onReturnToMap, onReportAnother, onTrackReport,
}) => {
  const handleCopyId = () => {
    Alert.alert('Copied', `Report ID: #${reportId}`);
  };

  return (
    <View style={reportStyles.content}>
      {/* Success Icon */}
      <View style={reportStyles.successIcon}>
        <CheckCircleIcon />
      </View>

      <Text variant="h1" style={{ textAlign: 'center', marginBottom: spacing.md }}>
        Report Submitted!
      </Text>

      <Text
        variant="bodyLarge"
        color="textSecondary"
        style={{ textAlign: 'center', marginBottom: spacing.lg }}
      >
        Your report has been received. Emergency services are being notified.
      </Text>

      {/* Report ID */}
      <View style={reportStyles.idCard}>
        <Text variant="bodyLarge">Report ID: #{reportId}</Text>
        <TouchableOpacity onPress={handleCopyId} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <CopyIcon />
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <View style={reportStyles.timeline}>
        <View style={reportStyles.timelineItem}>
          <View style={[reportStyles.timelineDot, reportStyles.timelineDotComplete]} />
          <Text variant="bodyMedium">Report received — Now</Text>
        </View>
        <View style={reportStyles.timelineItem}>
          <View style={[reportStyles.timelineDot, reportStyles.timelineDotActive]} />
          <Text variant="bodyMedium">Emergency services dispatched — 2 mins</Text>
        </View>
        <View style={reportStyles.timelineItem}>
          <View style={reportStyles.timelineDot} />
          <Text variant="bodyMedium" color="textSecondary">Unit arrival — Est. 8 mins</Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={reportStyles.infoGrid}>
        <View style={reportStyles.infoCard}>
          <BellIcon />
          <Text variant="bodyLarge">Track Status</Text>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            You'll receive updates
          </Text>
        </View>
        <View style={reportStyles.infoCard}>
          <ShieldIcon />
          <Text variant="bodyLarge">Stay Safe</Text>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            Follow safety guidelines
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <Button
        title="Track This Report"
        variant="primary"
        size="large"
        fullWidth
        onPress={onTrackReport ?? onReturnToMap}
        style={{ marginBottom: spacing.sm }}
      />

      <Button
        title="Return to Map"
        variant="secondary"
        size="large"
        fullWidth
        onPress={onReturnToMap}
        style={{ marginBottom: spacing.md }}
      />

      <TouchableOpacity onPress={onReportAnother} style={{ marginTop: spacing.sm, paddingVertical: spacing.md }}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.primary }}>
          Report Another Incident
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SuccessStep;