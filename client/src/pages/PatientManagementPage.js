import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaEye, FaFilter, FaSearch, FaTimes, FaUserFriends, FaSync } from 'react-icons/fa';
import appointmentService from '../services/appointmentService';
import consultationService from '../services/consultationService';
import userService from '../services/userService';
import './PatientManagementPage.css';

const PatientManagementPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ keyword: '', is_active: '', is_verified: '', sort: 'name' });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientMeta, setPatientMeta] = useState({});

  useEffect(() => {
    fetchPatients();
  }, [pagination.page, pagination.limit, filters]);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      const params = {
        role: 'patient',
        page: pagination.page,
        limit: pagination.limit,
        keyword: filters.keyword,
        is_active: filters.is_active
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const [patientsResponse, consultationResponse, appointmentResponse] = await Promise.all([
        userService.searchUsers(params),
        consultationService.getPatientStatisticsAdmin({ page: 1, limit: 500 }),
        appointmentService.getAllAppointments({ page: 1, limit: 5000 })
      ]);

      const userRows = patientsResponse.data.users || [];
      const consultationRows = consultationResponse.data.data?.patients || [];
      const appointmentRows = appointmentResponse.data.data || [];

      const appointmentMap = new Map();
      appointmentRows.forEach((appointment) => {
        const patientUser = appointment?.Patient?.User || appointment?.Patient?.user || appointment?.patient?.User || appointment?.patient?.user;
        if (!patientUser?.id) return;

        const current = appointmentMap.get(patientUser.id) || { totalAppointments: 0, lastAppointment: null, lastServiceName: '' };
        current.totalAppointments += 1;

        const appointmentDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null;
        if (appointmentDate && (!current.lastAppointment || appointmentDate > current.lastAppointment)) {
          current.lastAppointment = appointmentDate;
          current.lastServiceName = appointment?.Service?.name || appointment?.service_name || 'Khám thường';
        }

        appointmentMap.set(patientUser.id, current);
      });

      const consultationMap = new Map();
      consultationRows.forEach((item) => {
        const patientId = Number(item.patient_id);
        consultationMap.set(patientId, {
          totalConsultations: Number(item.total_consultations) || 0,
          totalSpent: Number(item.total_spent) || 0,
          mostUsedPackage: item.most_used_package || 'Chưa có dữ liệu'
        });
      });

      const mergedPatients = userRows.map((patient) => {
        const consultationInfo = consultationMap.get(Number(patient.id)) || {};
        const appointmentInfo = appointmentMap.get(Number(patient.id)) || {};
        const patientCode = patient.code || patient.Patient?.code || '';

        return {
          ...patient,
          patientCode,
          totalAppointments: appointmentInfo.totalAppointments || 0,
          lastAppointment: appointmentInfo.lastAppointment,
          lastServiceName: appointmentInfo.lastServiceName || 'Chưa có dữ liệu',
          totalConsultations: consultationInfo.totalConsultations || 0,
          totalSpent: consultationInfo.totalSpent || 0,
          mostUsedPackage: consultationInfo.mostUsedPackage || 'Chưa có dữ liệu'
        };
      });

      setPatients(mergedPatients);
      setPagination((prev) => ({
        ...prev,
        total: patientsResponse.data.total || 0,
        totalPages: patientsResponse.data.totalPages || 0
      }));

      setPatientMeta({
        totalAppointments: appointmentRows.filter((appointment) => {
          const patientUser = appointment?.Patient?.User || appointment?.Patient?.user || appointment?.patient?.User || appointment?.patient?.user;
          return !!patientUser?.id;
        }).length,
        totalConsultations: consultationRows.reduce((sum, item) => sum + (Number(item.total_consultations) || 0), 0)
      });
    } catch (error) {
      console.error('Lỗi tải danh sách bệnh nhân:', error);
      toast.error('Không thể tải danh sách bệnh nhân');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

      const summary = useMemo(() => {
        const active = patients.filter((patient) => patient.is_active).length;
        const verified = patients.filter((patient) => patient.is_verified).length;
        const appointments = patientMeta.totalAppointments || 0;
        const consultations = patientMeta.totalConsultations || 0;
        return {
          total: pagination.total || patients.length,
          active,
          verified,
          allSchedules: appointments + consultations
        };
      }, [patients, pagination.total, patientMeta]);

  const handlePageChange = (nextPage) => {
    setPagination((prev) => ({ ...prev, page: nextPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters({ keyword: '', is_active: '', is_verified: '', sort: 'name' });
  };

  const openDetail = async (patient) => {
    try {
      const response = await userService.getUserById(patient.id);
      if (response.data.success) {
        setSelectedPatient({ ...response.data.user, ...patient });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết bệnh nhân:', error);
      toast.error('Không thể tải chi tiết bệnh nhân');
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="patient-management-page">
      <div className="patient-management-page__header">
        <h1 className="patient-management-page__title"><FaUserFriends /> Danh sách bệnh nhân</h1>
        <div className="patient-management-page__header-actions">
          <button className="patient-management-page__button patient-management-page__button-secondary" onClick={() => { setPagination((prev) => ({ ...prev, page: 1 })); fetchPatients(); }} title="Làm mới">
            <FaSync /> Làm mới
          </button>
        </div>
      </div>

      <div className="patient-management-page__summary-grid">
        <div className="patient-management-page__summary-card"><span>Tổng bệnh nhân</span><strong>{summary.total}</strong></div>
        <div className="patient-management-page__summary-card"><span>Hoạt động</span><strong>{summary.active}</strong></div>
        <div className="patient-management-page__summary-card"><span>Đã xác thực</span><strong>{summary.verified}</strong></div>
        <div className="patient-management-page__summary-card"><span>Lịch hẹn</span><strong>{summary.allSchedules}</strong></div>
      </div>

      <div className="patient-management-page__toolbar">
        <div className="patient-management-page__search">
          <FaSearch />
          <input
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            placeholder="Tìm theo tên, email, số điện thoại hoặc mã bệnh nhân"
          />
        </div>
        <div className="patient-management-page__filters">
          <div className="patient-management-page__filter">
            <FaFilter />
            <select value={filters.is_active} onChange={(event) => setFilters((prev) => ({ ...prev, is_active: event.target.value, page: 1 }))}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </div>
          <div className="patient-management-page__filter">
            <FaFilter />
            <select value={filters.is_verified} onChange={(event) => setFilters((prev) => ({ ...prev, is_verified: event.target.value, page: 1 }))}>
              <option value="">Tất cả xác thực</option>
              <option value="true">Đã xác thực</option>
              <option value="false">Chưa xác thực</option>
            </select>
          </div>
          <div className="patient-management-page__filter">
            <FaFilter />
            <select value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value, page: 1 }))}>
              <option value="name">Tên (A-Z)</option>
              <option value="newest">Mới nhất</option>
              <option value="recent">Gần đây nhất</option>
            </select>
          </div>
          <button className="patient-management-page__reset" onClick={resetFilters}>Xóa lọc</button>
        </div>
      </div>

      <div className="patient-management-page__table-shell">
        {loading ? (
          <div className="patient-management-page__state">Đang tải danh sách bệnh nhân...</div>
        ) : patients.length === 0 ? (
          <div className="patient-management-page__state">
            <FaUserFriends />
            <h3>Không tìm thấy bệnh nhân</h3>
            <p>Hãy đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <table className="patient-management-page__table">
            <thead>
              <tr>
                <th>Bệnh nhân</th>
                <th>Mã</th>
                <th>Lịch hẹn</th>
                <th>Gói phổ biến</th>
                <th>Lần hẹn gần nhất</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="patient-management-page__person">
                      <img src={patient.avatar_url || 'https://via.placeholder.com/120?text=Patient'} alt={patient.full_name} onError={(event) => { event.currentTarget.src = 'https://via.placeholder.com/120?text=Patient'; }} />
                      <div>
                        <strong>{patient.full_name}</strong>
                        <span>{patient.email}</span>
                        <span>{patient.phone || 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{patient.patientCode || patient.code || 'Chưa có'}</td>
                  <td>{(patient.totalAppointments || 0) + (patient.totalConsultations || 0)}</td>
                  <td>{patient.mostUsedPackage || 'Chưa có dữ liệu'}</td>
                  <td>
                    <div className="patient-management-page__stack">
                      <strong>{formatDate(patient.lastAppointment)}</strong>
                      <span>{patient.lastServiceName || 'Chưa có dữ liệu'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`patient-management-page__badge patient-management-page__badge--${patient.is_active ? 'active' : 'inactive'}`}>
                      {patient.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <button className="patient-management-page__action" onClick={() => openDetail(patient)}><FaEye /> Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="patient-management-page__pagination">
          <button disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>Trước</button>
          <span>Trang {pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>Sau</button>
        </div>
      )}

      {showDetailModal && selectedPatient && (
        <div className="patient-management-page__modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="patient-management-page__modal" onClick={(event) => event.stopPropagation()}>
            <div className="patient-management-page__modal-header">
              <h3>Chi tiết bệnh nhân</h3>
              <button onClick={() => setShowDetailModal(false)}><FaTimes /></button>
            </div>
            <div className="patient-management-page__detail-grid">
              <div><span>Họ tên</span><strong>{selectedPatient.full_name}</strong></div>
              <div><span>Email</span><strong>{selectedPatient.email}</strong></div>
              <div><span>Điện thoại</span><strong>{selectedPatient.phone || 'Chưa cập nhật'}</strong></div>
              <div><span>Giới tính</span><strong>{selectedPatient.gender || 'Chưa cập nhật'}</strong></div>
              <div><span>Mã bệnh nhân</span><strong>{selectedPatient.patientCode || selectedPatient.code || 'Chưa có'}</strong></div>
              <div><span>Lịch hẹn</span><strong>{(selectedPatient.totalAppointments || 0) + (selectedPatient.totalConsultations || 0)}</strong></div>
              <div><span>Gói phổ biến</span><strong>{selectedPatient.mostUsedPackage || 'Chưa có dữ liệu'}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagementPage;