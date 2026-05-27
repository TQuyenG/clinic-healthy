// EventStatisticsPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaEye, FaMouse, FaChartLine, FaTrophy } from 'react-icons/fa';
import './EventStatisticsPage.css';

const typeLabels = {
  event: 'Sự kiện',
  promotion: 'Khuyến mãi',
  news: 'Tin tức',
  notification: 'Thông báo'
};

const EventStatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async (range) => {
    setLoading(true);
    try {
      const params = (range || dateRange).start_date && (range || dateRange).end_date ? (range || dateRange) : {};
      const response = await api.get('/marketing/events/stats', { params });
      if (response.data.success) setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchStats(dateRange);
  };

  const handleReset = () => {
    const cleared = { start_date: '', end_date: '' };
    setDateRange(cleared);
    fetchStats(cleared);
  };

  const getRankClass = (index) => {
    if (index === 0) return 'esp-rank--1';
    if (index === 1) return 'esp-rank--2';
    if (index === 2) return 'esp-rank--3';
    return 'esp-rank--other';
  };

  if (loading) return <div className="esp-loading">Đang tải thống kê...</div>;
  if (!stats) return <div className="esp-error">Không thể tải dữ liệu thống kê</div>;

  return (
    <div className="esp-page">
      <h1 className="esp-page__title">Thống kê Sự kiện & Tiếp thị</h1>

      {/* Filter */}
      <div className="esp-filter">
        <form onSubmit={handleFilterSubmit}>
          <div className="esp-filter__row">
            <input
              className="esp-filter__input"
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            />
            <span className="esp-filter__sep">đến</span>
            <input
              className="esp-filter__input"
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            />
            <button type="submit" className="esp-filter__btn esp-filter__btn--primary">Lọc</button>
            <button type="button" className="esp-filter__btn esp-filter__btn--reset" onClick={handleReset}>
              Xóa bộ lọc
            </button>
          </div>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="esp-stats-grid">
        <div className="esp-stat-card">
          <div className="esp-stat-card__icon esp-stat-card__icon--blue">
            <FaChartLine />
          </div>
          <div>
            <div className="esp-stat-card__label">Tổng sự kiện</div>
            <div className="esp-stat-card__number">{stats.total_events}</div>
            <div className="esp-stat-card__sub">{stats.active_events} đang hoạt động</div>
          </div>
        </div>

        <div className="esp-stat-card">
          <div className="esp-stat-card__icon esp-stat-card__icon--green">
            <FaEye />
          </div>
          <div>
            <div className="esp-stat-card__label">Tổng lượt xem</div>
            <div className="esp-stat-card__number">{stats.total_views.toLocaleString()}</div>
            <div className="esp-stat-card__sub">Trên tất cả sự kiện</div>
          </div>
        </div>

        <div className="esp-stat-card">
          <div className="esp-stat-card__icon esp-stat-card__icon--amber">
            <FaMouse />
          </div>
          <div>
            <div className="esp-stat-card__label">Tổng lượt click</div>
            <div className="esp-stat-card__number">{stats.total_clicks.toLocaleString()}</div>
            <div className="esp-stat-card__sub">Click vào CTA</div>
          </div>
        </div>

        <div className="esp-stat-card">
          <div className="esp-stat-card__icon esp-stat-card__icon--purple">
            <FaTrophy />
          </div>
          <div>
            <div className="esp-stat-card__label">Tỷ lệ CTR</div>
            <div className="esp-stat-card__number">{stats.avg_ctr}</div>
            <div className="esp-stat-card__sub">Click-through Rate</div>
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      {stats.top_events && stats.top_events.length > 0 && (
        <div className="esp-top-section" style={{ marginBottom: 16 }}>
          <div className="esp-top-section__title">Phân bổ lượt xem theo loại sự kiện</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(
              stats.top_events.reduce((acc, e) => {
                acc[e.event_type] = (acc[e.event_type] || 0) + e.views;
                return acc;
              }, {})
            ).map(([type, views]) => {
              const typeColor = { event: '#16a34a', promotion: '#d97706', news: '#2563eb', notification: '#7c3aed' };
              const typeLabel = { event: 'Sự kiện', promotion: 'Khuyến mãi', news: 'Tin tức', notification: 'Thông báo' };
              const pct = stats.total_views > 0 ? Math.round((views / stats.total_views) * 100) : 0;
              return (
                <div key={type} style={{ flex: '1 1 160px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: typeColor[type] || '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>{typeLabel[type] || type}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: 6 }}>{views.toLocaleString()}</div>
                  <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: typeColor[type] || '#6b7280', borderRadius: 4, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 4 }}>{pct}% tổng lượt xem</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTR Overview */}
      <div className="esp-top-section" style={{ marginBottom: 16 }}>
        <div className="esp-top-section__title">Tổng quan hiệu suất</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Views trung bình/sự kiện', value: stats.total_events > 0 ? Math.round(stats.total_views / stats.total_events).toLocaleString() : '0', color: '#16a34a' },
            { label: 'Clicks trung bình/sự kiện', value: stats.total_events > 0 ? Math.round(stats.total_clicks / stats.total_events).toLocaleString() : '0', color: '#2563eb' },
            { label: 'CTR tổng thể', value: stats.avg_ctr, color: '#d97706' },
            { label: 'Tỷ lệ sự kiện đang hoạt động', value: stats.total_events > 0 ? Math.round((stats.active_events / stats.total_events) * 100) + '%' : '0%', color: '#7c3aed' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: '1 1 160px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Events */}
      <div className="esp-top-section">
        <div className="esp-top-section__title">Top 5 Sự kiện hiệu quả nhất</div>
        <div className="esp-top-table-wrap">
          <table className="esp-top-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Lượt xem</th>
                <th>Lượt click</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_events.map((event, index) => (
                <tr key={event.id}>
                  <td>
                    <span className={`esp-rank ${getRankClass(index)}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td><strong>{event.title}</strong></td>
                  <td>
                    <span className={`esp-type-badge esp-type-badge--${event.event_type}`}>
                      {typeLabels[event.event_type] || event.event_type}
                    </span>
                  </td>
                  <td>{event.views.toLocaleString()}</td>
                  <td>{event.clicks.toLocaleString()}</td>
                  <td>
                    <strong>
                      {event.views > 0
                        ? ((event.clicks / event.views) * 100).toFixed(2) + '%'
                        : '0%'}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventStatisticsPage;