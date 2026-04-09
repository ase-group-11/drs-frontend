// =============================================================================
// FILE: src/screens/MyCrewScreen/MyCrewScreen.tsx
//
// "My Crew" screen for ERT responders.
//
// APIs used:
//   GET /users/{user_id}           → get unit_ids for the responder
//   GET /emergency-units/{id}      → full unit detail: crew_roster, commander

// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest, authService, getUserUnitInfo } from '@services/authService';
import { API } from '@services/apiConfig';

const RED = '#DC2626';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CrewMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  isCommander?: boolean;
  isAdmin?: boolean;
  isMe?: boolean;
}


const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Responder',
};
const DEPT_EMOJI: Record<string, string> = {
  FIRE: '🔥', POLICE: '👮', MEDICAL: '🏥', IT: '💻',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#22C55E', INACTIVE: '#6B7280', SUSPENDED: '#EF4444',
};

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const MyCrewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  // Crew state
  const [unit, setUnit]         = useState<any>(null);
  const [crew, setCrew]         = useState<CrewMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load crew from API
  // ---------------------------------------------------------------------------
  const loadCrew = useCallback(async () => {
    setError(null);
    try {
      const user = await authService.getStoredUser() as any;
      if (!user) { setError('Not logged in'); setLoading(false); return; }
      // 1. Get unit ID from /users/{user_id} API
      const { unitId } = await getUserUnitInfo(true);

      if (!unitId) {
        setError('No unit assigned to your account.');
        setLoading(false); setRefreshing(false);
        return;
      }

      const myDept = (user.department ?? '').toUpperCase();

      // 2. GET /emergency-units/{id} — full detail with crew_roster
      const detail = await authRequest<any>(API.units.byId(unitId));
      setUnit(detail);

      // Build crew list
      const crewList: CrewMember[] = [];

      // Commander first
      if (detail.commander?.id) {
        crewList.push({
          id:           detail.commander.id,
          name:         detail.commander.name ?? 'Commander',
          email:        detail.commander.email ?? '',
          role:         'MANAGER',
          department:   myDept,
          status:       'ACTIVE',
          isCommander:  true,
          isMe:         detail.commander.id === user.id,
        });
      }

      // Crew roster
      for (const c of detail.crew_roster ?? []) {
        if (c.id === detail.commander?.id) continue; // already added
        crewList.push({
          id:         c.id,
          name:       c.name ?? c.full_name ?? 'Member',
          email:      c.email ?? '',
          role:       c.role ?? 'STAFF',
          department: c.department ?? myDept,
          status:     c.status ?? 'ACTIVE',
          isMe:       c.id === user.id,
        });
      }

      // Log what the API returned so we can debug empty crews
      console.log('[MyCrew] Unit:', detail.unit_name, '| commander:', detail.commander?.name ?? 'none');
      console.log('[MyCrew] crew_roster from API:', JSON.stringify(detail.crew_roster ?? []));
      console.log('[MyCrew] crew list built:', crewList.length, 'members');

      if (crewList.length === 0) {
        console.warn('[MyCrew] No crew assigned to this unit in the database.');
        console.warn('[MyCrew] Ask admin to assign crew via POST /emergency-units/{id}/crew');
      }

      setCrew(crewList);

    } catch (e: any) {
      console.error('[MyCrewScreen] Load failed:', e.message);
      setError(e.message || 'Failed to load crew. Check your connection.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadCrew(); }, [loadCrew]);

  // ---------------------------------------------------------------------------
  // Render crew member card
  // ---------------------------------------------------------------------------
  const renderCrewCard = ({ item }: { item: CrewMember }) => (
    <View style={[S.crewCard, item.isMe && S.crewCardMe]}>
      {/* Avatar */}
      <View style={[S.avatar, {
        backgroundColor: item.isAdmin ? '#7C3AED' :
                         item.isCommander ? RED :
                         item.isMe ? '#1D4ED8' : '#374151'
      }]}>
        <Text style={S.avatarTxt}>{initials(item.name)}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={S.crewName}>{item.name}{item.isMe ? ' (You)' : ''}</Text>
          {item.isCommander && (
            <View style={S.badge}><Text style={S.badgeTxt}>Commander</Text></View>
          )}
          {item.isAdmin && (
            <View style={[S.badge, { backgroundColor: '#7C3AED20' }]}>
              <Text style={[S.badgeTxt, { color: '#7C3AED' }]}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={S.crewRole}>
          {DEPT_EMOJI[item.department] ?? ''} {item.department} · {ROLE_LABEL[item.role] ?? item.role}
        </Text>
        <Text style={S.crewEmail}>{item.email}</Text>
      </View>

      {/* Status dot */}
      <View style={[S.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? '#6B7280' }]} />
    </View>
  );

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>My Crew</Text>
          {unit && <Text style={S.headerSub}>{unit.unit_name ?? unit.unit_code} · {crew.length} members</Text>}
        </View>
        <TouchableOpacity style={S.hBtn} onPress={() => { setRefreshing(true); loadCrew(); }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {!!error && !loading && (
        <View style={S.errorBox}>
          <Text style={S.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={loadCrew} style={{ marginTop: 8 }}>
            <Text style={{ color: RED, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={S.center}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading crew...</Text>
        </View>
      )}

      {/* CREW LIST */}
      {!loading && (
        <FlatList
          data={crew}
          keyExtractor={i => i.id}
          renderItem={renderCrewCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCrew(); }} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListHeaderComponent={unit ? (
            <View style={S.unitCard}>
              <Text style={S.unitName}>{unit.unit_name ?? unit.unit_code}</Text>
              <Text style={S.unitMeta}>
                {DEPT_EMOJI[unit.department] ?? ''} {unit.department} · {unit.unit_type?.replace(/_/g,' ')} · {unit.unit_status}
              </Text>
              {unit.station?.name && (
                <Text style={S.unitStation}>📍 {unit.station.name}</Text>
              )}
              {unit.current_assignment && (
                <View style={S.assignmentBadge}>
                  <Text style={S.assignmentTxt}>
                    🚨 Active: {unit.current_assignment.disaster_type} at {unit.current_assignment.location}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
          ListEmptyComponent={!error ? (
            <View style={S.center}>
              <Text style={{ fontSize: 40, lineHeight: 52 }}>👥</Text>
              <Text style={{ color: '#374151', marginTop: 12, fontSize: 15, fontWeight: '700' }}>
                No crew assigned yet
              </Text>
              <Text style={{ color: '#9CA3AF', marginTop: 6, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                No members have been assigned. Contact your admin to set up the crew roster.
              </Text>
            </View>
          ) : null}
        />
      )}

    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center',
            backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  hBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },


  errorBox: { margin: 12, padding: 14, backgroundColor: '#FEE2E2',
              borderRadius: 10, borderLeftWidth: 3, borderLeftColor: RED },
  errorTxt: { color: '#991B1B', fontSize: 13 },

  unitCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14,
              marginBottom: 10, shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07,
              shadowRadius: 4, elevation: 2 },
  unitName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  unitMeta: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  unitStation: { fontSize: 12, color: '#4B5563', marginTop: 3 },
  assignmentBadge: { marginTop: 8, backgroundColor: '#FEF2F2',
                     borderRadius: 8, padding: 8, borderLeftWidth: 3,
                     borderLeftColor: RED },
  assignmentTxt: { fontSize: 12, color: '#991B1B', fontWeight: '600' },

  crewCard: { flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#fff', borderRadius: 12, padding: 12,
              marginBottom: 8, shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
              shadowRadius: 4, elevation: 2 },
  crewCardMe: { borderWidth: 1.5, borderColor: '#BFDBFE' },
  avatar: { width: 44, height: 44, borderRadius: 22,
            justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  crewName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  crewRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  crewEmail: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
           backgroundColor: '#FEE2E2' },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: RED },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },


});

export default MyCrewScreen;