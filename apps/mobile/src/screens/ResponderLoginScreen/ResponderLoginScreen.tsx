// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ResponderLoginScreen/ResponderLoginScreen.tsx
// Same look as citizen login — AuthTemplate + AuthHeader (DRS logo)
// Email + password instead of phone, clean SVG eye toggle
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator,
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

// SVG eye icons — clean, no emoji
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

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const emailError    = error && !password ? '' : error && email ? '' : '';
  const isDisabled    = !email.trim() || !password.trim() || loading;

  const handleLogin = async () => {
    if (!email.trim())    { setError('Please enter your email address'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    setError('');
    setLoading(true);

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
        setError(data.detail || data.message || 'Invalid email or password');
        return;
      }

      const { team_member, tokens } = data;
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,  tokens.access_token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, 'responder');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify({
        id:           team_member.id,
        full_name:    team_member.full_name,
        email:        team_member.email,
        phone_number: team_member.phone_number,
        role:         team_member.role,
        department:   team_member.department,
        employee_id:  team_member.employee_id,
        user_type:    'responder',
      }));

      navigation.reset({ index: 0, routes: [{ name: 'Main' as any }] });

    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate
      header={
        <AuthHeader
          title="Responder Login"
          subtitle="Emergency Services Portal"
        />
      }
    >
      <View style={S.container}>

        {/* Responder badge — subtle, sits just under header */}
        <View style={S.badge}>
          <Text style={S.badgeText}>🚒  Authorised Personnel Only</Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{error}</Text>
          </View>
        )}

        {/* Email */}
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

        {/* Password */}
        <View style={S.passwordWrapper}>
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={v => { setPassword(v); setError(''); }}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPass(p => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={S.eyeBtn}
              >
                {showPass ? <EyeOpen /> : <EyeClosed />}
              </TouchableOpacity>
            }
          />
        </View>

        {/* Login button */}
        <Button
          title="Login"
          onPress={handleLogin}
          loading={loading}
          disabled={isDisabled}
          style={S.button}
        />

        {/* Back to citizen login */}
        <View style={S.backRow}>
          <Text variant="bodyMedium" color="textSecondary">Not a responder? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text variant="bodyMedium" color="primary">Citizen Login</Text>
          </TouchableOpacity>
        </View>

      </View>
    </AuthTemplate>
  );
};

const S = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: spacing.xl,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  passwordWrapper: {
    marginTop: spacing.md,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  button: {
    marginTop: spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
});

export default ResponderLoginScreen;