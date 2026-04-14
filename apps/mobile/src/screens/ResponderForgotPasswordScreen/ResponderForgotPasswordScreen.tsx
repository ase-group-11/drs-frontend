// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ResponderForgotPasswordScreen/ResponderForgotPasswordScreen.tsx
//
// Forgot password flow for ERT members (2-step):
//   Step 1: POST /emergency-team/forgot-password  → { email }
//           Backend sends a temporary password to the registered email
//   Step 2: POST /emergency-team/reset-password   → { email, temp_password, new_password }
//           Sets new password. User can then log in normally.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthTemplate }  from '@templates/AuthTemplate';
import { AuthHeader }    from '@organisms/AuthHeader';
import { Input }         from '@atoms/Input';
import { Button }        from '@atoms/Button';
import { Text }          from '@atoms/Text';
import { colors }        from '@theme/colors';
import { spacing }       from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';
import { API } from '@services/apiConfig';

// ─── Icons ────────────────────────────────────────────────────────────────

const ArrowLeft = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7"
      stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeOpen = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={colors.textSecondary} strokeWidth="2" />
  </Svg>
);

const EyeClosed = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const SuccessCheck = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    <Circle cx="28" cy="28" r="28" fill="#DCFCE7" />
    <Circle cx="28" cy="28" r="20" fill="#22C55E" />
    <Path d="M19 28l6 6 12-12"
      stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Component ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 'success';

export const ResponderForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [email, setEmail] = useState('');

  // Step 2
  const [tempPassword, setTempPassword]     = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTemp, setShowTemp]             = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const newPassRef    = useRef<TextInput>(null);
  const confirmRef    = useRef<TextInput>(null);

  // ── Step 1: Request temp password ──────────────────────────────────────

  const handleStep1 = async () => {
    if (!email.trim()) { setError('Please enter your email address'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setError('Please enter a valid email address'); return; }

    setError('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
      const res = await fetch(`${API_BASE_URL}${API.responder.forgotPassword()}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      clearTimeout(tid);
      const data = await res.json();

      if (!res.ok) {
        const raw = data.detail || data.message || 'Request failed';
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please try again.'
          : typeof raw === 'string' ? raw : 'Request failed';
        setError(friendly);
        return;
      }
      // Backend always returns generic success (no email enumeration)
      setStep(2);
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Set new password ────────────────────────────────────────────

  const handleStep2 = async () => {
    if (!tempPassword.trim()) { setError('Please enter the temporary password from your email'); return; }
    if (!newPassword.trim())  { setError('Please enter a new password'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Password must include at least one uppercase letter'); return; }
    if (!/[a-z]/.test(newPassword)) { setError('Password must include at least one lowercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Password must include at least one number'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setError('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
      const res = await fetch(`${API_BASE_URL}${API.responder.resetPassword()}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:        email.trim().toLowerCase(),
          temp_password: tempPassword.trim(),
          new_password:  newPassword,
        }),
      });
      clearTimeout(tid);
      const data = await res.json();

      if (!res.ok) {
        const raw = data.detail || data.message || 'Password reset failed';
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please try again.'
          : typeof raw === 'string' ? raw : 'Password reset failed';
        setError(friendly);
        return;
      }
      setStep('success');
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength indicator ─────────────────────────────────────────

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: 'transparent', width: 0 };
    let score = 0;
    if (pwd.length >= 8)   score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Weak', color: '#EF4444', width: 33 };
    if (score <= 3) return { label: 'Fair', color: '#F97316', width: 66 };
    return { label: 'Strong', color: '#22C55E', width: 100 };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  // ── Render ──────────────────────────────────────────────────────────────

  const headerTitle    = step === 1 ? 'Forgot Password'
                       : step === 2 ? 'Set New Password'
                       : 'Password Reset';
  const headerSubtitle = step === 1 ? 'Enter your registered email'
                       : step === 2 ? 'Use the temp password sent to your email'
                       : 'Your password has been reset';

  return (
    <AuthTemplate
      header={
        <AuthHeader
          title={headerTitle}
          subtitle={headerSubtitle}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge */}
          <View style={S.badge}>
            <Text style={S.badgeText}>🚒  Emergency Services Portal</Text>
          </View>

          {/* Progress dots */}
          {step !== 'success' && (
            <View style={S.steps}>
              {[1, 2].map(n => (
                <View key={n} style={[
                  S.stepDot,
                  step === n && S.stepDotActive,
                  typeof step === 'number' && step > n && S.stepDotDone,
                ]} />
              ))}
            </View>
          )}

          {/* Error box */}
          {!!error && (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <View style={S.infoCard}>
                <Text style={S.infoCardTitle}>How it works</Text>
                <Text style={S.infoCardBody}>
                  We'll send a temporary password to your registered email address. Use it in the next step to create a new password.
                </Text>
              </View>

              <Input
                label="Registered Email"
                placeholder="name@emergency.ie"
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleStep1}
              />

              <Button
                title="Send Temporary Password"
                onPress={handleStep1}
                loading={loading}
                disabled={!email.trim() || loading}
                style={S.button}
              />

              <TouchableOpacity
                style={S.backRow}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <ArrowLeft />
                <Text style={S.backText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <View style={S.infoCard}>
                <Text style={S.infoCardTitle}>✉️ Check your email</Text>
                <Text style={S.infoCardBody}>
                  A temporary password has been sent to{' '}
                  <Text style={{ fontWeight: '700', color: '#DC2626' }}>{email}</Text>
                  . Enter it below along with your new password.
                </Text>
              </View>

              {/* Temp password */}
              <Input
                label="Temporary Password"
                placeholder="Paste from email"
                value={tempPassword}
                onChangeText={v => { setTempPassword(v); setError(''); }}
                secureTextEntry={!showTemp}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => newPassRef.current?.focus()}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowTemp(p => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: spacing.xs }}
                  >
                    {showTemp ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                }
              />

              {/* New password */}
              <View style={{ marginTop: spacing.md }}>
                <Input
                  ref={newPassRef}
                  label="New Password"
                  placeholder="Min 8 chars, A-z, 0-9"
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); setError(''); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowNew(p => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: spacing.xs }}
                    >
                      {showNew ? <EyeOpen /> : <EyeClosed />}
                    </TouchableOpacity>
                  }
                />
                {/* Strength bar */}
                {newPassword.length > 0 && (
                  <View style={S.strengthRow}>
                    <View style={S.strengthBarBg}>
                      <View style={[S.strengthBarFill, {
                        width: `${pwdStrength.width}%` as any,
                        backgroundColor: pwdStrength.color,
                      }]} />
                    </View>
                    <Text style={[S.strengthLabel, { color: pwdStrength.color }]}>
                      {pwdStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm password */}
              <View style={{ marginTop: spacing.md }}>
                <Input
                  ref={confirmRef}
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); setError(''); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleStep2}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowConfirm(p => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: spacing.xs }}
                    >
                      {showConfirm ? <EyeOpen /> : <EyeClosed />}
                    </TouchableOpacity>
                  }
                />
                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <Text style={[S.matchText, {
                    color: confirmPassword === newPassword ? '#22C55E' : '#EF4444',
                  }]}>
                    {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </Text>
                )}
              </View>

              <Button
                title="Reset Password"
                onPress={handleStep2}
                loading={loading}
                disabled={
                  !tempPassword.trim() ||
                  !newPassword.trim() ||
                  !confirmPassword.trim() ||
                  loading
                }
                style={S.button}
              />

              <TouchableOpacity
                style={S.backRow}
                onPress={() => { setStep(1); setError(''); setTempPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                disabled={loading}
                activeOpacity={0.7}
              >
                <ArrowLeft />
                <Text style={S.backText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <View style={S.successContainer}>
              <SuccessCheck />
              <Text style={S.successTitle}>Password Reset!</Text>
              <Text style={S.successBody}>
                Your password has been successfully updated. You can now log in with your new password.
              </Text>
              <Button
                title="Go to Login"
                onPress={() => navigation.goBack()}
                style={S.button}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </AuthTemplate>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  scrollContent:   { paddingBottom: spacing.xxl },
  badge:           {
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeText:       { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  steps:           {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  stepDot:         {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive:   { width: 24, backgroundColor: '#DC2626' },
  stepDotDone:     { backgroundColor: '#22C55E' },
  errorBox:        {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText:       { color: '#991B1B', fontSize: 14 },
  infoCard:        {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCardTitle:   { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  infoCardBody:    { fontSize: 13, color: '#64748B', lineHeight: 20 },
  button:          { marginTop: spacing.xxl },
  backRow:         {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  backText:        { fontSize: 14, color: colors.primary, fontWeight: '600' },
  strengthRow:     {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  strengthBarBg:   {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: 2 },
  strengthLabel:   { fontSize: 11, fontWeight: '600', minWidth: 44 },
  matchText:       { fontSize: 12, fontWeight: '500', marginTop: 4 },
  successContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  successTitle:    { fontSize: 24, fontWeight: '800', color: '#1E293B', marginTop: spacing.sm },
  successBody:     {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
});

export default ResponderForgotPasswordScreen;