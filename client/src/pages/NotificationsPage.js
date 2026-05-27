// client/src/pages/NotificationsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaBell, FaCheck, FaCheckDouble, FaTrash, FaFileAlt, 
  FaExclamationCircle, FaInfoCircle, FaSpinner, FaCalendarCheck,
  FaDollarSign
} from 'react-icons/fa';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const unreadOnly = filter === 'unread' ? '?unread_only=true' : '';
      
      const response = await axios.get(`${API_BASE_URL}/api/notifications${unreadOnly}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        let data = response.data.notifications;
        
        if (filter === 'read') {
          data = data.filter(n => n.is_read);
        }
        
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!window.confirm('Xóa tất cả thông báo đã đọc?')) return;

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/delete-all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.filter(notif => !notif.is_read));
    } catch (error) {
      console.error('Error deleting all read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'article':
        return <FaFileAlt className="notificationspage-icon-type notificationspage-icon-article" />;
      case 'appointment':
        return <FaCalendarCheck className="notificationspage-icon-type notificationspage-icon-appointment" />;
      case 'payment':
        return <FaDollarSign className="notificationspage-icon-type notificationspage-icon-payment" />;
      case 'system':
        return <FaExclamationCircle className="notificationspage-icon-type notificationspage-icon-system" />;
      default:
        return <FaInfoCircle className="notificationspage-icon-type notificationspage-icon-default" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = Math.floor((now - notifDate) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    
    return notifDate.toLocaleDateString('vi-VN');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notificationspage-container">
      <div className="notificationspage-wrapper">
        <div className="notificationspage-header">
          <div className="notificationspage-header-left">
            <FaBell className="notificationspage-header-icon" />
            <h1 className="notificationspage-title">Thông báo</h1>
            {unreadCount > 0 && (
              <span className="notificationspage-unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notificationspage-header-actions">
            {unreadCount > 0 && (
              <button className="notificationspage-button notificationspage-button-read-all" onClick={markAllAsRead}>
                <FaCheckDouble /> Đánh dấu tất cả
              </button>
            )}
            <button className="notificationspage-button notificationspage-button-delete" onClick={deleteAllRead}>
              <FaTrash /> Xóa đã đọc
            </button>
          </div>
        </div>

        <div className="notificationspage-filters">
          <button 
            className={`notificationspage-filter-button ${filter === 'all' ? 'notificationspage-filter-button-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({notifications.length})
          </button>
          <button 
            className={`notificationspage-filter-button ${filter === 'unread' ? 'notificationspage-filter-button-active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button 
            className={`notificationspage-filter-button ${filter === 'read' ? 'notificationspage-filter-button-active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Đã đọc ({notifications.length - unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="notificationspage-loading">
            <FaSpinner className="notificationspage-spinner" />
            <p className="notificationspage-loading-text">Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notificationspage-empty">
            <FaBell className="notificationspage-empty-icon" />
            <h3 className="notificationspage-empty-title">Không có thông báo</h3>
            <p className="notificationspage-empty-text">Bạn chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="notificationspage-list">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`notificationspage-card ${!notification.is_read ? 'notificationspage-card-unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notificationspage-icon-wrapper">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notificationspage-content">
                  <p className="notificationspage-message">{notification.message}</p>
                  <span className="notificationspage-time">{formatTime(notification.created_at)}</span>
                </div>

                <div className="notificationspage-actions">
                  {!notification.is_read && (
                    <button
                      className="notificationspage-action-button notificationspage-action-read"
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
                    className="notificationspage-action-button notificationspage-action-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Xóa"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;