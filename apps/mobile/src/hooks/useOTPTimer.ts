import { useState, useEffect, useCallback } from 'react';
import { OTP_RESEND_TIMEOUT } from '@constants/index';

export interface UseOTPTimerOptions {
  initialTime?: number;
  autoStart?: boolean;
}

export interface UseOTPTimerReturn {
  timer: number;
  canResend: boolean;
  startTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
}

export const useOTPTimer = ({
  initialTime = OTP_RESEND_TIMEOUT,
  autoStart = true,
}: UseOTPTimerOptions = {}): UseOTPTimerReturn => {
  const [timer, setTimer] = useState(autoStart ? initialTime : 0);
  const [canResend, setCanResend] = useState(!autoStart);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && !canResend) {
      setCanResend(true);
    }
  }, [timer, canResend]);

  const startTimer = useCallback(() => {
    setTimer(initialTime);
    setCanResend(false);
  }, [initialTime]);

  const resetTimer = useCallback(() => {
    setTimer(initialTime);
    setCanResend(false);
  }, [initialTime]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timer,
    canResend,
    startTimer,
    resetTimer,
    formatTime,
  };
};

export default useOTPTimer;
