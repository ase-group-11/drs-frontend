// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/RerouteOverrideScreen/RerouteOverrideScreen.tsx
//
// Responder Traffic Override Screen
// Lets an authorised responder inspect the live reroute plan for a disaster
// and submit a manual operator override via POST /reroute/override.
//
// Navigation param:  { disasterId: string }
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import MapboxGL from '@rnmapbox/maps';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';

import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import { authRequest, authService } from '@services/authService';
import { API } from '@services/apiConfig';
import { disasterService, RerouteOverrideRequest } from '@services/disasterService';
import { formatShortDateTime } from '@utils/formatters';
import { wsService } from '@services/wsService';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

// ── Constants ──────────────────────────────────────────────────────────────

const RED    = '#DC2626';
const ORANGE = '#EA580C';
const BLUE   = '#2563EB';
const GREEN  = '#16A34A';
const PURPLE = '#7C3AED';

// ── Override type config ───────────────────────────────────────────────────

type OverrideType = 'close_lane' | 'open_lane' | 'pin_detour' | 'corridor_priority';
type Priority     = 'low' | 'medium' | 'high' | 'critical';

interface OverrideTypeConfig {
  value:       OverrideType;
  label:       string;
  description: string;
  icon:        string;
  color:       string;
  needsSegment: boolean;
  needsRoute:   boolean;
}

const OVERRIDE_TYPES: OverrideTypeConfig[] = [
  {
    value:       'close_lane',
    label:       'Close Lane',
    description: 'Force a road segment closed immediately.',
    icon:        '🚧',
    color:       RED,
    needsSegment: true,
    needsRoute:   false,
  },
  {
    value:       'open_lane',
    label:       'Open Lane',
    description: 'Override an auto-closed segment and re-open it.',
    icon:        '✅',
    color:       GREEN,
    needsSegment: true,
    needsRoute:   false,
  },
  {
    value:       'pin_detour',
    label:       'Pin Detour',
    description: 'Lock a specific route as the preferred detour.',
    icon:        '📍',
    color:       BLUE,
    needsSegment: false,
    needsRoute:   true,
  },
  {
    value:       'corridor_priority',
    label:       'Corridor Priority',
    description: 'Reserve corridor for emergency vehicles only.',
    icon:        '🚨',
    color:       PURPLE,
    needsSegment: false,
    needsRoute:   false,
  },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low',      label: 'Low',      color: '#6B7280' },
  { value: 'medium',   label: 'Medium',   color: ORANGE },
  { value: 'high',     label: 'High',     color: RED },
  { value: 'critical', label: 'Critical', color: PURPLE },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtIso = formatShortDateTime;

/** Convert backend [lat, lon][] to Mapbox [lon, lat][] */
const toMapboxCoords = (points: number[][]): [number, number][] =>
  (points ?? [])
    .filter(p => Array.isArray(p) && p.length >= 2)
    .map(p => [p[1], p[0]] as [number, number]);

const buildLineGeoJSON = (allCoords: [number, number][][]) => ({
  type: 'FeatureCollection' as const,
  features: allCoords
    .filter(c => c.length >= 2)
    .map((coords, i) => ({
      type: 'Feature' as const,
      id: String(i),
      geometry: { type: 'LineString' as const, coordinates: coords },
      properties: {},
    })),
});

// ── Sub-components ─────────────────────────────────────────────────────────

const BackArrow = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress} activeOpacity={0.7}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  </TouchableOpacity>
);

const StatBox = ({
  value, label, color,
}: { value: string; label: string; color: string }) => (
  <View style={[S.statBox, { borderTopColor: color }]}>
    <Text style={[S.statVal, { color }]}>{value}</Text>
    <Text style={S.statLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={S.sectionTitle}>{children}</Text>
);

// ── Screen ─────────────────────────────────────────────────────────────────

export const RerouteOverrideScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { disasterId } = route.params ?? {};

  // ── State ────────────────────────────────────────────────────────────────
  const [plan,      setPlan]      = useState<any>(null);
  const [planLoad,  setPlanLoad]  = useState(true);
  const [planError, setPlanError] = useState('');

  const [overrideType, setOverrideType] = useState<OverrideType>('close_lane');
  const [segmentId,    setSegmentId]    = useState('');
  const [routeId,      setRouteId]      = useState('');
  const [priority,     setPriority]     = useState<Priority>('high');

  const [submitting,      setSubmitting]      = useState(false);
  const [result,          setResult]          = useState<{ routes_recomputed: number } | null>(null);
  const [submitErr,       setSubmitErr]       = useState('');
  const [manualSegmentId, setManualSegmentId] = useState('');

  const selectedType = OVERRIDE_TYPES.find(t => t.value === overrideType)!;

  // ── Mini-map refs & derived geometry ────────────────────────────────────
  const miniMapCameraRef = useRef<MapboxGL.Camera>(null);

  const blockedRoadsCoords = useMemo(() =>
    (plan?.blocked_roads ?? [])
      .map((r: any) => toMapboxCoords(r.points ?? []))
      .filter((c: [number, number][]) => c.length >= 2),
    [plan],
  );

  const chosenRoutesCoords = useMemo(() =>
    (plan?.chosen_routes ?? [])
      .map((r: any) => toMapboxCoords(r.points ?? []))
      .filter((c: [number, number][]) => c.length >= 2),
    [plan],
  );

  const blockedRoadsGeoJSON = useMemo(() => buildLineGeoJSON(blockedRoadsCoords), [blockedRoadsCoords]);
  const chosenRoutesGeoJSON = useMemo(() => buildLineGeoJSON(chosenRoutesCoords), [chosenRoutesCoords]);;

  // ── Load current plan ────────────────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    if (!disasterId) return;
    setPlanLoad(true);
    setPlanError('');
    try {
      // GET /reroute/plans returns all active plans; find the one for this disaster.
      const res = await authRequest<any>(API.reroute.plans());
      const plans: any[] = Array.isArray(res) ? res : (res?.plans ?? [res]);
      const matched = plans.find((p: any) => p.disaster_id === disasterId) ?? null;
      setPlan(matched);
    } catch (e: any) {
      if (e?.status === 422 || e?.status === 404) {
        setPlan(null);
      } else {
        const raw = e?.message;
        const msg = typeof raw === 'string' ? raw : 'Could not load reroute plan.';
        setPlanError(msg);
      }
    } finally {
      setPlanLoad(false);
    }
  }, [disasterId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // Reload plan each time this screen regains focus
  useFocusEffect(useCallback(() => {
    loadPlan();
  }, [loadPlan]));

  // Subscribe to WS events that indicate plan data has changed
  useEffect(() => {
    const REFRESH_EVENTS = ['reroute.triggered', 'route.updated', 'disaster.cleared', 'disaster.resolved'];
    const unsub = wsService.onAlert((alert: any) => {
      if (
        REFRESH_EVENTS.includes(alert.event_type) &&
        (alert.data?.disaster_id === disasterId || !alert.data?.disaster_id)
      ) {
        loadPlan();
      }
    });
    return unsub;
  }, [disasterId, loadPlan]);

  // Reset optional fields when type changes
  useEffect(() => {
    setSegmentId('');
    setRouteId('');
    setManualSegmentId('');
  }, [overrideType]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // For close_lane use the manually entered segment ID; for open_lane use picker selection
    const effectiveSegmentId = overrideType === 'close_lane' ? manualSegmentId : segmentId;

    // Validate
    if (selectedType.needsSegment && !effectiveSegmentId.trim()) {
      setSubmitErr(
        overrideType === 'close_lane'
          ? 'Please enter a road segment ID to force-close.'
          : 'Please select a road from the list above.',
      );
      return;
    }
    if (selectedType.needsRoute && !routeId.trim()) {
      setSubmitErr('Please select a route from the list above.');
      return;
    }

    // Get operator id from stored session
    const user = await authService.getStoredUser();
    if (!user?.id) {
      setSubmitErr('Session expired — please log in again.');
      return;
    }

    Alert.alert(
      'Confirm Override',
      `Apply "${selectedType.label}" override to disaster ${disasterId}?\n\nThis will recompute live routes for all affected vehicles.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Override',
          style: 'destructive',
          onPress: async () => {
            setSubmitErr('');
            setResult(null);
            setSubmitting(true);

            try {
              const payload: RerouteOverrideRequest = {
                disaster_id: disasterId,
                type:        overrideType,
                operator_id: user.id,
                priority:    priority,
                ...(effectiveSegmentId.trim() && { segment_id: effectiveSegmentId.trim() }),
                ...(routeId.trim()            && { route_id:   routeId.trim()           }),
              };

              const res = await disasterService.submitRerouteOverride(payload);
              setResult({ routes_recomputed: res?.routes_recomputed ?? 0 });
              // Refresh the plan to reflect changes
              loadPlan();
            } catch (e: any) {
              setSubmitErr(e?.message ?? 'Override failed. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={S.header}>
        <BackArrow onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text style={S.headerTitle}>Traffic Override</Text>
          <Text style={S.headerSub}>Disaster · {disasterId?.slice(0, 8)}…</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={loadPlan} activeOpacity={0.7}>
          {planLoad
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontSize: 20, lineHeight: 26 }}>↻</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Current Reroute Plan ─────────────────────────────────── */}
          <SectionTitle>CURRENT REROUTE PLAN</SectionTitle>

          {planLoad && (
            <View style={S.card}>
              <ActivityIndicator color={RED} />
            </View>
          )}

          {!planLoad && planError ? (
            <View style={[S.card, S.errorCard]}>
              <Text style={S.errorText}>{planError}</Text>
              <TouchableOpacity onPress={loadPlan} style={{ marginTop: 8 }}>
                <Text style={{ color: RED, fontWeight: '700', fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!planLoad && !planError && !plan && (
            <View style={S.card}>
              <View style={S.noplanRow}>
                <Text style={{ fontSize: 28, lineHeight: 36 }}>🚦</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={S.noplanTitle}>No Active Reroute Plan</Text>
                  <Text style={S.noplanSub}>
                    No routing plan is currently active for this disaster. An override will trigger a fresh reroute pipeline.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!planLoad && plan && (
            <>
              {/* ── Mini-map ── */}
              <View style={S.miniMapContainer}>
                <MapboxGL.MapView
                  style={S.miniMap}
                  styleURL="mapbox://styles/mapbox/dark-v11"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  logoEnabled={false}
                  attributionEnabled={false}
                  onDidFinishLoadingMap={() => {
                    const allPts: [number, number][] = [
                      ...blockedRoadsCoords.flat(),
                      ...chosenRoutesCoords.flat(),
                    ];
                    if (allPts.length >= 2) {
                      const lons = allPts.map(p => p[0]);
                      const lats = allPts.map(p => p[1]);
                      miniMapCameraRef.current?.fitBounds(
                        [Math.max(...lons), Math.max(...lats)],
                        [Math.min(...lons), Math.min(...lats)],
                        [32, 32, 32, 32],
                        0,
                      );
                    } else if (plan.disaster_lat && plan.disaster_lng) {
                      miniMapCameraRef.current?.setCamera({
                        centerCoordinate: [plan.disaster_lng, plan.disaster_lat],
                        zoomLevel: 13,
                        animationDuration: 0,
                      });
                    }
                  }}
                >
                  <MapboxGL.Camera
                    ref={miniMapCameraRef}
                    defaultSettings={{
                      centerCoordinate: [plan.disaster_lng ?? -6.26, plan.disaster_lat ?? 53.35],
                      zoomLevel: 12,
                    }}
                  />

                  {/* Blocked roads — red */}
                  {blockedRoadsGeoJSON.features.length > 0 && (
                    <MapboxGL.ShapeSource id="mini-blocked-roads" shape={blockedRoadsGeoJSON}>
                      <MapboxGL.LineLayer
                        id="mini-blocked-roads-line"
                        style={{ lineColor: RED, lineWidth: 3, lineOpacity: 0.9 }}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                  {/* Chosen routes — orange */}
                  {chosenRoutesGeoJSON.features.length > 0 && (
                    <MapboxGL.ShapeSource id="mini-chosen-routes" shape={chosenRoutesGeoJSON}>
                      <MapboxGL.LineLayer
                        id="mini-chosen-routes-line"
                        style={{ lineColor: ORANGE, lineWidth: 3, lineOpacity: 0.9 }}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                  {/* Disaster pin */}
                  {plan.disaster_lat != null && plan.disaster_lng != null && (
                    <MapboxGL.PointAnnotation
                      id="mini-disaster-pin"
                      coordinate={[plan.disaster_lng, plan.disaster_lat]}
                    >
                      <View style={S.disasterPin}>
                        <Text style={{ fontSize: 18, lineHeight: 22 }}>⚠️</Text>
                      </View>
                    </MapboxGL.PointAnnotation>
                  )}
                </MapboxGL.MapView>

                {/* Legend */}
                <View style={S.miniMapLegend}>
                  <View style={S.legendItem}>
                    <View style={[S.legendDot, { backgroundColor: RED }]} />
                    <Text style={S.legendText}>Blocked</Text>
                  </View>
                  <View style={S.legendItem}>
                    <View style={[S.legendDot, { backgroundColor: ORANGE }]} />
                    <Text style={S.legendText}>Routes</Text>
                  </View>
                </View>
              </View>

              {/* ── Compact stats + metadata card ── */}
              <View style={S.card}>
                <View style={S.planHeader}>
                  <View style={[S.statusBadge, { backgroundColor: GREEN + '18' }]}>
                    <View style={[S.statusDot, { backgroundColor: GREEN }]} />
                    <Text style={[S.statusText, { color: GREEN }]}>
                      {(plan.status ?? 'active').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={S.planMeta}>Since {fmtIso(plan.created_at)}</Text>
                </View>

                <View style={S.statsRow}>
                  <StatBox
                    value={String(plan.vehicles_affected ?? 0)}
                    label="Vehicles"
                    color={ORANGE}
                  />
                  <StatBox
                    value={String(Array.isArray(plan.chosen_routes) ? plan.chosen_routes.length : 0)}
                    label="Routes"
                    color={BLUE}
                  />
                  <StatBox
                    value={String(Array.isArray(plan.blocked_roads) ? plan.blocked_roads.length : 0)}
                    label="Blocked"
                    color={RED}
                  />
                </View>

                {plan.trigger_source && (
                  <View style={S.metaRow}>
                    <Text style={S.metaKey}>Triggered by</Text>
                    <Text style={S.metaVal}>{plan.trigger_source}</Text>
                  </View>
                )}
                {plan.id && (
                  <View style={S.metaRow}>
                    <Text style={S.metaKey}>Plan ID</Text>
                    <Text style={[S.metaVal, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }]}>
                      {plan.id}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Override Type ────────────────────────────────────────── */}
          <SectionTitle>OVERRIDE TYPE</SectionTitle>

          <View style={S.card}>
            {OVERRIDE_TYPES.map(t => {
              const active = overrideType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[S.typeRow, active && { backgroundColor: t.color + '10', borderColor: t.color }]}
                  onPress={() => setOverrideType(t.value)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 22, lineHeight: 30, marginRight: 10 }}>{t.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.typeLabel, active && { color: t.color }]}>{t.label}</Text>
                    <Text style={S.typeDesc}>{t.description}</Text>
                  </View>
                  <View style={[
                    S.radio,
                    active && { borderColor: t.color, backgroundColor: t.color },
                  ]}>
                    {active && <View style={S.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Road Selection (close_lane / open_lane) ───────────────── */}
          {selectedType.needsSegment && (
            <>
              <SectionTitle>SELECT ROAD</SectionTitle>
              <View style={S.card}>

                {overrideType === 'close_lane' ? (
                  /* close_lane: manual text entry — blocked_roads are already closed */
                  <>
                    <Text style={S.inputLabel}>
                      Road Segment ID to force-close
                      <Text style={{ color: RED }}> *</Text>
                    </Text>
                    <Text style={S.pickerHint}>
                      Enter the segment ID of the road you want to close. Contact your GIS operator
                      or the command dashboard for segment IDs.
                    </Text>
                    <TextInput
                      style={[S.textInput, manualSegmentId.length > 0 && S.textInputActive]}
                      value={manualSegmentId}
                      onChangeText={setManualSegmentId}
                      placeholder="e.g. seg-00123"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {manualSegmentId.length > 0 && (
                      <Text style={[S.hint, { color: RED, marginTop: 6 }]}>
                        ⚠️  This will immediately close the segment for all traffic.
                      </Text>
                    )}
                  </>
                ) : (
                  /* open_lane: show currently blocked roads — these can be re-opened */
                  <>
                    <Text style={S.inputLabel}>
                      Blocked road to re-open
                      <Text style={{ color: RED }}> *</Text>
                    </Text>

                    {plan && Array.isArray(plan.blocked_roads) && plan.blocked_roads.length > 0 ? (
                      <>
                        <Text style={S.pickerHint}>
                          Tap a currently blocked road from the active reroute plan:
                        </Text>
                        {plan.blocked_roads.map((road: any, i: number) => {
                          const id     = road.segment_id ?? road.id ?? road;
                          const name   = road.road_name ?? road.name ?? `Road ${i + 1}`;
                          const active = segmentId === String(id);
                          return (
                            <TouchableOpacity
                              key={String(id) + i}
                              style={[S.pickerRow, active && S.pickerRowActive]}
                              onPress={() => setSegmentId(String(id))}
                              activeOpacity={0.75}
                            >
                              <View style={[S.pickerDot, { backgroundColor: active ? RED : '#D1D5DB' }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={[S.pickerLabel, active && { color: RED }]}>{name}</Text>
                              </View>
                              {active && <Text style={{ color: RED, fontSize: 16 }}>✓</Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    ) : (
                      <View style={S.noplanRow}>
                        <Text style={{ fontSize: 22, lineHeight: 30 }}>🚦</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={S.noplanTitle}>No Blocked Roads in Current Plan</Text>
                          <Text style={S.noplanSub}>
                            Contact command for road details, or trigger a reroute plan first.
                          </Text>
                        </View>
                      </View>
                    )}

                    {segmentId.length > 0 && (
                      <View style={[S.selectedBadge, { marginTop: 10 }]}>
                        <Text style={S.selectedBadgeText}>
                          {(() => {
                            if (!plan?.blocked_roads) return 'Road selected';
                            const road = plan.blocked_roads.find(
                              (r: any) => String(r.segment_id ?? r.id ?? r) === segmentId,
                            );
                            return road?.road_name ?? road?.name ?? 'Road selected';
                          })()}
                        </Text>
                        <TouchableOpacity onPress={() => setSegmentId('')}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ color: RED, fontSize: 13, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

              </View>
            </>
          )}

          {/* ── Route Selection (pin_detour) ──────────────────────────── */}
          {selectedType.needsRoute && (
            <>
              <SectionTitle>SELECT ROUTE</SectionTitle>
              <View style={S.card}>
                <Text style={S.inputLabel}>
                  Route to pin as preferred detour
                  <Text style={{ color: RED }}> *</Text>
                </Text>

                {plan && Array.isArray(plan.chosen_routes) && plan.chosen_routes.length > 0 ? (
                  <>
                    <Text style={S.pickerHint}>
                      Tap a route from the active reroute plan:
                    </Text>
                    {plan.chosen_routes.map((r: any, i: number) => {
                      const id     = r.route_id ?? r.id ?? `route-${i}`;
                      const label  = `Route ${i + 1}`;
                      const mins   = r.travel_time_seconds != null
                        ? `~${Math.round(r.travel_time_seconds / 60)} min`
                        : null;
                      const dist   = r.length_meters != null
                        ? `${(r.length_meters / 1000).toFixed(1)} km`
                        : null;
                      const active = routeId === String(id);
                      return (
                        <TouchableOpacity
                          key={String(id) + i}
                          style={[S.pickerRow, active && S.pickerRowActive]}
                          onPress={() => setRouteId(String(id))}
                          activeOpacity={0.75}
                        >
                          <View style={[S.pickerDot, { backgroundColor: active ? BLUE : '#D1D5DB' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[S.pickerLabel, active && { color: BLUE }]}>
                              {label}
                            </Text>
                            {(mins || dist) && (
                              <Text style={S.pickerSub}>
                                {[mins, dist].filter(Boolean).join(' · ')}
                              </Text>
                            )}
                          </View>
                          {active && <Text style={{ color: BLUE, fontSize: 16 }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <View style={S.noplanRow}>
                    <Text style={{ fontSize: 22, lineHeight: 30 }}>📍</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={S.noplanTitle}>No Active Routes</Text>
                      <Text style={S.noplanSub}>
                        No reroute plan is active. Trigger a reroute plan first before pinning a detour.
                      </Text>
                    </View>
                  </View>
                )}

                {routeId.length > 0 && (
                  <View style={[S.selectedBadge, { marginTop: 10 }]}>
                    <Text style={S.selectedBadgeText}>
                      {(() => {
                        if (!plan?.chosen_routes) return 'Route selected';
                        const idx = plan.chosen_routes.findIndex(
                          (r: any) => String(r.route_id ?? r.id) === routeId
                        );
                        return idx >= 0 ? `Route ${idx + 1}` : 'Route selected';
                      })()}
                    </Text>
                    <TouchableOpacity onPress={() => setRouteId('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ color: RED, fontSize: 13, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Priority ─────────────────────────────────────────────── */}
          <SectionTitle>PRIORITY LEVEL</SectionTitle>

          <View style={[S.card, { paddingBottom: 4 }]}>
            <View style={S.priorityGrid}>
              {PRIORITIES.map(p => {
                const active = priority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      S.priorityPill,
                      active && { backgroundColor: p.color, borderColor: p.color },
                    ]}
                    onPress={() => setPriority(p.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[S.priorityText, active && { color: '#fff' }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[S.hint, { marginTop: 8 }]}>
              {priority === 'critical'
                ? '⚠️ Critical overrides all auto-routing. Use for emergency corridor only.'
                : priority === 'high'
                ? 'Takes precedence over automatic route suggestions.'
                : priority === 'medium'
                ? 'Standard operator instruction. Applied alongside auto-routing.'
                : 'Advisory only — vehicles may still use other routes.'}
            </Text>
          </View>

          {/* ── Error ────────────────────────────────────────────────── */}
          {!!submitErr && (
            <View style={[S.card, S.errorCard]}>
              <Text style={S.errorText}>{submitErr}</Text>
            </View>
          )}

          {/* ── Success banner ───────────────────────────────────────── */}
          {result && (
            <View style={[S.card, S.successCard]}>
              <Text style={{ fontSize: 28, lineHeight: 36 }}>✅</Text>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={S.successTitle}>Override Applied</Text>
                <Text style={S.successBody}>
                  Routes recomputed: <Text style={{ fontWeight: '700', color: GREEN }}>
                    {result.routes_recomputed}
                  </Text>{'\n'}
                  Affected vehicles are receiving updated navigation.
                </Text>
              </View>
            </View>
          )}

          {/* ── Submit ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[S.submitBtn, submitting && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={S.submitIcon}>{selectedType.icon}</Text>
                <Text style={S.submitText}>
                  Apply {selectedType.label} Override
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Context note */}
          <Text style={S.footNote}>
            Overrides are logged and attributed to your operator ID. The backend will recompute routes using TomTom and push updates to all affected vehicles via RabbitMQ.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  hBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Section title
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.9, marginBottom: 8, marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  errorCard: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#991B1B', fontSize: 13, lineHeight: 20 },

  successCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  successTitle: { fontSize: 15, fontWeight: '700', color: GREEN, marginBottom: 4 },
  successBody:  { fontSize: 13, color: '#166534', lineHeight: 20 },

  // Plan card
  planHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '800' },
  planMeta:   { fontSize: 11, color: '#9CA3AF' },

  statsRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox:   {
    flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 8, paddingVertical: 10, borderTopWidth: 3,
  },
  statVal:   { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaKey: { fontSize: 12, color: '#9CA3AF', width: 90 },
  metaVal: { fontSize: 12, color: '#374151', fontWeight: '500', flex: 1 },

  routeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  routeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  routeId:  { flex: 1, fontSize: 12, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  routeMeta:{ fontSize: 11, color: '#9CA3AF', marginLeft: 8 },

  noplanRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  noplanTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  noplanSub:   { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  // Override type
  typeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: '#F3F4F6', marginBottom: 8,
  },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  typeDesc:  { fontSize: 12, color: '#6B7280' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // Input
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1F2937',
    backgroundColor: '#FAFAFA',
  },
  textInputActive: {
    borderColor: RED, backgroundColor: '#FFF5F5',
  },
  hint: { fontSize: 11, color: '#9CA3AF', marginTop: 6, lineHeight: 16 },

  // Picker rows
  pickerHint: {
    fontSize: 12, color: '#6B7280', marginBottom: 10, lineHeight: 17,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6',
    marginBottom: 6, backgroundColor: '#FAFAFA',
  },
  pickerRowActive: {
    borderColor: RED, backgroundColor: '#FFF5F5',
  },
  pickerDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 10, flexShrink: 0,
  },
  pickerLabel: {
    fontSize: 13, fontWeight: '600', color: '#1F2937',
  },
  pickerSub: {
    fontSize: 11, color: '#9CA3AF', marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 11, color: '#9CA3AF' },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, backgroundColor: '#FEF2F2',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FECACA',
  },
  selectedBadgeText: {
    fontSize: 11, color: '#991B1B', fontWeight: '600', flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Priority
  priorityGrid: { flexDirection: 'row', gap: 8 },
  priorityPill: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  priorityText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: RED, borderRadius: 12,
    paddingVertical: 16, marginBottom: 12, gap: 8,
  },
  submitIcon: { fontSize: 20, lineHeight: 26 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footNote: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center',
    lineHeight: 16, paddingHorizontal: spacing.sm,
  },

  // Mini-map
  miniMapContainer: {
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  miniMap: { flex: 1 },
  miniMapLegend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  disasterPin: { alignItems: 'center', justifyContent: 'center' },
});

export default RerouteOverrideScreen;