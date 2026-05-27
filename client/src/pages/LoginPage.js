// client/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ✅ OAUTH LOGIN HANDLERS
  // ============================================
  const handleGoogleLogin = () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    window.location.href = `${apiUrl}/users/auth/google`;
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Vui lòng nhập email để gửi lại xác thực.');
      return;
    }

    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/users/resend-verification', { email: formData.email });
      setSuccessMessage(response.data.message || 'Email xác thực đã được gửi lại thành công!');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi gửi lại email xác thực.';
      setError(errorMsg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleRequestManualVerification = async () => {
    if (!formData.email) {
      setError('Vui lòng nhập email để gửi yêu cầu.');
      return;
    }

    setRequestLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/users/request-manual-verification', { 
        email: formData.email,
        reason: 'Không thấy email xác thực gửi về'
      });
      setSuccessMessage(response.data.message || 'Yêu cầu xác thực đã được gửi đến admin!');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi gửi yêu cầu đến admin.';
      setError(errorMsg);
    } finally {
      setRequestLoading(false);
    }
  };

  const isVerificationError = error.includes('chưa được xác thực email');

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-circle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <h2>Đăng nhập</h2>
          <p className="subtitle">Chào mừng quay trở lại!</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
            {isVerificationError && (
              <div className="verification-actions">
                <button 
                  onClick={handleResendVerification} 
                  className="btn-resend" 
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
                <button 
                  onClick={handleRequestManualVerification} 
                  className="btn-request-admin" 
                  disabled={requestLoading}
                >
                  {requestLoading ? 'Đang gửi...' : 'Yêu cầu admin xác thực'}
                </button>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {/* ✅ OAUTH BUTTONS */}
        <div className="oauth-buttons">
          <button 
            type="button" 
            className="btn-oauth btn-google"
            onClick={handleGoogleLogin}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Đăng nhập bằng Google
          </button>

        </div>

        <div className="divider">
          <span>hoặc</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Nhập email của bạn"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={loading}
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

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Đang đăng nhập...
              </>
            ) : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/dat-lai-mat-khau" className="link-primary">Quên mật khẩu?</Link>
          <div className="divider">
            <span>hoặc</span>
          </div>
          <Link to="/register" className="link-secondary">Chưa có tài khoản? Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;