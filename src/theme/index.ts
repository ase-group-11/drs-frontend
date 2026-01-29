export { colors, type ColorKeys } from './colors';
export { typography, type TypographyKeys } from './typography';
export { 
  spacing, 
  borderRadius, 
  shadows,
  type SpacingKeys,
  type BorderRadiusKeys,
  type ShadowKeys,
} from './spacing';

export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  shadows: require('./spacing').shadows,
};

export type Theme = typeof theme;
