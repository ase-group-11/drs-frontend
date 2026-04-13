import type { AppNotification } from '../hooks/useWebSocket';

// ─── Severity → tone config ───────────────────────────────────────────────────

const AUDIO_CONFIGS: Record<AppNotification['severity'], {
  freq: number; freq2: number; duration: number; gain: number;
}> = {
  critical: { freq: 880, freq2: 660, duration: 0.6, gain: 0.4 },
  high:     { freq: 660, freq2: 550, duration: 0.4, gain: 0.3 },
  medium:   { freq: 520, freq2: 440, duration: 0.3, gain: 0.25 },
  low:      { freq: 440, freq2: 400, duration: 0.2, gain: 0.2 },
  info:     { freq: 400, freq2: 380, duration: 0.2, gain: 0.15 },
};

/**
 * Plays a short synthesised tone scaled to the notification severity.
 * Uses the Web Audio API — silently no-ops if the browser blocks it
 * (e.g. before the first user interaction).
 */
export function playNotificationSound(severity: AppNotification['severity']): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const { freq, freq2, duration, gain } = AUDIO_CONFIGS[severity];

    const osc      = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration * 0.6);

    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    // Critical alerts get a second beep
    if (severity === 'critical') {
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.9);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.9);
    }

    osc.onended = () => ctx.close();
  } catch {
    // AudioContext blocked before first user interaction — silently ignore
  }
}