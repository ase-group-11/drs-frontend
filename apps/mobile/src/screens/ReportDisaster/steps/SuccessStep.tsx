import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { CheckCircle, Copy, Bell, Shield } from 'lucide-react-native';
import { reportStyles } from '../styles';

interface SuccessStepProps {
  reportId: string;
  onReturnToMap: () => void;
  onReportAnother: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  reportId,
  onReturnToMap,
  onReportAnother,
}) => {
  const handleCopyId = () => {
    console.log('Copied:', reportId);
  };

  return (
    <View style={reportStyles.content}>
      {/* Success Icon */}
      <View style={reportStyles.successIcon}>
        <CheckCircle size={80} color={colors.success} strokeWidth={2} />
      </View>

      <Text variant="h1" style={{ textAlign: 'center', marginBottom: spacing.md }}>
        Report Submitted!
      </Text>

      <Text
        variant="bodyLarge"
        color="textSecondary"
        style={{ textAlign: 'center', marginBottom: spacing.lg }}
      >
        Your report has been received and verified. Emergency services are being notified.
      </Text>

      {/* Report ID */}
      <View style={reportStyles.idCard}>
        <Text variant="bodyLarge" weight="bold">
          Report ID: #{reportId}
        </Text>
        <TouchableOpacity onPress={handleCopyId}>
          <Copy size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <View style={reportStyles.timeline}>
        <View style={reportStyles.timelineItem}>
          <View style={[reportStyles.timelineDot, reportStyles.timelineDotComplete]} />
          <Text variant="bodyMedium" weight="semibold">
            Report received - Now
          </Text>
        </View>

        <View style={reportStyles.timelineItem}>
          <View style={[reportStyles.timelineDot, reportStyles.timelineDotActive]} />
          <Text variant="bodyMedium" weight="semibold">
            Emergency services dispatched - 2 mins
          </Text>
        </View>

        <View style={reportStyles.timelineItem}>
          <View style={reportStyles.timelineDot} />
          <Text variant="bodyMedium" color="textSecondary">
            Unit arrival - Est. 8 mins
          </Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={reportStyles.infoGrid}>
        <View style={reportStyles.infoCard}>
          <Bell size={32} color={colors.primary} />
          <Text variant="bodyLarge" weight="bold">
            Track Status
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            You'll receive updates
          </Text>
        </View>

        <View style={reportStyles.infoCard}>
          <Shield size={32} color={colors.success} />
          <Text variant="bodyLarge" weight="bold">
            Stay Safe
          </Text>
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
        onPress={onReturnToMap}
        style={{ marginBottom: spacing.md }}
      />

      <TouchableOpacity onPress={onReturnToMap}>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          Return to Map
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onReportAnother} style={{ marginTop: spacing.sm }}>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          Report Another
        </Text>
      </TouchableOpacity>
    </View>
  );
};