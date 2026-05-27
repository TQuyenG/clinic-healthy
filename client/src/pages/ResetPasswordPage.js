// client/src/pages/ResetPasswordPage.js - VIẾT LẠI
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPasswordPage.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, verified, error
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  // Xác thực token khi component mount
  useEffect(() => {
    verifyToken();
  }, []);

  // Countdown khi reset thành công
  useEffect(() => {
    if (resetSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resetSuccess && countdown === 0) {
      navigate('/login');
    }
  }, [resetSuccess, countdown, navigate]);

  const verifyToken = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage({ 
        type: 'error', 
        text: 'Link không hợp lệ. Vui lòng kiểm tra lại email của bạn.' 
      });
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:3001/api/users/verify-reset-token?token=${token}`
      );

      if (response.data.success) {
        setStatus('verified');
        setEmail(response.data.email);
      }
    } catch (error) {
      console.error('Lỗi xác thực token:', error);
      setStatus('error');
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn' 
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setLoading(true);

    try {
      const token = searchParams.get('token');
      const response = await axios.post(
        'http://localhost:3001/api/users/reset-password-with-token',
        { token, newPassword }
      );

      if (response.data.success) {
        setResetSuccess(true);
        setMessage({ 
          type: 'success', 
          text: response.data.message 
        });
      }
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Đang xác thực...</h2>
            <p className="subtitle">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon-wrapper error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <h2>Link không hợp lệ</h2>
            {message.text && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}
            <div className="error-actions">
              <button onClick={() => navigate('/dat-lai-mat-khau')} className="btn-primary">
                Yêu cầu link mới
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary">
                Về trang đăng nhập
              </button>
            </div>
          </>
        )}

        {status === 'verified' && !resetSuccess && (
          <>
            <div className="icon-wrapper success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2>Đặt lại mật khẩu</h2>
            <p className="subtitle">Tài khoản: <strong>{email}</strong></p>

            {message.text && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Đang xử lý...
                  </>
                ) : 'Đặt lại mật khẩu'}
              </button>
            </form>
          </>
        )}

        {resetSuccess && (
          <>
            <div className="icon-wrapper complete-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2>Thành công!</h2>
            <div className="message success">{message.text}</div>
            
            <div className="countdown-box">
              <p className="countdown-text">
                Tự động chuyển hướng sau <span className="countdown-number">{countdown}</span> giây...
              </p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(5 - countdown) * 20}%` }}
                ></div>
              </div>
            </div>

            <button onClick={() => navigate('/login')} className="btn-submit">
              Đăng nhập ngay
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;