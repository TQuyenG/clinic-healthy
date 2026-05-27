// client/src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    if (!email) {
      setMessage({ type: 'error', text: 'Vui lòng nhập email' });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:3001/api/users/request-password-reset',
        { email }
      );

      if (response.data.success) {
        setEmailSent(true);
        setMessage({ 
          type: 'success', 
          text: response.data.message 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Không thể gửi email. Vui lòng thử lại.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        {!emailSent ? (
          <>
            <div className="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
            <h2>Quên mật khẩu?</h2>
            <p className="subtitle">
              Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu đến bạn
            </p>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email đã đăng ký</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Đang gửi...
                  </>
                ) : 'Gửi email xác thực'}
              </button>
            </form>

            <div className="footer-links">
              <a href="/login">← Quay lại đăng nhập</a>
              <a href="/register">Chưa có tài khoản?</a>
            </div>
          </>
        ) : (
          <>
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2>Email đã được gửi!</h2>
            <div className="message success">{message.text}</div>
            
            <div className="email-instructions">
              <p><strong>Các bước tiếp theo:</strong></p>
              <ol>
                <li>Kiểm tra hộp thư email của bạn</li>
                <li>Nhấp vào link xác thực trong email</li>
                <li>Đặt lại mật khẩu mới</li>
              </ol>
              <p className="note">
                <strong>Lưu ý:</strong> Link sẽ hết hạn sau 1 giờ. 
                Nếu không thấy email, vui lòng kiểm tra thư mục Spam.
              </p>
            </div>

            <button onClick={() => navigate('/login')} className="btn-submit">
              Về trang đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;