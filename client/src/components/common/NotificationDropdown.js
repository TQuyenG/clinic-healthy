// client/src/components/common/NotificationDropdown.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaBell, 
  FaCheck, 
  FaTimes,
  FaFileAlt,
  FaDollarSign,
  FaInfoCircle, 
  FaCalendarCheck,
  FaExclamationCircle
} from 'react-icons/fa';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setUnreadCount(response.data.count || 0);
        setOffline(false);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error.message || error);
      // Network error -> mark offline so UI can show retry
      if (!error.response) {
        setOffline(true);
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/api/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        // Hỗ trợ cả 2 trường hợp backend trả về key 'notifications' hoặc 'data'
        setNotifications(response.data.notifications || response.data.data || []);
        setOffline(false);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error.message || error);
      if (!error.response) {
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      const deletedNotif = notifications.find(n => n.id === notificationId);
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    setIsOpen(false);
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'article':
        return <FaFileAlt className="notificationdropdown-type-icon notificationdropdown-icon-article" />;
      case 'appointment':
        return <FaCalendarCheck className="notificationdropdown-type-icon notificationdropdown-icon-appointment" />;
      case 'payment':
        return <FaDollarSign className="notificationdropdown-type-icon notificationdropdown-icon-payment" />;
      case 'system':
        return <FaExclamationCircle className="notificationdropdown-type-icon notificationdropdown-icon-system" />;
      default:
        return <FaInfoCircle className="notificationdropdown-type-icon notificationdropdown-icon-default" />;
    }
  };

  return (
    <div className="notificationdropdown-wrapper" ref={dropdownRef}>
      <button 
        className="notificationdropdown-bell-button" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notificationdropdown-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notificationdropdown-menu">
          <div className="notificationdropdown-header">
            <h3 className="notificationdropdown-header-title">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="notificationdropdown-unread-badge">
                {unreadCount} mới
              </span>
            )}
          </div>

          <div className="notificationdropdown-list">
            {offline ? (
              <div className="notificationdropdown-empty">
                <FaExclamationCircle className="notificationdropdown-empty-icon" />
                <p className="notificationdropdown-empty-text">Không thể kết nối tới máy chủ</p>
                <button className="notificationdropdown-view-all-button" onClick={() => { setOffline(false); fetchUnreadCount(); fetchNotifications(); }} style={{ marginTop: '0.5rem' }}>Thử lại</button>
              </div>
            ) : loading ? (
              <div className="notificationdropdown-loading">
                <div className="notificationdropdown-spinner"></div>
                <p className="notificationdropdown-loading-text">Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notificationdropdown-empty">
                <FaBell className="notificationdropdown-empty-icon" />
                <p className="notificationdropdown-empty-text">Không có thông báo</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notificationdropdown-item ${!notification.is_read ? 'notificationdropdown-item-unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notificationdropdown-icon-wrapper">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notificationdropdown-content">
                    {/* Dùng content thay vì message để khớp với Database */}
                    <p className="notificationdropdown-message">{notification.content || notification.message}</p>
                    <span className="notificationdropdown-time">{formatTime(notification.created_at)}</span>
                  </div>

                  <div className="notificationdropdown-actions">
                    {!notification.is_read && (
                      <button
                        className="notificationdropdown-action-button notificationdropdown-action-read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Đánh dấu đã đọc"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      className="notificationdropdown-action-button notificationdropdown-action-delete"
                      onClick={(e) => deleteNotification(notification.id, e)}
                      title="Xóa"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notificationdropdown-footer">
              <button 
                className="notificationdropdown-view-all-button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;