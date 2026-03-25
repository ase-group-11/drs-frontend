import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { MapPin, AlertTriangle, FileText, Image, Users } from 'lucide-react-native';
import { reportStyles } from '../styles';

interface ReviewStepProps {
  data: any;
  onSubmit: () => void;
  onEdit: (step: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, onSubmit, onEdit }) => {
  const [sendAlert, setSendAlert] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const getTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      fire: '🔥',
      flood: '🌊',
      storm: '💨',
      accident: '🚧',
      power: '⚡',
      building: '🏗️',
    };
    return emojis[type] || '⚠️';
  };

  return (
    <ScrollView style={reportStyles.content} showsVerticalScrollIndicator={false}>
      {/* Location */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <MapPin size={20} color={colors.primary} />
            <Text variant="bodyLarge" weight="bold">
              Location
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(1)}>
            <Text variant="bodyMedium" color="primary">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">{data.location?.address}</Text>
      </View>

      {/* Type & Severity */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <Text style={reportStyles.typeEmoji}>{getTypeEmoji(data.type)}</Text>
            <Text variant="bodyLarge" weight="bold">
              Type: {data.type?.charAt(0).toUpperCase() + data.type?.slice(1)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(2)}>
            <Text variant="bodyMedium" color="primary">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        <View style={reportStyles.severityBadge}>
          <Text variant="bodySmall" weight="bold" style={reportStyles.severityText}>
            ● {data.severity?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Description */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <FileText size={20} color={colors.primary} />
            <Text variant="bodyLarge" weight="bold">
              Description
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">{data.description || 'No description provided'}</Text>
      </View>

      {/* Media */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <Image size={20} color={colors.primary} />
            <Text variant="bodyLarge" weight="bold">
              Media ({data.photos?.length || 0} items)
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Additional Details */}
      <View style={reportStyles.reviewCard}>
        <View style={reportStyles.reviewHeader}>
          <View style={reportStyles.reviewHeaderLeft}>
            <Users size={20} color={colors.primary} />
            <Text variant="bodyLarge" weight="bold">
              Additional Details
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(3)}>
            <Text variant="bodyMedium" color="primary">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        <Text variant="bodyMedium">
          People Affected: {data.peopleAffected || 'Not specified'}
        </Text>
      </View>

      {/* Emergency Alert */}
      <View style={reportStyles.alertBox}>
        <View style={reportStyles.alertHeader}>
          <AlertTriangle size={20} color={colors.warning} />
          <Text variant="bodyLarge" weight="bold" color="warning">
            Emergency Alert Notification
          </Text>
        </View>
        <Text variant="bodyMedium" color="warning" style={{ marginBottom: spacing.sm }}>
          Your report will be sent to emergency services and nearby residents will be alerted
        </Text>
        <TouchableOpacity style={reportStyles.checkbox} onPress={() => setSendAlert(!sendAlert)}>
          <View style={[reportStyles.checkboxBox, sendAlert && reportStyles.checkboxBoxChecked]}>
            {sendAlert && <Text style={reportStyles.checkboxCheck}>✓</Text>}
          </View>
          <Text variant="bodyMedium" weight="semibold">
            Send emergency alert
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation */}
      <TouchableOpacity style={reportStyles.checkbox} onPress={() => setConfirmed(!confirmed)}>
        <View style={[reportStyles.checkboxBox, confirmed && reportStyles.checkboxBoxChecked]}>
          {confirmed && <Text style={reportStyles.checkboxCheck}>✓</Text>}
        </View>
        <View>
          <Text variant="bodyMedium" weight="semibold">
            I confirm this information is accurate to the best of my knowledge
          </Text>
          <Text variant="bodySmall" color="textSecondary">
            False reports may result in account suspension
          </Text>
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
        />
        <Button
          title="Submit Report"
          variant="primary"
          size="large"
          onPress={onSubmit}
          disabled={!confirmed}
          style={[
            { flex: 1.5, backgroundColor: colors.error },
            !confirmed && reportStyles.submitDisabled,
          ]}
        />
      </View>
    </ScrollView>
  );
};
