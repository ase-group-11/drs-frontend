// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/ReportDisasterScreen.tsx
// FIXED: @/components/atoms → @atoms, correct disasterService.createReport call
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, TouchableOpacity, Animated, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import Svg, { Path } from 'react-native-svg';
import { reportStyles } from './styles';
import { disasterService } from '@services/disasterService';
import { authService } from '@services/authService';

import {
  LocationStep,
  TypeStep,
  DetailsStep,
  ReviewStep,
  SuccessStep,
} from './steps';

export const ReportDisasterScreen = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting]   = useState(false);
  const [reportId, setReportId]       = useState<string | null>(null);

  const [reportData, setReportData] = useState({
    location:          null as any,
    type:              null as string | null,
    severity:          null as string | null,
    description:       '',
    photos:            [] as any[],
    peopleAffected:    '',
    additionalDetails: [] as string[],
  });

  const fadeAnim       = React.useRef(new Animated.Value(1)).current;
  const scrollViewRef  = React.useRef<any>(null);

  const goToStep = (step: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentStep(step);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  const handleLocationNext = (location: any) => {
    setReportData(prev => ({ ...prev, location }));
    goToStep(2);
  };

  const handleTypeNext = (type: string, severity: string) => {
    setReportData(prev => ({ ...prev, type, severity }));
    goToStep(3);
  };

  const handleDetailsNext = (
    description: string,
    photos: any[],
    peopleAffected: string,
    additionalDetails: string[]
  ) => {
    setReportData(prev => ({ ...prev, description, photos, peopleAffected, additionalDetails }));
    goToStep(4);
  };

  // ── Submit to backend ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Get current user
      const user = await authService.getStoredUser();
      if (!user) throw new Error('You must be logged in to submit a report.');

      // Map frontend ids → backend enum values
      const typeMap: Record<string, string> = {
        flood:      'FLOOD',
        fire:       'FIRE',
        earthquake: 'EARTHQUAKE',
        hurricane:  'HURRICANE',
        tornado:    'TORNADO',
        tsunami:    'TSUNAMI',
        drought:    'DROUGHT',
        heatwave:   'HEATWAVE',
        coldwave:   'COLDWAVE',
        storm:      'STORM',
        other:      'OTHER',
      };
      const severityMap: Record<string, string> = {
        low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
      };

      // Parse people affected
      let peopleCount: number | undefined;
      const ppl = reportData.peopleAffected;
      if (ppl && ppl !== '0 (Just property damage)') {
        const num = parseInt(ppl.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) peopleCount = num;
      }

      // Map additional details to backend booleans
      const multipleCasualties  = reportData.additionalDetails.includes('Multiple casualties present');
      const structuralDamage    = reportData.additionalDetails.includes('Building structural damage');
      const roadBlocked         = reportData.additionalDetails.includes('Road access blocked');

      const payload = {
        user_id:             user.id,
        disaster_type:       (typeMap[reportData.type || ''] || 'OTHER') as any,
        severity:            (severityMap[reportData.severity || ''] || 'MEDIUM') as any,
        latitude:            reportData.location.latitude,
        longitude:           reportData.location.longitude,
        location_address:    reportData.location.address,
        description:         reportData.description || 'No description provided',
        people_affected:     peopleCount,
        multiple_casualties: multipleCasualties || undefined,
        structural_damage:   structuralDamage   || undefined,
        road_blocked:        roadBlocked        || undefined,
      };

      const response = await disasterService.submitReport(payload, reportData.photos?.length ? reportData.photos : undefined);
      console.log('Report submitted:', response.id, '| status:', response.report_status);
      setReportId(response.id);
      goToStep(5);

    } catch (error: any) {
      console.error('Submit failed:', error);
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit disaster report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => navigation.goBack();

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      goToStep(currentStep - 1);
    } else {
      handleClose();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Step 1 of 4 — Location';
      case 2: return 'Step 2 of 4 — Type & Severity';
      case 3: return 'Step 3 of 4 — Details & Media';
      case 4: return 'Step 4 of 4 — Review & Submit';
      default: return '';
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={reportStyles.container}>

          {/* HEADER */}
          {currentStep < 5 && (
            <View style={reportStyles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={reportStyles.headerButton}
                disabled={submitting}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke={colors.textPrimary} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>

              <View style={reportStyles.headerCenter}>
                <Text variant="h3">Report Disaster</Text>
                <Text variant="bodySmall" color="textSecondary">
                  {reportId ? `#${reportId.substring(0, 8).toUpperCase()}` : '#DR-XXXX'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                style={reportStyles.headerButton}
                disabled={submitting}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6l12 12"
                    stroke={colors.textPrimary} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          )}

          {/* PROGRESS DOTS */}
          {currentStep < 5 && (
            <>
              <View style={reportStyles.progressContainer}>
                {[1, 2, 3, 4].map(step => (
                  <View
                    key={step}
                    style={[
                      reportStyles.progressDot,
                      step <= currentStep && reportStyles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
              <Text variant="bodyMedium" style={reportStyles.stepText}>
                {getStepTitle()}
              </Text>
            </>
          )}

          {/* CONTENT */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          >
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              {currentStep === 1 && (
                <LocationStep
                  initialLocation={reportData.location}
                  onNext={handleLocationNext}
                />
              )}
              {currentStep === 2 && (
                <TypeStep
                  location={reportData.location}
                  initialType={reportData.type}
                  initialSeverity={reportData.severity}
                  onNext={handleTypeNext}
                />
              )}
              {currentStep === 3 && (
                <DetailsStep
                  location={reportData.location}
                  type={reportData.type || ''}
                  severity={reportData.severity || ''}
                  initialData={reportData}
                  onNext={handleDetailsNext}
                />
              )}
              {currentStep === 4 && (
                <ReviewStep
                  data={reportData}
                  onSubmit={handleSubmit}
                  onEdit={goToStep}
                  submitting={submitting}
                />
              )}
              {currentStep === 5 && (
                <SuccessStep
                  reportId={reportId || 'DR-2025-XXXX'}
                  onReturnToMap={handleClose}
                  onTrackReport={() => {
                    handleClose();
                    // Navigate to ReportDetail after closing modal
                    if (reportId) {
                      setTimeout(() => {
                        navigation.navigate('ReportDetail' as any, { reportId });
                      }, 400);
                    }
                  }}
                  onReportAnother={() => {
                    setReportData({
                      location: null, type: null, severity: null,
                      description: '', photos: [], peopleAffected: '', additionalDetails: [],
                    });
                    setReportId(null);
                    goToStep(1);
                  }}
                />
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReportDisasterScreen;