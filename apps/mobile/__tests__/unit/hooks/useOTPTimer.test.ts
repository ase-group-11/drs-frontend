/**
 * UNIT TESTS — src/hooks/useOTPTimer.ts
 *
 * Tests timer countdown, canResend flag, startTimer, resetTimer,
 * and formatTime helper using jest fake timers.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOTPTimer } from '@hooks/useOTPTimer';

// Use fake timers so we can fast-forward time without waiting
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useOTPTimer — initial state', () => {
  it('starts with autoStart=true: timer equals initialTime, canResend is false', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 60, autoStart: true }));
    expect(result.current.timer).toBe(60);
    expect(result.current.canResend).toBe(false);
  });

  it('starts with autoStart=false: timer is 0, canResend is true', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 60, autoStart: false }));
    expect(result.current.timer).toBe(0);
    expect(result.current.canResend).toBe(true);
  });
});

describe('useOTPTimer — countdown', () => {
  it('decrements by 1 each second', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 5, autoStart: true }));
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.timer).toBe(4);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.timer).toBe(3);
  });

  it('sets canResend to true when timer reaches 0', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 3, autoStart: true }));
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.timer).toBe(0);
    expect(result.current.canResend).toBe(true);
  });
});

describe('useOTPTimer — startTimer', () => {
  it('resets the timer back to initialTime and disables canResend', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 10, autoStart: true }));
    // Let it run down fully
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.canResend).toBe(true);

    // Restart
    act(() => { result.current.startTimer(); });
    expect(result.current.timer).toBe(10);
    expect(result.current.canResend).toBe(false);
  });
});

describe('useOTPTimer — resetTimer', () => {
  it('resets mid-countdown back to initialTime', () => {
    const { result } = renderHook(() => useOTPTimer({ initialTime: 60, autoStart: true }));
    act(() => { jest.advanceTimersByTime(20000); }); // 40 seconds left
    act(() => { result.current.resetTimer(); });
    expect(result.current.timer).toBe(60);
    expect(result.current.canResend).toBe(false);
  });
});

describe('useOTPTimer — formatTime', () => {
  it('formats 0 seconds as "0:00"', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.formatTime(0)).toBe('0:00');
  });

  it('formats 60 seconds as "1:00"', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.formatTime(60)).toBe('1:00');
  });

  it('formats 65 seconds as "1:05"', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.formatTime(65)).toBe('1:05');
  });

  it('formats 9 seconds as "0:09"', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.formatTime(9)).toBe('0:09');
  });

  it('formats 125 seconds as "2:05"', () => {
    const { result } = renderHook(() => useOTPTimer());
    expect(result.current.formatTime(125)).toBe('2:05');
  });
});