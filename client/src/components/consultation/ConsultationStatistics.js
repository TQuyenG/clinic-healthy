// client/src/components/consultation/ConsultationStatistics.js
import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { 
  FaChartBar, 
  FaUserMd, 
  FaUser, 
  FaCalendarAlt, 
  FaDollarSign, 
  FaStar, 
  FaPercentage, 
  FaExclamationTriangle 
} from 'react-icons/fa';
import './ConsultationStatistics.css'; // Import file CSS mới

export const ConsultationStatistics = () => {
  // --- LOGIC (GIỮ NGUYÊN) ---
  const [overview, setOverview] = useState(null);
  const [doctorStats, setDoctorStats] = useState([]);
  const [patientStats, setPatientStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStatistics();
  }, [activeTab]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const response = await consultationService.getSystemStatisticsOverview();
        if (response.data.success) {
          setOverview(response.data.data);
        }
      } else if (activeTab === 'doctors') {
        const response = await consultationService.getDoctorStatistics();
        if (response.data.success) {
          setDoctorStats(response.data.data.doctors);
        }
      } else if (activeTab === 'patients') {
        const response = await consultationService.getPatientStatistics();
        if (response.data.success) {
          setPatientStats(response.data.data.patients);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };
  // --- KẾT THÚC LOGIC ---

  // Component phụ cho biểu đồ thanh
  const StatBarChart = ({ title, data, dataKey, dataLabel }) => (
    <div className="consultation-statistics-chart-container">
      <h4 className="consultation-statistics-chart-title">{title}</h4>
      <div className="consultation-statistics-chart-bars-wrapper">
        {data.length > 0 ? data.map((item) => {
          // Tính % (giả sử tổng là 100 hoặc tìm max)
          const maxValue = Math.max(...data.map(d => d.count), 1);
          const percent = (item.count / maxValue) * 100;
          return (
            <div key={item[dataKey]} className="consultation-statistics-chart-bar-item">
              <span className="consultation-statistics-chart-bar-label">
                {item[dataLabel]}
              </span>
              <div className="consultation-statistics-chart-bar-bg">
                <div 
                  className="consultation-statistics-chart-bar-fg" 
                  style={{ width: `${percent}%` }}
                >
                  {item.count}
                </div>
              </div>
            </div>
          );
        }) : <p className="consultation-statistics-no-data-small">Không có dữ liệu</p>}
      </div>
    </div>
  );

  // JSX (ĐÃ VIẾT LẠI VỚI CSS MỚI)
  return (
    <div className="consultation-statistics-container">
      <div className="consultation-statistics-tabs-nav">
        <button 
          className={`consultation-statistics-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartBar /> Tổng quan
        </button>
        <button 
          className={`consultation-statistics-tab-button ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          <FaUserMd /> Theo bác sĩ
        </button>
        <button 
          className={`consultation-statistics-tab-button ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          <FaUser /> Theo bệnh nhân
        </button>
      </div>

      {loading ? (
        <div className="consultation-statistics-message-box loading">
          <div className="consultation-statistics-spinner"></div>
          Đang tải thống kê...
        </div>
      ) : (
        <div className="consultation-statistics-content-area">
          
          {/* === Tab Tổng quan === */}
          {activeTab === 'overview' && overview && (
            <div className="consultation-statistics-overview-tab">
              {/* Thẻ thống kê */}
              <div className="consultation-statistics-stat-card-grid">
                <div className="consultation-statistics-stat-card">
                  <FaCalendarAlt className="consultation-statistics-stat-card-icon" style={{color: '#3498db'}} />
                  <div className="consultation-statistics-stat-card-info">
                    <p className="consultation-statistics-stat-card-label">Tổng tư vấn</p>
                    <h3 className="consultation-statistics-stat-card-number">{overview.total_consultations}</h3>
                  </div>
                </div>
                <div className="consultation-statistics-stat-card">
                  <FaDollarSign className="consultation-statistics-stat-card-icon" style={{color: '#2ecc71'}} />
                  <div className="consultation-statistics-stat-card-info">
                    <p className="consultation-statistics-stat-card-label">Doanh thu</p>
                    <h3 className="consultation-statistics-stat-card-number">{overview.total_revenue?.toLocaleString()}đ</h3>
                  </div>
                </div>
                <div className="consultation-statistics-stat-card">
                  <FaStar className="consultation-statistics-stat-card-icon" style={{color: '#f1c40f'}} />
                  <div className="consultation-statistics-stat-card-info">
                    <p className="consultation-statistics-stat-card-label">Đánh giá TB</p>
                    <h3 className="consultation-statistics-stat-card-number">{overview.avg_rating} ⭐</h3>
                  </div>
                </div>
                <div className="consultation-statistics-stat-card">
                  <FaPercentage className="consultation-statistics-stat-card-icon" style={{color: '#e74c3c'}} />
                  <div className="consultation-statistics-stat-card-info">
                    <p className="consultation-statistics-stat-card-label">Tỷ lệ hoàn tiền</p>
                    <h3 className="consultation-statistics-stat-card-number">{overview.refund_rate}%</h3>
                  </div>
                </div>
              </div>

              {/* Biểu đồ */}
              <div className="consultation-statistics-charts-grid">
                <StatBarChart
                  title="Theo trạng thái"
                  data={overview.by_status || []}
                  dataKey="status"
                  dataLabel="status"
                />
                <StatBarChart
                  title="Theo loại"
                  data={overview.by_type || []}
                  dataKey="consultation_type"
                  dataLabel="consultation_type"
                />
              </div>
            </div>
          )}

          {/* === Tab Bác sĩ === */}
          {activeTab === 'doctors' && (
            <div className="consultation-statistics-table-container">
              <table className="consultation-statistics-table">
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Tổng tư vấn</th>
                    <th>Hoàn thành</th>
                    <th>Tỷ lệ (HT)</th>
                    <th>Đánh giá TB</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorStats.length > 0 ? doctorStats.map((stat) => (
                    <tr key={stat.doctor.id}>
                      <td>
                        <div className="consultation-statistics-table-cell-user">
                          <img src={stat.doctor.avatar_url || '/default-avatar.png'} alt={stat.doctor.full_name} />
                          <div className="consultation-statistics-table-cell-user-info">
                            <span className="consultation-statistics-table-cell-name">{stat.doctor.full_name}</span>
                            <span className="consultation-statistics-table-cell-subtext">
                              {stat.doctor.Doctor?.specialty?.name || 'Chưa cập nhật'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Tổng tư vấn">{stat.total_consultations}</td>
                      <td data-label="Hoàn thành">{stat.completed}</td>
                      <td data-label="Tỷ lệ (HT)">{stat.completion_rate}%</td>
                      <td data-label="Đánh giá TB">
                        <span className="consultation-statistics-table-cell-rating">
                          <FaStar /> {stat.avg_rating} 
                          <span className="consultation-statistics-table-cell-subtext">({stat.total_reviews} reviews)</span>
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="consultation-statistics-no-data-cell">Không có dữ liệu bác sĩ.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* === Tab Bệnh nhân === */}
          {activeTab === 'patients' && (
            <div className="consultation-statistics-table-container">
              <table className="consultation-statistics-table">
                <thead>
                  <tr>
                    <th>Bệnh nhân</th>
                    <th>Số buổi tư vấn</th>
                    <th>Gói phổ biến</th>
                    <th>Tổng chi tiêu</th>
                  </tr>
                </thead>
                <tbody>
                  {patientStats.length > 0 ? patientStats.map((stat) => (
                    <tr key={stat.patient_id}>
                      <td>
                        <div className="consultation-statistics-table-cell-user">
                          <div className="consultation-statistics-table-cell-user-info">
                            <span className="consultation-statistics-table-cell-name">{stat.patient?.full_name}</span>
                            <span className="consultation-statistics-table-cell-subtext">
                              {stat.patient?.email || stat.patient?.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Số tư vấn">{stat.total_consultations}</td>
                      <td data-label="Gói phổ biến">{stat.most_used_package}</td>
                      <td data-label="Tổng chi tiêu" className="consultation-statistics-table-cell-amount">
                        {stat.total_spent?.toLocaleString()}đ
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="consultation-statistics-no-data-cell">Không có dữ liệu bệnh nhân.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};