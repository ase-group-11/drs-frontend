import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { PhoneOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifySignupOTP, requestSignupOTP, verifyLoginOTP } from '../../../services';
import { useAuth } from '../../../hooks';
import './OtpVerificationForm.css';

interface LocationState {
  mobileNumber: string;
  signupData?: any;
  // Login OTP mode
  mode?: 'login' | 'signup';
  email?: string;
  phoneNumber?: string;
  loginToken?: string;
}

const OtpVerificationForm: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();

  const state = location.state as LocationState;
  const mode = state?.mode ?? 'signup';
  const mobileNumber = state?.mobileNumber;
  const email = state?.email;
  const loginToken = state?.loginToken;

  useEffect(() => {
    if (mode === 'signup' && !mobileNumber) {
      message.error('Invalid access. Please start from signup page.');
      navigate('/signup');
    }
    if (mode === 'login' && !loginToken) {
      message.error('Invalid access. Please start from login page.');
      navigate('/login');
    }
  }, [mobileNumber, email, mode, navigate, loginToken]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const resetOtp = () => {
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      message.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        // ── Login OTP verification ──
        const result = await verifyLoginOTP({ loginToken: loginToken!, otpCode });
        if (result.success && result.data) {
          // Role check — admin panel only
          if (result.data.user?.role?.toLowerCase() !== 'admin') {
            message.error('Access denied. Admin accounts only.');
            resetOtp();
            return;
          }
          // Save everything to localStorage exactly like direct login
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('user', JSON.stringify(result.data.user));
          if (result.data.refreshToken) {
            localStorage.setItem('refreshToken', result.data.refreshToken);
          }
          message.success('Login successful!');
          loginWithToken(result.data.token, result.data.user);
        } else {
          const errMsg = typeof result.message === 'string' ? result.message : 'Invalid OTP';
          message.error(errMsg);
          resetOtp();
        }
      } else {
        // ── Signup OTP verification ──
        const result = await verifySignupOTP({ mobileNumber: mobileNumber!, otpCode });
        if (result.success && result.data) {
          message.success('Account verified successfully!');
          loginWithToken(result.data.token, result.data.user);
        } else {
          const errMsg = typeof result.message === 'string' ? result.message : 'Invalid OTP';
          message.error(errMsg);
          resetOtp();
        }
      }
    } catch {
      message.error('Verification failed. Please try again.');
      resetOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      if (mode === 'login') {
        // Re-trigger login to resend OTP
        const { login: loginService } = await import('../../../services/api/auth.service');
        const result = await loginService(email!, '');
        if (result.success) {
          message.success('OTP resent successfully!');
          setCountdown(60);
          setCanResend(false);
          resetOtp();
        } else {
          message.error(result.message || 'Failed to resend OTP');
        }
      } else {
        const result = await requestSignupOTP({ ...state?.signupData, phoneNumber: mobileNumber! });
        if (result.success) {
          message.success('OTP resent successfully!');
          setCountdown(60);
          setCanResend(false);
          resetOtp();
        } else {
          message.error(result.message);
        }
      }
    } catch {
      message.error('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const maskContact = () => {
    if (mode === 'login' && mobileNumber) {
      return `number ending in ${mobileNumber.slice(-4)}`;
    }
    if (mobileNumber) {
      const last4 = mobileNumber.slice(-4);
      return `${mobileNumber.slice(0, 4)} ** *** ${last4}`;
    }
    return email ?? '';
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal-container">
        <button
          className="otp-modal-close"
          onClick={() => navigate(mode === 'login' ? '/login' : '/signup')}
        >
          <CloseOutlined />
        </button>

        <div className="otp-icon-circle">
          <PhoneOutlined className="otp-phone-icon" />
        </div>

        <h2 className="otp-modal-title">Verify Your Phone Number</h2>

        <p className="otp-modal-description">
          We've sent a 6-digit code to your registered {maskContact()}
        </p>

        <div className="otp-input-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`otp-input-box ${digit ? 'filled' : ''}`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <div className="otp-resend-container">
          <Button
            type="link"
            onClick={handleResendOTP}
            loading={resendLoading}
            disabled={!canResend}
            className="otp-resend-button"
          >
            {canResend ? 'Resend Code' : `Resend Code in 0:${countdown.toString().padStart(2, '0')}`}
          </Button>
        </div>

        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          disabled={!isOtpComplete || loading}
          onClick={handleVerify}
          className="otp-verify-button"
        >
          Verify
        </Button>
      </div>
    </div>
  );
};

export default OtpVerificationForm;