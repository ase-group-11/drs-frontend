import {StyleSheet} from 'react-native';

export const textInputStyles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    color: '#4B5563',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: '#DC2626',
  },
});