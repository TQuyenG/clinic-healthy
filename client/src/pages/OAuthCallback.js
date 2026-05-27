// client/src/pages/OAuthCallback.js - Xử lý OAuth callback
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './OAuthCallback.css';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('Đang xử lý đăng nhập...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Lấy token và user từ URL params
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');
        const error = searchParams.get('error');

        // Kiểm tra lỗi
        if (error) {
          setStatus('error');
          let errorMessage = 'Đăng nhập thất bại.';
          
          switch (error) {
            case 'google_auth_failed':
              errorMessage = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
              break;
            case 'facebook_auth_failed':
              errorMessage = 'Đăng nhập Facebook thất bại. Vui lòng thử lại.';
              break;
            case 'auth_failed':
              errorMessage = 'Xác thực thất bại. Vui lòng thử lại.';
              break;
            default:
              errorMessage = 'Có lỗi xảy ra trong quá trình đăng nhập.';
          }
          
          setMessage(errorMessage);
          
          // Redirect về login sau 3 giây
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Kiểm tra có token và user không
        if (!token || !userStr) {
          setStatus('error');
          setMessage('Thông tin đăng nhập không hợp lệ.');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userStr));

        // Lưu token và user vào localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Cập nhật AuthContext
        updateUser(user);

        // Hiển thị thành công
        setStatus('success');
        setMessage(`Đăng nhập thành công! Chào mừng ${user.full_name || user.email}`);

        // Redirect về dashboard sau 1.5 giây
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } catch (error) {
        console.error('OAuth Callback Error:', error);
        setStatus('error');
        setMessage('Có lỗi xảy ra. Vui lòng đăng nhập lại.');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-box">
        {status === 'processing' && (
          <>
            <div className="spinner-large"></div>
            <h2>{message}</h2>
            <p className="subtitle">Vui lòng đợi trong giây lát...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>{message}</h2>
            <p className="subtitle">Đang chuyển hướng đến trang chủ...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2>{message}</h2>
            <p className="subtitle">Đang chuyển hướng về trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;