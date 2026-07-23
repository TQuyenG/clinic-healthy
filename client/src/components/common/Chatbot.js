// client/src/components/common/Chatbot.js

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaComments, 
  FaTimes, 
  FaPaperPlane, 
  FaRobot,
  FaArrowUp,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUserMd,
  FaCreditCard,
  FaAmbulance,
  FaStethoscope,
  FaQuestionCircle,
  FaVideo,
  FaHospital,
  FaTrash
} from 'react-icons/fa';
import './Chatbot.css';
import chatService from '../../services/chatService'; 

// ✅ Key lưu lịch sử vào localStorage
const CHAT_HISTORY_KEY = 'chatbot_history';
const MAX_HISTORY = 100; // Giới hạn số tin nhắn lưu

const getInitialMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [
    {
      id: 1,
      text: 'Xin chào! Tôi là trợ lý AI thông minh của Easy Medify. Bạn đang gặp vấn đề gì về sức khỏe, hoặc cần tôi hỗ trợ thông tin gì về phòng khám?',
      sender: 'bot',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ];
};

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const MAX_RETRY_ATTEMPTS = 2;

  // Drag state
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: dragPos.x,
      elY: dragPos.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragPos({
      x: dragStart.current.elX + (e.clientX - dragStart.current.mouseX),
      y: dragStart.current.elY + (e.clientY - dragStart.current.mouseY),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    window.openChatbot = () => setIsOpen(true);
    return () => { delete window.openChatbot; };
  }, []);

  useEffect(() => {
    if (showGreeting) {
      const timer = setTimeout(() => setShowGreeting(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showGreeting]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 240);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ Khởi tạo messages từ localStorage
  const [messages, setMessages] = useState(getInitialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // ✅ Lưu lịch sử vào localStorage mỗi khi messages thay đổi
  useEffect(() => {
    try {
      const toSave = messages.slice(-MAX_HISTORY);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }, [messages]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isRetryableAIError = (error) => {
    const status = error?.response?.status;
    return !status || status === 429 || status === 503 || status >= 500;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Xóa lịch sử chat
  const handleClearHistory = () => {
    const initial = [{
      id: Date.now(),
      text: 'Lịch sử chat đã được xóa. Xin chào! Tôi có thể giúp gì cho bạn?',
      sender: 'bot',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }];
    setMessages(initial);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    const userMessage = {
      id: Date.now(), 
      text: inputMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // ✅ Kiểm tra điều hướng nhanh TRƯỚC khi gọi AI
    const quickRoute = getQuickRoute(inputMessage.trim());
    if (quickRoute) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: quickRoute.message,
        sender: 'bot',
        navRoute: quickRoute.route,
        navLabel: quickRoute.label,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
      return;
    }

    try {
      let response = null;
      let finalError = null;

      for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
        try {
          response = await chatService.sendAIMessage(userMessage.text);
          finalError = null;
          break;
        } catch (error) {
          finalError = error;
          if (!isRetryableAIError(error) || attempt === MAX_RETRY_ATTEMPTS) break;
          setMessages(prev => [...prev, {
            id: Date.now() + attempt + 100,
            text: `AI đang bận, hệ thống sẽ thử lại (${attempt + 1}/${MAX_RETRY_ATTEMPTS})...`,
            sender: 'bot',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }]);
          await wait(Math.min(1500 * (attempt + 1), 3500));
        }
      }

      if (!response) throw finalError || new Error('Không thể nhận phản hồi từ AI');

      const aiData = response.data?.data;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: aiData?.text || 'Xin lỗi, tôi chưa thể xử lý yêu cầu lúc này.',
        sender: 'bot',
        action: aiData?.suggested_action,
        specialtyData: {
          id: aiData?.suggested_specialty_id,
          name: aiData?.suggested_specialty_name
        },
        packageId: aiData?.suggested_package_id,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Đã có lỗi kết nối với máy chủ AI sau nhiều lần thử. Xin vui lòng thử lại sau ít phút.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ✅ Map từ khóa → route đúng trong hệ thống
  const getQuickRoute = (text) => {
    const lower = text.toLowerCase();

    if (lower.includes('đặt lịch khám') || lower.includes('lịch khám')) {
      return {
        route: '/dat-lich-kham',
        label: 'Đến trang đặt lịch khám',
        message: 'Tôi sẽ dẫn bạn đến trang đặt lịch khám trực tiếp tại phòng khám.'
      };
    }
    if (lower.includes('tư vấn') || lower.includes('tu van') || lower.includes('online')) {
      return {
        route: '/tu-van',
        label: 'Đến trang tư vấn online',
        message: 'Tôi sẽ dẫn bạn đến trang đặt lịch tư vấn trực tuyến với bác sĩ.'
      };
    }
    if (lower.includes('bác sĩ') || lower.includes('bac si') || lower.includes('danh sách bác sĩ')) {
      return {
        route: '/bac-si',
        label: 'Xem danh sách bác sĩ',
        message: 'Đây là danh sách bác sĩ của phòng khám Easy Medify.'
      };
    }
    if (lower.includes('dịch vụ') || lower.includes('chi phí') || lower.includes('giá')) {
      return {
        route: '/dich-vu',
        label: 'Xem dịch vụ & chi phí',
        message: 'Tôi sẽ dẫn bạn đến trang danh sách dịch vụ và bảng giá chi tiết.'
      };
    }
    if (lower.includes('giờ làm việc') || lower.includes('địa chỉ') || lower.includes('liên hệ')) {
      return {
        route: '/lien-he',
        label: 'Xem thông tin liên hệ',
        message: 'Phòng khám làm việc T2-T7: 7:00-20:00, CN: 8:00-17:00. Bạn có thể xem địa chỉ chi tiết tại đây.'
      };
    }
    if (lower.includes('cấp cứu') || lower.includes('khẩn cấp')) {
      return {
        route: '/lien-he',
        label: 'Liên hệ khẩn cấp',
        message: '🚨 Trường hợp khẩn cấp, vui lòng gọi ngay: 1900 1234 (24/7). Hoặc đến phòng cấp cứu gần nhất.'
      };
    }
    if (lower.includes('hồ sơ') || lower.includes('lịch sử khám') || lower.includes('kết quả')) {
      return {
        route: '/ho-so-suc-khoe',
        label: 'Xem hồ sơ sức khỏe',
        message: 'Tôi sẽ dẫn bạn đến trang hồ sơ sức khỏe của bạn.'
      };
    }
    return null;
  };

  // ✅ Điều hướng đúng route
  const handleNavigate = (route) => {
    setIsOpen(false);
    navigate(route);
  };

  // ✅ Route đúng cho đặt lịch offline
  const handleBookOffline = (specialtyId) => {
    setIsOpen(false);
    navigate(`/dat-lich-kham${specialtyId ? `?specialty_id=${specialtyId}` : ''}`);
  };

  // ✅ Route đúng cho tư vấn online
  const handleBookOnline = (packageId) => {
    setIsOpen(false);
    navigate(`/tu-van${packageId ? `?package_id=${packageId}` : ''}`);
  };

  const quickReplies = [
    { text: 'Tư vấn triệu chứng bệnh', icon: FaStethoscope },
    { text: 'Đặt lịch khám', icon: FaCalendarAlt },
    { text: 'Giờ làm việc & Địa chỉ', icon: FaMapMarkerAlt },
    { text: 'Chi phí dịch vụ', icon: FaCreditCard },
    { text: 'Cấp cứu 24/7', icon: FaAmbulance }
  ];

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="chatbot">
      {showScrollTop && (
        <button
          type="button"
          className="chatbot-scroll-top-btn"
          onClick={handleScrollToTop}
          aria-label="Cuộn lên đầu trang"
          title="Lên đầu trang"
        >
          <FaArrowUp />
        </button>
      )}

      <button
        className={`chatbot-toggle-btn ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
        style={{
          transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        aria-label="Mở chat hỗ trợ"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
        {!isOpen && showGreeting && (
          <div className="chatbot-tooltip">
            <FaQuestionCircle /> Cần AI hỗ trợ?
          </div>
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-profile">
              <div className="chatbot-avatar bot-header-avatar">
                <FaRobot />
              </div>
              <div className="chatbot-header-text">
                <h3>Bác sĩ Trí tuệ nhân tạo (AI)</h3>
                <div className="chatbot-status">
                  <span className="chatbot-status-dot"></span>
                  Hỗ trợ trực tuyến 24/7
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* ✅ Nút xóa lịch sử */}
              <button
                className="chatbot-close-icon-btn"
                onClick={handleClearHistory}
                title="Xóa lịch sử chat"
                aria-label="Xóa lịch sử chat"
              >
                <FaTrash style={{ fontSize: 15 }} />
              </button>
              <button 
                className="chatbot-close-icon-btn" 
                onClick={() => setIsOpen(false)}
                aria-label="Đóng cửa sổ chat"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message-row ${message.sender}`}
              >
                {message.sender === 'bot' && (
                  <div className="chatbot-avatar bot-msg-avatar">
                    <FaRobot />
                  </div>
                )}
                
                <div className="chatbot-message-content">
                  <div className="chatbot-bubble">
                    <p>{message.text}</p>
                    
                    {/* ✅ Nút điều hướng nhanh (từ getQuickRoute) */}
                    {message.sender === 'bot' && message.navRoute && (
                      <button
                        className="action-card-btn"
                        style={{ marginTop: 10, background: '#16a34a' }}
                        onClick={() => handleNavigate(message.navRoute)}
                      >
                        <FaCalendarAlt /> {message.navLabel}
                      </button>
                    )}

                    {/* Thẻ đặt lịch OFFLINE từ AI */}
                    {message.sender === 'bot' && message.action === 'BOOK_OFFLINE' && (
                      <div className="chatbot-action-card" style={{ borderColor: '#86efac' }}>
                        <div className="action-card-info" style={{ color: '#166534' }}>
                          <FaHospital className="action-card-icon" /> 
                          <div className="action-card-text" style={{ color: '#166534' }}>
                            {message.specialtyData?.name ? (
                              <>Chuyên khoa gợi ý: <strong>{message.specialtyData.name}</strong></>
                            ) : (
                              <strong>Khám bệnh tại phòng khám</strong>
                            )}
                          </div>
                        </div>
                        <button 
                          className="action-card-btn"
                          style={{ background: '#22c55e' }}
                          onClick={() => handleBookOffline(message.specialtyData?.id)}
                        >
                          <FaCalendarAlt /> Đặt lịch khám trực tiếp
                        </button>
                      </div>
                    )}

                    {/* Thẻ đặt lịch ONLINE từ AI */}
                    {message.sender === 'bot' && message.action === 'BOOK_ONLINE' && (
                      <div className="chatbot-action-card" style={{ borderColor: '#bbf7d0' }}>
                        <div className="action-card-info" style={{ color: '#166534' }}>
                          <FaVideo className="action-card-icon" /> 
                          <div className="action-card-text" style={{ color: '#166534' }}>
                            <strong>Tư vấn sức khỏe từ xa (Online)</strong>
                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#16a34a' }}>Video Call / Chat với Bác sĩ</p>
                          </div>
                        </div>
                        <button 
                          className="action-card-btn"
                          style={{ background: '#16a34a' }}
                          onClick={() => handleBookOnline(message.packageId)}
                        >
                          <FaComments /> Đặt lịch tư vấn ngay
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="chatbot-time">{message.time}</span>
                </div>

                {message.sender === 'user' && (
                  <div className="chatbot-avatar user-msg-avatar">
                    <FaUser />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="chatbot-message-row bot typing">
                <div className="chatbot-avatar bot-msg-avatar">
                  <FaRobot />
                </div>
                <div className="chatbot-message-content">
                  <div className="chatbot-bubble typing-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 1 && (
            <div className="chatbot-quick-replies">
              <p className="quick-reply-title">Chọn câu hỏi nhanh hoặc nhập triệu chứng:</p>
              <div className="quick-reply-list">
                {quickReplies.map((reply, index) => {
                  const IconComponent = reply.icon;
                  return (
                    <button
                      key={index}
                      className="quick-reply-btn"
                      onClick={() => handleQuickReply(reply.text)}
                    >
                      <IconComponent className="quick-reply-icon" />
                      {reply.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <form id="chatbot-form" className="chatbot-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input-field"
              placeholder="Nhập triệu chứng của bạn (VD: Đau đầu, chóng mặt)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              aria-label="Tin nhắn"
            />
            <button type="submit" className="chatbot-send-btn" aria-label="Gửi">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;