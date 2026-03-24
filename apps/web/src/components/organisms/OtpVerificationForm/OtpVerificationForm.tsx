import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { PhoneOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifySignupOTP, requestSignupOTP } from '../../../services';
import { useAuth } from '../../../hooks';
import './OtpVerificationForm.css';

interface LocationState {
  mobileNumber: string;
  signupData?: any;
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
  const mobileNumber = state?.mobileNumber;

  useEffect(() => {
    if (!mobileNumber) {
      message.error('Invalid access. Please start from signup page.');
      navigate('/signup');
    }
  }, [mobileNumber, navigate]);

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

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      message.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const result = await verifySignupOTP({
        mobileNumber: mobileNumber!,
        otpCode: otpCode,
      });

      if (result.success && result.data) {
        message.success('Account verified successfully!');
        loginWithToken(result.data.token, result.data.user);
      } else {
        message.error(result.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      message.error('Verification failed. Please try again.');
      console.error('OTP verification error:', error);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setResendLoading(true);
    try {

      const result = await requestSignupOTP({
        ...state?.signupData,
        phoneNumber: mobileNumber!,
      });

      if (result.success) {
        message.success('OTP resent successfully!');
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Failed to resend OTP. Please try again.');
      console.error('Resend OTP error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  const maskMobileNumber = (number: string) => {
    if (!number) return '';
    const last4 = number.slice(-4);
    return `${number.slice(0, 4)} ** *** ${last4}`;
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal-container">
        <button 
          className="otp-modal-close"
          onClick={() => navigate('/signup')}
        >
          <CloseOutlined />
        </button>

        <div className="otp-icon-circle">
          <PhoneOutlined className="otp-phone-icon" />
        </div>

        <h2 className="otp-modal-title">Verify Your Phone Number</h2>

        <p className="otp-modal-description">
          We've sent a 6-digit code to {maskMobileNumber(mobileNumber || '')}
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