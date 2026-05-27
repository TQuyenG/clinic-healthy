// client/src/pages/VerifyEmailPage.js
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VerifyEmailPage.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    verifyEmail();
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      navigate('/login');
    }
  }, [status, countdown, navigate]);

  const verifyEmail = async () => {
    const token = searchParams.get('token');

    console.log('Token từ URL:', token);

    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ. Vui lòng kiểm tra lại link trong email.');
      return;
    }

    try {
      console.log('Gửi request xác thực tới:', `http://localhost:3001/api/users/verify-email?token=${token}`);
      
      const res = await axios.get(
        `http://localhost:3001/api/users/verify-email?token=${token}`
      );

      console.log('Response nhận được:', {
        status: res.status,
        data: res.data
      });

      if (res.status === 200 && res.data.success === true) {
        setStatus('success');
        setMessage(res.data.message || 'Xác thực email thành công! Tài khoản đã được kích hoạt.');
      } else {
        setStatus('error');
        setMessage(res.data.message || 'Xác thực thất bại');
      }
      
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      console.error('Error response:', error.response);
      
      setStatus('error');
      
      if (error.response) {
        const errorMsg = error.response.data?.message || 'Xác thực thất bại';
        setMessage(errorMsg);
        
        if (error.response.status === 400 && errorMsg.includes('đã được sử dụng')) {
          setStatus('success');
          setMessage('Tài khoản đã được xác thực trước đó. Bạn có thể đăng nhập ngay.');
        }
      } else if (error.request) {
        setMessage('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.');
      } else {
        setMessage('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    }
  };

  const requestManualVerification = async () => {
    try {
      const token = searchParams.get('token');
      
      await axios.post('http://localhost:3001/api/users/request-manual-verification', {
        verification_token: token
      });
      
      alert('Đã gửi yêu cầu xác thực đến admin. Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.');
      navigate('/login');
      
    } catch (error) {
      console.error('Lỗi gửi yêu cầu:', error);
      alert('Không thể gửi yêu cầu. Vui lòng liên hệ admin qua email.');
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Đang xác thực email...</h2>
            <p className="verify-description">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="icon-wrapper success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2>Xác thực thành công!</h2>
            <p className="success-message">{message}</p>
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
            <button onClick={() => navigate('/login')} className="btn-login">
              Đăng nhập ngay
            </button>
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
            <h2>Xác thực thất bại</h2>
            <p className="error-message">{message}</p>
            
            <div className="error-actions">
              <button onClick={() => navigate('/register')} className="btn-register">
                Đăng ký lại
              </button>
              
              <button onClick={requestManualVerification} className="btn-help">
                Yêu cầu Admin xác thực
              </button>
              
              <button onClick={() => navigate('/login')} className="btn-login">
                Về trang đăng nhập
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;