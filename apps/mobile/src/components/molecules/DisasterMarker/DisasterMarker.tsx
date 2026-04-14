// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/molecules/DisasterMarker/DisasterMarker.tsx
//
// Redesigned: each disaster type has a distinct SVG icon + shaped background.
// Severity ring thickness and glow colour provide instant threat-level reading.
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, Polygon, G } from 'react-native-svg';
import type { DisasterType, DisasterSeverity } from '../../../types/disaster';

// ─── Severity system ──────────────────────────────────────────────────────

const SEVERITY_RING: Record<DisasterSeverity, { border: string; bg: string; glow: string }> = {
  critical: { border: '#DC2626', bg: '#FFF1F1', glow: '#DC2626' },
  high:     { border: '#EA580C', bg: '#FFF4ED', glow: '#EA580C' },
  medium:   { border: '#CA8A04', bg: '#FFFBEB', glow: '#CA8A04' },
  low:      { border: '#2563EB', bg: '#EFF6FF', glow: '#2563EB' },
};

// ─── SVG icons per disaster type ─────────────────────────────────────────
// All icons are 24×24 viewBox, filled with the iconColor prop

interface IconProps { color: string; size?: number; }

const FireIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2c0 0-3 4-3 7.5C9 12 10.5 13 12 13s3-1 3-3.5c0 0 2 2.5 2 5.5 0 2.76-2.24 5-5 5S7 17.76 7 15c0-3.5 2-7 5-13z"
      fill={color}
    />
    <Path
      d="M12 17c-.55 0-1-.45-1-1 0-.75.5-1.5 1-2 .5.5 1 1.25 1 2 0 .55-.45 1-1 1z"
      fill="#FFF"
      opacity="0.8"
    />
  </Svg>
);

const FloodIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 13c3 0 3-2 6-2s3 2 6 2 3-2 6-2"
      stroke={color} strokeWidth="2.2" strokeLinecap="round"
    />
    <Path
      d="M3 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2"
      stroke={color} strokeWidth="2.2" strokeLinecap="round"
    />
    <Path
      d="M12 3 L8 9 h8 Z"
      fill={color} opacity="0.8"
    />
  </Svg>
);

const StormIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 9.5C19 6.46 16.54 4 13.5 4c-2.5 0-4.63 1.64-5.31 3.89C7.82 7.64 7.43 7.5 7 7.5A3.5 3.5 0 0 0 3.5 11c0 1.93 1.57 3.5 3.5 3.5h5"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"
    />
    <Path d="M13 12 L10 17 h4 L11 22" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const EarthquakeIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 12 L5 9 L8 14 L11 8 L14 13 L17 10 L20 12 L22 12"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <Path d="M3 20 L21 20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
  </Svg>
);

const ExplosionIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2 L14 7 L19 4 L16 9 L22 10 L17 13 L20 19 L14 16 L12 22 L10 16 L4 19 L7 13 L2 10 L8 9 L5 4 L10 7 Z"
      fill={color}
    />
    <Circle cx="12" cy="12" r="3" fill="#FFF" opacity="0.6"/>
  </Svg>
);

const GasLeakIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Ellipse cx="12" cy="14" rx="8" ry="5" fill={color} opacity="0.35"/>
    <Path d="M8 14 Q10 8 12 6 Q14 8 16 14" fill={color} opacity="0.7"/>
    <Path d="M10 14 Q11 10 12 9 Q13 10 14 14" fill={color}/>
    <Path d="M6 10 Q5 7 7 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <Path d="M18 10 Q19 7 17 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </Svg>
);

const HazmatIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none"/>
    <Circle cx="12" cy="12" r="3" fill={color}/>
    <Path d="M12 3 Q17 8 12 12 Q7 8 12 3" fill={color} opacity="0.5"/>
    <Path d="M21 12 Q16 17 12 12 Q16 7 21 12" fill={color} opacity="0.5"/>
    <Path d="M3 12 Q8 17 12 12 Q8 7 3 12" fill={color} opacity="0.5"/>
  </Svg>
);

const LandslideIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M2 18 L8 8 L13 14 L16 11 L22 18 Z" fill={color} opacity="0.9"/>
    <Path d="M2 18 L22 18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <Path d="M13 6 L16 3 L18 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
  </Svg>
);

const AccidentIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="9" width="20" height="8" rx="3" fill={color} opacity="0.9"/>
    <Rect x="5" y="6" width="14" height="5" rx="2" fill={color} opacity="0.7"/>
    <Circle cx="7" cy="18" r="2.5" fill="#FFF" stroke={color} strokeWidth="1.5"/>
    <Circle cx="17" cy="18" r="2.5" fill="#FFF" stroke={color} strokeWidth="1.5"/>
    <Path d="M10 9 L14 9" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
  </Svg>
);

const BuildingCollapseIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21 L8 5 L12 15 L16 5 L21 21 Z" stroke={color} strokeWidth="2" fill={color} opacity="0.3"/>
    <Path d="M3 21 L21 21" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <Path d="M5 15 L8 12 M10 10 L13 8 M16 12 L18 10" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
  </Svg>
);

const MedicalIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" fill={color} opacity="0.15"/>
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="2" fill="none"/>
    <Rect x="11" y="7" width="2" height="10" rx="1" fill={color}/>
    <Rect x="7" y="11" width="10" height="2" rx="1" fill={color}/>
  </Svg>
);

const PowerOutageIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2 L4 14 h7 L11 22 L20 10 h-7 Z" fill={color}/>
  </Svg>
);

const WaterContaminationIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2 C12 2 5 10 5 15 a7 7 0 0 0 14 0 C19 10 12 2 12 2 Z" fill={color} opacity="0.8"/>
    <Path d="M9 16 L15 16 M10 19 L14 19" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
    <Path d="M12 11 L12 14" stroke="#FFF" strokeWidth="2" strokeLinecap="round"/>
    <Circle cx="12" cy="16" r="1" fill="#FFF"/>
  </Svg>
);

const CrimeIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 1 L15 8 L22 9 L17 14 L18 21 L12 18 L6 21 L7 14 L2 9 L9 8 Z"
      fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <Circle cx="12" cy="12" r="3" fill={color}/>
  </Svg>
);

const TerroristIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" fill={color} opacity="0.15" stroke={color} strokeWidth="2"/>
    <Path d="M12 7 L12 13" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    <Circle cx="12" cy="16" r="1.5" fill={color}/>
  </Svg>
);

const DefaultWarningIcon = ({ color }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      fill={color} opacity="0.15" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <Path d="M12 9 L12 13" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <Circle cx="12" cy="17" r="1.5" fill={color}/>
  </Svg>
);

// ─── Icon map ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<IconProps>> = {
  fire:                FireIcon,
  flood:               FloodIcon,
  storm:               StormIcon,
  hurricane:           StormIcon,
  tornado:             StormIcon,
  tsunami:             FloodIcon,
  earthquake:          EarthquakeIcon,
  explosion:           ExplosionIcon,
  gas_leak:            GasLeakIcon,
  hazmat:              HazmatIcon,
  landslide:           LandslideIcon,
  accident:            AccidentIcon,
  building_collapse:   BuildingCollapseIcon,
  medical_emergency:   MedicalIcon,
  power_outage:        PowerOutageIcon,
  water_contamination: WaterContaminationIcon,
  crime:               CrimeIcon,
  riot:                DefaultWarningIcon,
  terrorist_attack:    TerroristIcon,
  drought:             DefaultWarningIcon,
  heatwave:            DefaultWarningIcon,
  coldwave:            DefaultWarningIcon,
  other:               DefaultWarningIcon,
};

// ─── Component ────────────────────────────────────────────────────────────

export interface DisasterMarkerProps {
  type:     DisasterType;
  severity: DisasterSeverity;
  /** If true, shows a red pulse ring (used for critical markers) */
  pulse?:   boolean;
}

export const DisasterMarker: React.FC<DisasterMarkerProps> = ({ type, severity, pulse }) => {
  const theme  = SEVERITY_RING[severity] ?? SEVERITY_RING.medium;
  const Icon   = ICON_MAP[type?.toLowerCase?.()] ?? DefaultWarningIcon;
  const isCrit = severity === 'critical';

  return (
    <View style={styles.wrapper}>
      {/* Outer glow ring for critical/high */}
      {(isCrit || severity === 'high') && (
        <View style={[styles.glowRing, { borderColor: theme.border, opacity: isCrit ? 0.3 : 0.2 }]} />
      )}

      {/* Main marker circle */}
      <View style={[
        styles.marker,
        {
          backgroundColor: theme.bg,
          borderColor:     theme.border,
          borderWidth:     isCrit ? 3.5 : severity === 'high' ? 3 : 2.5,
        },
      ]}>
        <Icon color={theme.border} />
      </View>

      {/* Critical indicator dot */}
      {isCrit && <View style={styles.critDot} />}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
  },
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 8,
  },
  critDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default DisasterMarker;