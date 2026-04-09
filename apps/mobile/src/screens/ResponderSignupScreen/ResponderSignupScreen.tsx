// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ResponderSignupScreen/ResponderSignupScreen.tsx
//
// ERT member registration (3-step):
//   Step 1: Fill personal details + role/department
//   Step 2: POST /emergency-team/register  → { phone_number, password, full_name,
//                                              email, role, department, employee_id? }
//           Backend sends a 6-digit OTP via SMS
//   Step 3: POST /emergency-team/register/verify → { phone_number, otp }
//           Creates account and returns JWT tokens → navigate to Main
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
  Modal,
  FlatList,
  ActivityIndicator,
  InputAccessoryView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AuthTemplate }   from '@templates/AuthTemplate';
import { AuthHeader }     from '@organisms/AuthHeader';
import { Input }          from '@atoms/Input';
import { Button }         from '@atoms/Button';
import { Text }           from '@atoms/Text';
import { colors }         from '@theme/colors';
import { spacing }        from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';
import { useOTPTimer } from '@hooks/useOTPTimer';
import { API } from '@services/apiConfig';

// ─── Constants ────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'STAFF',   label: 'Staff',   desc: 'Standard emergency responder' },
  { value: 'MANAGER', label: 'Manager', desc: 'Team management access' },
  { value: 'ADMIN',   label: 'Admin',   desc: 'Full system access' },
];

const DEPARTMENTS = [
  { value: 'FIRE',    label: '🔴 Fire',    desc: 'Fire Department' },
  { value: 'MEDICAL', label: '🔵 Medical', desc: 'Ambulance & Paramedics' },
  { value: 'POLICE',  label: '⚫ Police',  desc: 'Law Enforcement' },
  { value: 'IT',      label: '🟢 IT',      desc: 'Technical Support' },
];

const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA:     '@auth/user_data',
  USER_ROLE:     '@auth/user_role',
};

// ─── Icons ────────────────────────────────────────────────────────────────

const ArrowLeft = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7"
      stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDown = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Dropdown Picker ──────────────────────────────────────────────────────

interface DropdownItem { value: string; label: string; desc?: string; }

interface DropdownProps {
  label: string;
  placeholder: string;
  value: string;
  items: DropdownItem[];
  onSelect: (v: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ label, placeholder, value, items, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.value === value);

  return (
    <View style={DD.wrapper}>
      <Text style={DD.label}>{label}</Text>
      <TouchableOpacity
        style={DD.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[DD.triggerText, !selected && { color: '#9CA3AF' }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={DD.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={DD.sheet}>
            <Text style={DD.sheetTitle}>{label}</Text>
            {items.map(item => (
              <TouchableOpacity
                key={item.value}
                style={[DD.sheetItem, item.value === value && DD.sheetItemActive]}
                onPress={() => { onSelect(item.value); setOpen(false); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[DD.sheetItemLabel, item.value === value && { color: '#DC2626' }]}>
                    {item.label}
                  </Text>
                  {item.desc && <Text style={DD.sheetItemDesc}>{item.desc}</Text>}
                </View>
                {item.value === value && (
                  <Text style={{ color: '#DC2626', fontSize: 16 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const DD = StyleSheet.create({
  wrapper:        { marginBottom: spacing.md },
  label:          { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  trigger:        {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  triggerText:    { fontSize: 15, color: colors.textPrimary, flex: 1 },
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle:     { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: spacing.md },
  sheetItem:      {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetItemActive:{ backgroundColor: '#FFF5F5', marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, borderRadius: 8 },
  sheetItemLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  sheetItemDesc:  { fontSize: 12, color: '#64748B', marginTop: 2 },
});

// ─── Main Component ───────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export const ResponderSignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [employeeId, setEmployeeId]   = useState('');
  const [role, setRole]               = useState('');
  const [department, setDepartment]   = useState('');

  // Step 1 password
  const [password, setPassword]         = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Step 2 OTP
  const [otp, setOtp] = useState('');

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const otpRef = useRef<TextInput>(null);
  const { canResend, resendLoading, resendSuccess, formattedTime, triggerResend, resetTimer } = useOTPTimer();

  // ── Password strength ───────────────────────────────────────────────────
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
  const pwdStrength = getPasswordStrength(password);

  // ── Validate Step 1 ─────────────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (!fullName.trim())   return 'Please enter your full name';
    if (!email.trim())      return 'Please enter your email address';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
    if (!phone.trim())      return 'Please enter your phone number';
    if (!phone.startsWith('+')) return 'Phone must be in international format (e.g. +353...)';
    if (!role)              return 'Please select your role';
    if (!department)        return 'Please select your department';
    if (!password)          return 'Please enter a password';
    if (password.length < 8)          return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password))      return 'Password must include at least one uppercase letter';
    if (!/[a-z]/.test(password))      return 'Password must include at least one lowercase letter';
    if (!/[0-9]/.test(password))      return 'Password must include at least one number';
    if (password !== confirmPass)     return 'Passwords do not match';
    return null;
  };

  // ── Submit Step 1 → POST /emergency-team/register ───────────────────────
  const handleStep1 = async () => {
    const validationError = validateStep1();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
      const body: Record<string, any> = {
        phone_number: phone.trim(),
        password,
        full_name:    fullName.trim(),
        email:        email.trim().toLowerCase(),
        role:         role,
        department:   department,
      };
      if (employeeId.trim()) body.employee_id = employeeId.trim();

      const res = await fetch(`${API_BASE_URL}${API.responder.register()}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      clearTimeout(tid);
      const data = await res.json();

      if (!res.ok) {
        const raw = data.detail || data.message || 'Registration failed';
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please check your details and try again.'
          : typeof raw === 'string' ? raw : 'Registration failed. Please try again.';
        setError(friendly);
        return;
      }
      setStep(2);
      resetTimer();
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Request timed out. Check your connection.');
      else setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Step 2 → POST /emergency-team/register/verify ────────────────
  const handleResendOtp = async (): Promise<void> => {
    setOtp('');
    setError('');
    // Re-send registration request — backend sends a new OTP
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
    const res = await fetch(`${API_BASE_URL}${API.responder.register()}`, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        phone_number: phone.trim(),
        full_name:    fullName.trim(),
        email:        email.trim().toLowerCase(),
        password,
        role:         selectedRole,
        department:   selectedDept,
        employee_id:  employeeId.trim() || undefined,
      }),
    });
    clearTimeout(tid);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || data.message || 'Failed to resend OTP');
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
      const res = await fetch(`${API_BASE_URL}${API.responder.registerVerify()}`, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone_number: phone.trim(), otp: otpClean }),
      });
      clearTimeout(tid);
      const data = await res.json();

      if (!res.ok) {
        const raw = data.detail || data.message || 'Invalid OTP';
        const friendly = typeof raw === 'string' && raw.includes('validation error')
          ? 'Server error. Please try again.'
          : typeof raw === 'string' ? raw : 'Invalid or expired OTP.';
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

  // ── Header text per step ────────────────────────────────────────────────
  const stepTitle    = step === 1 ? 'Create Account' : 'Verify Phone';
  const stepSubtitle = step === 1 ? 'Emergency Services Registration' : 'Enter the OTP sent to your phone';

  return (
    <AuthTemplate header={<AuthHeader title={stepTitle} subtitle={stepSubtitle} />}>
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
            <Text style={S.badgeText}>🚒  Authorised Personnel Only</Text>
          </View>

          {/* Progress bar */}
          <View style={S.progressRow}>
            {[1, 2].map(n => (
              <View key={n} style={[S.progressSegment, step >= n && S.progressSegmentActive]} />
            ))}
          </View>
          <Text style={S.progressLabel}>Step {step} of 2</Text>

          {/* Error */}
          {!!error && (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          )}

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <>
              <Input
                label="Full Name"
                placeholder="John Murphy"
                value={fullName}
                onChangeText={v => { setFullName(v); setError(''); }}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="Email Address"
                  placeholder="name@emergency.ie"
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="Phone Number (E.164 format)"
                  placeholder="+353891234567"
                  value={phone}
                  onChangeText={v => { setPhone(v); setError(''); }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="Employee ID (Optional)"
                  placeholder="EMP-12345"
                  value={employeeId}
                  onChangeText={v => { setEmployeeId(v); setError(''); }}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <Dropdown
                  label="Department"
                  placeholder="Select your department"
                  value={department}
                  items={DEPARTMENTS}
                  onSelect={v => { setDepartment(v); setError(''); }}
                />
              </View>

              <Dropdown
                label="Role"
                placeholder="Select your role"
                value={role}
                items={ROLES}
                onSelect={v => { setRole(v); setError(''); }}
              />

              {/* Password */}
              <Input
                label="Password"
                placeholder="Min 8 chars, A-z, 0-9"
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="next"
                rightElement={
                  <TouchableOpacity onPress={() => setShowPass(p => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: spacing.xs }}>
                    {showPass ? <EyeOpen /> : <EyeClosed />}
                  </TouchableOpacity>
                }
              />
              {password.length > 0 && (
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

              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPass}
                  onChangeText={v => { setConfirmPass(v); setError(''); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleStep1}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowConfirm(p => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: spacing.xs }}>
                      {showConfirm ? <EyeOpen /> : <EyeClosed />}
                    </TouchableOpacity>
                  }
                />
                {confirmPass.length > 0 && (
                  <Text style={[S.matchText, { color: confirmPass === password ? '#22C55E' : '#EF4444' }]}>
                    {confirmPass === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </Text>
                )}
              </View>

              <Button
                title="Create Account"
                onPress={handleStep1}
                loading={loading}
                disabled={loading}
                style={S.button}
              />

              <View style={S.footer}>
                <Text variant="bodyMedium" color="textSecondary">Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                  <Text variant="bodyMedium" color="primary">Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <>
              <View style={S.infoCard}>
                <Text style={S.infoCardTitle}>📱 Check your phone</Text>
                <Text style={S.infoCardBody}>
                  A 6-digit OTP has been sent to{' '}
                  <Text style={{ fontWeight: '700', color: '#DC2626' }}>{phone}</Text>.
                  It expires in 5 minutes.
                </Text>
              </View>

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
                inputAccessoryViewID={Platform.OS === 'ios' ? OTP_ACCESSORY_ID : undefined}
              />
              {Platform.OS === 'ios' && (
                <InputAccessoryView nativeID={OTP_ACCESSORY_ID}>
                  <View style={{ height: 0 }} />
                </InputAccessoryView>
              )}

              <Button
                title="Verify & Create Account"
                onPress={handleStep2}
                loading={loading}
                disabled={otp.trim().length !== 6 || loading}
                style={S.button}
              />

              {/* Resend OTP */}
              <View style={S.resendRow}>
                {resendLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#DC2626" />
                    <Text style={S.resendText}> Sending new code…</Text>
                  </>
                ) : resendSuccess ? (
                  <Text style={S.resendSuccess}>✅ OTP resent successfully!</Text>
                ) : canResend ? (
                  <TouchableOpacity onPress={() => triggerResend(handleResendOtp)} activeOpacity={0.7}>
                    <Text style={S.resendLink}>Didn't receive code? Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={S.resendText}>Resend in <Text style={S.resendTimer}>{formattedTime}</Text></Text>
                )}
              </View>

              <TouchableOpacity
                style={S.backRow}
                onPress={() => { setStep(1); setOtp(''); setError(''); }}
                disabled={loading}
                activeOpacity={0.7}
              >
                <ArrowLeft />
                <Text style={S.backText}>Back — edit details</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </AuthTemplate>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  scrollContent:     { paddingBottom: spacing.xxl },
  badge:             {
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeText:         { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  progressRow:       {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  progressSegment:   {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressSegmentActive: { backgroundColor: '#DC2626' },
  progressLabel:     {
    fontSize: 12, color: '#64748B', fontWeight: '500',
    marginBottom: spacing.lg,
  },
  errorBox:          {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText:         { color: '#991B1B', fontSize: 14 },
  strengthRow:       {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 6, marginBottom: 2, gap: 8,
  },
  strengthBarBg:     {
    flex: 1, height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2, overflow: 'hidden',
  },
  strengthBarFill:   { height: '100%', borderRadius: 2 },
  strengthLabel:     { fontSize: 11, fontWeight: '600', minWidth: 44 },
  matchText:         { fontSize: 12, fontWeight: '500', marginTop: 4 },
  button:            { marginTop: spacing.xxl },
  footer:            {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  infoCard:          {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCardTitle:     { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  infoCardBody:      { fontSize: 13, color: '#64748B', lineHeight: 20 },
  otpLabel:          { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  resendRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, marginBottom: spacing.xs },
  resendText:        { fontSize: 13, color: '#6B7280' },
  resendTimer:       { color: '#DC2626', fontWeight: '700' },
  resendLink:        { fontSize: 13, color: '#DC2626', fontWeight: '700', textDecorationLine: 'underline' },
  resendSuccess:     { fontSize: 13, color: '#166534', fontWeight: '600' },
  otpInput:          {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 24, fontWeight: '700',
    letterSpacing: 8, textAlign: 'center',
    color: colors.textPrimary,
    backgroundColor: '#FFF',
  },
  backRow:           {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg, gap: spacing.xs,
  },
  backText:          { fontSize: 14, color: colors.primary, fontWeight: '600' },
});

export default ResponderSignupScreen;