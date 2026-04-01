// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ResponderLoginScreen/ResponderLoginScreen.tsx
//
// NEW 2-step MFA login flow (backend updated):
//   Step 1: POST /emergency-team/login
//           Body: { email, password }
//           Returns: { message, login_token }
//
//   Step 2: POST /emergency-team/login/verify
//           Body: { login_token, otp }
//           Returns: { team_member, tokens }
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader }   from '@organisms/AuthHeader';
import { Input }        from '@atoms/Input';
import { Button }       from '@atoms/Button';
import { Text }         from '@atoms/Text';
import { colors }       from '@theme/colors';
import { spacing }      from '@theme/spacing';
import Svg, { Path }    from 'react-native-svg';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';

const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA:     '@auth/user_data',
  USER_ROLE:     '@auth/user_role',
};

const EyeOpen = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      stroke={colors.textSecondary} strokeWidth="2" />
  </Svg>
);

const EyeClosed = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const ResponderLoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Step 1
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Step 2
  const [step, setStep]             = useState<1 | 2>(1);
  const [loginToken, setLoginToken] = useState('');
  const [otp, setOtp]               = useState('');
  const [otpHint, setOtpHint]       = useState('');

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const otpRef = useRef<TextInput>(null);

  const handleStep1 = async () => {
    if (!email.trim())    { setError('Please enter your email address'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    setError('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
      const res = await fetch(`${API_BASE_URL}/emergency-team/login`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) {
        const raw = data.detail || data.message || 'Invalid email or password';
        // Sanitize backend Pydantic validation errors into a friendly message
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please try again or contact support.'
          : typeof raw === 'string' ? raw : 'Invalid email or password';
        setError(friendly);
        return;
      }
      setLoginToken(data.login_token);
      setOtpHint(data.message || 'An OTP has been sent to your registered phone number.');
      setStep(2);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    const otpClean = otp.trim().replace(/\s/g, '');
    if (otpClean.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
      const res = await fetch(`${API_BASE_URL}/emergency-team/login/verify`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ login_token: loginToken, otp: otpClean }),
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) {
        const raw = data.detail || data.message || 'Invalid or expired OTP';
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please try again.'
          : typeof raw === 'string' ? raw : 'Invalid or expired OTP';
        setError(friendly);
        return;
      }

      const { team_member, tokens } = data;
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,  tokens.access_token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE,     'responder');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify({
        id:           team_member.id,
        full_name:    team_member.full_name,
        email:        team_member.email,
        phone_number: team_member.phone_number,
        role:         team_member.role,
        department:   team_member.department,
        employee_id:  team_member.employee_id,
        user_type:    'emergency_team',
      }));
      navigation.reset({ index: 0, routes: [{ name: 'Main' as any }] });
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToStep1 = () => {
    setStep(1); setOtp(''); setLoginToken(''); setError('');
  };

  return (
    <AuthTemplate
      header={
        <AuthHeader
          title={step === 1 ? 'Responder Login' : 'Enter OTP'}
          subtitle={step === 1 ? 'Emergency Services Portal' : 'Enter the OTP sent to your registered number'}
        />
      }
    >
      <View style={S.container}>

        <View style={S.badge}>
          <Text style={S.badgeText}>🚒  Authorised Personnel Only</Text>
        </View>

        {!!error && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{error}</Text>
          </View>
        )}

        {step === 1 && (
          <>
            <Input
              label="Email Address"
              placeholder="name@emergency.ie"
              value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={{ marginTop: spacing.md }}>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleStep1}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPass(p => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: spacing.xs }}>
                    {showPass ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                }
              />
            </View>
            <Button title="Continue" onPress={handleStep1} loading={loading}
              disabled={!email.trim() || !password.trim() || loading} style={S.button} />
            <View style={S.backRow}>
              <Text variant="bodyMedium" color="textSecondary">Not a responder? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Text variant="bodyMedium" color="primary">Citizen Login</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={{ marginTop: spacing.sm }}>
              <Text style={S.otpLabel}>One-Time Passcode</Text>
              <TextInput
                ref={otpRef}
                style={S.otpInput}
                placeholder="● ● ● ● ● ●"
                placeholderTextColor="#D1D5DB"
                value={otp}
                onChangeText={v => { setOtp(v.replace(/[^0-9]/g, '')); setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleStep2}
                textContentType="oneTimeCode"
              />
              <Text style={S.otpHint}>Check your registered phone for the SMS</Text>
            </View>

            <Button title="Verify & Login" onPress={handleStep2} loading={loading}
              disabled={otp.trim().length !== 6 || loading} style={S.button} />

            <TouchableOpacity style={S.backStep} onPress={goBackToStep1} disabled={loading}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={S.backStepText}>Back — use different credentials</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </AuthTemplate>
  );
};

const S = StyleSheet.create({
  container:        { width: '100%', paddingTop: spacing.lg },
  badge:            { alignSelf: 'center', backgroundColor: '#FEF2F2', borderRadius: 20,
                      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                      marginBottom: spacing.lg, borderWidth: 1, borderColor: '#FECACA' },
  badgeText:        { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  errorBox:         { backgroundColor: '#FEE2E2', borderRadius: 10, padding: spacing.md,
                      marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errorText:        { color: '#991B1B', fontSize: 14 },
  button:           { marginTop: spacing.xxl },
  backRow:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                      marginTop: spacing.xxl },
  otpLabel:         { fontSize: 14, fontWeight: '600', color: colors.textPrimary,
                      marginBottom: spacing.sm },
  otpInput:         { borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 12,
                      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                      fontSize: 24, fontWeight: '700', letterSpacing: 8,
                      textAlign: 'center', color: colors.textPrimary, backgroundColor: '#FFF' },
  otpHint:          { fontSize: 12, color: colors.textSecondary, textAlign: 'center',
                      marginTop: spacing.xs },
  backStep:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      marginTop: spacing.lg, gap: spacing.xs },
  backStepText:     { fontSize: 14, color: colors.primary, fontWeight: '600' },
});

export default ResponderLoginScreen;