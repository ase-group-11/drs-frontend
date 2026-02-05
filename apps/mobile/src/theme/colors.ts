export const colors = {
  // Primary colors
  primary: '#1890FF',
  primaryLight: '#40A9FF',
  primaryDark: '#096DD9',
  
  // Secondary colors (DRS brand)
  navy: '#1E3A5F',
  navyLight: '#2B4A73',
  navyDark: '#152942',
  
  // Accent colors
  coral: '#E85D4C',
  coralLight: '#F07A6C',
  coralDark: '#D14434',
  
  // Success colors
  success: '#52C41A',
  successLight: '#73D13D',
  successDark: '#389E0D',
  successBg: '#F6FFED',
  
  // Error colors
  error: '#FF4D4F',
  errorLight: '#FF7875',
  errorDark: '#CF1322',
  errorBg: '#FFF2F0',
  
  // Warning colors
  warning: '#FAAD14',
  warningLight: '#FFC53D',
  warningDark: '#D48806',
  warningBg: '#FFFBE6',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E8E8E8',
  gray300: '#D9D9D9',
  gray400: '#BFBFBF',
  gray500: '#8C8C8C',
  gray600: '#595959',
  gray700: '#434343',
  gray800: '#262626',
  gray900: '#141414',
  
  // Text colors
  textPrimary: '#262626',
  textSecondary: '#8C8C8C',
  textDisabled: '#BFBFBF',
  textPlaceholder: '#BFBFBF',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  
  // Border colors
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  borderDark: '#D9D9D9',
  
  // Transparent
  transparent: 'transparent',
} as const;

export type ColorKeys = keyof typeof colors;
