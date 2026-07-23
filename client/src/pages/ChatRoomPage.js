// client/src/pages/ChatRoomPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import chatService from '../services/chatService';
import consultationService from '../services/consultationService';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import './ChatRoomPage.css'; // Sẽ import file CSS mới ở dưới
import InRoomResultPanel from '../components/medical/InRoomResultPanel';

const ChatRoomPage = ({ isAIChatbot = false }) => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}')); // <-- XÓA setUser
  
  // State management
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
   useEffect(() => {
    if (isAIChatbot) {
      // Tin nhắn chào mừng của AI bot
      setMessages([{
        id: 1,
        text: 'Xin chào! Tôi là trợ lý ảo của Easy Medify. Tôi có thể giúp gì cho bạn?',
        sender: 'bot',
        created_at: new Date().toISOString()
      }]);
    }
  }, [isAIChatbot]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(true); // Bắt buộc nhập pass khi vào
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  // Giữ lại để không lỗi tham chiếu
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showEndConsultationModal, setShowEndConsultationModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ 
    report_type: 'technical',
    description: ''
  });
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  const [warning10MinShown, setWarning10MinShown] = useState(false);
  const [timeUpModalShown, setTimeUpModalShown] = useState(false);
  const [preCountdown, setPreCountdown] = useState(null); // đếm ngược trước giờ hẹn (ms)
  const [sessionExpired, setSessionExpired] = useState(false); // hết giờ → khóa chat
  const warned2MinRef = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const [showInRoomPanel, setShowInRoomPanel] = useState(searchParams.get('openResult') === '1');

  useEffect(() => {
    setShowInRoomPanel(searchParams.get('openResult') === '1');
  }, [searchParams]);

  const closeInRoomPanel = () => {
    setShowInRoomPanel(false);
    const p = new URLSearchParams(searchParams);
    p.delete('openResult');
    setSearchParams(p);
  };

  const openInRoomPanel = () => {
    const p = new URLSearchParams(searchParams);
    p.set('openResult', '1');
    setSearchParams(p);
    setShowInRoomPanel(true);
  };

  // ========== BẮT ĐẦU ĐOẠN SỬA LỖI no-use-before-define ==========

  // DI CHUYỂN CÁC HÀM XỬ LÝ LÊN TRÊN (TRƯỚC KHI useEffect GỌI)

  // Load consultation data
  const loadConsultationData = useCallback(async () => {
    try {
      if (!consultationId || isNaN(consultationId) || consultationId === 'chon-bac-si' || consultationId === 'chatbot') {
        setError('ID tư vấn không hợp lệ');
        setLoading(false);
        return;
      }

      const response = await consultationService.getConsultationById(consultationId);
      
      let data;
      if (response.data?.data) {
        data = response.data.data;
      } else if (response.data) {
        data = response.data;
      } else {
        data = response;
      }

      // Chỉ update consultation nếu data hợp lệ và có status
      // Tránh ghi đè bằng data thiếu field làm mất nút header
      if (!data || !data.status) {
        setLoading(false);
        return;
      }
      
      console.log('🔍 Full response:', response);
      console.log('🔍 Consultation data:', data);
      console.log('🔍 Data keys:', Object.keys(data));
      console.log('🔍 Data.appointment:', data.appointment);
      console.log('🔍 Data.Appointment:', data.Appointment);
      console.log('🔍 Data.appointment_code:', data.appointment_code);
      console.log('🔍 Data.code:', data.code);
      setConsultation(data);

      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching consultation:', err);
      setError('Không thể tải thông tin buổi tư vấn');
      setLoading(false);
    }
  }, [consultationId, user.role]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    try {
      const history = await chatService.getChatHistory(consultationId);
      setMessages(history);
    } catch (err) {
      console.error('Không thể tải lịch sử chat:', err);
    }
  }, [consultationId]);

  // Handle new message from WebSocket
  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    
    if (message.sender_id !== user.id) {
      chatService.markMessageAsRead(message.id);
    }
  }, [user.id]);

  // Handle typing indicator from WebSocket
  const handleTypingEvent = useCallback((data) => {
    if (data.userId !== user.id) {
      setOtherUserTyping(true);
      setTimeout(() => setOtherUserTyping(false), 3000);
    }
  }, [user.id]);


  // CÁC HÀM useEffect GIỜ ĐÃ NẰM SAU KHI HÀM ĐƯỢC ĐỊNH NGHĨA
  // Load consultation data và chat history
  useEffect(() => {
    loadConsultationData();
    loadChatHistory();
  }, [consultationId, loadConsultationData, loadChatHistory]); // <-- Đã sửa

  // Setup WebSocket connection
  useEffect(() => {
    if (!user.id || !consultationId) return;

    // Connect WebSocket
    chatService.connect(user.id);

    // Join consultation room
    chatService.joinConsultation(consultationId);

    // Khi mình vào phòng, giả định người kia có thể đang online
    // Sẽ cập nhật chính xác khi nhận sự kiện user_joined/user_left
    setOtherUserOnline(false); // reset trước

    // Register event listeners
    chatService.on('message', handleNewMessage);
    chatService.on('new_message', handleNewMessage); 
    chatService.on('typing', handleTypingEvent);
    chatService.on('message_read', handleMessageRead);
    chatService.on('user_joined', handleUserJoined);
    chatService.on('user_left', handleUserLeft);

    // Cleanup on unmount
    return () => {
      chatService.leaveConsultation(consultationId);
      chatService.off('message', handleNewMessage);
      chatService.off('new_message', handleNewMessage); 
      chatService.off('typing', handleTypingEvent);
      chatService.off('message_read', handleMessageRead);
      chatService.off('user_joined', handleUserJoined);
      chatService.off('user_left', handleUserLeft);
    };
  }, [user.id, consultationId, handleNewMessage, handleTypingEvent]); // <-- Đã sửa

  // Auto scroll to bottom when new message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

 // Đếm ngược thời gian tư vấn
  useEffect(() => {
    if (!consultation?.appointment_time) return;

    const durationMinutes =
      consultation.package?.duration_minutes ||
      consultation.duration_minutes ||
      30;

    const appointmentTime = new Date(consultation.appointment_time).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = appointmentTime + durationMs;

    warned2MinRef.current = false;

    const timer = setInterval(() => {
      const now = Date.now();
      const msToStart = appointmentTime - now;

      if (msToStart > 0) {
        // Chưa tới giờ hẹn → hiện đếm ngược trước giờ
        setPreCountdown(msToStart);
        setTimeRemaining(null);
        setSessionExpired(false);
      } else {
        // Đã tới giờ hẹn → đếm ngược thời gian tư vấn
        setPreCountdown(null);
        const remaining = endTime - now;

        if (remaining <= 0) {
          setTimeRemaining(0);
          setSessionExpired(true);
          clearInterval(timer);
        } else {
          setTimeRemaining(remaining);
          setSessionExpired(false);

          // Cảnh báo còn 2 phút (120000ms)
          if (remaining <= 120000 && !warned2MinRef.current) {
            warned2MinRef.current = true;
            alert('⏰ Còn 2 phút kết thúc buổi tư vấn!');
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [consultation?.appointment_time, consultation?.package?.duration_minutes, consultation?.duration_minutes]);
  // ========== KẾT THÚC ĐOẠN SỬA ==========

  // Format thời gian còn lại
  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // XỬ LÝ OTP
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!roomPassword) {
      setPasswordError('Vui lòng nhập mật khẩu');
      return;
    }
    try {
      setVerifyingPassword(true);
      const token = localStorage.getItem('token');
      const API_BASE = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/consultations/${consultationId}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: roomPassword })
      });
      const data = await res.json();
      if (data.success) {
        setPasswordVerified(true);
        setNeedsPassword(false);
      } else {
        setPasswordError(data.message || 'Mật khẩu không chính xác');
      }
    } catch (err) {
      setPasswordError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otp) {
      setOtpError('Vui lòng nhập OTP');
      return;
    }

    try {
      await consultationService.verifyChatOTP(consultationId, { otp }); 
      setNeedsOtp(false);
    } catch (err) {
      console.error('Lỗi xác thực OTP:', err);
      setOtpError(err.response?.data?.message || 'Lỗi xác thực OTP');
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle message read
  const handleMessageRead = (data) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, is_read: true, read_at: new Date() } : msg
    ));
  };

  // Handle user joined
  const handleUserJoined = (data) => {
    console.log('User joined:', data);
    const otherUserId = getOtherUserId();
    if (data?.user_id && parseInt(data.user_id) === parseInt(otherUserId)) {
      setOtherUserOnline(true);
    }
  };

  const handleUserLeft = (data) => {
    console.log('User left:', data);
    const otherUserId = getOtherUserId();
    if (data?.user_id && parseInt(data.user_id) === parseInt(otherUserId)) {
      setOtherUserOnline(false);
    }
  };

  // Send message
  const handleSendMessage = async (content, files = []) => {
    if (!content.trim() && files.length === 0) return;

    if (isAIChatbot) {
      const userMsg = {
        id: messages.length + 1,
        text: inputValue.trim(),
        sender: 'user',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
      setIsTyping(true);

      setTimeout(() => {
        const botResponse = getBotResponse(userMsg.text);
        const botMsg = {
          id: messages.length + 2,
          text: botResponse,
          sender: 'bot',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 1500);
      
      return;
    }

    try {
      if (content.trim()) {
        const receiverId = getOtherUserId();
        console.log('🔍 Debug send:', { 
          userId: user.id, 
          patientId: consultation?.patient_id, 
          doctorId: consultation?.doctor_id,
          receiverId 
        });
        
        if (!receiverId) {
          alert('Không xác định được người nhận. Vui lòng tải lại trang!');
          return;
        }

        const messageData = {
          consultation_id: parseInt(consultationId),
          receiver_id: receiverId,
          message_type: 'text',
          content: content.trim(),
          reply_to_id: replyingTo ? replyingTo.id : null  // đúng tên field server nhận
        };

        const response = await chatService.sendTextMessage(messageData);

        // Server trả về { success: true, message: messageData }
        // axios bọc thêm 1 lớp nên phải lấy response.data.message
        const sentMessage = response?.data?.message || response?.message;
        if (sentMessage && sentMessage.id) {
          setMessages(prev => {
            // Tránh duplicate nếu WebSocket cũng broadcast về
            const exists = prev.some(m => m.id === sentMessage.id);
            if (exists) return prev;
            return [...prev, sentMessage];
          });
        }

        setInputValue('');
        setReplyingTo(null);
      }

      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          await handleFileUpload(file);
        }
        setUploading(false);
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
      setUploading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultation_id', consultationId);
      formData.append('receiver_id', getOtherUserId());

      let messageType = 'file';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type.startsWith('audio/')) {
        messageType = 'voice';
      }

      formData.append('message_type', messageType);

      await chatService.uploadFile(formData);
    } catch (err) {
      console.error('Lỗi khi upload file:', err);
      throw err;
    }
  };

  // Send typing indicator
  const handleUserTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      chatService.sendTypingStatus(consultationId, getOtherUserId());
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  // Get other user ID
  const getOtherUserId = () => {
    if (!consultation) return null;
    const userId = parseInt(user.id);
    const patientId = parseInt(consultation.patient_id);
    const doctorId = parseInt(consultation.doctor_id);
    if (userId === patientId) return doctorId;
    if (userId === doctorId) return patientId;
    return patientId; // fallback
  };

  // Get other user info
  const getOtherUser = () => {
    if (!consultation) return null;
    return user.id === consultation.patient_id ? consultation.Doctor : consultation.Patient;
  };

  // Simple AI bot response helper
  const getBotResponse = (text) => {
    if (!text) return "Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?";
    const t = text.toLowerCase();
    if (t.includes('xin chào') || t.includes('chào')) return 'Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?';
    if (t.includes('đau') || t.includes('đau ngực')) return 'Nếu bạn bị đau ngực khi vận động, hãy dừng hoạt động và liên hệ cấp cứu nếu cơn đau dữ dội.';
    if (t.includes('cảm ơn') || t.includes('thanks')) return 'Rất vui được giúp đỡ bạn!';
    return 'Cảm ơn. Tôi đã nhận được tin nhắn của bạn và sẽ trả lời sớm.';
  };

  // Handle reply message
  const handleReply = (messageId) => {
    const msgToReply = messages.find(m => m.id === messageId);
    if (msgToReply) setReplyingTo(msgToReply);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Lỗi khi xóa tin nhắn:', err);
      alert('Không thể xóa tin nhắn!');
    }
  };

  // End consultation (Doctor only)
  const handleEndConsultation = async (resultData) => {
    try {
      await consultationService.completeConsultation(consultationId, resultData);
  alert('Kết thúc buổi tư vấn thành công!');
  navigate('/lich-hen-cua-toi'); // Chuyển về trang lịch hẹn gộp chung
    } catch (err) {
      console.error('Lỗi khi kết thúc tư vấn:', err);
      alert('Không thể kết thúc buổi tư vấn!');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="chatroompage-loading-container">
        <div className="chatroompage-loading-spinner"></div>
        <p className="chatroompage-loading-text">Đang tải phòng chat...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="chatroompage-error-container">
        <i className="fas fa-exclamation-circle chatroompage-error-icon"></i>
        <h2 className="chatroompage-error-title">{error}</h2>
        <button className="chatroompage-error-button" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  const otherUser = getOtherUser();

  // Hiện màn hình nhập mật khẩu nếu chưa xác thực
  if (!passwordVerified) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f0f9ff'
      }}>
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '40px 32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%', maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', background: '#eff6ff',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px'
            }}>🔒</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 700, color: '#1e3a5f' }}>
              Xác thực để vào phòng
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Nhập mật khẩu đăng nhập của bạn để tiếp tục
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontWeight: 600, fontSize: '0.85rem',
                color: '#374151', marginBottom: '6px'
              }}>
                Mật khẩu tài khoản
              </label>
              <input
                type="password"
                value={roomPassword}
                onChange={e => { setRoomPassword(e.target.value); setPasswordError(''); }}
                placeholder="Nhập mật khẩu đăng nhập..."
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: passwordError ? '1.5px solid #ef4444' : '1.5px solid #d1d5db',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
                }}
              />
              {passwordError && (
                <p style={{ margin: '6px 0 0', color: '#ef4444', fontSize: '0.82rem' }}>
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingPassword || !roomPassword}
              style={{
                width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                background: verifyingPassword || !roomPassword ? '#bfdbfe' : '#2563eb',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                cursor: verifyingPassword || !roomPassword ? 'not-allowed' : 'pointer'
              }}
            >
              {verifyingPassword ? 'Đang xác thực...' : 'Vào phòng tư vấn'}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: '1.5px solid #d1d5db', background: '#fff',
                color: '#374151', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', marginTop: '10px'
              }}
            >
              Quay lại
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chatroompage-container">
      {/* Header */}
      <div className="chatroompage-header">
        <button className="chatroompage-header-back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        
        <div className="chatroompage-header-user-info">
          <img 
            src={otherUser?.avatar_url || '/images/default-avatar.png'} 
            alt={otherUser?.full_name}
            className="chatroompage-header-avatar"
          />
          <div className="chatroompage-header-details">
            <h3 className="chatroompage-header-name">{otherUser?.full_name}</h3>
            <span className="chatroompage-header-status">
              {otherUserTyping ? (
                <>
                  <span className="chatroompage-header-typing-dot"></span>
                  Đang gõ...
                </>
              ) : (
                <>
                  <span className={`chatroompage-header-status-dot ${
                    otherUserOnline || ['confirmed', 'in_progress'].includes(consultation?.status)
                      ? 'chatroompage-header-status-online' 
                      : ''
                  }`}></span>
                  {otherUserOnline || ['confirmed', 'in_progress'].includes(consultation?.status)
                    ? 'Đang hoạt động' 
                    : 'Không hoạt động'}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="chatroompage-header-actions">
          {/* Đếm ngược trước giờ hẹn */}
          {preCountdown !== null && preCountdown > 0 && (
            <div className="chatroompage-header-timer">
              <i className="fas fa-clock"></i>
              <span>Bắt đầu sau {formatTimeRemaining(preCountdown)}</span>
            </div>
          )}

          {/* Đếm ngược thời gian tư vấn */}
          {preCountdown === null && timeRemaining !== null && timeRemaining > 0 && (
            <div className={`chatroompage-header-timer ${timeRemaining < 120000 ? 'chatroompage-header-timer-warning' : ''}`}>
              <i className="fas fa-clock"></i>
              <span>Còn {formatTimeRemaining(timeRemaining)}</span>
            </div>
          )}

          {/* Hết giờ */}
          {sessionExpired && (
            <div className="chatroompage-header-timer chatroompage-header-timer-warning">
              <i className="fas fa-clock"></i>
              <span>Hết giờ tư vấn</span>
            </div>
          )}
          {user.role === 'doctor' && ['confirmed', 'in_progress'].includes(consultation?.status) && (
            <button
              className="chatroompage-header-end-button"
              onClick={async () => {
                if (consultation?.status === 'confirmed') {
                  try {
                    await consultationService.startConsultation(consultationId);
                    await loadConsultationData();
                  } catch (err) {
                    console.error('Auto start error:', err);
                  }
                }
                openInRoomPanel();
              }}
            >
              <i className="fas fa-notes-medical"></i>
              <span>Nhập kết quả</span>
            </button>
          )}

          <button 
            className="chatroompage-header-info-button"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            title="Thông tin"
          >
            <i className="fas fa-info-circle"></i>
          </button>
          
          {['confirmed', 'in_progress'].includes(consultation?.status) && (
            <button 
              className="chatroompage-header-report-button"
              onClick={() => setShowReportModal(true)}
            >
              <i className="fas fa-flag"></i>
            </button>
          )}

          {user.role === 'doctor' && ['confirmed', 'in_progress'].includes(consultation?.status) && (
            <button
              className="chatroompage-header-end-button"
              onClick={() => setShowEndConfirmModal(true)}
            >
              <i className="fas fa-check-circle"></i>
              <span>Kết thúc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="chatroompage-content">
        {/* Messages Area */}
        <div className={`chatroompage-messages-area ${showInfoPanel ? 'chatroompage-messages-area-with-panel' : ''}`}>
          <div className="chatroompage-messages-list">
            {messages.length === 0 ? (
              <div className="chatroompage-messages-empty">
                <i className="fas fa-comments chatroompage-messages-empty-icon"></i>
                <p className="chatroompage-messages-empty-title">Chưa có tin nhắn</p>
                <p className="chatroompage-messages-empty-subtitle">Bắt đầu cuộc trò chuyện ngay!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isMyMessage={message.sender_id === user.id}
                    onReply={handleReply}
                    onDelete={handleDeleteMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {otherUserTyping && (
            <div className="chatroompage-typing-indicator">
              <span className="chatroompage-typing-dot"></span>
              <span className="chatroompage-typing-dot"></span>
              <span className="chatroompage-typing-dot"></span>
            </div>
          )}

          {sessionExpired && (
            <div style={{
              padding: '12px 20px', background: '#fee2e2',
              borderTop: '1px solid #fca5a5', textAlign: 'center',
              fontSize: '14px', color: '#991b1b', fontWeight: 600
            }}>
              ⏰ Buổi tư vấn đã kết thúc. Bạn không thể gửi thêm tin nhắn.
            </div>
          )}
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onTyping={handleUserTyping}
            disabled={uploading || consultation?.status === 'completed' || sessionExpired}
            uploading={uploading}
            replyingTo={replyingTo} 
            onCancelReply={() => setReplyingTo(null)} 
          />
        </div>

        {/* Info Panel */}
        {showInfoPanel && (
          <div className="chatroompage-info-panel">
            <div className="chatroompage-info-panel-header">
              <h3 className="chatroompage-info-panel-title">Thông tin buổi tư vấn</h3>
              <button className="chatroompage-info-panel-close" onClick={() => setShowInfoPanel(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="chatroompage-info-panel-content">
              {/* Consultation Info */}
              <div className="chatroompage-info-section">
                <h4 className="chatroompage-info-section-title">Chi tiết tư vấn</h4>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Mã:</label>
                  <span className="chatroompage-info-value">{consultation?.consultation_code}</span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Loại:</label>
                  <span className="chatroompage-info-badge chatroompage-info-badge-type">
                    {consultation?.consultation_type === 'chat' && 'Chat'}
                    {consultation?.consultation_type === 'video' && 'Video'}
                    {consultation?.consultation_type === 'offline' && 'Tại viện'}
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Trạng thái:</label>
                  <span className={`chatroompage-info-badge chatroompage-info-badge-${consultation?.status}`}>
                    {consultation?.status === 'pending' && 'Chờ xác nhận'}
                    {consultation?.status === 'confirmed' && 'Đã xác nhận'}
                    {consultation?.status === 'in_progress' && 'Đang diễn ra'}
                    {consultation?.status === 'completed' && 'Hoàn thành'}
                    {consultation?.status === 'cancelled' && 'Đã hủy'}
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Thời gian:</label>
                  <span className="chatroompage-info-value">
                    {new Date(consultation?.appointment_time).toLocaleString('vi-VN')}
                  </span>
                </div>
                {consultation?.started_at && (
                  <div className="chatroompage-info-item">
                    <label className="chatroompage-info-label">Bắt đầu:</label>
                    <span className="chatroompage-info-value">
                      {new Date(consultation?.started_at).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              {consultation?.chief_complaint && (
                <div className="chatroompage-info-section">
                  <h4 className="chatroompage-info-section-title">Triệu chứng</h4>
                  <p className="chatroompage-info-medical-text">{consultation.chief_complaint}</p>
                </div>
              )}

              {consultation?.medical_history && (
                <div className="chatroompage-info-section">
                  <h4 className="chatroompage-info-section-title">Tiền sử bệnh</h4>
                  <p className="chatroompage-info-medical-text">{consultation.medical_history}</p>
                </div>
              )}

              {/* Payment Info */}
              <div className="chatroompage-info-section">
                <h4 className="chatroompage-info-section-title">Thanh toán</h4>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Phí tư vấn:</label>
                  <span className="chatroompage-info-price">
                    {consultation?.base_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Phí nền tảng:</label>
                  <span className="chatroompage-info-price">
                    {consultation?.platform_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item chatroompage-info-item-total">
                  <label className="chatroompage-info-label">Tổng cộng:</label>
                  <span className="chatroompage-info-price chatroompage-info-price-total">
                    {consultation?.total_fee?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="chatroompage-info-item">
                  <label className="chatroompage-info-label">Trạng thái:</label>
                  <span className={`chatroompage-info-badge chatroompage-info-badge-payment-${consultation?.payment_status}`}>
                    {consultation?.payment_status === 'paid_online' && 'Đã thanh toán Online'}
                    {consultation?.payment_status === 'paid_at_clinic' && 'Đã thanh toán tại PK'}
                    {consultation?.payment_status === 'unpaid' && 'Chờ thanh toán'}
                    {consultation?.payment_status === 'not_required' && 'Miễn phí'}
                    {consultation?.payment_status === 'refunded' && 'Đã hoàn tiền'}
                    {consultation?.payment_status === 'partial_refund' && 'Hoàn một phần'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="chatroompage-info-actions">
                <button 
                  className="chatroompage-info-action-button chatroompage-info-action-view" 
                  onClick={() => navigate(`/tu-van/${consultationId}`)}
                >
                  <i className="fas fa-eye"></i>
                  Xem chi tiết
                </button>
                {user.role === 'patient' && consultation?.status === 'pending' && (
                  <button 
                    className="chatroompage-info-action-button chatroompage-info-action-cancel" 
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn hủy buổi tư vấn này?')) {
                        consultationService.cancelConsultation(consultationId, { reason: 'Hủy bởi bệnh nhân' });
                      }
                    }}
                  >
                    <i className="fas fa-times-circle"></i>
                    Hủy tư vấn
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {/* In-room result panel (embedded medical form) */}
      {showInRoomPanel && (
          <InRoomResultPanel
            consultationId={consultation?.id}
            consultationCode={consultation?.consultation_code}
            appointmentCode={consultation?.appointment_code}
            onClose={closeInRoomPanel}
            onSuccess={() => { closeInRoomPanel(); loadConsultationData(); }}
          />
        )}
      {showReportModal && (
        <div className="chatroompage-modal-overlay">
          <div className="chatroompage-modal-content">
            <div className="chatroompage-modal-header">
              <h2 className="chatroompage-modal-title">Báo cáo vấn đề</h2>
              <button className="chatroompage-modal-close" onClick={() => setShowReportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!reportData.report_type) { // <-- KIỂM TRA VALIDATION
                alert('Vui lòng chọn loại sự cố');
                return;
              }
              try {
                await consultationService.reportIssue(consultationId, reportData);
                setShowReportModal(false);
                setReportData({ report_type: '', description: '' });
                setReportSuccess(true); // hiện toast thành công
              } catch (err) {
                setReportError(err.response?.data?.message || 'Lỗi khi gửi báo cáo');
              }
            }} className="chatroompage-modal-form">

              {/* ========== BẮT ĐẦU THÊM MỚI: LOẠI SỰ CỐ ========== */}
              <div className="chatroompage-modal-form-group">
                <label className="chatroompage-modal-label">Loại sự cố <span style={{color: 'red'}}>*</span></label>
                <select
                  value={reportData.report_type}
                  onChange={(e) => setReportData(prev => ({...prev, report_type: e.target.value}))}
                  required
                  className="chatroompage-modal-select" // Giả sử bạn có style cho select
                >
                  <option value="technical">Lỗi kỹ thuật (Không gửi được file, mất kết nối...)</option>
                    <option value="behavior">Vấn đề thái độ / hành vi</option>
                    <option value="emergency">Khẩn cấp y tế / an toàn</option>
                    <option value="security">Vi phạm bảo mật</option>
                    <option value="other">Khác</option>
                </select>
              </div>
              {/* ========== KẾT THÚC THÊM MỚI ========== */}

              <div className="chatroompage-modal-form-group">
                <label className="chatroompage-modal-label">Mô tả vấn đề <span style={{color: 'red'}}>*</span></label>
                <textarea
                  value={reportData.description} // <-- SỬA
                  onChange={(e) => setReportData(prev => ({...prev, description: e.target.value}))} // <-- SỬA
                  placeholder="Vui lòng mô tả vấn đề bạn gặp phải..."
                  rows="5"
                  required
                  className="chatroompage-modal-textarea"
                />
              </div>
              <div className="chatroompage-modal-actions">
                <button 
                  type="button" 
                  className="chatroompage-modal-button chatroompage-modal-button-cancel" 
                  onClick={() => setShowReportModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="chatroompage-modal-button chatroompage-modal-button-submit">
                  <i className="fas fa-flag"></i>
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TOAST THÀNH CÔNG ===== */}
      {reportSuccess && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '20px 24px', minWidth: '320px', maxWidth: '400px',
          borderLeft: '4px solid #16a34a',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          animation: 'slideInRight 0.3s ease'
        }}>
          <div style={{
            background: '#dcfce7', borderRadius: '50%',
            width: '40px', height: '40px', minWidth: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>✅</div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, color: '#15803d', marginBottom: '4px', fontSize: '15px'}}>
              Báo cáo đã gửi thành công!
            </div>
            <div style={{color: '#6b7280', fontSize: '13px', lineHeight: '1.5'}}>
              Quản trị viên sẽ sớm xem xét và xử lý sự cố của bạn.
            </div>
          </div>
          <button onClick={() => setReportSuccess(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: '18px', padding: '0', lineHeight: 1
          }}>✕</button>
        </div>
      )}

      {/* ===== TOAST LỖI ===== */}
      {reportError && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '20px 24px', minWidth: '320px', maxWidth: '400px',
          borderLeft: '4px solid #dc2626',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          animation: 'slideInRight 0.3s ease'
        }}>
          <div style={{
            background: '#fee2e2', borderRadius: '50%',
            width: '40px', height: '40px', minWidth: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>❌</div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, color: '#dc2626', marginBottom: '4px', fontSize: '15px'}}>
              Gửi báo cáo thất bại
            </div>
            <div style={{color: '#6b7280', fontSize: '13px', lineHeight: '1.5'}}>
              {reportError}
            </div>
          </div>
          <button onClick={() => setReportError('')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: '18px', padding: '0', lineHeight: 1
          }}>✕</button>
        </div>
      )}

      {/* End Confirm Modal */}
      {showEndConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            padding: '32px 28px', width: '420px', maxWidth: '90vw',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#dcfce7', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px'
            }}>✅</div>
            <h2 style={{margin: '0 0 8px', color: '#15803d', fontSize: '20px', fontWeight: 700}}>
              Kết thúc buổi tư vấn
            </h2>
            {!consultation?.diagnosis ? (
              <>
                <p style={{color: '#6b7280', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px'}}>
                  Bạn chưa nhập kết quả khám. Vui lòng điền đầy đủ thông tin vào form
                  <strong> "Nhập kết quả"</strong> trước khi kết thúc buổi tư vấn.
                </p>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                  <button
                    onClick={() => { setShowEndConfirmModal(false); openInRoomPanel(); }}
                    style={{
                      padding: '10px 24px', borderRadius: '8px', border: 'none',
                      background: '#16a34a', color: '#fff', fontWeight: 600,
                      fontSize: '15px', cursor: 'pointer'
                    }}
                  >
                    Nhập kết quả ngay
                  </button>
                  <button
                    onClick={() => setShowEndConfirmModal(false)}
                    style={{
                      padding: '10px 24px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', background: '#f9fafb',
                      color: '#374151', fontWeight: 500, fontSize: '15px', cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{color: '#6b7280', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px'}}>
                  Bạn có chắc muốn kết thúc buổi tư vấn này? Hành động này không thể hoàn tác.
                </p>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                  <button
                    onClick={async () => {
                      try {
                        // Nếu còn confirmed thì start trước
                        if (consultation?.status === 'confirmed') {
                          await consultationService.startConsultation(consultationId);
                        }
                        await consultationService.completeConsultation(consultationId, {
                          diagnosis: consultation.diagnosis
                        });
                        window.dispatchEvent(new CustomEvent('consultation:reload_list'));
                        setShowEndConfirmModal(false);
                        navigate('/lich-hen-cua-toi');
                      } catch (err) {
                        console.error('Lỗi kết thúc:', err);
                        alert(err.response?.data?.message || 'Không thể kết thúc buổi tư vấn!');
                      }
                    }}
                    style={{
                      padding: '10px 24px', borderRadius: '8px', border: 'none',
                      background: '#16a34a', color: '#fff', fontWeight: 600,
                      fontSize: '15px', cursor: 'pointer'
                    }}
                  >
                    Xác nhận kết thúc
                  </button>
                  <button
                    onClick={() => setShowEndConfirmModal(false)}
                    style={{
                      padding: '10px 24px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', background: '#f9fafb',
                      color: '#374151', fontWeight: 500, fontSize: '15px', cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* End Consultation Modal */}
      {showEndConsultationModal && (
        <EndConsultationModal
          consultation={consultation}
          // SỬA: Chặn việc đóng modal
          onClose={() => alert('Vui lòng hoàn thành ghi chú tư vấn để kết thúc.')}
          onSubmit={handleEndConsultation}
        />
      )}
    </div>
  );
};

// End Consultation Modal Component
const EndConsultationModal = ({ consultation, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment_plan: '',
    prescription_data: '',
    severity_level: 'normal',
    need_followup: false,
    followup_date: '',
    doctor_notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.diagnosis.trim()) {
      alert('Vui lòng nhập chẩn đoán!');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="chatroompage-modal-overlay">
      <div className="chatroompage-modal-content chatroompage-modal-end">
        <div className="chatroompage-modal-header">
          <h2 className="chatroompage-modal-title">Kết thúc buổi tư vấn</h2>
          <button className="chatroompage-modal-close" onClick={onClose}>
            {/* SỬA: Nút X (close) giờ cũng sẽ gọi onClose đã bị sửa ở trên */}
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="chatroompage-modal-form">
          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">
              Chẩn đoán <span className="chatroompage-modal-required">*</span>
            </label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              placeholder="Nhập chẩn đoán sơ bộ..."
              rows="3"
              required
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Kế hoạch điều trị</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({...formData, treatment_plan: e.target.value})}
              placeholder="Nhập kế hoạch điều trị..."
              rows="3"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Đơn thuốc (nếu có)</label>
            <textarea
              value={formData.prescription_data}
              onChange={(e) => setFormData({...formData, prescription_data: e.target.value})}
              placeholder="Tên thuốc, liều dùng..."
              rows="3"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Mức độ nghiêm trọng</label>
            <select
              value={formData.severity_level}
              onChange={(e) => setFormData({...formData, severity_level: e.target.value})}
              className="chatroompage-modal-select"
            >
              <option value="normal">Bình thường</option>
              <option value="moderate">Cần theo dõi</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div className="chatroompage-modal-form-group chatroompage-modal-checkbox-group">
            <label className="chatroompage-modal-checkbox-label">
              <input
                type="checkbox"
                checked={formData.need_followup}
                onChange={(e) => setFormData({...formData, need_followup: e.target.checked})}
                className="chatroompage-modal-checkbox"
              />
              Cần tái khám
            </label>
          </div>

          {formData.need_followup && (
            <div className="chatroompage-modal-form-group">
              <label className="chatroompage-modal-label">Ngày tái khám</label>
              <input
                type="date"
                value={formData.followup_date}
                onChange={(e) => setFormData({...formData, followup_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="chatroompage-modal-input"
              />
            </div>
          )}

          <div className="chatroompage-modal-form-group">
            <label className="chatroompage-modal-label">Ghi chú của bác sĩ</label>
            <textarea
              value={formData.doctor_notes}
              onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}
              placeholder="Ghi chú thêm..."
              rows="2"
              className="chatroompage-modal-textarea"
            />
          </div>

          <div className="chatroompage-modal-actions">
            <button type="submit" className="chatroompage-modal-button chatroompage-modal-button-submit">
              <i className="fas fa-check"></i>
              Hoàn thành tư vấn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatRoomPage;