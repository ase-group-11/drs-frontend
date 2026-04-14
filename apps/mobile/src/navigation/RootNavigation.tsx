// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/RootNavigation.ts
//
// Global navigation ref — lets non-component code (wsService, notificationService)
// navigate to any screen without needing props.
//
// Usage:
//   import * as RootNavigation from '@navigation/RootNavigation';
//   RootNavigation.navigate('Alerts');
//   RootNavigation.navigate('ActiveMissions', { openMissionId: 'xxx' });
// ═══════════════════════════════════════════════════════════════════════════

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  } else {
    console.warn('[RootNavigation] Navigator not ready — cannot navigate to', name);
  }
}

export function getCurrentRoute(): string | undefined {
  return navigationRef.getCurrentRoute()?.name;
}