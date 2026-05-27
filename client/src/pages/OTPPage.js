import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaShieldAlt,
  FaCheckCircle,
  FaRedo
} from 'react-icons/fa';
import './Auth.css';

const OTPPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, type = 'verify-email', message } = location.state || {};
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(120); // 2 phút
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown, email, navigate]);

  const handleChange = (index, value) => {
    // Chỉ cho phép số
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Tự động focus ô tiếp theo
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Tự động submit khi đủ 6 số
    if (index === 5 && value) {
      handleSubmit(null, [...newOtp.slice(0, 5), value]);
    }
  };

  const handleKeyDown = (index, e) => {
    // Xử lý phím Backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
    
    // Focus vào ô cuối cùng đã điền
    const lastIndex = Math.min(newOtp.length - 1, 5);
    inputRefs.current[lastIndex].focus();
  };

  const handleSubmit = async (e, otpArray = otp) => {
    if (e) e.preventDefault();
    
    const otpCode = otpArray.join('');
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = type === 'reset-password' 
        ? '/api/auth/verify-reset-otp' 
        : '/api/auth/verify-email';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp: otpCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (type === 'reset-password') {
          // Chuyển đến trang đặt lại mật khẩu
          navigate('/reset-password', { 
            state: { 
              email, 
              reset_token: data.reset_token 
            } 
          });
        } else {
          // Xác thực email thành công, chuyển đến trang đăng nhập
          navigate('/login', { 
            state: { 
              message: 'Xác thực email thành công! Vui lòng đăng nhập.' 
            } 
          });
        }
      } else {
        setError(data.message || 'Mã OTP không đúng. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Có lỗi xảy ra. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError('');

    try {
      const endpoint = type === 'reset-password' 
        ? '/api/auth/forgot-password' 
        : '/api/auth/resend-otp';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setCountdown(120);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0].focus();
      } else {
        const data = await response.json();
        setError(data.message || 'Không thể gửi lại mã. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Có lỗi xảy ra. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-center">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-icon">
              <FaShieldAlt />
            </div>
            <h2>Xác thực OTP</h2>
            <p>
              {message || `Mã xác nhận đã được gửi đến`}
              <br />
              <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="otp-input"
                  autoFocus={index === 0}
                  disabled={isLoading}
                />
              ))}
            </div>

            <div className="otp-timer">
              {canResend ? (
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  <FaRedo />
                  Gửi lại mã
                </button>
              ) : (
                <span>Gửi lại mã sau: <strong>{formatTime(countdown)}</strong></span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={isLoading || otp.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <div className="spinner-small"></div>
                  Đang xác thực...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Xác nhận
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPPage;