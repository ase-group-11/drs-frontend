// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/EvacuationPlansScreen/EvacuationPlansScreen.tsx
//
// CITIZEN VIEW:
//   - Detects user location via GPS
//   - Finds nearest impact zone (evacuation point) to the citizen
//   - Shows urgent card: go to nearest zone, buses take you to shelter
//   - Shows route to evacuation point + onward shelter info
//
// RESPONDER VIEW:
//   - All impact zones with priority, progress, people count
//   - Zone → shelter routing + transport schedule
//   - Shelter capacity status
//   - Operational data-dense layout
//
// APIs:
//   GET /api/v1/evacuations/                        → all plans
//   GET /api/v1/evacuations/{plan_id}               → plan detail
//   GET /api/v1/evacuations/{plan_id}/progress      → live metrics
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, Linking, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authRequest, authService } from '@services/authService';
import { wsService } from '@services/wsService';
import { mapActionStore } from '@services/mapActionStore';
import { formatTime, formatDate } from '@utils/formatters';
import { API } from '@services/apiConfig';
import { useUserLocation } from '@hooks/useUserLocation';

// ─── Types ────────────────────────────────────────────────────────────────

interface EvacuationPlan {
  id: string;
  plan_ref: string;
  disaster_id: string;
  plan_status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  approved_by?: string;
  activated_at?: string;
  created_at?: string;
  // Enriched from linked disaster
  disaster_type?: string;
  disaster_location?: string;
  impact_zones?: Zone[];
  shelters_with_capacity?: Shelter[];
  population_stats?: { total: number; vulnerable: number; zones_count: number };
  transport_plan?: TransportPlan;
  allocations?: { buses_allocated: number; ambulances_allocated: number };
  completion_metrics?: Record<string, ZoneMetrics>;
  best_routes_per_zone?: Record<string, Route[]>;
  notes?: string;
}

interface Zone {
  zone_id?: string;
  area_name?: string;
  name?: string;
  lat?: number;
  lon?: number;
  center_lat?: number;
  center_lon?: number;
  population: number;
  vulnerable_count?: number;
  distance_from_disaster_km?: number;
  priority?: number;
}

interface Shelter {
  shelter_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  current_occupancy?: number;
  available?: number;
}

interface Route {
  route_id: string;
  origin_zone_id: string;
  zone_name?: string;
  destination_shelter_id: string;
  shelter_name?: string;
  distance_km?: number;
  estimated_time_min?: number;
  fallback?: boolean;
}

interface TransportPlan {
  total_buses: number;
  total_ambulances: number;
  total_people: number;
  total_vulnerable: number;
  schedules?: Array<{
    zone_id: string;
    zone_name: string;
    shelter_name: string;
    buses_needed: number;
    estimated_time_min: number;
  }>;
}

interface ZoneMetrics {
  percentage: number;
  evacuated: number;
  remaining: number;
  status?: string;
}

interface ProgressData {
  plan_id: string;
  plan_ref: string;
  plan_status: string;
  overall_completion: number;
  completion_metrics: Record<string, ZoneMetrics>;
}

interface UserLocation { lat: number; lon: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F97316', APPROVED: '#3B82F6',
  ACTIVE: '#DC2626', COMPLETED: '#22C55E', CANCELLED: '#6B7280',
};
const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳', APPROVED: '✅', ACTIVE: '🚨', COMPLETED: '✅', CANCELLED: '❌',
};

// Haversine distance in km
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function openExternalMaps(lat: number, lon: number, label: string) {
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${lat},${lon}&dirflg=w`
    : `google.navigation:q=${lat},${lon}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)
  );
}

const BackIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// CITIZEN DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════

const CitizenDetailView: React.FC<{
  plan: EvacuationPlan;
  userLocation: UserLocation | null;
  onBack: () => void;
  onFlyTo: (lat: number, lon: number, label: string) => void;
}> = ({ plan, userLocation, onBack, onFlyTo }) => {
  const navigation = useNavigation<any>();
  const zones    = plan.impact_zones ?? [];
  const zoneLat  = (z: Zone) => z.lat ?? z.center_lat ?? 53.3498;
  const zoneLon  = (z: Zone) => z.lon ?? z.center_lon ?? -6.2603;
  const zoneName = (z: Zone) => z.name ?? z.area_name ?? 'Evacuation Point';
  const zoneKey  = (z: Zone) => z.zone_id ?? z.area_name ?? 'zone';
  const shelters = plan.shelters_with_capacity ?? [];
  const routes   = plan.best_routes_per_zone ?? {};

  // Find nearest evacuation point (zone) to the citizen
  const nearestZone = userLocation && zones.length > 0
    ? zones.reduce((nearest, zone) => {
        const d = distanceKm(userLocation.lat, userLocation.lon, zoneLat(zone), zoneLon(zone));
        const nd = distanceKm(userLocation.lat, userLocation.lon, nearest.lat, nearest.lon);
        return d < nd ? zone : nearest;
      })
    : zones[0] ?? null;

  const nearestZoneDist = nearestZone && userLocation
    ? distanceKm(userLocation.lat, userLocation.lon, zoneLat(nearestZone), zoneLon(nearestZone))
    : null;

  // Find the route from nearest zone to a shelter
  const zoneRoutes = nearestZone
    ? (routes[nearestZone.zone_id] ?? [])
    : [];
  const bestRoute = zoneRoutes[0] ?? null;

  // Find the shelter for that route
  const targetShelter = bestRoute
    ? shelters.find(s => s.shelter_id === bestRoute.destination_shelter_id) ?? null
    : shelters[0] ?? null;

  // Find bus schedule for nearest zone
  const schedule = plan.transport_plan?.schedules?.find(
    s => s.zone_id === (nearestZone?.zone_id ?? nearestZone?.area_name)
  );

  const walkTime = nearestZoneDist
    ? Math.round(nearestZoneDist * 12) // ~12 min/km walking
    : null;

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Red urgent header */}
      <View style={S.urgentHeader}>
        <BackIcon onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.urgentHeaderTitle}>🚨 EVACUATE NOW</Text>
          <Text style={S.urgentHeaderSub}>{plan.plan_ref}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* ── Step 1: Go to nearest evacuation point ── */}
        {nearestZone && (
          <View style={S.stepCard}>
            <View style={S.stepBadge}>
              <Text style={S.stepBadgeText}>STEP 1</Text>
            </View>
            <Text style={S.stepTitle}>🚶 Go to your nearest evacuation point</Text>

            <View style={S.evacuationPointCard}>
              <View style={S.evacuationPointHeader}>
                <View style={[S.priorityBadge, {
                  backgroundColor: nearestZone.priority === 1 ? '#DC2626'
                    : nearestZone.priority === 2 ? '#F97316' : '#EAB308'
                }]}>
                  <Text style={S.priorityText}>P{nearestZone.priority ?? '—'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={S.evacuationPointName}>{zoneName(nearestZone)}</Text>
                  {nearestZoneDist != null && (
                    <Text style={S.evacuationPointMeta}>
                      📍 {nearestZoneDist < 1
                        ? `${Math.round(nearestZoneDist * 1000)}m away`
                        : `${nearestZoneDist.toFixed(1)}km away`}
                      {walkTime ? `  ·  🚶 ~${walkTime} min walk` : ''}
                    </Text>
                  )}
                </View>
              </View>

              <View style={S.infoBox}>
                <Text style={S.infoBoxText}>
                  🚌 Buses are waiting at this point to take you to a safe shelter.
                  {schedule?.buses_needed != null ? ` ${schedule.buses_needed} buses assigned.` : ' Buses are being arranged.'}
                </Text>
              </View>

              <View style={S.actionRow}>
                <TouchableOpacity
                  style={[S.primaryActionBtn, { flex: 1 }]}
                  onPress={() => {
                    console.log('[EvacuationPlans] Get Directions → evacuationRoute:', nearestZone.lat, nearestZone.lon);
                    mapActionStore.setPending({ type: 'evacuationRoute', lat: zoneLat(nearestZone), lon: zoneLon(nearestZone), label: zoneName(nearestZone) });
                    navigation.navigate('Home' as any);
                  }}
                >
                  <Text style={S.primaryActionTxt}>🗺️  Get Directions to Evacuation Point</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2: Bus takes you to shelter ── */}
        {targetShelter && (
          <View style={[S.stepCard, { marginTop: spacing.sm }]}>
            <View style={[S.stepBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={S.stepBadgeText}>STEP 2</Text>
            </View>
            <Text style={S.stepTitle}>🏛️ Buses will take you to safety</Text>

            <View style={S.shelterCard}>
              <Text style={S.shelterName}>{targetShelter.name}</Text>
              <View style={S.shelterMetaRow}>
                <View style={S.shelterMetaChip}>
                  <Text style={S.shelterMetaText}>
                    👥 Capacity: {(targetShelter.capacity ?? 0).toLocaleString()}
                  </Text>
                </View>
                {(targetShelter.available ?? 0) > 0 && (
                  <View style={[S.shelterMetaChip, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                    <Text style={[S.shelterMetaText, { color: '#166534' }]}>
                      ✅ {targetShelter.available?.toLocaleString()} spots available
                    </Text>
                  </View>
                )}
              </View>

              {bestRoute && (
                <View style={S.routeInfoRow}>
                  {bestRoute.distance_km != null && (
                    <Text style={S.routeInfoText}>📏 {bestRoute.distance_km.toFixed(1)} km from evacuation point</Text>
                  )}
                  {bestRoute.estimated_time_min != null && (
                    <Text style={S.routeInfoText}>⏱ ~{bestRoute.estimated_time_min} min by bus</Text>
                  )}
                </View>
              )}

              {schedule && (
                <View style={S.busInfoBox}>
                  <Text style={S.busInfoText}>
                    🚌 {schedule.buses_needed ?? '?'} buses · ~{schedule.estimated_time_min ?? '?'} min journey
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[S.secondaryActionBtn, { marginTop: spacing.sm }]}
                onPress={() => onFlyTo(targetShelter.lat, targetShelter.lon, targetShelter.name)}
              >
                <Text style={S.secondaryActionTxt}>📍 View Shelter on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Other zones if citizen wants to see all options ── */}
        {zones.length > 1 && (
          <View style={[S.stepCard, { marginTop: spacing.sm, backgroundColor: '#F8FAFC' }]}>
            <Text style={[S.stepTitle, { fontSize: 13, color: '#6B7280' }]}>
              Other evacuation points nearby
            </Text>
            {zones
              .filter(z => z.zone_id !== nearestZone?.zone_id)
              .sort((a, b) => {
                if (!userLocation) return 0;
                return distanceKm(userLocation.lat, userLocation.lon, a.lat, a.lon)
                  - distanceKm(userLocation.lat, userLocation.lon, b.lat, b.lon);
              })
              .map(z => {
                const d = userLocation
                  ? distanceKm(userLocation.lat, userLocation.lon, zoneLat(z), zoneLon(z))
                  : null;
                return (
                  <TouchableOpacity
                    key={zoneKey(z)}
                    style={S.altZoneRow}
                    onPress={() => onFlyTo(zoneLat(z), zoneLon(z), zoneName(z))}
                  >
                    <Text style={S.altZoneName}>{zoneName(z)}</Text>
                    {d != null && (
                      <Text style={S.altZoneDist}>
                        {d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {/* ── Safety tips ── */}
        <View style={S.tipsCard}>
          <Text style={S.tipsTitle}>⚠️ Safety Instructions</Text>
          {[
            'Leave immediately — do not wait',
            'Take only essential items (ID, medication, phone)',
            'Help elderly or disabled neighbours if safe to do so',
            'Follow instructions from emergency personnel',
            'Do not return until authorities say it is safe',
          ].map((tip, i) => (
            <View key={i} style={S.tipRow}>
              <Text style={S.tipBullet}>•</Text>
              <Text style={S.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// RESPONDER DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════

const ResponderDetailView: React.FC<{
  plan: EvacuationPlan;
  progress: ProgressData | null;
  onBack: () => void;
  onRefresh: () => void;
  onFlyTo: (lat: number, lon: number, label: string) => void;
}> = ({ plan, progress, onBack, onRefresh, onFlyTo }) => {
  const zones    = plan.impact_zones ?? [];
  const zoneLat  = (z: Zone) => z.lat ?? z.center_lat ?? 53.3498;
  const zoneLon  = (z: Zone) => z.lon ?? z.center_lon ?? -6.2603;
  const zoneName = (z: Zone) => z.name ?? z.area_name ?? 'Evacuation Point';
  const zoneKey  = (z: Zone) => z.zone_id ?? z.area_name ?? 'zone';
  const shelters = plan.shelters_with_capacity ?? [];
  const transport = plan.transport_plan;
  const alloc    = plan.allocations;
  const metrics  = progress?.completion_metrics ?? plan.completion_metrics ?? {};
  const overall  = progress?.overall_completion ?? 0;
  const routes   = plan.best_routes_per_zone ?? {};
  const statusColor = STATUS_COLOR[plan.plan_status] ?? '#6B7280';

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={S.header}>
        <BackIcon onPress={onBack} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Evacuation Plan</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{plan.plan_ref}</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={onRefresh}>
          <Text style={{ fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* Status banner */}
        <View style={[S.statusBanner, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
          <Text style={{ fontSize: 28, marginRight: spacing.md }}>{STATUS_ICON[plan.plan_status]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[S.statusBannerTitle, { color: statusColor }]}>{plan.plan_status}</Text>
            <Text style={S.statusBannerSub}>
              {plan.plan_status === 'ACTIVE' ? `Evacuation in progress — ${overall.toFixed(0)}% complete`
               : plan.plan_status === 'COMPLETED' ? 'Evacuation successfully completed'
               : plan.plan_status === 'APPROVED'  ? 'Plan approved — awaiting activation'
               : plan.plan_status === 'PENDING'   ? 'Awaiting coordinator approval'
               : plan.plan_status}
            </Text>
          </View>
        </View>

        {/* Overall progress */}
        {(plan.plan_status === 'ACTIVE' || plan.plan_status === 'COMPLETED') && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Overall Progress</Text>
            <View style={S.progressBarBg}>
              <View style={[S.progressBarFill, { width: `${Math.min(overall, 100)}%` as any }]} />
            </View>
            <Text style={S.progressPct}>{overall.toFixed(1)}% evacuated</Text>
          </View>
        )}

        {/* Resource summary */}
        {(transport || alloc) && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Resources Deployed</Text>
            <View style={S.statsRow}>
              <View style={S.statBox}>
                <Text style={{ fontSize: 20 }}>🚌</Text>
                <Text style={S.statVal}>{alloc?.buses_allocated ?? transport?.total_buses ?? 0}</Text>
                <Text style={S.statLbl}>Buses</Text>
              </View>
              <View style={S.statBox}>
                <Text style={{ fontSize: 20 }}>🚑</Text>
                <Text style={S.statVal}>{alloc?.ambulances_allocated ?? transport?.total_ambulances ?? 0}</Text>
                <Text style={S.statLbl}>Ambulances</Text>
              </View>
              <View style={S.statBox}>
                <Text style={{ fontSize: 20 }}>👥</Text>
                <Text style={S.statVal}>{(plan.population_stats?.total ?? transport?.total_people ?? 0).toLocaleString()}</Text>
                <Text style={S.statLbl}>People</Text>
              </View>
              <View style={S.statBox}>
                <Text style={{ fontSize: 20 }}>🏥</Text>
                <Text style={S.statVal}>{(plan.population_stats?.vulnerable ?? transport?.total_vulnerable ?? 0).toLocaleString()}</Text>
                <Text style={S.statLbl}>Vulnerable</Text>
              </View>
            </View>
          </View>
        )}

        {/* Impact zones — evacuation points with full operational detail */}
        {zones.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Evacuation Points ({zones.length})</Text>
            {zones
              .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
              .map((z, zi) => {
                const m = metrics[z.zone_id];
                const zoneRoutes = routes[z.zone_id] ?? [];
                const bestRoute = zoneRoutes[0];
                const shelter = bestRoute
                  ? shelters.find(s => s.shelter_id === bestRoute.destination_shelter_id)
                  : null;
                const sched = transport?.schedules?.find(s => s.zone_id === z.zone_id);
                const pct = m?.percentage ?? 0;

                return (
                  <View key={zoneKey(z)} style={[S.responderZoneCard, zi < zones.length - 1 && { marginBottom: spacing.md }]}>
                    {/* Zone header */}
                    <View style={S.responderZoneHeader}>
                      <View style={[S.priorityBadge, {
                        backgroundColor: z.priority === 1 ? '#DC2626'
                          : z.priority === 2 ? '#F97316' : '#EAB308'
                      }]}>
                        <Text style={S.priorityText}>P{z.priority ?? zi + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={S.responderZoneName}>{zoneName(z)}</Text>
                        <Text style={S.responderZoneMeta}>
                          👥 {(z.population ?? 0).toLocaleString()} residents
                          {z.vulnerable_count ? ` · 🏥 ${z.vulnerable_count.toLocaleString()} vulnerable` : ''}
                          {z.distance_from_disaster_km != null ? ` · 💥 ${z.distance_from_disaster_km.toFixed(1)}km from disaster` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => onFlyTo(zoneLat(z), zoneLon(z), zoneName(z))} style={S.mapPinBtn}>
                        <Text style={{ fontSize: 16 }}>📍</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Evacuation progress bar */}
                    {m && (
                      <View style={{ marginTop: spacing.sm }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>
                            {m.evacuated.toLocaleString()} evacuated · {m.remaining.toLocaleString()} remaining
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: pct >= 80 ? '#22C55E' : pct >= 40 ? '#F97316' : '#DC2626' }}>
                            {pct.toFixed(0)}%
                          </Text>
                        </View>
                        <View style={S.progressBarBgSm}>
                          <View style={[S.progressBarFillSm, {
                            width: `${Math.min(pct, 100)}%` as any,
                            backgroundColor: pct >= 80 ? '#22C55E' : pct >= 40 ? '#F97316' : '#DC2626',
                          }]} />
                        </View>
                      </View>
                    )}

                    {/* Route to shelter */}
                    {(shelter || sched) && (
                      <View style={S.zoneRouteBox}>
                        <View style={S.zoneRouteArrow}>
                          <View style={S.zoneRouteDot} />
                          <View style={S.zoneRouteLine} />
                          <View style={[S.zoneRouteDot, { backgroundColor: '#3B82F6' }]} />
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={S.zoneRouteFrom}>{zoneName(z)}</Text>
                          <Text style={S.zoneRouteDetail}>
                            {sched ? `🚌 ${sched.buses_needed ?? '?'} buses · ~${sched.estimated_time_min ?? '?'} min` : ''}
                            {bestRoute?.distance_km ? ` · ${bestRoute.distance_km.toFixed(1)} km` : ''}
                          </Text>
                          {shelter && (
                            <React.Fragment key={shelter.shelter_id ?? shelter.name}>
                              <Text style={S.zoneRouteTo}>🏛️ {shelter.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                  Cap: {shelter.capacity.toLocaleString()}
                                </Text>
                                {(shelter.available ?? 0) > 0 && (
                                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, color: '#166534', fontWeight: '700' }}>
                                      {shelter.available?.toLocaleString()} available
                                    </Text>
                                  </View>
                                )}
                                <TouchableOpacity onPress={() => onFlyTo(shelter.lat, shelter.lon, shelter.name)} style={{ padding: 4 }}>
                                  <Text style={{ fontSize: 14 }}>📍</Text>
                                </TouchableOpacity>
                              </View>
                            </React.Fragment>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* Shelter capacity overview */}
        {shelters.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Shelter Status ({shelters.length})</Text>
            {shelters.map((sh, si) => {
              const occupancyPct = sh.capacity > 0
                ? ((sh.current_occupancy ?? 0) / sh.capacity) * 100
                : 0;
              return (
                <View key={sh.shelter_id} style={[S.shelterStatusRow, si < shelters.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: spacing.sm, marginBottom: spacing.sm }]}>
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>{sh.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        {(sh.current_occupancy ?? 0).toLocaleString()} / {sh.capacity.toLocaleString()}
                      </Text>
                      <View style={[{
                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                        backgroundColor: occupancyPct > 80 ? '#FEF2F2' : occupancyPct > 50 ? '#FFFBEB' : '#F0FDF4',
                      }]}>
                        <Text style={{
                          fontSize: 10, fontWeight: '700',
                          color: occupancyPct > 80 ? '#DC2626' : occupancyPct > 50 ? '#D97706' : '#166534',
                        }}>
                          {occupancyPct > 80 ? 'NEAR CAPACITY' : occupancyPct > 50 ? 'FILLING UP' : 'AVAILABLE'}
                        </Text>
                      </View>
                    </View>
                    <View style={[S.progressBarBgSm, { marginTop: 6 }]}>
                      <View style={[S.progressBarFillSm, {
                        width: `${Math.min(occupancyPct, 100)}%` as any,
                        backgroundColor: occupancyPct > 80 ? '#DC2626' : occupancyPct > 50 ? '#F97316' : '#22C55E',
                      }]} />
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={{ marginLeft: spacing.sm, padding: 6, backgroundColor: '#EFF6FF', borderRadius: 8, alignSelf: 'flex-start' }} 
                    onPress={() => onFlyTo(sh.lat, sh.lon, sh.name)}
                  >
                    <Text style={{ fontSize: 18 }}>📍</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {plan.notes && (
          <View style={[S.card, { backgroundColor: '#FFFBEB' }]}>
            <Text style={S.cardTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#92400E', lineHeight: 20 }}>{plan.notes}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const EvacuationPlansScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  // If navigated from DisasterAlertDetail, auto-open the plan for this disaster
  const filterDisasterId: string | undefined = route.params?.disasterId;

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [plans, setPlans]                 = useState<EvacuationPlan[]>([]);
  const [selectedPlan, setSelectedPlan]   = useState<EvacuationPlan | null>(null);
  const [progress, setProgress]           = useState<ProgressData | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [isResponder, setIsResponder]     = useState(false);
  // isManager removed — only 'staff' role exists; all responders can approve/activate
  const [view, setView]                   = useState<'list' | 'detail'>('list');

  // Use the same location hook as HomeScreen — works on both iOS and Android
  const { location: gpsLocation } = useUserLocation();
  const userLocation: UserLocation | null = gpsLocation
    ? { lat: gpsLocation[1], lon: gpsLocation[0] }
    : null;

  useEffect(() => {
    loadAll();

    // Detect role — only 'staff' is a valid responder role
    AsyncStorage.getItem('@auth/user_role').then(role => {
      setIsResponder(role === 'responder');
    });

    const unsub = wsService.onAlert((alert) => {
      if (alert.event_type === 'evacuation.triggered') loadAll();
    });
    return () => unsub();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await loadPlans();
    setLoading(false);
  };

  // After plans are loaded, if a specific disasterId was passed as param,
  // auto-open that disaster's evacuation plan directly
  useEffect(() => {
    if (!filterDisasterId || plans.length === 0) return;
    const match = plans.find(p => p.disaster_id === filterDisasterId);
    if (match) {
      loadPlanDetail(match.id);
    } else {
      Alert.alert(
        'No Evacuation Plan',
        'No evacuation plan has been activated for this disaster yet. Check back shortly or contact emergency services.',
        [{ text: 'OK' }],
      );
    }
  }, [plans, filterDisasterId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    if (selectedPlan) await loadProgress(selectedPlan.id);
    setRefreshing(false);
  };

  const loadPlans = async () => {
    try {
      const data = await authRequest<{ evacuation_plans: EvacuationPlan[] }>('/evacuations/');
      const rawPlans: EvacuationPlan[] = data?.evacuation_plans ?? [];

      // Enrich each plan with disaster type + location by fetching linked disaster
      // Run in parallel, silently ignore failures (plan still shows without disaster info)
      const enriched = await Promise.all(
        rawPlans.map(async (plan) => {
          if (!plan.disaster_id) return plan;
          try {
            const d = await authRequest<any>(API.disasters.byId(plan.disaster_id));
            return {
              ...plan,
              disaster_type:     (d?.type ?? d?.disaster_type ?? '').replace(/_/g, ' ').toUpperCase(),
              disaster_location: d?.location_address ?? d?.location?.address ?? '',
            };
          } catch {
            return plan; // fallback: show plan without disaster info
          }
        })
      );

      setPlans(enriched);
    } catch (e: any) {
      console.warn('Could not load evacuation plans:', e);
      Alert.alert('Could Not Load Plans', e?.message || 'Failed to load evacuation plans. Please try again.');
    }
  };

  const loadPlanDetail = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      const detail = await authRequest<EvacuationPlan>(`/evacuations/${planId}`);
      setSelectedPlan(detail);
      setView('detail');
      if (detail.plan_status === 'ACTIVE' || detail.plan_status === 'COMPLETED') {
        await loadProgress(planId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load plan details');
    }
    setLoadingPlanId(null);
  };

  const loadProgress = async (planId: string) => {
    try {
      const prog = await authRequest<ProgressData>(`/evacuations/${planId}/progress`);
      setProgress(prog);
    } catch {}
  };

  const openMaps = (lat: number, lon: number, label: string) => {
    console.log('[EvacuationPlans] View on Map → flyTo:', lat, lon, label);
    mapActionStore.setPending({ type: 'flyTo', lat, lon, label });
    navigation.navigate('Home' as any);
  };

  // ── ERT Actions ────────────────────────────────────────────────────────

  const triggerEvacuation = async (disasterId: string) => {
    try {
      await authRequest<any>('/evacuations/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disaster_id: disasterId, auto_approve: false }),
      } as any);
      Alert.alert('Plan Created', 'Evacuation plan is pending approval.');
      await loadPlans();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const approvePlan = async (planId: string) => {
    try {
      const user = await authService.getStoredUser() as any;
      await authRequest<any>(`/evacuations/${planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user?.full_name ?? 'ERT Officer', notes: '' }),
      } as any);
      Alert.alert('Approved', 'Plan has been approved.');
      await loadPlans();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const activatePlan = async (planId: string) => {
    try {
      await authRequest<any>(`/evacuations/${planId}/activate`, { method: 'POST' } as any);
      Alert.alert('Activated', 'Evacuation is now active. Citizens have been notified.');
      await loadPlanDetail(planId);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  // ── Detail view routing ────────────────────────────────────────────────

  if (view === 'detail' && selectedPlan) {
    if (isResponder) {
      return (
        <ResponderDetailView
          plan={selectedPlan}
          progress={progress}
          onBack={() => { setView('list'); setSelectedPlan(null); setProgress(null); }}
          onRefresh={() => loadProgress(selectedPlan.id)}
          onFlyTo={openMaps}
        />
      );
    }
    return (
      <CitizenDetailView
        plan={selectedPlan}
        userLocation={userLocation}
        onBack={() => { setView('list'); setSelectedPlan(null); setProgress(null); }}
        onFlyTo={openMaps}
      />
    );
  }

  // ── Visible plans ───────────────────────────────────────────────────────
  // Citizens: only show ACTIVE plans (disaster still ongoing)
  // Hide PENDING (not yet approved), CANCELLED, and COMPLETED (disaster resolved)
  // Responders see all non-cancelled plans for operational awareness
  const visiblePlans = plans.filter(p => {
    if (p.plan_status === 'PENDING' || p.plan_status === 'CANCELLED') return false;
    if (!isResponder && p.plan_status === 'COMPLETED') return false; // resolved for citizens
    return true;
  });
  const activePlans = visiblePlans.filter(p => p.plan_status === 'ACTIVE');

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={S.header}>
        <BackIcon onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Evacuation Plans</Text>
          {filterDisasterId && (
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
              For disaster · {filterDisasterId.slice(0, 8).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading evacuation data…
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Active evacuation alert banner */}
          {activePlans.length > 0 && (
            <View style={S.activeBanner}>
              <Text style={S.activeBannerIcon}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.activeBannerTitle}>ACTIVE EVACUATION</Text>
                <Text style={S.activeBannerSub}>
                  {activePlans.length} active plan{activePlans.length > 1 ? 's' : ''} — tap to view your evacuation route
                </Text>
              </View>
            </View>
          )}

          {/* Plans list */}
          <Text style={S.sectionTitle}>EVACUATION PLANS</Text>

          {/* Notice when opened from a specific disaster but no matching plan found */}
          {filterDisasterId && visiblePlans.length > 0 && !visiblePlans.some(p => p.disaster_id === filterDisasterId) && (
            <View style={[S.emptyCard, { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }]}>
              <Text style={{ fontSize: 22 }}>⚠️</Text>
              <Text variant="h5" style={{ marginTop: spacing.sm, color: '#92400E' }}>No Plan for This Disaster Yet</Text>
              <Text variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                Emergency coordinators haven't created an evacuation plan for this disaster yet. All current plans are shown below.
              </Text>
            </View>
          )}

          {visiblePlans.length === 0 ? (
            <View style={S.emptyCard}>
              <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#F3F4F6"
                />
              </Svg>
              <Text variant="h5" style={{ marginTop: spacing.md }}>No Active Plans</Text>
              <Text variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                Evacuation plans appear here when activated by emergency coordinators.
              </Text>
            </View>
          ) : (
            visiblePlans.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[S.planCard, p.plan_status === 'ACTIVE' && { borderLeftWidth: 4, borderLeftColor: '#DC2626' }]}
                onPress={() => loadPlanDetail(p.id)}
                disabled={!!loadingPlanId}
                activeOpacity={0.8}
              >
                <View style={S.planCardLeft}>
                  <View style={[S.statusDot, { backgroundColor: STATUS_COLOR[p.plan_status] ?? '#6B7280' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={S.planCardRow}>
                    <Text style={S.planRef}>{p.plan_ref}</Text>
                    <View style={[S.statusPill, { backgroundColor: STATUS_COLOR[p.plan_status] + '18' }]}>
                      <Text style={[S.statusPillTxt, { color: STATUS_COLOR[p.plan_status] }]}>
                        {p.plan_status}
                      </Text>
                    </View>
                  </View>
                  {/* Disaster info — type + address */}
                  {p.disaster_type ? (
                    <Text style={S.planDisasterType}>
                      {p.disaster_type === 'FIRE' ? '🔥' :
                       p.disaster_type === 'FLOOD' ? '🌊' :
                       p.disaster_type === 'EARTHQUAKE' ? '🏚️' :
                       p.disaster_type === 'STORM' ? '⛈️' : '⚠️'
                      } {p.disaster_type}
                    </Text>
                  ) : null}
                  {p.disaster_location ? (
                    <Text style={S.planDisasterLocation} numberOfLines={1}>
                      📍 {p.disaster_location}
                    </Text>
                  ) : null}
                  <Text style={S.planMeta}>
                    {p.activated_at
                      ? `Active since ${formatTime(p.activated_at)}`
                      : p.created_at
                      ? `Created ${formatDate(p.created_at)}`
                      : 'Evacuation plan'}
                  </Text>
                  {p.approved_by && <Text style={S.planMeta}>Approved by: {p.approved_by}</Text>}
                  {p.plan_status === 'ACTIVE' && !isResponder && (
                    <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 4 }}>
                      Tap to see your evacuation route →
                    </Text>
                  )}
                  {/* Manager actions */}
                  {isResponder && p.plan_status === 'PENDING' && (
                    <TouchableOpacity style={[S.ertBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={() => Alert.alert('Approve Plan', 'Approve this plan?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => approvePlan(p.id) }
                      ])}>
                      <Text style={S.ertBtnTxt}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {isResponder && p.plan_status === 'APPROVED' && (
                    <TouchableOpacity style={[S.ertBtn, { backgroundColor: '#DC2626' }]}
                      onPress={() => Alert.alert('Activate Plan', 'Activate this evacuation?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Activate', onPress: () => activatePlan(p.id) }
                      ])}>
                      <Text style={S.ertBtnTxt}>Activate</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {loadingPlanId === p.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
                }
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const S = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F8FAFC' },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  hBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Urgent citizen header
  urgentHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: '#DC2626' },
  urgentHeaderTitle:{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  urgentHeaderSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },

  // Active banner on list
  activeBanner:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', margin: spacing.md, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  activeBannerIcon: { fontSize: 24 },
  activeBannerTitle:{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  activeBannerSub:  { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },

  // Plan list cards
  planCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: 12, padding: spacing.md, gap: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  planCardLeft: { justifyContent: 'center', alignItems: 'center', width: 14 },
  planCardRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  planRef:      { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  planMeta:     { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  planDisasterType: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 3 },
  planDisasterLocation: { fontSize: 11, color: '#6B7280', marginTop: 1, marginBottom: 2 },
  statusPill:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillTxt:{ fontSize: 11, fontWeight: '700' },
  statusDot:    { width: 12, height: 12, borderRadius: 6 },

  ertBtn:    { marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  ertBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyCard: { margin: spacing.lg, padding: spacing.xl, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },

  // Citizen step cards
  stepCard:           { backgroundColor: '#fff', borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  stepBadge:          { alignSelf: 'flex-start', backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: spacing.sm },
  stepBadgeText:      { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepTitle:          { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: spacing.md },

  evacuationPointCard:    { backgroundColor: '#FFF5F5', borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: '#FECACA' },
  evacuationPointHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  evacuationPointName:    { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  evacuationPointMeta:    { fontSize: 13, color: '#6B7280', marginTop: 3 },
  priorityBadge:          { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  priorityText:           { color: '#fff', fontSize: 11, fontWeight: '800' },

  infoBox:      { backgroundColor: '#FFFBEB', borderRadius: 8, padding: spacing.sm, borderWidth: 1, borderColor: '#FDE68A', marginBottom: spacing.md },
  infoBoxText:  { fontSize: 13, color: '#92400E', lineHeight: 18 },

  actionRow:          { flexDirection: 'row', gap: spacing.sm },
  primaryActionBtn:   { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryActionTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryActionBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  secondaryActionTxt: { color: '#374151', fontWeight: '600', fontSize: 13 },

  shelterCard:      { backgroundColor: '#F0F9FF', borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: '#BAE6FD' },
  shelterName:      { fontSize: 16, fontWeight: '800', color: '#0C4A6E', marginBottom: spacing.sm },
  shelterMetaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  shelterMetaChip:  { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD' },
  shelterMetaText:  { fontSize: 12, color: '#0369A1', fontWeight: '600' },
  routeInfoRow:     { gap: 4, marginBottom: spacing.sm },
  routeInfoText:    { fontSize: 13, color: '#374151' },
  busInfoBox:       { backgroundColor: '#fff', borderRadius: 8, padding: spacing.sm, borderWidth: 1, borderColor: '#BAE6FD' },
  busInfoText:      { fontSize: 13, fontWeight: '600', color: '#0369A1' },

  altZoneRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  altZoneName:  { fontSize: 13, color: '#374151', fontWeight: '600' },
  altZoneDist:  { fontSize: 12, color: '#6B7280' },

  tipsCard:   { backgroundColor: '#fff', borderRadius: 16, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tipsTitle:  { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: spacing.md },
  tipRow:     { flexDirection: 'row', marginBottom: 6 },
  tipBullet:  { fontSize: 14, color: '#92400E', marginRight: 6, lineHeight: 20 },
  tipText:    { fontSize: 13, color: '#78350F', lineHeight: 20, flex: 1 },

  // Responder detail
  statusBanner:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md },
  statusBannerTitle: { fontSize: 17, fontWeight: '800' },
  statusBannerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },

  card:      { backgroundColor: '#fff', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: spacing.md },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox:  { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: spacing.md },
  statVal:  { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 4 },
  statLbl:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  progressBarBg:    { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginBottom: spacing.xs },
  progressBarFill:  { height: 10, backgroundColor: '#3B82F6', borderRadius: 5 },
  progressPct:      { fontSize: 13, color: '#3B82F6', fontWeight: '700', textAlign: 'right', marginBottom: spacing.sm },
  progressBarBgSm:  { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBarFillSm:{ height: 6, backgroundColor: '#22C55E', borderRadius: 3 },
  zoneProgress:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  zoneProgressName: { fontSize: 13, color: '#374151', marginBottom: 4 },
  zoneProgressPct:  { fontSize: 13, fontWeight: '700', color: '#6B7280', minWidth: 36, textAlign: 'right' },

  responderZoneCard:    { backgroundColor: '#F8FAFC', borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: '#E5E7EB' },
  responderZoneHeader:  { flexDirection: 'row', alignItems: 'center' },
  responderZoneName:    { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  responderZoneMeta:    { fontSize: 12, color: '#6B7280', marginTop: 3 },
  mapPinBtn:            { padding: 8, marginLeft: 4 },

  zoneRouteBox:   { flexDirection: 'row', marginTop: spacing.md, alignItems: 'flex-start' },
  zoneRouteArrow: { alignItems: 'center', paddingTop: 4 },
  zoneRouteDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  zoneRouteLine:  { width: 2, height: 30, backgroundColor: '#E5E7EB', marginVertical: 3 },
  zoneRouteFrom:  { fontSize: 12, fontWeight: '700', color: '#374151' },
  zoneRouteDetail:{ fontSize: 11, color: '#6B7280', marginTop: 2 },
  zoneRouteTo:    { fontSize: 12, fontWeight: '700', color: '#1D4ED8', marginTop: spacing.xs },

  shelterStatusRow: { flexDirection: 'row', alignItems: 'center' },
});

export default EvacuationPlansScreen;