import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 80 }) => {
  const scale = size / 80;

  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      <Svg
        width={size}
        height={size * 1.1}
        viewBox="0 0 80 88"
        fill="none"
      >
        <Defs>
          <LinearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#2B4A73" />
            <Stop offset="100%" stopColor="#1E3A5F" />
          </LinearGradient>
        </Defs>
        
        {/* Shield shape */}
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
          points="40,28 54,52 26,52"
          fill="none"
          stroke="#E85D4C"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        
        {/* Exclamation mark line */}
        <Path
          d="M40 36 L40 44"
          stroke="#E85D4C"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Exclamation mark dot */}
        <Circle cx="40" cy="48" r="1.5" fill="#E85D4C" />
        
        {/* DRS text */}
        <Path
          d="M31 60 L31 68 L34 68 C36.5 68 38 66.5 38 64 C38 61.5 36.5 60 34 60 L31 60Z"
          fill="white"
          fillOpacity="0.9"
        />
        <Path
          d="M41 60 L41 68 L43 68 L43 65.5 L44 65.5 L46 68 L48.5 68 L46 65 C47 64.5 47.5 63.5 47.5 62.5 C47.5 61 46 60 44 60 L41 60Z M43 61.5 L44 61.5 C45 61.5 45.5 62 45.5 62.5 C45.5 63 45 63.5 44 63.5 L43 63.5 L43 61.5Z"
          fill="white"
          fillOpacity="0.9"
        />
        <Path
          d="M50 65.5 C50 67 51.5 68.3 54 68.3 C56.5 68.3 58 67 58 65.5 C58 64 57 63.5 54.5 63 C52.5 62.5 52 62.3 52 62 C52 61.5 52.5 61.2 53.5 61.2 C54.5 61.2 55 61.5 55.2 62 L57.5 62 C57.3 60.5 56 59.7 53.5 59.7 C51.2 59.7 50 60.8 50 62 C50 63.3 51 64 53 64.5 C55.5 65 56 65.2 56 65.7 C56 66.2 55.3 66.8 54 66.8 C52.7 66.8 52 66.2 51.8 65.5 L50 65.5Z"
          fill="white"
          fillOpacity="0.9"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;
