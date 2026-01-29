import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import type { WelcomeScreenProps } from '@types/navigation';

const SuccessIcon: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <Circle cx="60" cy="60" r="56" fill={colors.success} />
    <Path
      d="M35 60L52 77L85 44"
      stroke={colors.white}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  navigation,
  route,
}) => {
  const { isNewUser } = route.params;

  const handleGetStarted = () => {
    // TODO: Navigate to main app
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'Main' }],
    // });
    console.log('Navigate to main app');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.container}>
        <View style={styles.content}>
          <SuccessIcon size={120} />
          <Text variant="h2" color="textPrimary" align="center" style={styles.title}>
            Welcome!
          </Text>
          <Text
            variant="bodyMedium"
            color="textSecondary"
            align="center"
            style={styles.subtitle}
          >
            {isNewUser
              ? 'Your account has been successfully created'
              : 'You have successfully logged in'}
          </Text>
          <Text variant="brand" color="navy" align="center" style={styles.brand}>
            DISASTER RESPONSE SYSTEM
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Get Started" onPress={handleGetStarted} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  brand: {
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    paddingTop: spacing.xxl,
  },
});

export default WelcomeScreen;
