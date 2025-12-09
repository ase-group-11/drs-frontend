import {StyleSheet} from 'react-native';

export const otpFormStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: '#111827',
    textAlign: 'center',
  },
  spacing: {
    height: 16,
  },
  error: {
    marginTop: 16,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  subtitle: {
  marginTop: 8,
  marginBottom: 16,
  fontSize: 14,
  color: '#4B5563',
  textAlign: 'center',
  },
  phone: {
  fontWeight: '600',
  }
});