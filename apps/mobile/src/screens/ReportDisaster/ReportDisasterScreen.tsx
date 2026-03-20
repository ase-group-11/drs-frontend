// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDisaster/ReportDisasterScreen.tsx
// COMPLETE - With backend API integration
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, TouchableOpacity, Animated, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Alert } from 'react-native';
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
    const [submitting, setSubmitting] = useState(false);
    const [reportId, setReportId] = useState<string | null>(null);
    
    const [reportData, setReportData] = useState({
        location: null,
        type: null,
        severity: null,
        description: '',
        photos: [],
        peopleAffected: '',
        additionalDetails: [],
    });

    const fadeAnim = React.useRef(new Animated.Value(1)).current;
    const scrollViewRef = React.useRef(null);

    const goToStep = (step: number) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setCurrentStep(step);
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleLocationNext = (location) => {
        setReportData({ ...reportData, location });
        goToStep(2);
    };

    const handleTypeNext = (type, severity) => {
        setReportData({ ...reportData, type, severity });
        goToStep(3);
    };

    const handleDetailsNext = (description, photos, peopleAffected, additionalDetails) => {
        setReportData({
            ...reportData,
            description,
            photos,
            peopleAffected,
            additionalDetails,
        });
        goToStep(4);
    };

    // ✅ NEW: Submit to backend API
    const handleSubmit = async () => {
        try {
            setSubmitting(true);

            // Map disaster types to backend format
            const typeMap = {
                'fire': 'FIRE',
                'flood': 'FLOOD',
                'storm': 'STORM',
                'accident': 'ACCIDENT',
                'power': 'POWER_OUTAGE',
                'earthquake': 'EARTHQUAKE',
                'landslide': 'LANDSLIDE',
                'explosion': 'EXPLOSION',
                'building_collapse': 'BUILDING_COLLAPSE',
            };

            // Map severity to backend format
            const severityMap = {
                'low': 'LOW',
                'medium': 'MEDIUM',
                'high': 'HIGH',
                'critical': 'CRITICAL',
            };

            // Build additional details object
            const additionalDetails = {};
            reportData.additionalDetails.forEach((detail) => {
                if (detail === 'Property Damage') additionalDetails.property_damage = true;
                if (detail === 'Infrastructure Damage') additionalDetails.infrastructure_damage = true;
                if (detail === 'Casualties') additionalDetails.casualties = true;
                if (detail === 'Evacuation Needed') additionalDetails.evacuation_needed = true;
            });

            // Build request payload
            const payload = {
                disaster_type: typeMap[reportData.type] || 'OTHER',
                severity: severityMap[reportData.severity] || 'MEDIUM',
                latitude: reportData.location.latitude,
                longitude: reportData.location.longitude,
                location_address: reportData.location.address,
                description: reportData.description,
                people_affected: reportData.peopleAffected ? parseInt(reportData.peopleAffected) : undefined,
                images: reportData.photos.length > 0 ? reportData.photos : undefined,
                additional_details: Object.keys(additionalDetails).length > 0 ? additionalDetails : undefined,
            };

            // Submit to backend
            const response = await disasterService.submitDisasterReport(payload);
            
            console.log('Report submitted successfully:', response);
            setReportId(response.id);
            
            // Go to success screen
            goToStep(5);
            
        } catch (error: any) {
            console.error('Failed to submit report:', error);
            
            Alert.alert(
                'Submission Failed',
                error.message || 'Failed to submit disaster report. Please try again.',
                [
                    { text: 'OK', style: 'default' }
                ]
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        navigation.goBack();
    };

    const handleBack = () => {
        if (currentStep > 1 && currentStep < 5) {
            goToStep(currentStep - 1);
        } else {
            handleClose();
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 1: return 'Step 1 of 4 - Location';
            case 2: return 'Step 2 of 4 - Type & Severity';
            case 3: return 'Step 3 of 4 - Details & Media';
            case 4: return 'Step 4 of 4 - Review & Submit';
            case 5: return '';
            default: return '';
        }
    };

    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY < 0) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
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
                                        stroke={colors.textPrimary} 
                                        strokeWidth={2} 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </TouchableOpacity>
                            
                            <View style={reportStyles.headerCenter}>
                                <Text variant="h3">Report Disaster</Text>
                                <Text variant="bodySmall" color="textSecondary">
                                    {reportId ? `#DR-${reportId.substring(0, 8)}` : '#DR-XXXX'}
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
                                        stroke={colors.textPrimary} 
                                        strokeWidth={2} 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* PROGRESS */}
                    {currentStep < 5 && (
                        <>
                            <View style={reportStyles.progressContainer}>
                                {[1, 2, 3, 4].map((step) => (
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
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingHorizontal: 16,
                            paddingBottom: 16,
                        }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        alwaysBounceVertical={false}
                        overScrollMode="never"
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        contentInsetAdjustmentBehavior="never"
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
                                    type={reportData.type}
                                    severity={reportData.severity}
                                    initialData={reportData}
                                    onNext={handleDetailsNext}
                                />
                            )}
                            {currentStep === 4 && (
                                <ReviewStep
                                    data={reportData}
                                    onSubmit={handleSubmit}
                                    onEdit={(step) => goToStep(step)}
                                    submitting={submitting}
                                />
                            )}
                            {currentStep === 5 && (
                                <SuccessStep
                                    reportId={reportId || 'DR-2025-XXXX'}
                                    onReturnToMap={handleClose}
                                    onReportAnother={() => {
                                        setReportData({
                                            location: null,
                                            type: null,
                                            severity: null,
                                            description: '',
                                            photos: [],
                                            peopleAffected: '',
                                            additionalDetails: [],
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