// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ActiveMissionsScreen/ActiveMissionsScreen.tsx
//
// Active Missions with per-disaster group chat in mission detail.
//
// Mission Detail has 2 tabs:
//   Details — mission info, deployment details, action buttons
//   Group Chat — per-disaster chat (AsyncStorage, key = @disaster_chat:{disaster_id})
//
// All responders assigned to the SAME disaster share one chat room.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authService, authRequest, getUserUnitInfo } from '@services/authService';
import { wsService } from '@services/wsService';
import { disasterStore } from '@services/disasterStore';
import { disasterService } from '@services/disasterService';
import { API, WS_URL } from '@services/apiConfig';

const RED = '#DC2626';

interface Mission {
  id: string;
  disaster_id: string;
  disaster_type: string;
  severity: string;
  location_address: string;
  coordinates: { lat: number; lon: number };
  status: string;
  assigned_at: string;
  distance_km: string;
  people_affected: string;
  eta_minutes: string;
  unit_id: string;
  unit_members: number;
}

interface ChatMessage {
  id: string;
  seq?: number;
  sender: string;       // sender_name from backend
  senderId: string;     // sender_id from backend
  sender_type?: string; // 'admin' | 'unit'
  text: string;         // message field from backend
  timestamp: string;    // sent_at from backend
  type?: 'message' | 'system' | 'error' | 'ping' | 'pong';
  isSystem?: boolean;
}

const SEV_COLOR: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6' };
const STATUS_COLOR: Record<string, string> = { dispatched: '#DC2626', en_route: '#F97316', on_scene: '#8B5CF6', in_progress: '#EF4444', completed: '#22C55E', cancelled: '#6B7280' };
const TYPE_EMOJI: Record<string, string> = {
  FLOOD: '🌊', FIRE: '🔥', EARTHQUAKE: '🏚️', HURRICANE: '🌀',
  TORNADO: '🌪️', TSUNAMI: '🌊', DROUGHT: '☀️', HEATWAVE: '🌡️',
  COLDWAVE: '🥶', STORM: '⛈️', OTHER: '⚠️',
};
const STATUS_OPTIONS = [
  { id: 'EN_ROUTE',    emoji: '🚗', label: 'En Route',    desc: 'Traveling to scene' },
  { id: 'ON_SCENE',    emoji: '📍', label: 'On Scene',    desc: 'Arrived at location' },
  { id: 'IN_PROGRESS', emoji: '⚡', label: 'In Progress', desc: 'Actively responding' },
  { id: 'COMPLETED',   emoji: '✅', label: 'Completed',   desc: 'Task finished' },
];

// Parse UTC ISO timestamp from backend (may be missing Z suffix)
const parseUTCTimestamp = (ts: string): Date => {
  if (!ts) return new Date();
  const normalized = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  return new Date(normalized);
};
const formatChatTime = (ts: string): string =>
  parseUTCTimestamp(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const sortMessages = (msgs: ChatMessage[]): ChatMessage[] =>
  [...msgs].sort((a, b) => {
    // Sort purely by timestamp (UTC-corrected) — oldest first
    const ta = parseUTCTimestamp(a.timestamp).getTime();
    const tb = parseUTCTimestamp(b.timestamp).getTime();
    if (ta !== tb) return ta - tb;
    // Tiebreak by seq if timestamps are identical
    if (a.seq != null && b.seq != null) return a.seq - b.seq;
    return 0;
  });

const formatAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} mins ago`;
  return `${Math.floor(s / 3600)} hr ago`;
};

export const ActiveMissionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [active, setActive] = useState<Mission[]>([]);
  const [completed, setCompleted] = useState<Mission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unitLabel, setUnitLabel] = useState('Unit');

  // Detail view
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionDetail, setMissionDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'details' | 'chat'>('details');
  const [isCompletedMission, setIsCompletedMission] = useState(false);  // true = read-only history

  // Status modal
  const [statusModal, setStatusModal] = useState<Mission | null>(null);
  const [selStatus, setSelStatus] = useState('');
  const [sitrep, setSitrep] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [minorInjuries, setMinorInjuries] = useState(0);
  const [seriousInjuries, setSeriousInjuries] = useState(0);
  const [locationVerified, setLocationVerified] = useState(false);
  const [requestBackupFlag, setRequestBackupFlag] = useState(false);
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chat state — real-time WebSocket
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState('');
  const [userName, setUserName]         = useState('');
  const [userId, setUserId]             = useState('');
  const [chatConnected, setChatConnected] = useState(false);
  const [chatConnecting, setChatConnecting] = useState(false);
  const [chatError, setChatError]       = useState<string | null>(null);
  const [membersOnline, setMembersOnline] = useState(0);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const chatWsRef   = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const chatDisasterRef = useRef<string | null>(null);
  const isCompletedRef  = useRef<boolean>(false); // ref so useEffect reads fresh value

  // Subscribe to disasterStore so any external mission changes reflect immediately
  useEffect(() => {
    const unsub = disasterStore.subscribe(() => {
      const storeMissions = disasterStore.getState().activeMissions;
      if (storeMissions.length === 0) return; // store cleared — don't override local list
      // Re-map store missions to local Mission shape if store has fresher data
      setActive(prev => prev.map(m => {
        const updated = storeMissions.find(s => s.id === m.id || s.deployment_id === m.id);
        if (!updated) return m;
        return { ...m, status: (updated.deployment_status ?? m.status).toLowerCase() };
      }).filter(m => storeMissions.some(s => s.id === m.id || s.deployment_id === m.id)));
    });
    return unsub;
  }, []);

  // WS — subscribe to alerts only, do NOT connect/disconnect the singleton
  // wsService lifecycle is owned by HomeScreen; calling disconnect() here
  // would kill the connection for the entire app when navigating back.
  useEffect(() => {
    const unsub = wsService.onAlert((alert) => {
      if (['disaster.dispatched', 'disaster.verified', 'disaster.updated', 'disaster.resolved',
           'disaster.false_alarm', 'disaster.unit_completed', 'coordination.team_assigned'].includes(alert.event_type)) {
        fetchMissions();
      }
      if (alert.event_type === 'disaster.backup_requested') Alert.alert('🆘 BACKUP', alert.message, [{ text: 'OK' }]);
      if (alert.event_type === 'evacuation.triggered') Alert.alert('🚨 EVACUATION', alert.message ?? '', [{ text: 'View', onPress: () => navigation.navigate('EvacuationPlans' as any) }, { text: 'OK' }]);
    });
    return () => { unsub(); }; // only unsubscribe, never disconnect
  }, []);

  useEffect(() => {
    fetchMissions();
    loadUser();
  }, []);

  // Refresh whenever screen comes into focus (e.g. navigating back from detail)
  useFocusEffect(useCallback(() => {
    fetchMissions();
  }, []));

  const loadUser = async () => {
    try {
      const u = await authService.getStoredUser() as any;
      setUserName(u?.full_name ?? u?.employee_id ?? 'Me');
      setUserId(u?.id ?? '');
    } catch {}
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const user = await authService.getStoredUser();
      if (!user?.id) { setLoading(false); return; }

      // Use getUserUnitInfo() — same as File 1, avoids inline /emergency-units/ fetch
      const { unitId, unitCodes } = await getUserUnitInfo();
      const unitCode = unitCodes.length > 0 ? unitCodes[0] : 'Unit';
      setUnitLabel(unitCode);
      if (!unitId) { setLoading(false); return; }

      const [a, c] = await Promise.all([
        authRequest<any>(API.deployments.unitActive(unitId)),
        authRequest<any>(API.deployments.unitCompleted(unitId, 20)),
      ]);

      const toM = (m: any): Mission => ({
        id: m.id ?? m.deployment_id,
        disaster_id: m.disaster_id ?? m.disaster?.id ?? m.id,
        disaster_type: (m.disaster?.disaster_type ?? m.disaster?.type ?? m.disaster_type ?? 'OTHER').toUpperCase(),
        severity: (m.disaster?.severity ?? m.severity ?? 'MEDIUM').toUpperCase(),
        location_address: m.disaster?.location_address ?? m.location_address ?? 'Unknown',
        coordinates: m.disaster?.location ?? m.disaster?.coordinates ?? { lat: 53.3498, lon: -6.2603 },
        status: (m.deployment_status ?? m.status ?? 'dispatched').toLowerCase(),
        assigned_at: m.timeline?.assigned_at ?? m.assigned_at ?? m.timeline?.dispatched_at ?? m.created_at ?? new Date().toISOString(),
        distance_km: m.distance_km ? String(m.distance_km) : '—',
        people_affected: m.disaster?.people_affected ? String(m.disaster.people_affected) : '—',
        eta_minutes: m.eta_minutes ? String(m.eta_minutes) : '—',
        unit_id: m.unit_id ?? m.unit?.unit_code ?? unitCode,
        unit_members: m.unit?.crew_count ?? m.unit_members ?? 4,
      });

      const al = a?.active_missions ?? a?.missions ?? (Array.isArray(a) ? a : []);
      const cl = c?.completed_missions ?? c?.missions ?? (Array.isArray(c) ? c : []);
      setActive(al.map(toM));
      setCompleted(cl.map(toM));
      disasterStore.setActiveMissions(al);
    } catch (e: any) { setError(e.message || 'Failed'); }
    setLoading(false);
  };

  const openDetail = async (m: Mission, fromCompleted = false) => {
    console.log('[openDetail] mission id:', m.id, 'disaster_id:', m.disaster_id);
    setSelectedMission(m);
    setDetailTab('details');
    setDetailLoading(true);
    setIsCompletedMission(fromCompleted);
    isCompletedRef.current = fromCompleted; // update ref immediately for useEffect
    setMessages([]);
    setChatError(null);

    try {
      const detail = await disasterService.getDeploymentDetail(m.id);
      setMissionDetail(detail);
    } catch { setMissionDetail(null); }
    setDetailLoading(false);
    // WS connection is managed by useEffect on selectedMission below
  };

  const navigateToDisaster = (m: Mission) => {
    navigation.navigate('Home' as any, { flyToLat: m.coordinates.lat, flyToLon: m.coordinates.lon, flyToLabel: m.location_address });
  };

  // ── Chat — real WebSocket via /ws/chat/{disaster_id} ───────────────

  // ── Chat WS refs — StrictMode-safe (same pattern as admin web hook) ─────
  const isChatMounted    = useRef(false);
  const hasConnectedRef  = useRef(false);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount   = useRef(0);
  const MAX_RECONNECTS   = 10;
  const RECONNECT_DELAY  = 3000;

  const disconnectChat = useCallback(() => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    reconnectCount.current = MAX_RECONNECTS;
    if (chatWsRef.current) {
      chatWsRef.current.onclose = null;
      chatWsRef.current.close();
      chatWsRef.current = null;
    }
    setChatConnected(false);
    setChatConnecting(false);
    chatDisasterRef.current = null;
  }, []);

  const connectChat = useCallback(async (disasterId: string) => {
    if (!isChatMounted.current) return;
    // Close any stale socket without triggering onclose reconnect
    if (chatWsRef.current) {
      chatWsRef.current.onclose = null;
      chatWsRef.current.close();
      chatWsRef.current = null;
    }
    const token = await AsyncStorage.getItem('@auth/access_token');
    if (!token) { setChatError('Not authenticated.'); return; }
    // Re-check after async token fetch — component might have unmounted
    if (!isChatMounted.current) return;

    const url = `${WS_URL}${API.chat.ws(disasterId)}?token=${token}`;
    console.log('[Chat WS] Connecting:', url.replace(token, token.slice(0,16)+'...'));
    const ws = new WebSocket(url);
    chatWsRef.current = ws;
    chatDisasterRef.current = disasterId;
    setChatConnecting(true);
    setChatError(null);

    ws.onopen = () => {
      if (!thisWsActive()) { ws.close(); return; }
      console.log('[Chat WS] Connected ✓ disaster:', disasterId);
      setChatConnected(true);
      setChatConnecting(false);
      setChatError(null);
      reconnectCount.current = 0;
    };

    // Capture mounted state at connection time — each WS instance checks its own flag
    const thisWsActive = () => isChatMounted.current && chatWsRef.current === ws;

    ws.onmessage = (event) => {
      // Log every raw frame so we can confirm messages arrive at JS layer
      console.log('[Chat WS] RAW frame received:', event.data?.slice(0, 120));
      if (!thisWsActive()) {
        console.warn('[Chat WS] Frame received but connection no longer active — ignoring');
        return;
      }
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'history') {
          const hist: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
            id: m.id, seq: m.seq,
            sender: m.sender_name ?? 'Unknown', senderId: m.sender_id ?? '',
            sender_type: m.sender_type ?? 'unit',
            text: m.message ?? '', timestamp: m.sent_at ?? new Date().toISOString(),
            type: 'message',
          }));
          setMessages(sortMessages(hist));
          if (data.members_online != null) setMembersOnline(data.members_online);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
          return;
        }

        if (data.type === 'system') {
          setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`, sender: 'System', senderId: 'system',
            text: data.message ?? '', timestamp: data.sent_at ?? new Date().toISOString(),
            isSystem: true, type: 'system',
          }]);
          return;
        }

        if (data.type === 'error') {
          setChatError(data.message ?? 'Chat error');
          if (data.code === 4003) loadChatHistory(disasterId);
          return;
        }

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'ping' }));
          return;
        }

        if (data.type === 'message') {
          console.log('[Chat WS] ▶ Message from:', data.sender_name, '—', data.message);
          if (!thisWsActive()) { console.warn('[Chat WS] Message arrived after disconnect'); return; }
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return sortMessages([...prev, {
              id: data.id, seq: data.seq,
              sender: data.sender_name ?? 'Unknown', senderId: data.sender_id ?? '',
              sender_type: data.sender_type ?? 'unit',
              text: data.message ?? '', timestamp: data.sent_at ?? new Date().toISOString(),
              type: 'message',
            }]);
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        }
      } catch { /* non-JSON — ignore */ }
    };

    ws.onerror = () => ws.close();

    ws.onclose = (e) => {
      if (!isChatMounted.current) return; // full unmount — skip
      setChatConnected(false);
      setChatConnecting(false);
      console.log('[Chat WS] Closed code:', e.code, 'reason:', e.reason);
      const reason = (e.reason ?? '').toLowerCase();
      const is403 = e.code === 1006 && reason.includes('403');
      const is401 = e.code === 1006 && (reason.includes('401') || reason.includes('unauthorized'));

      if (e.code === 4001 || is401) {
        setChatError('Authentication failed. Please log out and log back in.');
      } else if (e.code === 4003 || is403) {
        setChatError('You are not assigned to this disaster. Showing message history.');
        loadChatHistory(disasterId);
      } else if (e.code === 4004) {
        setChatError('Disaster not found.');
      } else if (e.code === 4009) {
        setChatError('Chat is closed — disaster no longer active.');
      } else if (e.code === 1000) {
        // Normal close — do nothing
      } else {
        // Unexpected drop — auto-reconnect (same as admin web)
        if (reconnectCount.current < MAX_RECONNECTS) {
          reconnectCount.current += 1;
          console.log('[Chat WS] Reconnecting in 3s... attempt', reconnectCount.current);
          reconnectTimer.current = setTimeout(() => {
            if (isChatMounted.current) connectChat(disasterId);
          }, RECONNECT_DELAY);
        } else {
          setChatError('Connection lost. Tap Reconnect to try again.');
        }
      }
    };
  }, []);

  // ── WS lifecycle — StrictMode-safe (50ms guard, same as admin web) ───────
  useEffect(() => {
    if (!selectedMission || isCompletedRef.current) {
      if (!selectedMission) disconnectChat();
      if (selectedMission && isCompletedRef.current) loadChatHistory(selectedMission.disaster_id);
      return;
    }

    isChatMounted.current   = true;
    hasConnectedRef.current = false;
    reconnectCount.current  = 0;

    // 50ms delay prevents double-connect in React dev StrictMode
    const initTimer = setTimeout(() => {
      if (!isChatMounted.current || hasConnectedRef.current) return;
      hasConnectedRef.current = true;
      setMessages([]);
      connectChat(selectedMission.disaster_id);
    }, 50);

    return () => {
      clearTimeout(initTimer);
      isChatMounted.current   = false;
      hasConnectedRef.current = false;
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      if (chatWsRef.current) {
        chatWsRef.current.onclose = null;
        chatWsRef.current.close();
        chatWsRef.current = null;
      }
      setChatConnected(false);
      setChatConnecting(false);
    };
  }, [selectedMission?.id]);
  const loadChat = (disasterId: string) => {
    connectChat(disasterId);
  };

  // Read-only history for completed/resolved missions via REST
  const loadChatHistory = async (disasterId: string) => {
    setChatHistoryLoading(true);
    setChatError(null);
    try {
      const data = await authRequest<any>(API.chat.history(disasterId, 200));
      const hist: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
        id:          m.id,
        seq:         m.seq,
        sender:      m.sender_name ?? 'Unknown',
        senderId:    m.sender_id   ?? '',
        sender_type: m.sender_type ?? 'unit',
        text:        m.message     ?? '',
        timestamp:   m.sent_at     ?? new Date().toISOString(),
        type:        'message',
      }));
      setMessages(sortMessages(hist));
      if (hist.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (e: any) {
      // 403 = not assigned, 404 = no history yet — both are non-critical
      if (e.status === 403 || e.status === 404) {
        setMessages([]);
      } else {
        setChatError(e.message || 'Could not load chat history.');
      }
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !chatWsRef.current || chatWsRef.current.readyState !== WebSocket.OPEN) return;
    chatWsRef.current.send(JSON.stringify({ message: text }));
    setChatInput('');
  };

  // ── Status modal ───────────────────────────────────────────────────
  const openStatusModal = (m: Mission) => {
    setStatusModal(m); setSelStatus(''); setSitrep(''); setTags([]);
    setMinorInjuries(0); setSeriousInjuries(0); setLocationVerified(false);
    setRequestBackupFlag(false); setIsFalseAlarm(false); setAssessmentNotes('');
  };

  const submitStatus = async () => {
    if (!selStatus || !statusModal) return;
    setSubmitting(true);
    try {
      await disasterService.updateDeploymentStatus(statusModal.id, {
        new_status: selStatus, situation_report: sitrep || undefined,
        tags: tags.length > 0 ? tags : undefined, minor_injuries: minorInjuries,
        serious_injuries: seriousInjuries, location_verified: locationVerified,
        request_immediate_backup: requestBackupFlag, assessment_notes: assessmentNotes || undefined,
        is_false_alarm: isFalseAlarm,
      });
      Alert.alert('✅ Updated', `Status: ${selStatus.replace(/_/g, ' ')}`);
      const sl = selStatus.toLowerCase();
      if (sl === 'completed' || isFalseAlarm) {
        // Optimistic remove then full re-fetch so completed tab also populates
        setActive(prev => prev.filter(x => x.id !== statusModal.id));
        disasterStore.removeMission(statusModal.id);
        fetchMissions();
      } else {
        setActive(prev => prev.map(x => x.id === statusModal.id ? { ...x, status: sl } : x));
        disasterStore.updateMissionStatus(statusModal.id, selStatus);
      }
      setStatusModal(null);
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
    setSubmitting(false);
  };

  const list = tab === 'active' ? active : completed;

  // ═══════════════════════════════════════════════════════════════════
  // MISSION DETAIL VIEW (with chat tab)
  // ═══════════════════════════════════════════════════════════════════
  if (selectedMission) {
    const m = selectedMission;
    const sevCol = SEV_COLOR[m.severity] ?? '#6B7280';

    const renderBubble = ({ item }: { item: ChatMessage }) => {
      // System messages (join/leave) — centred grey pill
      if (item.isSystem || item.type === 'system') {
        return (
          <View style={S.systemMsgWrap}>
            <Text style={S.systemMsg}>{item.text}</Text>
          </View>
        );
      }
      const isMe = item.senderId === userId;
      const isAdmin = item.sender_type === 'admin';
      return (
        <View style={[S.bubbleWrap, isMe ? S.bubbleWrapMe : S.bubbleWrapOther]}>
          {!isMe && (
            <View style={S.bubbleHeader}>
              {isAdmin && (
                <View style={S.adminBadge}>
                  <Text style={S.adminBadgeTxt}>CMD</Text>
                </View>
              )}
              <Text style={S.bubbleSender} numberOfLines={1}>{item.sender}</Text>
            </View>
          )}
          <Text style={[S.bubbleText, isMe && { color: '#fff' }]}>{item.text}</Text>
          <Text style={[S.bubbleTime, isMe && { color: 'rgba(255,255,255,0.65)' }]}>
            {formatChatTime(item.timestamp)}
          </Text>
        </View>
      );
    };

    return (
      <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={S.header}>
          <TouchableOpacity style={S.hBtn} onPress={() => { disconnectChat(); setSelectedMission(null); setMissionDetail(null); setMessages([]); }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={S.hTitle}>Mission Detail</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Detail tabs: Details | Group Chat */}
        <View style={S.tabs}>
          <TouchableOpacity style={[S.tab, detailTab === 'details' && S.tabOn]} onPress={() => setDetailTab('details')}>
            <Text style={[S.tabTxt, detailTab === 'details' && S.tabTxtOn]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.tab, detailTab === 'chat' && S.tabOn]}
            onPress={() => { setDetailTab('chat'); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[S.tabTxt, detailTab === 'chat' && S.tabTxtOn]}>
                {isCompletedMission ? 'Chat History' : 'Group Chat'}
              </Text>
              {!isCompletedMission && chatConnected && (
                <View style={[S.chatLiveDot, { marginBottom: 6 }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── DETAILS TAB ── */}
        {detailTab === 'details' && (
          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            <View style={[S.card, { borderLeftWidth: 4, borderLeftColor: sevCol }]}>
              <Text style={{ fontSize: 28, lineHeight: 36 }}>{TYPE_EMOJI[m.disaster_type] ?? '⚠️'}</Text>
              <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#1F2937', marginTop: 4 }}>
                {m.disaster_type.replace(/_/g, ' ')} — {m.severity}
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{m.location_address}</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Assigned {formatAgo(m.assigned_at)}</Text>
              <View style={[S.statusBadge, { backgroundColor: STATUS_COLOR[m.status] ?? '#6B7280', alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={S.statusBadgeTxt}>{m.status.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            </View>

            {detailLoading ? <ActivityIndicator color={RED} style={{ margin: 20 }} /> : missionDetail ? (
              <View style={S.card}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>Deployment Details</Text>
                {missionDetail.priority_level && <Text style={S.infoRow}>Priority: <Text style={S.infoVal}>{missionDetail.priority_level}</Text></Text>}
                {missionDetail.situation_report && <Text style={S.infoRow}>Sitrep: <Text style={S.infoVal}>{missionDetail.situation_report}</Text></Text>}
                {missionDetail.timeline && Object.entries(missionDetail.timeline).map(([k, v]) => v ? (
                  <Text key={k} style={S.infoRow}>{k.replace(/_/g, ' ')}: <Text style={S.infoVal}>{new Date(v as string).toLocaleTimeString()}</Text></Text>
                ) : null)}
              </View>
            ) : null}

            {m.status !== 'completed' && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={S.btnRed} onPress={() => navigateToDisaster(m)}>
                <Text style={S.btnRedTxt}>🧭  Navigate to Disaster</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.btnOutline} onPress={() => openStatusModal(m)}>
                <Text style={S.btnOutTxt}>📱  Update Status</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.btnOutline}
                onPress={() => Alert.alert('📞 Contact Command', 'Call HQ?',
                  [{ text: 'Cancel', style: 'cancel' }, { text: 'Call', onPress: () => Linking.openURL('tel:999') }])}>
                <Text style={S.btnOutTxt}>📞  Contact Command</Text>
              </TouchableOpacity>
            </View>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ── GROUP CHAT TAB ── */}
        {detailTab === 'chat' && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>

            {/* ── COMPLETED MISSION: read-only history ── */}
            {isCompletedMission ? (
              <>
                {/* Read-only banner */}
                <View style={S.historyBanner}>
                  <Text style={S.historyBannerIcon}>🔒</Text>
                  <Text style={S.historyBannerTxt}>Read-only — mission completed</Text>
                  <TouchableOpacity
                    onPress={() => selectedMission && loadChatHistory(selectedMission.disaster_id)}
                    style={S.historyRefreshBtn}
                    disabled={chatHistoryLoading}
                  >
                    <Text style={S.historyRefreshTxt}>{chatHistoryLoading ? '…' : '↻'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Error */}
                {!!chatError && (
                  <View style={S.chatErrorBar}>
                    <Text style={S.chatErrorTxt}>{chatError}</Text>
                  </View>
                )}

                {/* Loading */}
                {chatHistoryLoading && messages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={RED} />
                    <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Loading chat history…</Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <Text style={{ fontSize: 40, lineHeight: 52 }}>💬</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 }}>No Chat History</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                      No messages were sent during this mission.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={i => i.id}
                    renderItem={renderBubble}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 20 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                  />
                )}
                {/* No input bar for completed missions */}
              </>
            ) : (
              <>
                {/* ── ACTIVE MISSION: live WebSocket chat ── */}

                {/* Connection status bar */}
                <View style={[S.chatStatusBar, chatConnected ? S.chatStatusBarOn : S.chatStatusBarOff]}>
                  <View style={[S.chatStatusDot, {
                    backgroundColor: chatConnected ? '#22C55E' : chatConnecting ? '#F59E0B' : '#9CA3AF'
                  }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.chatStatusTxt}>
                      {chatConnecting ? 'Connecting…' : chatConnected ? `Live · ${membersOnline > 0 ? `${membersOnline} online` : 'connected'}` : 'Disconnected'}
                    </Text>
                    {!chatConnected && !chatConnecting && selectedMission && (
                      <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                        Disaster #{selectedMission.disaster_id?.slice(0, 8)}
                      </Text>
                    )}
                  </View>
                  {!chatConnected && !chatConnecting && (
                    <TouchableOpacity
                      onPress={() => { setChatError(null); selectedMission && connectChat(selectedMission.disaster_id); }}
                      style={S.chatRetryBtn}
                    >
                      <Text style={S.chatRetryTxt}>Reconnect</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Error banner */}
                {!!chatError && (
                  <View style={S.chatErrorBar}>
                    <Text style={S.chatErrorTxt}>{chatError}</Text>
                  </View>
                )}

                {/* Connecting spinner / empty state / messages */}
                {chatConnecting && messages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={RED} />
                    <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>Joining group chat…</Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <Text style={{ fontSize: 40, lineHeight: 52 }}>💬</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 }}>Mission Group Chat</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                      Real-time chat for all responders assigned to this disaster.{`\n`}Messages are saved on the server.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={i => i.id}
                    renderItem={renderBubble}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 8 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                  />
                )}

                {/* Only show input bar when actually connected — hidden in history fallback (403) */}
                {chatConnected && (
                <View style={S.chatBar}>
                  <TextInput
                    style={S.chatInput}
                    placeholder="Type a message…"
                    placeholderTextColor="#9CA3AF"
                    value={chatInput}
                    onChangeText={setChatInput}
                    multiline
                    maxLength={500}
                    editable={true}
                  />
                  <TouchableOpacity
                    style={[S.sendBtn, !chatInput.trim() && { opacity: 0.4 }]}
                    onPress={sendMessage}
                    disabled={!chatInput.trim()}
                  >
                    <Text style={S.sendBtnTxt}>Send</Text>
                  </TouchableOpacity>
                </View>
                )}
              </>
            )}
          </KeyboardAvoidingView>
        )}

        {renderStatusModal()}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATUS MODAL
  // ═══════════════════════════════════════════════════════════════════
  function renderStatusModal() {
    return (
      <Modal visible={!!statusModal} transparent animationType="slide" onRequestClose={() => setStatusModal(null)}>
        <View style={S.overlay}><View style={S.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700' }}>Update Status</Text>
            <TouchableOpacity onPress={() => setStatusModal(null)}><Text style={{ fontSize: 22, lineHeight: 28, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id} style={[S.statusOpt, selStatus === opt.id && S.statusOptOn]} onPress={() => setSelStatus(opt.id)}>
                <Text style={{ fontSize: 24, lineHeight: 32, marginRight: 12 }}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: selStatus === opt.id ? '700' : '400', fontSize: 15 }}>{opt.label}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={S.fieldLabel}>Situation Report</Text>
            <TextInput style={S.sitrep} placeholder="Describe situation..." placeholderTextColor="#9CA3AF"
              value={sitrep} onChangeText={setSitrep} multiline maxLength={500} textAlignVertical="top" />
            <Text style={S.fieldLabel}>Tags</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {['flood', 'fire', 'vehicles-trapped', 'building-damage', 'road-blocked', 'hazmat', 'medical', 'rescue'].map(tag => (
                <TouchableOpacity key={tag} style={[S.tagChip, tags.includes(tag) && S.tagChipOn]}
                  onPress={() => setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}>
                  <Text style={[S.tagTxt, tags.includes(tag) && S.tagTxtOn]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Minor Injuries</Text>
                <View style={S.counterRow}>
                  <TouchableOpacity style={S.cBtn} onPress={() => setMinorInjuries(Math.max(0, minorInjuries - 1))}><Text style={S.cBtnTxt}>−</Text></TouchableOpacity>
                  <Text style={S.cVal}>{minorInjuries}</Text>
                  <TouchableOpacity style={[S.cBtn, { backgroundColor: RED }]} onPress={() => setMinorInjuries(minorInjuries + 1)}><Text style={[S.cBtnTxt, { color: '#fff' }]}>+</Text></TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Serious Injuries</Text>
                <View style={S.counterRow}>
                  <TouchableOpacity style={S.cBtn} onPress={() => setSeriousInjuries(Math.max(0, seriousInjuries - 1))}><Text style={S.cBtnTxt}>−</Text></TouchableOpacity>
                  <Text style={S.cVal}>{seriousInjuries}</Text>
                  <TouchableOpacity style={[S.cBtn, { backgroundColor: RED }]} onPress={() => setSeriousInjuries(seriousInjuries + 1)}><Text style={[S.cBtnTxt, { color: '#fff' }]}>+</Text></TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              <CheckRow label="Location verified" checked={locationVerified} onToggle={() => setLocationVerified(v => !v)} color="#22C55E" />
              <CheckRow label="Request backup" checked={requestBackupFlag} onToggle={() => setRequestBackupFlag(v => !v)} color="#F97316" />
            </View>
            {selStatus === 'ON_SCENE' && (
              <View style={[S.falseAlarmBox, isFalseAlarm && { borderColor: RED, backgroundColor: '#FEF2F2' }]}>
                <CheckRow label="Mark as False Alarm" checked={isFalseAlarm} onToggle={() => setIsFalseAlarm(v => !v)} color={RED} />
              </View>
            )}
            <Text style={S.fieldLabel}>Assessment Notes</Text>
            <TextInput style={[S.sitrep, { minHeight: 60 }]} placeholder="Additional observations..."
              placeholderTextColor="#9CA3AF" value={assessmentNotes} onChangeText={setAssessmentNotes} multiline maxLength={300} textAlignVertical="top" />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 }}>
              <TouchableOpacity style={[S.modalBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => setStatusModal(null)}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.modalBtn, { flex: 2, backgroundColor: selStatus ? RED : '#D1D5DB' }]}
                onPress={submitStatus} disabled={!selStatus || submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> :
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{isFalseAlarm ? '⚠️ Report False Alarm' : 'Submit Update'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MISSION LIST VIEW
  // ═══════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={S.hTitle}>Active Missions</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{unitLabel}</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={fetchMissions}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 20, lineHeight: 26 }}>↻</Text>}
        </TouchableOpacity>
      </View>

      <View style={S.tabs}>
        {(['active', 'completed'] as const).map(k => (
          <TouchableOpacity key={k} style={[S.tab, tab === k && S.tabOn]} onPress={() => setTab(k)}>
            <Text style={[S.tabTxt, tab === k && S.tabTxtOn]}>{k === 'active' ? `Active (${active.length})` : `Done (${completed.length})`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && (
        <View style={{ backgroundColor: '#FEE2E2', margin: 12, padding: 14, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: RED }}>
          <Text style={{ color: '#991B1B', fontSize: 13 }}>{error}</Text>
          <TouchableOpacity onPress={fetchMissions}><Text style={{ color: RED, fontWeight: '700', marginTop: 6 }}>Retry</Text></TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 48, lineHeight: 62 }}>{tab === 'active' ? '✅' : '📋'}</Text>
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 12 }}>{tab === 'active' ? 'No active missions' : 'No completed missions'}</Text>
          </View>
        ) : list.map(m => (
          <TouchableOpacity key={m.id} style={[S.card, { borderLeftWidth: 4, borderLeftColor: SEV_COLOR[m.severity] ?? '#6B7280' }]}
            onPress={() => openDetail(m, tab === 'completed')} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>#{m.disaster_id?.slice(0, 8)}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: SEV_COLOR[m.severity] ?? '#6B7280' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{m.severity}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#1F2937' }}>{TYPE_EMOJI[m.disaster_type] ?? '⚠️'}  {m.disaster_type.replace(/_/g, ' ')}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>{m.location_address}</Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Assigned {formatAgo(m.assigned_at)}</Text>
            <View style={[S.statusBadge, { backgroundColor: STATUS_COLOR[m.status] ?? '#6B7280', alignSelf: 'flex-start', marginTop: 8 }]}>
              <Text style={S.statusBadgeTxt}>{m.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
      {renderStatusModal()}
    </SafeAreaView>
  );
};

const CheckRow: React.FC<{ label: string; checked: boolean; onToggle: () => void; color: string }> = ({ label, checked, onToggle, color }) => (
  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={onToggle}>
    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? color : '#D1D5DB', backgroundColor: checked ? color : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
      {checked && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
    </View>
    <Text style={{ flex: 1, fontSize: 14, color: '#374151' }}>{label}</Text>
  </TouchableOpacity>
);

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: RED },
  hBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  hTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: RED },
  tabTxt: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTxtOn: { color: RED, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoRow: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  infoVal: { color: '#1F2937', fontWeight: '600' },
  btnRed: { backgroundColor: RED, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnRedTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  btnOutTxt: { color: '#374151', fontWeight: '600', fontSize: 14 },
  // Chat
  // Bubble wrapper (replaces old bubble/bubbleMe/bubbleOther)
  bubbleWrap:      { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 8 },
  bubbleWrapMe:    { alignSelf: 'flex-end', backgroundColor: RED, borderBottomRightRadius: 4 },
  bubbleWrapOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleHeader:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  bubbleSender:    { fontSize: 11, fontWeight: '700', color: RED, flexShrink: 1 },
  bubbleText:      { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  bubbleTime:      { fontSize: 10, color: '#9CA3AF', marginTop: 3, textAlign: 'right' },
  chatBar:         { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 },
  chatInput:       { flex: 1, minHeight: 42, maxHeight: 100, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1F2937', backgroundColor: '#F9FAFB' },
  sendBtn:         { backgroundColor: RED, borderRadius: 21, paddingHorizontal: 18, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
  sendBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  statusOpt: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  statusOptOn: { borderColor: RED, backgroundColor: '#FFF5F5' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  sitrep: { minHeight: 100, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#F9FAFB' },
  tagChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  tagChipOn: { borderColor: RED, backgroundColor: '#FEF2F2' },
  tagTxt: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tagTxtOn: { color: RED },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  cBtnTxt: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#374151' },
  cVal: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: '#1F2937', minWidth: 32, textAlign: 'center' },
  falseAlarmBox: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  // Chat WS status
  chatStatusBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  chatStatusBarOn:  { backgroundColor: '#F0FDF4' },
  chatStatusBarOff: { backgroundColor: '#F9FAFB' },
  chatStatusDot:    { width: 8, height: 8, borderRadius: 4 },
  chatStatusTxt:    { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  chatRetryBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: RED },
  chatRetryTxt:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatErrorBar:     { backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#FCA5A5' },
  chatErrorTxt:     { color: '#991B1B', fontSize: 12 },
  chatLiveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  // System message
  systemMsgWrap:    { alignItems: 'center', marginVertical: 10 },
  systemMsg:        { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  // Admin badge in chat
  adminBadge:       { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, backgroundColor: RED },
  adminBadgeTxt:    { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  bubbleSeq:        { fontSize: 9, color: '#D1D5DB' },
  // Completed mission history banner
  historyBanner:      {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  historyBannerIcon:  { fontSize: 13, lineHeight: 18 },
  historyBannerTxt:   { flex: 1, fontSize: 12, fontWeight: '600', color: '#6B7280' },
  historyRefreshBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#E5E7EB' },
  historyRefreshTxt:  { fontSize: 14, fontWeight: '700', color: '#374151' },
});

export default ActiveMissionsScreen;