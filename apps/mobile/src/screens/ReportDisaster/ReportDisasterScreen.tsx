import React, { useState } from 'react';
import { View, TouchableOpacity, Animated, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { ArrowLeft, X } from 'lucide-react-native';
import { reportStyles } from './styles';

import {
    LocationStep,
    TypeStep,
    DetailsStep,
    ReviewStep,
    SuccessStep,
} from './steps';

export const ReportDisasterScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(1);
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
            // ✅ Reset scroll position to top when changing steps
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

    const handleSubmit = async () => {
        console.log('Submitting:', reportData);
        goToStep(5);
    };

    const handleClose = () => {
        navigation.navigate('MainTabs');
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

    // ✅ Prevent scrolling past top
    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY < 0) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={reportStyles.container}>
                {/* ✅ FIXED HEADER */}
                {currentStep < 5 && (
                    <View style={reportStyles.header}>
                        <TouchableOpacity onPress={handleBack}>
                            <ArrowLeft size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={reportStyles.headerCenter}>
                            <Text variant="h3">Report Disaster</Text>
                            <Text variant="bodySmall" color="textSecondary">#DR-2025-XXXX</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ✅ FIXED PROGRESS */}
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

                {/* ✅ SCROLLABLE CONTENT - WITH SCROLL LOCK */}
                <ScrollView
                    ref={scrollViewRef}  // ✅ Add ref
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
                    onScroll={handleScroll}  // ✅ Add scroll handler
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
                            />
                        )}
                        {currentStep === 5 && (
                            <SuccessStep
                                reportId="DR-2025-1234"
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
                                    goToStep(1);
                                }}
                            />
                        )}
                    </Animated.View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ReportDisasterScreen;
