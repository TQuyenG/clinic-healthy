// client/src/services/notificationService.js
// Service xử lý API cho thông báo

import api from './api';

const notificationService = {
  
  // ==================== NOTIFICATION APIs ====================
  
  /**
   * Lấy danh sách thông báo của user
   * GET /api/notifications
   */
  getMyNotifications: async (params = {}) => {
    try {
      const response = await api.get('/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },
  
  /**
   * Lấy số lượng thông báo chưa đọc
   * GET /api/notifications/unread-count
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  },
  
  /**
   * Đánh dấu một thông báo đã đọc
   * PUT /api/notifications/:id/read
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  /**
   * Đánh dấu tất cả thông báo đã đọc
   * PUT /api/notifications/mark-all-read
   */
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },
  
  /**
   * Xóa một thông báo
   * DELETE /api/notifications/:id
   */
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },
  
  /**
   * Xóa tất cả thông báo đã đọc
   * DELETE /api/notifications/delete-read
   */
  deleteAllRead: async () => {
    try {
      const response = await api.delete('/notifications/delete-read');
      return response.data;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  },
  
  /**
   * Gửi thông báo test (Admin)
   * POST /api/notifications/test
   */
  sendTestNotification: async (data) => {
    try {
      const response = await api.post('/notifications/test', data);
      return response.data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  },
  
  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Format icon theo loại thông báo
   */
  getNotificationIcon: (type) => {
    const iconMap = {
      'appointment': '📅',
      'consultation': '💬',
      'chat': '💬',
      'payment': '💰',
      'article': '📰',
      'system': '⚙️',
      'reminder': '⏰',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'info': 'ℹ️',
      'other': '🔔'
    };
    return iconMap[type] || '🔔';
  },
  
  /**
   * Format màu theo priority
   */
  getPriorityColor: (priority) => {
    const colorMap = {
      'low': '#6b7280',
      'normal': '#3b82f6',
      'high': '#f59e0b',
      'urgent': '#ef4444'
    };
    return colorMap[priority] || '#3b82f6';
  },
  
  /**
   * Format thời gian thông báo
   */
  formatNotificationTime: (timestamp) => {
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
   * Group thông báo theo ngày
   */
  groupNotificationsByDate: (notifications) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const grouped = {
      today: [],
      yesterday: [],
      older: []
    };
    
    notifications.forEach(notif => {
      const date = new Date(notif.created_at);
      date.setHours(0, 0, 0, 0);
      
      if (date.getTime() === today.getTime()) {
        grouped.today.push(notif);
      } else if (date.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(notif);
      } else {
        grouped.older.push(notif);
      }
    });
    
    return grouped;
  },
  
  /**
   * Tạo notification toast
   */
  showToast: (title, message, type = 'info', duration = 3000) => {
    // Tạo toast notification element
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${notificationService.getNotificationIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Thêm styles nếu chưa có
    if (!document.getElementById('notification-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-toast-styles';
      style.textContent = `
        .notification-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 400px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          z-index: 10000;
          animation: slideInRight 0.3s ease;
        }
        .notification-info { border-left: 4px solid #3b82f6; }
        .notification-success { border-left: 4px solid #10b981; }
        .notification-warning { border-left: 4px solid #f59e0b; }
        .notification-error { border-left: 4px solid #ef4444; }
        .toast-icon { font-size: 24px; }
        .toast-content { flex: 1; }
        .toast-title { font-weight: 600; margin-bottom: 4px; }
        .toast-message { font-size: 14px; color: #6b7280; }
        .toast-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }
        .toast-close:hover { color: #374151; }
        @keyframes slideInRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Thêm vào body
    document.body.appendChild(toast);
    
    // Tự động xóa sau duration
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  /**
   * Request notification permission (Browser)
   */
  requestPermission: async () => {
    if (!('Notification' in window)) {
      console.warn('Browser không hỗ trợ notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },
  
  /**
   * Show browser notification
   */
  showBrowserNotification: (title, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        if (options.link) {
          window.location.href = options.link;
        }
        notification.close();
      };
      
      return notification;
    }
    return null;
  },
  
  /**
   * Play notification sound
   */
  playNotificationSound: () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('Cannot play notification sound:', err);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }
};

export default notificationService;