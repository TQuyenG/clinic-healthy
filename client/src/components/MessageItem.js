// client/src/components/MessageItem.js
import React, { useState } from 'react';
import './MessageItem.css';

const MessageItem = ({ message, isMyMessage, onReply, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const iconMap = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',
      docx: 'fa-file-word',
      xls: 'fa-file-excel',
      xlsx: 'fa-file-excel',
      ppt: 'fa-file-powerpoint',
      pptx: 'fa-file-powerpoint',
      zip: 'fa-file-archive',
      rar: 'fa-file-archive',
      txt: 'fa-file-alt',
      default: 'fa-file'
    };
    return iconMap[ext] || iconMap.default;
  };

  // Get file name from URL
  const getFileName = (url) => {
    if (!url) return 'file';
    return url.split('/').pop() || 'file';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Render message content based on type
  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="messageitem-text">
            {message.replyTo && (
              <div className="messageitem-reply-preview">
                <i className="fas fa-reply"></i>
                <div className="messageitem-reply-content">
                  <span className="messageitem-reply-sender">
                    {message.replyTo.sender?.full_name || 'Tin nhắn'}
                  </span>
                  <span className="messageitem-reply-text">
                    {message.replyTo.message_type === 'text'
                      ? message.replyTo.content
                      : '[Tệp đính kèm]'}
                  </span>
                </div>
              </div>
            )}
            <p className="messageitem-text-content">{message.content}</p>
          </div>
        );

      case 'image':
        return (
          <div className="messageitem-image">
            {message.content && <p className="messageitem-image-caption">{message.content}</p>}
            {!imageError ? (
              <img 
                src={`http://localhost:3001${message.file_url}`}
                alt="Hình ảnh"
                onClick={() => window.open(`http://localhost:3001${message.file_url}`, '_blank')}
                onError={() => setImageError(true)}
                className="messageitem-image-img"
              />
            ) : (
              <div className="messageitem-image-error">
                <i className="fas fa-image"></i>
                <span>Không thể tải hình ảnh</span>
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="messageitem-file">
            <div className="messageitem-file-icon">
              <i className={`fas ${getFileIcon(message.file_url)}`}></i>
            </div>
            <div className="messageitem-file-info">
              <p className="messageitem-file-name">{getFileName(message.file_url)}</p>
              {message.file_size && (
                <p className="messageitem-file-size">{formatFileSize(message.file_size)}</p>
              )}
            </div>
            <a 
              href={`http://localhost:3001${message.file_url}`}
              download
              className="messageitem-file-download"
              title="Tải xuống"
            >
              <i className="fas fa-download"></i>
            </a>
          </div>
        );

      case 'voice':
        return (
          <div className="messageitem-voice">
            <audio controls className="messageitem-voice-audio">
               <source src={`http://localhost:3001${message.file_url}`} type="audio/mpeg" />

              Trình duyệt không hỗ trợ phát âm thanh.
            </audio>
          </div>
        );

      case 'system':
        return (
          <div className="messageitem-system">
            <i className="fas fa-info-circle"></i>
            <span>{message.content}</span>
          </div>
        );

      default:
        return <p className="messageitem-text-content">{message.content}</p>;
    }
  };

  // System messages are rendered differently
  if (message.message_type === 'system') {
    return (
      <div className="messageitem-container messageitem-system-wrapper">
        {renderContent()}
      </div>
    );
  }

  // ✅ Đoạn code SAU khi sửa (Thay thế chính xác cụm trên):
  return (
    <div 
      className={`messageitem-container ${isMyMessage ? 'messageitem-my' : 'messageitem-other'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`messageitem-content-group ${isMyMessage ? 'my-group' : 'other-group'}`}>
        {!isMyMessage && (
          <img 
            src={message.sender?.avatar_url || '/images/default-avatar.png'} 
            alt="Avatar"
            className="messageitem-avatar"
            onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-avatar.png'; }}
          />
        )}

        <div className="messageitem-content-wrapper">
          {!isMyMessage && (
            <div className="messageitem-sender-name">{message.sender?.full_name || 'Người dùng'}</div>
          )}

          <div style={{ position: 'relative' }}>
            <div className={`messageitem-bubble messageitem-bubble-${message.message_type}`}>
              {renderContent()}
              
              <div className="messageitem-meta">
                <span className="messageitem-time">{formatTime(message.created_at)}</span>
                {isMyMessage && (
                  <span className={`messageitem-status ${message.is_read ? 'messageitem-status-read' : 'messageitem-status-sent'}`}>
                    {message.is_read ? (
                      <i className="fas fa-check-double"></i>
                    ) : (
                      <i className="fas fa-check"></i>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Message Actions */}
            {showActions && message.message_type !== 'system' && (
              <div className="messageitem-actions">
                {onReply && (
                  <button 
                    className="messageitem-action-button messageitem-action-reply"
                    onClick={() => onReply(message.id)}
                    title="Trả lời"
                  >
                    <i className="fas fa-reply"></i>
                  </button>
                )}
                {isMyMessage && onDelete && (
                  <button 
                    className="messageitem-action-button messageitem-action-delete"
                    onClick={() => onDelete(message.id)}
                    title="Xóa"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isMyMessage && (
          <img 
            src={message.sender?.avatar_url || '/images/default-avatar.png'} 
            alt="You"
            className="messageitem-avatar"
            onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-avatar.png'; }}
          />
        )}
      </div>
    </div>
  );
};
export default MessageItem;