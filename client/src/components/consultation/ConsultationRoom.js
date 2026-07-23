// client/src/components/consultation/ConsultationRoom.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import chatService from '../../services/chatService';
import { 
  FaPaperPlane, 
  FaPaperclip, 
  FaImage,
  FaVideo,
  FaMicrophone,
  FaPhone,
  FaEllipsisV,
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRedo,
  FaFlag,
  FaWifi,
  FaClock,
  FaEye
} from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import './ConsultationRoom.css';

const ConsultationRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
const { showToast } = useToast();
  
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ws, setWs] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('technical');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPriority, setReportPriority] = useState('medium');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'lost' | 'reconnecting'
  const [failedMessages, setFailedMessages] = useState({}); // { tempId: messageObj }
  const [systemMessages, setSystemMessages] = useState([]); // tin nhắn từ admin
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectCountRef = useRef(0);

  // ===== ĐẾM NGƯỢC TỚI GIỜ HẸN & THỜI GIAN TƯ VẤN =====
  const [countdown, setCountdown] = useState(null);
  // null = chưa tính, số dương = còn X giây trước giờ hẹn
  
  const [sessionCountdown, setSessionCountdown] = useState(null);
  // null = chưa bắt đầu đếm, số dương = còn X giây của phiên tư vấn
  
  const [sessionExpired, setSessionExpired] = useState(false);
  // true = hết giờ, khóa chat
  
  const warnedRef = useRef(false); // tránh toast cảnh báo 2 phút bị lặp

  useEffect(() => {
    if (!consultation?.appointment_time) return;

    console.log('🔍 DEBUG consultation:', {
      appointment_time: consultation.appointment_time,
      package: consultation.package,
      duration_minutes: consultation.duration_minutes,
      status: consultation.status,
      allKeys: Object.keys(consultation)
    });
    const durationMinutes = consultation.package?.duration_minutes || 30;
    const durationSeconds = durationMinutes * 60;

    const tick = () => {
      const now = new Date();
      const apptTime = new Date(consultation.appointment_time);
      const secondsToStart = Math.floor((apptTime - now) / 1000);

      if (secondsToStart > 0) {
        // Chưa tới giờ → hiện đếm ngược tới giờ hẹn
        setCountdown(secondsToStart);
        setSessionCountdown(null);
        setSessionExpired(false);
        warnedRef.current = false;
      } else {
        // Đã tới hoặc đang trong giờ tư vấn
        setCountdown(null);
        const elapsed = Math.abs(secondsToStart); // số giây đã trôi qua kể từ giờ hẹn
        const remaining = durationSeconds - elapsed;

        if (remaining > 0) {
          setSessionCountdown(remaining);
          setSessionExpired(false);

          // Cảnh báo khi còn 2 phút (120 giây)
          if (remaining <= 120 && !warnedRef.current) {
            warnedRef.current = true;
            showToast({ type: 'warning', message: '⏰ Còn 2 phút kết thúc buổi tư vấn!' });
          }
        } else {
          // Hết giờ
          setSessionCountdown(0);
          setSessionExpired(true);
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [consultation?.appointment_time, consultation?.package?.duration_minutes]);

  const formatCountdown = (seconds) => {
    if (seconds == null || seconds <= 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  // ===== KẾT THÚC ĐẾM NGƯỢC =====

  useEffect(() => {
    if (!id || !user) return () => { chatService.disconnect(); };

    fetchConsultationData();
    chatService.connect(user.id, id);

    chatService.on('restart_video', async () => {
      const { default: videoService } = await import('../../services/videoService');
      await videoService.restartSession();
    });
    chatService.on('reload_history', () => { fetchConsultationData(); });

    const handleSystemMessage = (e) => {
      const msg = e.detail;
      setSystemMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });
      showToast({ type: 'info', message: `📢 Thông báo Admin: ${msg.message}` });
    };
    window.addEventListener('consultation:system_message', handleSystemMessage);

    const handleSystemCommand = (e) => {
      const { command } = e.detail;
      if (command === 'force_reconnect') {
        showToast({ type: 'warning', message: '⚠️ Hệ thống đang tối ưu kết nối...' });
        setConnectionStatus('reconnecting');
        setTimeout(() => {
          fetchConsultationData();
          setConnectionStatus('connected');
        }, 2000);
      }
    };
    window.addEventListener('consultation:system_command', handleSystemCommand);

    const handleMessageStatus = (e) => {
      const { message_id, is_read } = e.detail;
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, is_read } : m));
    };
    window.addEventListener('consultation:message_status', handleMessageStatus);

    // Heartbeat mỗi 30 giây (5 giây quá dày, tốn băng thông)
    heartbeatRef.current = setInterval(() => {
      chatService.send?.('ping', { consultation_id: id });
    }, 30000);

    // Polling fallback mỗi 10 giây (WS là chính, polling chỉ để đồng bộ lại)
    const pollingInterval = setInterval(async () => {
      try {
        const messagesRes = await chatService.getMessages(id);
        setMessages(messagesRes.data.data || []);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 10000);

    // Cleanup duy nhất — bao gồm tất cả
    return () => {
      clearInterval(pollingInterval);
      clearInterval(heartbeatRef.current);
      chatService.disconnect();
      window.removeEventListener('consultation:system_message', handleSystemMessage);
      window.removeEventListener('consultation:system_command', handleSystemCommand);
      window.removeEventListener('consultation:message_status', handleMessageStatus);
    };
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConsultationData = async () => {
    try {
      setLoading(true);
      
      const [consultationRes, messagesRes] = await Promise.all([
        consultationService.getConsultationById(id),
        chatService.getMessages(id)
      ]);

      setConsultation(consultationRes.data.data);
      setMessages(messagesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      showToast({ type: 'error', message: 'Không thể tải thông tin tư vấn' });
      navigate('/dich-vu?tab=consultation');
    } finally {
      setLoading(false);
    }
  };

  const initWebSocket = () => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({
        type: 'register',
        payload: { user_id: user.id }
      }));
      
      socket.send(JSON.stringify({
        type: 'join_consultation',
        payload: { consultation_id: id }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(socket);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => {
          // Tránh duplicate
          if (prev.find(m => m.id === data.payload.id)) return prev;
          return [...prev, data.payload];
        });
        break;
      case 'typing':
        setTyping(data.payload.is_typing);
        break;
      case 'message_read':
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.payload.message_id
              ? { ...msg, is_read: true }
              : msg
          )
        );
        break;
      case 'system_command':
        if (data.payload.command === 'force_reconnect') {
          showToast({ type: 'warning', message: '⚠️ Hệ thống đang tối ưu hóa kết nối...' });
          setConnectionStatus('reconnecting');
          setTimeout(() => {
            fetchConsultationData();
            setConnectionStatus('connected');
          }, 2000);
        }
        break;
      // Admin buộc kết thúc phiên → điều hướng user ra ngoài
      case 'consultation_ended':
        showToast({
          type: 'warning',
          message: `⚠️ Phiên tư vấn đã bị kết thúc bởi quản trị viên${data.payload.reason ? ': ' + data.payload.reason : ''}`
        });
        setTimeout(() => {
          navigate(user?.role === 'doctor' ? '/tu-van/quan-ly' : '/lich-tu-van-cua-toi');
        }, 2500);
        break;
      default:
        break;
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      consultation_id: id,
      sender_id: user.id,
      message: newMessage.trim(),
      message_type: 'text',
      status: 'sending', // ⏳
      created_at: new Date().toISOString(),
      is_read: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);
      const response = await chatService.sendMessage({
        consultation_id: id,
        message: msgText,
        message_type: 'text'
      });

      if (response.data.success) {
        const sentMessage = { ...response.data.data, status: 'sent' };
        // Thay thế optimistic message bằng message thật
        setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Đánh dấu failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      setFailedMessages(prev => ({ ...prev, [tempId]: { message: msgText, message_type: 'text' } }));
    } finally {
      setSending(false);
    }
  };

  // Gửi lại tin nhắn thất bại
  const handleRetryMessage = async (tempId) => {
    const failedMsg = failedMessages[tempId];
    if (!failedMsg) return;
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sending' } : m));
    try {
      const response = await chatService.sendMessage({ consultation_id: id, ...failedMsg });
      if (response.data.success) {
        const sentMessage = { ...response.data.data, status: 'sent' };
        setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
        setFailedMessages(prev => { const n = { ...prev }; delete n[tempId]; return n; });
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      showToast({ type: 'error', message: 'Vẫn không gửi được. Kiểm tra kết nối mạng.' });
    }
  };

  // Mở phòng chat mới (backup room)
  const handleOpenBackupRoom = async () => {
    if (!window.confirm('Tạo phiên tư vấn dự phòng mới?')) return;
    try {
      const response = await consultationService.createBackupSession?.(id);
      if (response?.data?.data?.id) {
        navigate(`/tu-van/${response.data.data.id}/chat`);
      } else {
        showToast({ type: 'info', message: 'Vui lòng liên hệ admin để tạo phòng mới.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Không thể tạo phòng dự phòng. Hãy báo cáo sự cố.' });
    }
  };

  // Gửi báo cáo sự cố
  const handleSubmitReport = async () => {
    if (!reportDescription.trim()) {
      showToast({ type: 'warning', message: 'Vui lòng mô tả sự cố.' });
      return;
    }
    if (reportDescription.trim().length < 10) {
      showToast({ type: 'warning', message: 'Mô tả cần ít nhất 10 ký tự.' });
      return;
    }
    try {
      setReportSubmitting(true);
      await consultationService.reportIssue(id, {
        report_type: reportType,
        description: reportDescription.trim(),
        priority: reportPriority,
      });
      showToast({ type: 'success', message: '✅ Báo cáo đã gửi. Admin sẽ xử lý sớm!' });
      setShowReportModal(false);
      setReportDescription('');
      setReportPriority('medium');
    } catch (error) {
      showToast({ type: 'error', message: 'Không thể gửi báo cáo. Thử lại sau.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultation_id', id);

      const response = await chatService.uploadFile(formData);
      
      if (response.data.success) {
        const message = response.data.data;
        setMessages(prev => [...prev, message]);

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'new_message',
            payload: message
          }));
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast({ type: 'error', message: 'Không thể tải file lên. Vui lòng thử lại.' });
    }
  };

  const handleEndConsultation = async () => {
    if (!window.confirm('Bạn có chắc muốn kết thúc buổi tư vấn này?')) return;

    try {
      await consultationService.completeConsultation(id, {});
      showToast({ type: 'success', message: 'Kết thúc buổi tư vấn thành công!' });
      setTimeout(() => {
        if (user.role === 'doctor') {
          navigate('/tu-van/quan-ly');
        } else {
          navigate('/lich-hen-cua-toi');
        }
      }, 1500);
    } catch (error) {
      console.error('Error ending consultation:', error);
      showToast({ type: 'error', message: 'Không thể kết thúc tư vấn' });
    }
  };

  if (loading) {
    return (
      <div className="consultation-room-loading">
        <div className="spinner"></div>
        <p>Đang tải phòng tư vấn...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="consultation-room-error">
        <FaExclamationTriangle />
        <h3>Không tìm thấy buổi tư vấn</h3>
        <button onClick={() => navigate('/dich-vu?tab=consultation')}>Quay lại</button>
      </div>
    );
  }

  const otherUser = user.role === 'patient' 
    ? consultation.Doctor?.User 
    : consultation.Patient?.User;

  return (
    <div className="consultation-room-container">
      <div className="consultation-room-header">
        <div className="header-left">
          <div className="user-avatar">
            <img 
              src={otherUser?.avatar_url || '/default-avatar.png'} 
              alt={otherUser?.full_name}
            />
            <span className="online-indicator"></span>
          </div>
          <div className="user-info">
            <h3>{otherUser?.full_name}</h3>
            <p className="user-role">
              {user.role === 'patient' ? 'Bác sĩ' : 'Bệnh nhân'}
            </p>
          </div>
        </div>

       <div className="header-right">
          {/* Đếm ngược trước giờ hẹn */}
          {countdown !== null && countdown > 0 && (
            <span className="countdown-badge">
              <FaClock /> Bắt đầu sau {formatCountdown(countdown)}
            </span>
          )}

          {/* Đếm ngược thời gian tư vấn đang diễn ra */}
          {sessionCountdown !== null && sessionCountdown > 0 && !sessionExpired && (
            <span className={`countdown-badge ${sessionCountdown <= 120 ? 'countdown-warning' : 'countdown-now'}`}>
              <FaClock /> Còn {formatCountdown(sessionCountdown)}
            </span>
          )}

          {/* Hết giờ */}
          {sessionExpired && (
            <span className="countdown-badge countdown-expired">
              <FaClock /> Hết giờ tư vấn
            </span>
          )}

          {/* Indicator kết nối */}
          <span className={`connection-badge connection-${connectionStatus}`}>
            <FaWifi />
            {connectionStatus === 'connected' && ' Đã kết nối'}
            {connectionStatus === 'lost' && ' Mất kết nối'}
            {connectionStatus === 'reconnecting' && ' Đang kết nối lại...'}
          </span>

          <button className="icon-btn" title="Gọi thoại">
            <FaPhone />
          </button>
          <button className="icon-btn" title="Gọi video">
            <FaVideo />
          </button>
          <button 
            className="icon-btn btn-report"
            onClick={() => setShowReportModal(true)}
            title="Báo cáo sự cố"
          >
            <FaFlag />
          </button>
          <button 
            className="btn-end-consultation"
            onClick={handleEndConsultation}
          >
            <FaTimesCircle /> Kết thúc
          </button>
        </div>

        {/* Modal báo cáo sự cố nâng cấp */}
        {showReportModal && (
          <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="report-modal" onClick={e => e.stopPropagation()}>
              <div className="report-modal-header">
                <FaFlag /> Báo cáo sự cố
                <button className="report-modal-close" onClick={() => setShowReportModal(false)}>✕</button>
              </div>
              <div className="report-modal-body">
                <label>Loại sự cố *</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)}>
                  <option value="technical">🔧 Lỗi kỹ thuật (không gửi được tin nhắn...)</option>
                  <option value="no_video">📹 Không vào được Video Call</option>
                  <option value="no_audio">🔇 Không có âm thanh</option>
                  <option value="connection_lost">📡 Mất kết nối liên tục</option>
                  <option value="poor_quality">📶 Chất lượng kém (lag, giật...)</option>
                  <option value="network_issue">🌐 Lỗi mạng</option>
                  <option value="server_error">🖥 Lỗi máy chủ</option>
                  <option value="behavior">⚠️ Vấn đề thái độ / hành vi</option>
                  <option value="emergency">🚨 Khẩn cấp y tế / an toàn</option>
                  <option value="security">🔒 Vi phạm bảo mật</option>
                  <option value="other">📋 Khác</option>
                </select>

                <label>Mức độ ưu tiên *</label>
                <select value={reportPriority} onChange={e => setReportPriority(e.target.value)}>
                  <option value="low">🟢 Thấp — không ảnh hưởng phiên</option>
                  <option value="medium">🟡 Trung bình — cần xử lý sớm</option>
                  <option value="high">🟠 Cao — ảnh hưởng đến chất lượng</option>
                  <option value="critical">🔴 Khẩn cấp — phiên không thể tiếp tục</option>
                </select>

                <label>Mô tả vấn đề * <span style={{fontWeight:400,color:'#999',fontSize:12}}>(tối thiểu 10 ký tự)</span></label>
                <textarea
                  rows={4}
                  placeholder="Mô tả chi tiết sự cố bạn gặp phải..."
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                />

                <div className="report-device-info">
                  <small>
                    🖥 Thiết bị: {navigator.platform} &nbsp;|&nbsp;
                    🌐 Trình duyệt: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Khác'} &nbsp;|&nbsp;
                    🔑 Mã phiên: {id}
                  </small>
                </div>
              </div>
              <div className="report-modal-footer">
                <button className="btn-cancel-report" onClick={() => setShowReportModal(false)}>Hủy</button>
                <button
                  className="btn-submit-report"
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? '⏳ Đang gửi...' : '📤 Gửi báo cáo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="consultation-room-body">
        <div className="messages-container">
          {/* Banner hết giờ */}
          {sessionExpired && (
            <div className="system-message-banner" style={{ background: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }}>
              <FaClock /> <strong>Buổi tư vấn đã kết thúc.</strong> Bạn không thể gửi thêm tin nhắn.
            </div>
          )}

          {/* Tin nhắn từ admin (ghim đầu) */}
          {systemMessages.length > 0 && (
            <div className="system-message-banner">
              <FaFlag /> <strong>Thông báo Admin:</strong> {systemMessages[0].message}
              {systemMessages.length > 1 && <span className="sys-msg-count">+{systemMessages.length - 1} thông báo khác</span>}
            </div>
          )}

          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message-bubble ${message.sender_id === user.id ? 'sent' : 'received'} ${message.status === 'failed' ? 'message-failed' : ''}`}
            >
              {message.message_type === 'text' && (
                <div className="message-text">{message.message}</div>
              )}
              
              {message.message_type === 'image' && (
                <div className="message-image">
                  <img src={message.file_url} alt="Image" />
                </div>
              )}
              
              {message.message_type === 'file' && (
                <div className="message-file">
                  <FaPaperclip />
                  <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                    {message.file_name || 'File đính kèm'}
                  </a>
                </div>
              )}

              <div className="message-time">
                {new Date(message.created_at).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {message.sender_id === user.id && (
                  <span className={`message-status ${message.is_read ? 'read' : message.status === 'failed' ? 'failed' : 'sent'}`}>
                    {message.status === 'sending' && <FaClock title="Đang gửi..." />}
                    {message.status === 'failed' && <FaExclamationTriangle title="Gửi thất bại" />}
                    {message.status === 'sent' && !message.is_read && '✓'}
                    {message.is_read && <FaCheckCircle title="Đã xem" />}
                  </span>
                )}
              </div>

              {/* Nút gửi lại khi lỗi */}
              {message.status === 'failed' && (
                <div className="message-error-actions">
                  <span className="message-error-label">❌ Không gửi được</span>
                  <button className="btn-retry-msg" onClick={() => handleRetryMessage(message.id)}>
                    <FaRedo /> Gửi lại
                  </button>
                  <button className="btn-new-room" onClick={handleOpenBackupRoom}>
                    Tạo phiên mới
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {typing && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="consultation-room-footer">
        <form onSubmit={handleSendMessage} className="message-input-form">
          <button 
            type="button" 
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FaPaperclip />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <input
            type="text"
            className="message-input"
            placeholder={sessionExpired ? "⏰ Buổi tư vấn đã kết thúc" : "Nhập tin nhắn..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || sessionExpired}
          />

          <button 
            type="submit" 
            className="btn-send"
            disabled={!newMessage.trim() || sending || sessionExpired}
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsultationRoom;