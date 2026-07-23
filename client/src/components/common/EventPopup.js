import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './EventPopup.css';

const EventPopup = ({ data, onClose }) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (data?.id) {
      api.post(`/marketing/events/${data.id}/track`, { type: 'view' }).catch(() => {});
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [data]);

  if (!data) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250); // Khớp với thời gian animation trong CSS là 0.25s
  };

  const handleAction = () => {
    api.post(`/marketing/events/${data.id}/track`, { type: 'click' }).catch(() => {});
    
    const ctaLink = data.cta_config?.link;
    if (ctaLink) {
      if (ctaLink.startsWith('http')) {
        window.open(ctaLink, '_blank');
      } else {
        navigate(ctaLink);
      }
    } else {
      navigate(`/su-kien/${data.slug}`);
    }
    handleClose();
  };

  return (
    <div className={`popup-overlay ${isClosing ? 'popup-overlay--closing' : ''}`} onClick={handleClose}>
      <div className={`popup-card ${isClosing ? 'popup-card--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-btn" onClick={handleClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className="popup-image-wrap" onClick={handleAction}>
          <img 
            src={data.thumbnail?.startsWith('http') 
              ? data.thumbnail 
              : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${data.thumbnail}`} 
            alt={data.title} 
            className="popup-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x400?text=Event+Image';
            }}
          />
          <div className="popup-image-hint">
            Nhấn để xem chi tiết
          </div>
        </div>

        <div className="popup-content">
          <div className="popup-badge-row">
            <span className={`popup-badge popup-badge--${data.event_type}`}>
              {data.event_type === 'event' ? 'Sự kiện' : 
               data.event_type === 'promotion' ? 'Khuyến mãi' : 
               data.event_type === 'news' ? 'Tin tức' : 'Thông báo'}
            </span>
          </div>

          <h2 className="popup-title">
            {data.title}
          </h2>
                    
          {data.description && (
            <p className="popup-desc">
              {data.description}
            </p>
          )}

          <div className="popup-meta">
            <span className="popup-meta__item">
              <FaIcons.FaCalendarAlt className="popup-meta__icon" />
              {new Date(data.start_date).toLocaleDateString('vi-VN')}
            </span>
            {data.location && (
              <span className="popup-meta__item">
                <FaIcons.FaMapMarkerAlt className="popup-meta__icon popup-meta__icon--red" />
                {data.location}
              </span>
            )}
          </div>

          <button className="popup-cta-btn" onClick={handleAction}>
            {data.cta_config?.text || 'Xem chi tiết'}
            <span className="popup-cta-btn__arrow">→</span>
          </button>

          <button className="popup-close-text" onClick={handleClose}>
            Đóng thông báo
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPopup;