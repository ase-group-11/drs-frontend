// =============================================================================
// FILE: src/screens/MyCrewScreen/MyCrewScreen.tsx
//
// "My Crew" screen for ERT responders.
//
// APIs used:
//   GET /users/{user_id}           → get unit_ids for the responder
//   GET /emergency-units/{id}      → full unit detail: crew_roster, commander
//
// Group chat: messages stored locally in AsyncStorage (no backend chat API).
// Messages are per-unit so each unit has its own chat history on the device.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity,
  FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest, authService, getUserUnitInfo } from '@services/authService';

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

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  text: string;
  timestamp: string; // ISO
  isMe: boolean;
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

function timeStr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const MyCrewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'crew' | 'chat'>('crew');

  // Crew state
  const [unit, setUnit]         = useState<any>(null);
  const [crew, setCrew]         = useState<CrewMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [me, setMe]             = useState<any>(null);
  const flatListRef             = useRef<FlatList>(null);
  const CHAT_KEY_PREFIX         = '@crew_chat:';

  // ---------------------------------------------------------------------------
  // Load crew from API
  // ---------------------------------------------------------------------------
  const loadCrew = useCallback(async () => {
    setError(null);
    try {
      const user = await authService.getStoredUser() as any;
      if (!user) { setError('Not logged in'); setLoading(false); return; }
      setMe(user);

      // 1. Get unit ID from /users/{user_id} API
      const { unitId } = await getUserUnitInfo(true);

      if (!unitId) {
        setError('No unit assigned to your account.');
        setLoading(false); setRefreshing(false);
        return;
      }

      const myDept = (user.department ?? '').toUpperCase();

      // 2. GET /emergency-units/{id} — full detail with crew_roster
      const detail = await authRequest<any>(`/emergency-units/${unitId}`);
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

      // Load chat messages for this unit
      await loadMessages(unitId);

    } catch (e: any) {
      console.error('[MyCrewScreen] Load failed:', e.message);
      setError(e.message || 'Failed to load crew. Check your connection.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadCrew(); }, [loadCrew]);

  // ---------------------------------------------------------------------------
  // Chat — AsyncStorage persistence
  // ---------------------------------------------------------------------------
  const loadMessages = async (unitId: string) => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_KEY_PREFIX + unitId);
      setMessages(raw ? JSON.parse(raw) : []);
    } catch { setMessages([]); }
  };

  const saveMessages = async (msgs: ChatMessage[]) => {
    if (!unit?.id) return;
    try {
      await AsyncStorage.setItem(CHAT_KEY_PREFIX + unit.id, JSON.stringify(msgs));
    } catch {}
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !me) return;
    setInputText('');

    const msg: ChatMessage = {
      id:             Date.now().toString(),
      senderId:       me.id,
      senderName:     me.full_name ?? me.name ?? 'Me',
      senderInitials: initials(me.full_name ?? me.name ?? 'ME'),
      text,
      timestamp:      new Date().toISOString(),
      isMe:           true,
    };

    const updated = [...messages, msg];
    setMessages(updated);
    await saveMessages(updated);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const clearChat = async () => {
    setMessages([]);
    if (unit?.id) await AsyncStorage.removeItem(CHAT_KEY_PREFIX + unit.id);
  };

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
  // Render chat bubble
  // ---------------------------------------------------------------------------
  const renderBubble = ({ item }: { item: ChatMessage }) => (
    <View style={[S.bubbleRow, item.isMe && S.bubbleRowMe]}>
      {!item.isMe && (
        <View style={[S.bubbleAvatar, { backgroundColor: '#374151' }]}>
          <Text style={S.bubbleAvatarTxt}>{item.senderInitials}</Text>
        </View>
      )}
      <View style={{ maxWidth: '72%' }}>
        {!item.isMe && (
          <Text style={S.bubbleSender}>{item.senderName}</Text>
        )}
        <View style={[S.bubble, item.isMe ? S.bubbleMe : S.bubbleThem]}>
          <Text style={[S.bubbleText, item.isMe && { color: '#fff' }]}>{item.text}</Text>
        </View>
        <Text style={[S.bubbleTime, item.isMe && { textAlign: 'right' }]}>
          {timeStr(item.timestamp)}
        </Text>
      </View>
    </View>
  );

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

      {/* Tab bar */}
      <View style={S.tabBar}>
        {(['crew', 'chat'] as const).map(t => (
          <TouchableOpacity key={t} style={[S.tab, tab === t && S.tabActive]}
            onPress={() => {
              setTab(t);
              if (t === 'chat') setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
            }}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtActive]}>
              {t === 'crew' ? `👥 Team (${crew.length})` : `💬 Group Chat${messages.length > 0 ? ` (${messages.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
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

      {/* CREW TAB */}
      {!loading && tab === 'crew' && (
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

      {/* CHAT TAB */}
      {!loading && tab === 'chat' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {messages.length === 0 ? (
            <View style={S.center}>
              <Text style={{ fontSize: 40, lineHeight: 52 }}>💬</Text>
              <Text style={S.emptyChat}>No messages yet.</Text>
              <Text style={S.emptyChatSub}>Messages are stored on this device.</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m.id}
              renderItem={renderBubble}
              contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Clear chat */}
          {messages.length > 0 && (
            <TouchableOpacity style={S.clearBtn} onPress={clearChat}>
              <Text style={S.clearTxt}>Clear Chat</Text>
            </TouchableOpacity>
          )}

          {/* Input */}
          <View style={S.inputRow}>
            <TextInput
              style={S.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message your crew..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[S.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                  stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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

  tabBar: { flexDirection: 'row', backgroundColor: '#fff',
            borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab:    { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: RED },
  tabTxt:    { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTxtActive: { color: RED },

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

  // Chat
  emptyChat:    { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyChatSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  bubbleRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14,
                  justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  bubbleAvatarTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubbleSender: { fontSize: 11, color: '#6B7280', marginBottom: 3, marginLeft: 2 },
  bubble:   { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: RED, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 3, marginHorizontal: 2 },
  clearBtn: { alignSelf: 'flex-end', margin: 8, paddingHorizontal: 12,
              paddingVertical: 5, borderRadius: 8,
              backgroundColor: '#FEE2E2' },
  clearTxt: { fontSize: 11, color: RED, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end',
              padding: 10, backgroundColor: '#fff',
              borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 100,
           backgroundColor: '#F9FAFB', borderRadius: 20,
           paddingHorizontal: 14, paddingVertical: 8,
           fontSize: 14, color: '#111827',
           borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 40, height: 40, borderRadius: 20,
             backgroundColor: RED, justifyContent: 'center',
             alignItems: 'center' },
});

export default MyCrewScreen;