import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
});

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    fontFamily: fontFamily?.bold,
  } as TextStyle,
  
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: fontFamily?.bold,
  } as TextStyle,
  
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  h5: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  // Body text
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    fontFamily: fontFamily?.regular,
  } as TextStyle,
  
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: fontFamily?.regular,
  } as TextStyle,
  
  bodySmall: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: fontFamily?.regular,
  } as TextStyle,
  
  // Labels
  labelLarge: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: fontFamily?.medium,
  } as TextStyle,
  
  labelMedium: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: fontFamily?.medium,
  } as TextStyle,
  
  labelSmall: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: fontFamily?.medium,
  } as TextStyle,
  
  // Caption
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: fontFamily?.regular,
  } as TextStyle,
  
  // Button text
  buttonLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  buttonMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  buttonSmall: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: fontFamily?.semibold,
  } as TextStyle,
  
  // Brand text
  brand: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: fontFamily?.bold,
    letterSpacing: 1.5,
  } as TextStyle,
} as const;

export type TypographyKeys = keyof typeof typography;
