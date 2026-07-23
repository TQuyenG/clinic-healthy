// client/src/services/chatService.js
// Service xử lý API cho chức năng chat real-time

import api from './api';

const chatService = {
  
  // ==================== MESSAGE APIs ====================
  
  /**
   * Lấy danh sách tin nhắn trong một consultation
   * GET /api/chat/:consultationId/messages
   */
  getMessages: (consultationId, params = {}) => {
    return api.get(`/chat/${consultationId}/messages`, { params });
  },

  /**
   * Gửi tin nhắn mới tới phòng tư vấn
   * POST /api/chat/messages
   */
  sendMessage: (data) => {
    return api.post('/chat/messages', data);
  },

  /**
   * Gửi tin nhắn cho AI Chatbot Public
   * POST /api/chat/ai-chat
   */
  sendAIMessage: (message) => {
    return api.post('/chat/ai-chat', { message });
  },

  /**
   * Đánh dấu tin nhắn đã đọc
   * PUT /api/chat/messages/:messageId/read
   */
  markAsRead: (messageId) => {
    return api.put(`/chat/messages/${messageId}/read`);
  },

  /**
   * Xóa tin nhắn
   * DELETE /api/chat/messages/:messageId
   */
  deleteMessage: (messageId) => {
    return api.delete(`/chat/messages/${messageId}`);
  },

  /**
   * Chỉnh sửa tin nhắn
   * PUT /api/chat/messages/:messageId
   */
  editMessage: (messageId, data) => {
    return api.put(`/chat/messages/${messageId}`, data);
  },

  // ==================== FILE UPLOAD APIs ====================
  
  /**
   * Upload file/image trong chat
   * POST /api/chat/upload
   */
  uploadFile: (formData) => {
    return api.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Upload nhiều file cùng lúc
   * POST /api/chat/upload-multiple
   */
  uploadMultipleFiles: (formData) => {
    return api.post('/chat/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // ==================== CONVERSATION APIs ====================
  
  /**
   * Lấy danh sách cuộc hội thoại (conversations)
   * GET /api/chat/conversations
   */
  getConversations: (params = {}) => {
    return api.get('/chat/conversations', { params });
  },

  /**
   * Lấy chi tiết một cuộc hội thoại
   * GET /api/chat/conversations/:id
   */
  getConversationById: (conversationId) => {
    return api.get(`/chat/conversations/${conversationId}`);
  },

  /**
   * Xóa lịch sử chat
   * DELETE /api/chat/conversations/:id
   */
  deleteConversation: (conversationId) => {
    return api.delete(`/chat/conversations/${conversationId}`);
  },

  // ==================== NOTIFICATION APIs ====================
  
  /**
   * Lấy số tin nhắn chưa đọc
   * GET /api/chat/unread-count
   */
  getUnreadCount: () => {
    return api.get('/chat/unread-count');
  },

  /**
   * Đánh dấu tất cả tin nhắn đã đọc trong một consultation
   * PUT /api/chat/:consultationId/mark-all-read
   */
  markAllAsRead: (consultationId) => {
    return api.put(`/chat/${consultationId}/mark-all-read`);
  },

  // ==================== SEARCH APIs ====================
  
  /**
   * Tìm kiếm tin nhắn
   * GET /api/chat/search
   */
  searchMessages: (params) => {
    return api.get('/chat/search', { params });
  },

  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Format thời gian tin nhắn
   */
  formatMessageTime: (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 1) {
      return 'Vừa xong';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  },

  /**
   * Format chi tiết thời gian (cho message bubble)
   */
  formatDetailedTime: (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Kiểm tra file có phải là ảnh không
   */
  isImageFile: (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  },

  /**
   * Kiểm tra file có phải là video không
   */
  isVideoFile: (filename) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return videoExtensions.includes(extension);
  },

  /**
   * Lấy icon cho file type
   */
  getFileIcon: (filename) => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const iconMap = {
      '.pdf': '📄',
      '.doc': '📝',
      '.docx': '📝',
      '.xls': '📊',
      '.xlsx': '📊',
      '.ppt': '📽️',
      '.pptx': '📽️',
      '.zip': '🗜️',
      '.rar': '🗜️',
      '.txt': '📃',
      '.csv': '📊'
    };
    return iconMap[extension] || '📎';
  },

  /**
   * Format kích thước file
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Validate file upload
   */
  validateFile: (file, maxSizeMB = 10) => {
    const errors = {};

    if (!file) {
      errors.file = 'Vui lòng chọn file';
      return { isValid: false, errors };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.size = `Kích thước file không được vượt quá ${maxSizeMB}MB`;
    }

    // Check file type (allow common types)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'video/mp4'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.type = 'Định dạng file không được hỗ trợ';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Tạo preview cho file
   */
  createFilePreview: (file) => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    });
  },

  /**
   * Group messages theo ngày
   */
  groupMessagesByDate: (messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString('vi-VN');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  },

  /**
   * Kiểm tra xem có nên hiển thị avatar không
   * (chỉ hiển thị avatar cho tin nhắn đầu tiên của mỗi người trong chuỗi)
   */
  shouldShowAvatar: (messages, currentIndex) => {
    if (currentIndex === messages.length - 1) return true;
    
    const currentMsg = messages[currentIndex];
    const nextMsg = messages[currentIndex + 1];
    
    return currentMsg.sender_id !== nextMsg.sender_id;
  },

  /**
   * Kiểm tra xem có nên hiển thị thời gian không
   * (hiển thị thời gian nếu khoảng cách > 5 phút)
   */
  shouldShowTime: (messages, currentIndex) => {
    if (currentIndex === messages.length - 1) return true;
    
    const currentMsg = messages[currentIndex];
    const nextMsg = messages[currentIndex + 1];
    
    const timeDiff = new Date(nextMsg.created_at) - new Date(currentMsg.created_at);
    return timeDiff > 300000; // 5 phút
  },

  /**
   * Parse mention trong tin nhắn (@username)
   */
  parseMentions: (text) => {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  },

  /**
   * Parse link trong tin nhắn
   */
  parseLinks: (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  },

  /**
   * Encrypt tin nhắn (basic)
   */
  encryptMessage: (message) => {
    // Implement encryption nếu cần
    return btoa(message);
  },

  /**
   * Decrypt tin nhắn (basic)
   */
  decryptMessage: (encryptedMessage) => {
    // Implement decryption nếu cần
    try {
      return atob(encryptedMessage);
    } catch {
      return encryptedMessage;
    }
  },

 // ==================== WEBSOCKET FUNCTIONS ====================
  
  ws: null,
  listeners: {},
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,

  /**
   * Kết nối WebSocket
   */
  // ✅ SỬA: Thêm tham số consultationId và tự động join room
connect: function(userId, consultationId = null) {
  return new Promise((resolve, reject) => {
    // ✅ THÊM: Kiểm tra nếu đã kết nối
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket đã kết nối rồi');
      // Nếu có consultationId mới, join room
      if (consultationId) {
        this.joinConsultation(consultationId);
      }
      resolve();
      return;
    }

    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001'; // <--- SỬA CỔNG
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Đăng ký user_id + role để server phân loại admin broadcast
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        this.send('register', {
          user_id: userId,
          role: storedUser.role || null
        });
        
        // ✅ THÊM: Tự động join consultation nếu có
        if (consultationId) {
          setTimeout(() => {
            this.joinConsultation(consultationId);
          }, 500); // Tăng lên 500ms để chắc chắn register đã được server xử lý
        }
        
        resolve();
      };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.attemptReconnect(userId);
        };

      } catch (error) {
        console.error('Error connecting:', error);
        reject(error);
      }
    });
  },

  /**
   * Thử kết nối lại
   */
  attemptReconnect: function(userId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(userId);
      }, this.reconnectDelay);
    }
  },

  /**
   * Ngắt kết nối
   */
  disconnect: function() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  },

  // ✅ THÊM HÀM NÀY
/**
 * Kiểm tra trạng thái kết nối
 */
isConnected: function() {
  return this.ws && this.ws.readyState === WebSocket.OPEN;
},

  /**
   * Gửi message qua WebSocket
   */
  send: function(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  },

/**
   * Join consultation room
   */
  joinConsultation: function(consultationId) {
    console.log(`🚪 Attempting to join consultation: ${consultationId}`);
    
    // Đợi WebSocket ready
    const tryJoin = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log(`✅ Sending join_consultation for room ${consultationId}`);
        this.send('join_consultation', { consultation_id: consultationId });
      } else {
        console.log(`⏳ WebSocket not ready, retrying...`);
        setTimeout(tryJoin, 100);
      }
    };
    
    tryJoin();
  },

  /**
   * Leave consultation room
   */
  leaveConsultation: function(consultationId) {
    this.send('leave_consultation', { consultation_id: consultationId });
  },

  /**
   * Gửi trạng thái typing
   */
  sendTypingStatus: function(consultationId, receiverId) {
    this.send('typing', { is_typing: true });
  },

  // ========== BẮT ĐẦU THÊM MỚI: GỬI TÍN HIỆU WEBRTC ==========
  sendWebRTCOffer: function(consultationId, sdp) {
    console.log('[WS Send] Gửi OFFER cho room:', consultationId);
    this.send('webrtc_offer', { consultation_id: consultationId, sdp });
  },

  sendWebRTCAnswer: function(consultationId, sdp) {
    console.log('[WS Send] Gửi ANSWER cho room:', consultationId);
    this.send('webrtc_answer', { consultation_id: consultationId, sdp });
  },

  sendWebRTCICECandidate: function(consultationId, candidate) {
    this.send('webrtc_ice_candidate', { consultation_id: consultationId, candidate });
  },

  /**
   * Đánh dấu message đã đọc (WebSocket)
   */
  markMessageAsRead: function(messageId) {
    this.send('message_read', { message_id: messageId });
  },

  /**
   * Đăng ký event listener
   */
  on: function(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  /**
   * Hủy đăng ký event listener
   */
  off: function(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  },

  /**
   * Xử lý message từ WebSocket
   */
  handleMessage: function(data) {
    const { type, payload } = data;

    if (type === 'system_command') {
      console.warn('⚡ NHẬN LỆNH HỆ THỐNG:', payload.command);
      switch (payload.command) {
        case 'force_reconnect':
          this.disconnect();
          setTimeout(() => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) this.connect(user.id, payload.consultation_id);
          }, 1000);
          if (this.listeners['system_reconnect']) {
            this.listeners['system_reconnect'].forEach(cb => cb());
          }
          return;
        case 'restart_signaling':
          if (this.listeners['restart_video']) {
            this.listeners['restart_video'].forEach(cb => cb());
          }
          return;
        case 'reload_history':
          if (this.listeners['reload_history']) {
            this.listeners['reload_history'].forEach(cb => cb());
          }
          return;
      }
    }

    // Dispatch CustomEvent cho các loại incident để component lắng nghe
    if (type === 'new_incident') {
      window.dispatchEvent(new CustomEvent('consultation:new_incident', { detail: payload }));
    }
    if (type === 'incident_resolved') {
      window.dispatchEvent(new CustomEvent('consultation:incident_resolved', { detail: payload }));
    }
    if (type === 'system_message') {
      window.dispatchEvent(new CustomEvent('consultation:system_message', { detail: payload }));
    }
    if (type === 'consultation_ended') {
      window.dispatchEvent(new CustomEvent('consultation:ended', { detail: payload }));
    }

    // ✅ THÊM: Debug log để xác nhận event có về không
    console.log('📨 [WS] handleMessage type:', type, payload);

    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => callback(payload));
    }
  },

  /**
   * Gửi tin nhắn text
   */
  sendTextMessage: async function(messageData) {
    const response = await api.post('/chat/messages', messageData);
    return response.data;
  },

  /**
   * Lấy lịch sử chat
   */
  getChatHistory: async function(consultationId) {
    try {
      const response = await this.getMessages(consultationId);
      // Xử lý nhiều cấu trúc response
      if (response.data?.messages) {
        return response.data.messages;
      } else if (response.data?.data) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.warn('⚠️ Không thể tải lịch sử chat:', error.message);
      return [];
    }
  },
  // --- [THÊM MỚI] HÀNH ĐỘNG CỦA ADMIN ---
  adminJoinMonitor: function(consultationId) {
    this.send('admin_monitor_join', { consultation_id: consultationId });
  },

  adminSendAction: function(action, consultationId) {
    // action: 'force_reconnect' | 'restart_signaling'
    this.send('admin_action', { 
      action: action, 
      target_room: consultationId 
    });
  }
};



export default chatService;