import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path, Circle, Polygon, Defs, LinearGradient, Stop, Text as SvgText,
} from 'react-native-svg';

export interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 80 }) => (
  <View style={[styles.container, { width: size, height: size * 1.1 }]}>
    <Svg width={size} height={size * 1.1} viewBox="0 0 80 88" fill="none">
      <Defs>
        <LinearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#2B4A73" />
          <Stop offset="100%" stopColor="#1E3A5F" />
        </LinearGradient>
      </Defs>

      {/* Shield body */}
      <Path
        d="M40 4 L72 16 L72 44 C72 62 58 76 40 84 C22 76 8 62 8 44 L8 16 L40 4Z"
        fill="url(#shieldGradient)"
        stroke="#1E3A5F"
        strokeWidth="2"
      />

      {/* Inner shield border */}
      <Path
        d="M40 10 L66 20 L66 44 C66 58 54 70 40 76 C26 70 14 58 14 44 L14 20 L40 10Z"
        fill="none"
        stroke="#E85D4C"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />

      {/* Warning triangle */}
      <Polygon
        points="40,24 55,50 25,50"
        fill="none"
        stroke="#E85D4C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Exclamation line */}
      <Path
        d="M40 32 L40 41"
        stroke="#E85D4C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Exclamation dot */}
      <Circle cx="40" cy="45.5" r="1.5" fill="#E85D4C" />

      {/* DRS text — centred, using SvgText for reliability */}
      <SvgText
        x="40"
        y="67"
        fontSize="12"
        fontWeight="bold"
        fill="white"
        fillOpacity="0.95"
        textAnchor="middle"
        letterSpacing="2"
      >
        DRS
      </SvgText>
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;