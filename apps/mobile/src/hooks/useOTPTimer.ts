import { useState, useEffect, useCallback, useRef } from 'react';
import { OTP_RESEND_TIMEOUT } from '@constants/index';

export interface UseOTPTimerOptions {
  initialTime?: number;
  autoStart?: boolean;
}

export interface UseOTPTimerReturn {
  timer: number;
  canResend: boolean;
  resendLoading: boolean;
  resendSuccess: boolean;
  formattedTime: string;
  startTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
  triggerResend: (resendFn: () => Promise<void>) => Promise<void>;
}

export const useOTPTimer = ({
  initialTime = OTP_RESEND_TIMEOUT,
  autoStart = true,
}: UseOTPTimerOptions = {}): UseOTPTimerReturn => {
  const [timer, setTimer]               = useState(autoStart ? initialTime : 0);
  const [canResend, setCanResend]       = useState(!autoStart);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const startCountdown = useCallback((from: number) => {
    clearTimer();
    setTimer(from);
    setCanResend(false);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearTimer();
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (autoStart) startCountdown(initialTime);
    return clearTimer;
  }, []);

  const startTimer = useCallback(() => {
    setResendSuccess(false);
    startCountdown(initialTime);
  }, [initialTime, startCountdown]);

  const resetTimer = useCallback(() => {
    setResendSuccess(false);
    startCountdown(initialTime);
  }, [initialTime, startCountdown]);

  const triggerResend = useCallback(async (resendFn: () => Promise<void>) => {
    if (!canResend || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await resendFn();
      setResendSuccess(true);
      startCountdown(initialTime);
      setTimeout(() => setResendSuccess(false), 3000);
    } finally {
      setResendLoading(false);
    }
  }, [canResend, resendLoading, initialTime, startCountdown]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formattedTime = formatTime(timer);

  return {
    timer,
    canResend,
    resendLoading,
    resendSuccess,
    formattedTime,
    startTimer,
    resetTimer,
    formatTime,
    triggerResend,
  };
};

// Alias for backward compatibility
export const useOtpTimer = useOTPTimer;
export default useOTPTimer;