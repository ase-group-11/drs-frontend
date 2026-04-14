// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/notificationService.ts
//
// Local push notifications using @notifee/react-native ONLY.
// No Firebase, no backend changes needed.
//
// SETUP (one-time):
//   cd apps/mobile
//   npm install @notifee/react-native
//   cd ios && pod install
//
//   iOS: Xcode → Signing & Capabilities → + Push Notifications
//   iOS: Also add Background Modes → Remote notifications
//
// HOW IT WORKS:
//   - App OPEN/BACKGROUND: wsService receives WS event → calls showLocalNotification()
//     → notifee displays native notification immediately
//   - App CLOSED: WS is not connected so no events arrive.
//     For closed-app notifications you need FCM (separate setup).
// ═══════════════════════════════════════════════════════════════════════════

import { Alert, Platform } from 'react-native';
import * as RootNavigation from '@navigation/RootNavigation';

// Dynamic import — app won't crash if notifee isn't installed yet
let notifee: any = null;
let AndroidImportance: any = null;
let AndroidStyle: any = null;
let EventType: any = null;

try {
  const mod = require('@notifee/react-native');
  notifee          = mod.default;
  AndroidImportance = mod.AndroidImportance;
  AndroidStyle      = mod.AndroidStyle;
  EventType         = mod.EventType;
} catch {
  console.warn('[Notif] @notifee/react-native not installed — using Alert.alert fallback');
}

const CHANNEL_ID = 'drs_alerts';
const CHANNEL_URGENT = 'drs_urgent';

// ── Severity config ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH:     '#F97316',
  MEDIUM:   '#EAB308',
  LOW:      '#3B82F6',
  INFO:     '#22C55E',
};

// ── Channel setup ──────────────────────────────────────────────────────────

async function ensureChannels() {
  if (!notifee || Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id:          CHANNEL_ID,
      name:        'DRS Alerts',
      importance:  AndroidImportance.HIGH,
      sound:       'default',
      vibration:   true,
    });
    await notifee.createChannel({
      id:          CHANNEL_URGENT,
      name:        'DRS Critical Alerts',
      importance:  AndroidImportance.HIGH,
      sound:       'default',
      vibration:   true,
      lights:      true,
      lightColor:  '#DC2626',
    });
  } catch (e) {
    console.warn('[Notif] createChannel error:', e);
  }
}

// ── Permission request ─────────────────────────────────────────────────────

export async function requestPermission(): Promise<boolean> {
  if (!notifee) return false;
  try {
    const settings = await notifee.requestPermission();
    // authorizationStatus: 1 = authorized, 2 = provisional
    const granted = settings.authorizationStatus >= 1;
    console.log('[Notif] Permission:', granted ? 'granted' : 'denied');
    return granted;
  } catch (e) {
    console.warn('[Notif] Permission error:', e);
    return false;
  }
}

// ── Main display function ──────────────────────────────────────────────────

export async function showLocalNotification(
  title: string,
  body: string,
  severity: string = 'INFO',
  data?: Record<string, string>,
) {
  const color = SEVERITY_COLOR[severity.toUpperCase()] ?? '#3B82F6';
  const isUrgent = severity === 'CRITICAL' || severity === 'HIGH';

  if (!notifee) {
    // Fallback — Alert.alert works on any screen
    Alert.alert(title, body, [{ text: 'OK' }]);
    return;
  }

  try {
    await ensureChannels();
    await notifee.displayNotification({
      title: `<b>${title}</b>`,
      body,
      data,
      android: {
        channelId:   isUrgent ? CHANNEL_URGENT : CHANNEL_ID,
        color,
        smallIcon:   'ic_notification', // make sure this exists in android/app/src/main/res/drawable/
        pressAction: { id: 'default' },
        importance:  AndroidImportance.HIGH,
        style: body.length > 40 ? {
          type:        AndroidStyle.BIGTEXT,
          text:        body,
        } : undefined,
      },
      ios: {
        sound:       'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: false,
          sound: true,
        },
      },
    });
  } catch (e) {
    console.warn('[Notif] displayNotification error:', e);
    Alert.alert(title, body, [{ text: 'OK' }]);
  }
}

// ── Init + event listeners ─────────────────────────────────────────────────

let _foregroundUnsub: (() => void) | null = null;

export async function initNotifications() {
  if (!notifee) {
    console.warn('[Notif] notifee not installed — notifications will use Alert.alert');
    return;
  }

  await ensureChannels();
  await requestPermission();

  // Handle notification press while app is in foreground
  _foregroundUnsub = notifee.onForegroundEvent(({ type, detail }: any) => {
    if (type === EventType?.PRESS) {
      console.log('[Notif] Notification pressed:', detail?.notification?.title);
      handleNotificationPress(detail?.notification?.data);
    }
  });

  console.log('[Notif] Initialised ✓');
}

export function cleanupNotifications() {
  _foregroundUnsub?.();
  _foregroundUnsub = null;
}

// ── Background handler (call in index.js before registerRootComponent) ─────
//
// import { backgroundNotificationHandler } from './src/services/notificationService';
// notifee.onBackgroundEvent(backgroundNotificationHandler);
//
export async function backgroundNotificationHandler({ type, detail }: any) {
  if (!EventType) return;
  if (type === EventType.PRESS) {
    console.log('[Notif] Background press:', detail?.notification?.title);
    handleNotificationPress(detail?.notification?.data);
  }
}

// ── Navigation on tap ──────────────────────────────────────────────────────

export function handleNotificationPress(data?: Record<string, string>) {
  if (!data) {
    RootNavigation.navigate('Alerts');
    return;
  }

  const { event_type, mission_id, disaster_id } = data;

  // Chat message → open Active Missions and open that specific mission chat
  if (event_type === 'chat.message' && mission_id) {
    RootNavigation.navigate('ActiveMissions', { openMissionId: mission_id });
    return;
  }

  // Evacuation → open Evacuation Plans
  if (event_type?.startsWith('evacuation.')) {
    RootNavigation.navigate('EvacuationPlans');
    return;
  }

  // Reroute → go Home (map will show the route)
  if (event_type === 'reroute.triggered' || event_type === 'route.updated') {
    RootNavigation.navigate('Home');
    return;
  }

  // Disaster events → open Alerts screen
  if (event_type?.startsWith('disaster.') || event_type?.startsWith('coordination.')) {
    RootNavigation.navigate('Alerts');
    return;
  }

  // Default → Alerts
  RootNavigation.navigate('Alerts');
}