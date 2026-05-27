// client/src/components/ForumBanner.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaStar, FaPhoneAlt, FaHospital } from 'react-icons/fa';
import './ForumBanner.css';

const ForumBanner = () => {
  const [overview, setOverview] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    topicCount: 0,
  });

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/forum/stats/overview');
        if (res.data && res.data.data) {
          setOverview(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching forum overview:', error);
        setOverview({ totalQuestions: 0, totalAnswers: 0, topicCount: 0 });
      }
    };
    fetchOverview();
  }, []);

  return (
    <header className="ForumBanner">
      <div className="ForumBanner-bg"></div>
      <div className="ForumBanner-inner">
        <div className="ForumBanner-content">
          <div className="ForumBanner-brand">
            <FaStar color="#FFC107" /> Cộng đồng đã kiểm duyệt
          </div>
          <h1 className="ForumBanner-title">Diễn đàn sức khỏe</h1>
          <p className="ForumBanner-desc">
            Hỏi đáp cùng cộng đồng, kết nối bác sĩ – bệnh nhân và lan tỏa kiến thức y khoa.
          </p>
          <div className="ForumBanner-stats-row">
            <div className="ForumBanner-stat-box">
              <span className="ForumBanner-stat-val">{overview.totalQuestions}</span>
              <span className="ForumBanner-stat-lbl">Câu hỏi</span>
            </div>
            <div className="ForumBanner-stat-box">
              <span className="ForumBanner-stat-val">{overview.totalAnswers}</span>
              <span className="ForumBanner-stat-lbl">Bình luận</span>
            </div>
            <div className="ForumBanner-stat-box">
              <span className="ForumBanner-stat-val">{overview.topicCount}</span>
              <span className="ForumBanner-stat-lbl">Chủ đề</span>
            </div>
          </div>
        </div>

        {/* Action Box Right */}
        <div className="ForumBanner-actions">
          <div className="ForumBanner-action-card">
            <FaPhoneAlt size={20} />
            <div>
              <span className="ForumBanner-action-label">HOTLINE HỖ TRỢ</span>
              <strong className="ForumBanner-action-value">1900 6868</strong>
            </div>
          </div>
          <div className="ForumBanner-action-card">
            <FaHospital size={20} />
            <div>
              <span className="ForumBanner-action-label">TƯ VẤN BÁC SĨ</span>
              <strong className="ForumBanner-action-value">Trực tuyến 24/7</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ForumBanner;
