// ── @env must be first, before any imports that use it ──
// jest.mock('@env', () => ({
//   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.test_token_123',
//   EXPO_PUBLIC_API_URL: 'http://192.168.1.1:8000/api/v1',
//   EXPO_PUBLIC_ENV: 'test',
// }));

global.fetch = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:     jest.fn(() => Promise.resolve(null)),
  setItem:     jest.fn(() => Promise.resolve()),
  removeItem:  jest.fn(() => Promise.resolve()),
  clear:       jest.fn(() => Promise.resolve()),
  getAllKeys:   jest.fn(() => Promise.resolve([])),
  multiGet:    jest.fn(() => Promise.resolve([])),
  multiSet:    jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockView = (props) => React.createElement(View, props);
  return {
    setAccessToken: jest.fn(),
    MapView: MockView, Camera: MockView, UserLocation: MockView,
    MarkerView: MockView, ShapeSource: MockView, LineLayer: MockView,
    CircleLayer: MockView, FillExtrusionLayer: MockView, FillLayer: MockView,
    StyleURL: { Street: 'mapbox://styles/mapbox/streets-v11' },
  };
});
// ... rest of your mocks unchanged

// ─── Geolocation mock ─────────────────────────────────────────────────────
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) =>
    success({ coords: { latitude: 53.3498, longitude: -6.2603 } })
  ),
}));

// ─── react-native-svg mock ────────────────────────────────────────────────
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    Svg: View, Path: View, Circle: View, Rect: View, G: View,
    default: View,
  };
});

// ─── Constants mock ───────────────────────────────────────────────────────
jest.mock('@constants/index', () => ({
  API_BASE_URL: 'http://192.168.1.1:8000/api/v1',
  API_TIMEOUT: 5000,
  OTP_RESEND_TIMEOUT: 60,
  OTP_LENGTH: 6,
  DEFAULT_COUNTRY: { code: 'IE', dialCode: '+353', name: 'Ireland', flag: '🇮🇪' },
  COUNTRIES: [{ code: 'IE', dialCode: '+353', name: 'Ireland', flag: '🇮🇪' }],
}));

// ─── Theme mocks ──────────────────────────────────────────────────────────
jest.mock('@theme/colors', () => ({
  colors: {
    primary: '#FF6B6B', error: '#EF4444', coral: '#F97316',
    warning: '#EAB308', white: '#FFFFFF', transparent: 'transparent',
    gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB',
    gray300: '#D1D5DB', gray500: '#6B7280',
    textPrimary: '#111827', textSecondary: '#6B7280',
    textDisabled: '#D1D5DB', textPlaceholder: '#9CA3AF',
    border: '#E5E7EB', errorBg: '#FEF2F2',
    background: '#FFFFFF',                  // ← ADD
    backgroundSecondary: '#F5F5F5',         // ← ADD
    success: '#22C55E',                     // ← ADD
    navy: '#1E3A5F',                        // ← ADD
  },
}));

jest.mock('@theme/spacing', () => ({
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  shadows: {},
}));

jest.mock('@theme/typography', () => ({
  typography: { bodyMedium: { fontSize: 14, fontWeight: '400' } },
}));

// ─── Navigation mock ──────────────────────────────────────────────────────
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), reset: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

// Silence noisy React Native warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View, TapGestureHandler: View,
    LongPressGestureHandler: View, PinchGestureHandler: View,
    RotationGestureHandler: View, FlingGestureHandler: View,
    NativeViewGestureHandler: View, RawButton: View,
    RectButton: View, BorderlessButton: View, BaseButton: View,
    gestureHandlerRootHOC: jest.fn(c => c),
    State: {}, Directions: {},
  };
});
