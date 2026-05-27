// client/src/pages/ScheduleManagementPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (Lần 8)
// 1. (FIX) Sửa logic đếm Badge để CHỈ đếm 'pending'
// 2. Thêm state và hàm riêng để tải số lượng 'pending'

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Select from 'react-select'; 

// Components chính
import CalendarView from '../components/schedule/CalendarView';
import ScheduleTableView from '../components/schedule/ScheduleTableView'; 

// Components cho Tab Phê duyệt
import PendingLeaveTable from '../components/schedule/PendingLeaveTable';
import LeaveDetailModal from '../components/schedule/LeaveDetailModal';
import ConfirmationModal from '../components/schedule/ConfirmationModal';
import ScheduleApprovalTable from '../components/schedule/ScheduleApprovalTable';
import OvertimeApprovalTable from '../components/schedule/OvertimeApprovalTable';
import OvertimeEditor from '../components/schedule/OvertimeEditor'; 

import './ScheduleManagementPage.css'; 

// === IMPORT ICONS ===
import { 
  FaCog, 
  FaUserMd, 
  FaCheck, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight, 
  FaSpinner, 
  FaUserNurse, 
  FaUsers,
  FaTasks,
  FaCalendarDay, 
  FaCalendarWeek, 
  FaCalendarAlt, 
  FaList, 
  FaUserClock, 
  FaExclamationTriangle,
  FaBusinessTime,
  FaClock,
  FaArchive, 
  FaExclamationCircle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaUmbrellaBeach 
} from 'react-icons/fa';
import { MdOutlineErrorOutline } from "react-icons/md";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// DEBUG: Log imported components to detect undefined imports causing runtime errors
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('DEBUG Imports:', {
    CalendarView: typeof CalendarView,
    ScheduleTableView: typeof ScheduleTableView,
    PendingLeaveTable: typeof PendingLeaveTable,
    LeaveDetailModal: typeof LeaveDetailModal,
    ConfirmationModal: typeof ConfirmationModal,
    ScheduleApprovalTable: typeof ScheduleApprovalTable,
    OvertimeApprovalTable: typeof OvertimeApprovalTable,
    OvertimeEditor: typeof OvertimeEditor
  });
}

// (Helpers getWeekRange, getMonthRange, formatDateISO giữ nguyên)
const getWeekRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
  // Align with CalendarView.getWeekDays(): Monday of the current week.
  const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
};
const getMonthRange = (date) => {
   const start = new Date(date.getFullYear(), date.getMonth(), 1);
   const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
   end.setHours(23,59,59,999);
   return { start, end };
};
const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getAppointmentKind = (appointment = {}) => {
  const rawType = String(appointment.appointment_type || appointment.type || '').toLowerCase();
  if (appointment.is_consultation || rawType.includes('consult')) return 'consultation';
  if (rawType.includes('service') || appointment.service_id || appointment.service_name) return 'service';
  return 'service';
};

const normalizeAppointmentForFilter = (appointment = {}) => ({
  ...appointment,
  appointment_kind: getAppointmentKind(appointment)
});

const ScheduleManagementPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userStaffInfo, setUserStaffInfo] = useState(null); // Thông tin staff nếu là staff
  const [activeTab, setActiveTab] = useState('doctor-schedule');
  const [workShiftConfig, setWorkShiftConfig] = useState([]); 
  const [visibleWeekStart, setVisibleWeekStart] = useState(null);
  
  // State cho danh sách
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [staffList, setStaffList] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  
  // State cho lịch (Quản lý đa lựa chọn)
  const [selectedUsers, setSelectedUsers] = useState([]); 
  const [allCalendarData, setAllCalendarData] = useState({
    schedules: [],
    overtime_schedules: [],
    leaves: [],
    appointments: []
  }); 

  const [eventTypeFilters, setEventTypeFilters] = useState({
    schedules: true,
    overtime: true,
    leaves: true,
    appointmentService: true,
    appointmentConsultation: true
  });

  // State quản lý hiển thị lịch
  const [viewMode, setViewMode] = useState('week'); 
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // State cho Tab 4 (Quản lý đơn)
  const [activeSubTab, setActiveSubTab] = useState('leaves'); 
  const [leaveRequests, setLeaveRequests] = useState([]); 
  const [pendingRegistrations, setPendingRegistrations] = useState([]); 
  const [pendingOvertimes, setPendingOvertimes] = useState([]); 
  
  // (MỚI) State riêng cho đếm badge
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [pendingOvertimeCount, setPendingOvertimeCount] = useState(0);

  // State cho Filter (Dùng chung cho cả 3 tab con)
  const [userTypeFilter, setUserTypeFilter] = useState('all'); 
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('pending');

  // Quyền xem lịch bác sĩ (nếu permissions được lưu trong user object)
  const hasViewDoctorPerm = useMemo(() => {
    if (!user) return false;
    const perms = user.role_info?.permissions || user.staff?.permissions || {};
    const workShiftPerm = perms.work_shift;
    if (workShiftPerm === true) return true;
    if (Array.isArray(workShiftPerm)) return workShiftPerm.includes('view_doctors') || workShiftPerm.includes('view_doctor_schedule');
    if (typeof workShiftPerm === 'object') return workShiftPerm.view_doctors || workShiftPerm.view_doctor_schedule;
    return false;
  }, [user]);

  // --- BẮT ĐẦU THÊM MỚI: KIỂM TRA QUYỀN PHÊ DUYỆT ---
  const canApprove = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = user.role_info?.permissions || user.staff?.permissions || {};
    const ws = perms.work_shift;
    if (ws === true) return true;
    if (Array.isArray(ws)) return ws.includes('approve_shift') || ws.includes('approve_leave') || ws.includes('approve_overtime');
    if (typeof ws === 'object') return ws.approve_shift || ws.approve_leave || ws.approve_overtime;
    return false;
  }, [user]);
  // --- KẾT THÚC THÊM MỚI ---
  
  // State cho Tìm kiếm
  const [leaveSearch, setLeaveSearch] = useState('');
  const [flexibleSearch, setFlexibleSearch] = useState(''); 
  const [overtimeSearch, setOvertimeSearch] = useState(''); 

  // (State Modal Đơn Nghỉ)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // (State Modal Tăng Ca)
  const [showOvertimeEditor, setShowOvertimeEditor] = useState(false);
  const [selectedUserForOvertime, setSelectedUserForOvertime] = useState(null);

  const [loading, setLoading] = useState({
    config: false,
    users: false, 
    leaves: false, 
    registrations: false, 
    overtimes: false, 
    schedules: false, 
    submit: false
  });

  // ========== INIT ==========
  useEffect(() => {
    const init = async () => {
      // (Load user)
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) { toast.error('Vui lòng đăng nhập'); return; }
      try {
        const userData = JSON.parse(userStr);
        if (userData.role !== 'admin' && userData.role !== 'staff') { toast.error('Bạn không có quyền truy cập trang này'); return; }
        setUser(userData);
        
        // Load thông tin staff nếu là staff
        if (userData.role === 'staff') {
          await loadUserStaffInfo(userData.id);
        }
        
        // Tải dữ liệu
        loadWorkShiftConfig();
  // Tải danh sách chuyên khoa (dùng để lọc chọn bác sĩ)
  loadSpecialties();
        
        // Chỉ load bác sĩ nếu admin hoặc trưởng phòng hoặc được cấp quyền 'view_doctor_schedule'
        // Kiểm tra permissions được lưu trong localStorage.user (role_info.permissions || staff.permissions)
        const storedUserStr = localStorage.getItem('user');
        let hasViewDoctorPerm = false;
        try {
          const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
          const perms = storedUser.role_info?.permissions || storedUser.staff?.permissions || {};
          const workShiftPerm = perms.work_shift;
          if (workShiftPerm === true) {
            hasViewDoctorPerm = true;
          } else if (Array.isArray(workShiftPerm) && workShiftPerm.includes('view_doctor_schedule')) {
            hasViewDoctorPerm = true;
          } else if (workShiftPerm && typeof workShiftPerm === 'object' && workShiftPerm.view_doctor_schedule) {
            hasViewDoctorPerm = true;
          }
        } catch (err) {
          console.error('Error parsing stored user for permissions', err);
        }

        // Doctors được load trong loadDropdownData() bên dưới (tránh duplicate + race condition)

        // (Xử lý link highlight từ thông báo)
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const dateParam = params.get('date');
        if (tab === 'manage-registrations') {
          setActiveTab('manage-registrations');
          const subTab = params.get('sub_tab');
          if (subTab) setActiveSubTab(subTab);
        }

        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
          const targetDate = new Date(`${dateParam}T00:00:00`);
          if (!Number.isNaN(targetDate.getTime())) {
            setCurrentDate(targetDate);
            setViewMode('day');
          }
        }
        
      } catch (error) { console.error('Parse user error:', error); }
    };
    
    init();
  }, []);
  
  // (Gộp doctors và staff)
  useEffect(() => {
    // Tạo danh sách đầy đủ cho Admin chọn
    const all = [
      ...doctors.map(d => ({ ...d, label: `(BS) ${d.full_name}` })),
      ...staffList.map(s => ({ ...s, label: `(NV) ${s.full_name}` }))
    ];
    setAllUsers(all);
  }, [doctors, staffList]); // Thêm dependencies
  
  // Load bác sĩ & nhân viên vào Dropdown theo đúng phân quyền
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!user) return;
      const token = localStorage.getItem('token');
      
      // 1. TẢI DANH SÁCH BÁC SĨ (Cho tab Lịch bác sĩ)
      if (user.role === 'admin' || (user.role === 'staff' && userStaffInfo?.rank === 'manager')) {
        // Admin hoặc Trưởng phòng: Thấy toàn bộ bác sĩ
        try {
          const res = await axios.get(`${API_URL}/users/by-role?role=doctor`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) {
            setDoctors(res.data.users.map(d => ({ ...d, id: d.user_id || d.id, full_name: d.full_name || d.User?.full_name })));
          }
        } catch (e) { console.error(e); }
      } else if (user.role === 'staff' && hasViewDoctorPerm && userStaffInfo?.id) {
        // Staff Lâm sàng: CHỈ thấy bác sĩ do mình được phân công quản lý
        try {
          const res = await axios.get(`${API_URL}/staff/${userStaffInfo.id}/doctors`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) {
            setDoctors(res.data.data.map(d => ({
              id: d.user?.id || d.user_id,
              full_name: d.user?.full_name || d.full_name,
              avatar_url: d.user?.avatar_url,
              specialty: d.specialty
            })));
          }
        } catch (e) { console.error(e); }
      }

      // 2. TẢI DANH SÁCH NHÂN VIÊN (Cho tab Lịch nhân viên)
      if (user.role === 'admin') {
        try {
          const res = await axios.get(`${API_URL}/users/by-role?role=staff`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) setStaffList(res.data.users.map(u => ({ ...u, id: u.id || u.user_id })));
        } catch (e) { console.error(e); }
      } else if (user.role === 'staff' && userStaffInfo?.rank === 'manager') {
        try {
          const res = await axios.get(`${API_URL}/staff/by-department/${userStaffInfo.department}?rank=staff`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) setStaffList(res.data.data.map(s => ({ ...s, id: s.user_id, full_name: s.User?.full_name })));
        } catch (e) { console.error(e); }
      } else if (user.role === 'staff') {
        // CỰC KỲ QUAN TRỌNG: Nhân viên thường tự đưa chính mình vào Dropdown để có thể chọn xem "Lịch cá nhân"
        setStaffList([{
          id: user.id,
          full_name: user.full_name || user.username || 'Lịch cá nhân của tôi',
          avatar_url: user.avatar_url
        }]);
      }
    };

    loadDropdownData();
  }, [user, userStaffInfo, hasViewDoctorPerm]);

  // [REMOVED] Auto-select logic bị lock view để 1 người - backend sẽ load tất cả nếu chưa chọn
  
  // Cập nhật assigned doctors khi doctors list thay đổi - không cần nữa
  // useEffect(() => {
  //   if (user && user.role === 'staff' && userStaffInfo?.department === 'clinical' && doctors.length > 0) {
  //     loadAssignedDoctors(user.id);
  //   }
  // }, [doctors, user, userStaffInfo]);
  
  // Luôn cho phép staff/doctor đăng ký nghỉ, ca, tăng ca (theo logic mới)
  const canRegisterLeaveOrShift = () => {
    if (!user) return false;
    // Admin should always have full access
    return user.role === 'admin' || user.role === 'staff' || user.role === 'doctor';
  } 

  // Tải cấu hình ca làm việc
  const loadWorkShiftConfig = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    
    const defaultShifts = [
      {
        shift_name: 'morning',
        display_name: 'Ca sáng',
        start_time: '07:00:00',
        end_time: '12:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6], 
        is_active: false
      },
      {
        shift_name: 'afternoon',
        display_name: 'Ca chiều',
        start_time: '13:00:00',
        end_time: '17:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6], 
        is_active: false
      },
      {
        shift_name: 'evening',
        display_name: 'Ca tối',
        start_time: '17:00:00',
        end_time: '21:00:00',
        days_of_week: [1, 2, 3, 4, 5],
        is_active: false
      }
    ];

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/work-shifts/config`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        if (response.data.data && response.data.data.length > 0) {
          setWorkShiftConfig(response.data.data);
        } else {
          setWorkShiftConfig(defaultShifts);
          toast.info('Chưa có cấu hình ca. Hiển thị 3 ca mặc định để tạo mới.');
        }
      } else {
        setWorkShiftConfig(defaultShifts);
      }
    } catch (error) {
      console.error('Load work shift config error:', error);
      setWorkShiftConfig(defaultShifts);
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  // Tải danh sách chuyên khoa để dùng cho bộ lọc chọn bác sĩ
  const loadSpecialties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/specialties`, { headers: { Authorization: `Bearer ${token}` } });
      // API có thể trả về { success: true, specialties: [...] } hoặc { data: [...] }
      const data = response.data;
      const list = data?.specialties || data?.data || data || [];
      setSpecialties(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Load specialties error:', error);
      setSpecialties([]);
    }
  };

  // Tải thông tin staff của user hiện tại
  const loadUserStaffInfo = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/staff/my-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUserStaffInfo(response.data.data);
      }
    } catch (error) {
      console.error('Load user staff info error:', error);
    }
  };

  // Tải danh sách staff (có lọc theo department cho trưởng phòng)
  const loadStaffList = async () => {
    setLoading(prev => ({ ...prev, users: true }));
    try {
      const token = localStorage.getItem('token');
      
      if (user.role === 'admin') {
        // Admin: load tất cả staff
        const response = await axios.get(
          `${API_URL}/users/by-role?role=staff`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          const users = response.data.users || [];
          // Normalize staff objects so they always have id, full_name, avatar_url, role
          const normalized = users.map(u => ({
            id: u.id || u.user_id || u.User?.id,
            full_name: u.full_name || u.User?.full_name || u.name || u.User?.fullName,
            email: u.email || u.User?.email,
            avatar_url: u.avatar_url || u.User?.avatar_url || u.avatar || u.User?.avatar,
            role: 'staff',
            raw: u
          }));
          setStaffList(normalized);
        }
      } else if (user.role === 'staff' && userStaffInfo?.department) {
        // Trưởng phòng: chỉ load staff thường (không phải manager) của phòng mình
        const response = await axios.get(
          `${API_URL}/staff/by-department/${userStaffInfo.department}?rank=staff`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          // Chuyển đổi dữ liệu staff thành format giống User
          const formattedStaff = (response.data.data || []).map(staff => ({
            id: staff.user_id,
            full_name: staff.User?.full_name || staff.full_name,
            email: staff.User?.email || staff.email,
            avatar_url: staff.User?.avatar_url || staff.avatar_url,
            role: 'staff',
            department: staff.department,
            rank: staff.rank
          }));
          setStaffList(formattedStaff);
        }
      } else {
        // Staff thường: không load gì cả
        setStaffList([]);
      }
    } catch (error) {
      console.error('Load staff list error:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Tải Lịch (API Hợp Nhất Mới)
  const loadUserCalendarData = async () => {
    setLoading(prev => ({ ...prev, schedules: true }));
    try {
      const token = localStorage.getItem('token');
      const range = (viewMode === 'week' || calendarDisplayMode === 'table')
        ? getWeekRange(currentDate) 
        : getMonthRange(currentDate);
      const effectiveSelectedUsers = activeTab === 'doctor-schedule' ? selectedUsers.slice(0, 1) : selectedUsers;

      const params = new URLSearchParams({
        date_from: formatDateISO(range.start),
        date_to: formatDateISO(range.end)
      });
      
      if (user.role === 'admin') {
        // Admin: only send user_ids when selection exists; otherwise omit to let server return all doctors/staff
        if (effectiveSelectedUsers.length > 0) {
          params.append('user_ids', effectiveSelectedUsers.map(u => u.value).join(','));
          params.append('user_ids_kind', 'user');
        }
      } else if (user.role === 'staff' && (userStaffInfo?.rank === 'manager' || hasViewDoctorPerm)) {
        // Trưởng phòng / staff có quyền: dùng selectedUsers nếu đã chọn
        if (effectiveSelectedUsers.length > 0) {
          params.append('user_ids', effectiveSelectedUsers.map(u => u.value).join(','));
          params.append('user_ids_kind', 'user');
        } else if (activeTab === 'staff-schedule' && staffList.length > 0) {
          // Trưởng phòng xem lịch nhân viên mà chưa chọn: load tất cả staff trong phòng (tối đa 5)
          params.append('user_ids', staffList.slice(0, 5).map(s => s.id).join(','));
          params.append('user_ids_kind', 'user');
        }
        // doctor-schedule không chọn → không gửi user_ids → backend load tất cả doctors
      } else {
        // Staff thường: chỉ xem lịch của chính mình
        params.append('user_ids', user.id);
        params.append('user_ids_kind', 'user');
      }
      
      params.append('types', 'schedules,overtime,leaves,appointments');

      // DEBUG: log request params
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Calendar] API request params:', Object.fromEntries(params));
        console.log('[Calendar] selectedUsers:', selectedUsers);
        console.log('[Calendar] effectiveSelectedUsers values:', effectiveSelectedUsers.map(u => u.value));
      }
      
      const response = await axios.get(
        `${API_URL}/calendar/view?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAllCalendarData(response.data.data);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[Calendar] Response - appointments count:', (response.data.data || {}).appointments?.length, 'appointments:', (response.data.data || {}).appointments?.slice(0,3));
          // eslint-disable-next-line no-console
          console.log('[Calendar] Response - schedules count:', (response.data.data || {}).schedules?.length);
        }
      } else {
        setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
      }

    } catch (error) {
      console.error('Load user calendar data error:', error);
      toast.error('Không thể tải dữ liệu lịch');
      setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
    } finally {
      setLoading(prev => ({ ...prev, schedules: false }));
    }
  };
  
  // Tải lại dữ liệu lịch
  useEffect(() => {
    if (user && activeTab === 'staff-schedule') {
      // Luôn load lịch nhân viên
      loadUserCalendarData();
    } else if (user && activeTab === 'doctor-schedule' && (user.role === 'admin' || user.role === 'doctor' || (user.role === 'staff' && (userStaffInfo?.rank === 'manager' || hasViewDoctorPerm)))) {
      // Load lịch bác sĩ cho admin, bác sĩ, hoặc staff có quyền xem lịch bác sĩ
      loadUserCalendarData();
    }
  }, [selectedUsers, currentDate, viewMode, calendarDisplayMode, activeTab, user, userStaffInfo, staffList, doctors]);


  // Tải dữ liệu cho Tab 4 (Quản lý đơn)
  const loadPendingLeaves = async () => {
    setLoading(prev => ({ ...prev, leaves: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (userTypeFilter !== 'all') params.append('user_type', userTypeFilter);
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(
        `${API_URL}/leave-requests/pending?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setLeaveRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Load leave requests error:', error);
      toast.error('Không thể tải danh sách đơn nghỉ.');
    } finally {
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };
  
  // Tải đăng ký lịch chờ duyệt
  const loadPendingRegistrations = async () => {
    setLoading(prev => ({ ...prev, registrations: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(`${API_URL}/schedules/pending-registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPendingRegistrations(response.data.data || []);
      }
    } catch (error) {
      console.error('Load pending registrations error:', error);
    } finally {
      setLoading(prev => ({ ...prev, registrations: false }));
    }
  };
  
  // Tải tăng ca chờ duyệt
  const loadPendingOvertimes = async () => {
    setLoading(prev => ({ ...prev, overtimes: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', approvalStatusFilter); 

      const response = await axios.get(`${API_URL}/schedules/pending-overtimes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPendingOvertimes(response.data.data || []);
      }
    } catch (error) {
      console.error('Load pending overtimes error:', error);
    } finally {
      setLoading(prev => ({ ...prev, overtimes: false }));
    }
  };
  
  // (MỚI) Hàm tải SỐ LƯỢNG CHỜ DUYỆT (cho badge)
  const loadAllPendingCounts = async () => {
    // SỬA: Chặn không gọi API nếu không phải Admin/Manager hoặc không có quyền Duyệt
    if (!user || !canApprove) {
      setPendingLeaveCount(0);
      setPendingRegCount(0);
      setPendingOvertimeCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const [leavesRes, regRes, otRes] = await Promise.all([
        // Luôn fetch status=pending cho count
        axios.get(`${API_URL}/leave-requests/pending?status=pending`, headers),
        axios.get(`${API_URL}/schedules/pending-registrations?status=pending`, headers),
        axios.get(`${API_URL}/schedules/pending-overtimes?status=pending`, headers)
      ]);
      
      // API Đơn nghỉ (leaveRequestController) trả về .count
      setPendingLeaveCount(leavesRes.data.count || 0); 
      // API Đăng ký (scheduleController) trả về .data (mảng)
      setPendingRegCount(regRes.data.data.length || 0); 
      setPendingOvertimeCount(otRes.data.data.length || 0);
      
    } catch (error) {
      console.error("Lỗi khi tải tổng số chờ duyệt:", error);
      setPendingLeaveCount(0);
      setPendingRegCount(0);
      setPendingOvertimeCount(0);
    }
  };

  // useEffect cho Tab 4 (Load dữ liệu bảng)
  useEffect(() => {
    if (user && activeTab === 'manage-registrations' && (user.role === 'admin' || user.role === 'staff')) {
      // Tải data cho bảng (dựa trên filter)
      if (activeSubTab === 'leaves') {
        loadPendingLeaves();
      }
      if (activeSubTab === 'flexible') {
        loadPendingRegistrations();
      }
      if (activeSubTab === 'overtime') {
        loadPendingOvertimes();
      }
    }
  }, [user, userTypeFilter, approvalStatusFilter, activeTab, activeSubTab]); 

  
  // (MỚI) useEffect riêng cho Badge Count (chỉ chạy 1 lần khi vào tab)
  useEffect(() => {
     if (user && activeTab === 'manage-registrations' && (user.role === 'admin' || user.role === 'staff')) {
         // Tải (hoặc tải lại) tổng số pending
         loadAllPendingCounts();
     }
  }, [user, activeTab, userStaffInfo]);
  // useEffect để chuyển tab nếu user không có quyền
  useEffect(() => {
    if (user && activeTab === 'manage-registrations' && user.role !== 'admin' && user.role !== 'staff') {
      // Chuyển về tab mặc định
      setActiveTab('doctor-schedule');
    } else if (user && activeTab === 'doctor-schedule' && user.role === 'staff' && userStaffInfo?.department !== 'clinical') {
      // Trưởng phòng không phải clinic không được xem lịch bác sĩ
      // Nếu staff không có quyền xem lịch bác sĩ thì redirect, nếu có quyền thì giữ nguyên
      if (!hasViewDoctorPerm && userStaffInfo?.rank !== 'manager') {
        setActiveTab('staff-schedule');
      }
    }
  }, [user, userStaffInfo, activeTab, hasViewDoctorPerm]);
  
  
  // Lọc dữ liệu ở Frontend
  const filteredData = useMemo(() => {
    const { schedules, overtime_schedules, leaves, appointments } = allCalendarData;
    const showWorkSchedules = true; 
    const normalizedAppointments = (appointments || []).map(normalizeAppointmentForFilter);
    const showServiceAppointments = eventTypeFilters.appointmentService;
    const showConsultationAppointments = eventTypeFilters.appointmentConsultation;
    const filteredAppointments = normalizedAppointments.filter(app => {
      if (app.appointment_kind === 'consultation') return showConsultationAppointments;
      if (app.appointment_kind === 'service') return showServiceAppointments;
      return showServiceAppointments || showConsultationAppointments;
    });
    
    return {
      schedules: showWorkSchedules && eventTypeFilters.schedules ? schedules : [],
      overtime_schedules: eventTypeFilters.overtime ? overtime_schedules : [],
      leaves: eventTypeFilters.leaves ? leaves : [],
      appointments: filteredAppointments,
      showWorkSchedules
    };
  }, [allCalendarData, eventTypeFilters, activeTab]);

  // Lọc danh sách phê duyệt
  const filteredLeaves = useMemo(() => {
    const query = leaveSearch.toLowerCase();
    return leaveRequests.filter(leave => {
      const matchesSearch = !leaveSearch || 
        leave.user?.full_name?.toLowerCase().includes(query) ||
        leave.reason?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || leave.user_type === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [leaveRequests, leaveSearch, userTypeFilter]);

  const filteredRegistrations = useMemo(() => {
    const query = flexibleSearch.toLowerCase();
    return pendingRegistrations.filter(reg => {
      const matchesSearch = !flexibleSearch || reg.user?.full_name?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || reg.user?.role === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [pendingRegistrations, flexibleSearch, userTypeFilter]); 

  const filteredOvertimes = useMemo(() => {
    const query = overtimeSearch.toLowerCase();
    return pendingOvertimes.filter(ot => {
      const matchesSearch = !overtimeSearch || 
        ot.user?.full_name?.toLowerCase().includes(query) ||
        ot.reason?.toLowerCase().includes(query);
      const matchesType = userTypeFilter === 'all' || ot.user?.role === userTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [pendingOvertimes, overtimeSearch, userTypeFilter]); 


  // ========== HANDLERS ==========
  
  // (Handler Tab Config: handleConfigChange, handleDayToggle, handleSaveConfig - Giữ nguyên)
  const handleConfigChange = (shiftName, field, value) => {
    setWorkShiftConfig(prev => prev.map(shift =>
      shift.shift_name === shiftName
        ? { ...shift, [field]: value }
        : shift
    ));
  };
  const handleDayToggle = (shiftName, day) => {
    setWorkShiftConfig(prev => prev.map(shift => {
      if (shift.shift_name === shiftName) {
        const currentDays = shift.days_of_week || [];
        const newDays = currentDays.includes(day)
          ? currentDays.filter(d => d !== day)
          : [...currentDays, day].sort((a, b) => a - b);
        return { ...shift, days_of_week: newDays };
      }
      return shift;
    }));
  };
  const handleSaveConfig = async () => {
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const shifts = workShiftConfig.map(shift => ({
        ...shift,
        start_time: shift.start_time.length === 5 ? `${shift.start_time}:00` : shift.start_time,
        end_time: shift.end_time.length === 5 ? `${shift.end_time}:00` : shift.end_time
      }));
      const response = await axios.put(
        `${API_URL}/work-shifts/config`,
        { shifts },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Cập nhật cấu hình thành công');
        loadWorkShiftConfig();
      }
    } catch (error) {
      console.error('Save config error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };


  // Handler chọn Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'doctor-schedule' || tab === 'staff-schedule') {
      setSelectedUsers([]); 
      setAllCalendarData({ schedules: [], overtime_schedules: [], leaves: [], appointments: [] });
    }
  };

  // (Handler chọn User: handleUserChange - Giữ nguyên)
  const handleUserChange = (selectedOptions) => {
    const normalizeOption = (option) => {
      if (!option) return option;
      const normalizedId = option.userId || option.user_id || option.value || option.id || null;
      return {
        ...option,
        value: normalizedId,
        userId: normalizedId
      };
    };

    if (activeTab === 'doctor-schedule') {
      const singleSelection = Array.isArray(selectedOptions)
        ? selectedOptions.slice(0, 1).map(normalizeOption)
        : (selectedOptions ? [normalizeOption(selectedOptions)] : []);
      setSelectedUsers(singleSelection);
      return;
    }

    if (user.role === 'admin' && Array.isArray(selectedOptions) && selectedOptions.length > 5) {
      toast.warn('Chỉ được phép xem tối đa 5 người dùng cùng lúc');
      return;
    }
    if (user.role === 'admin') {
      setSelectedUsers(Array.isArray(selectedOptions) ? selectedOptions.map(normalizeOption) : []);
    } else {
      setSelectedUsers(selectedOptions ? [normalizeOption(selectedOptions)] : []);
    }
  };
  
  // (Handler toggle lọc sự kiện: handleEventTypeToggle - Giữ nguyên)
  const handleEventTypeToggle = (type) => {
    setEventTypeFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // (Handler Lịch: handleDateChange, goToToday - Giữ nguyên)
  const handleDateChange = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week' || calendarDisplayMode === 'table') {
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    }
    setCurrentDate(newDate);
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // (Handlers Modal Đơn nghỉ: ... - SỬA)
  const handleOpenDetailModal = (leave) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };
  const handleOpenConfirmModal = () => {
    setShowDetailModal(false); 
    setShowConfirmModal(true);
  };
  const handleOpenRejectModal = () => {
    setShowDetailModal(false);
    setRejectReason('');
    setShowRejectModal(true);
  };
  const handleApproveLeave = async () => {
    if (!selectedLeave) return;
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/leave-requests/${selectedLeave.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Đã duyệt đơn');
        loadPendingLeaves(); 
        loadAllPendingCounts(); // (SỬA) Tải lại count
        setShowConfirmModal(false);
        setSelectedLeave(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt đơn');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };
  const handleRejectLeave = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }
    if (!selectedLeave) return;
    setLoading(prev => ({ ...prev, submit: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/leave-requests/${selectedLeave.id}/reject`,
        { reject_reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Đã từ chối đơn');
        setShowRejectModal(false);
        setRejectReason('');
        loadPendingLeaves(); 
        loadAllPendingCounts(); // (SỬA) Tải lại count
        setSelectedLeave(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi từ chối');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // (Helpers, weekDays, check user - Giữ nguyên)
  const weekDays = [
    { value: 1, label: 'T2' }, { value: 2, label: 'T3' },
    { value: 3, label: 'T4' }, { value: 4, label: 'T5' },
    { value: 5, label: 'T6' }, { value: 6, label: 'T7' },
    { value: 0, label: 'CN' }
  ];
  if (!user) {
    return (
      <div className="schedule-management-page__loading">
        <FaSpinner className="fa-spin" /> Đang tải...
      </div>
    );
  }

  // ========== RENDER ==========
  
  // (SỬA) Tách JSX của bộ lọc (Phê duyệt) ra
  const renderRoleFilters = () => {
    // Hiện bộ lọc cho Admin hoặc trưởng phòng (quản lý cả bác sĩ và nhân viên)
  const canSeeFilters = user?.role === 'admin' || (user?.role === 'staff' && (userStaffInfo?.rank === 'manager' || hasViewDoctorPerm));
    
    if (!canSeeFilters) {
      return null; // Không hiện bộ lọc nào nếu không có quyền
    }
    
    return (
      <div className="schedule-management-page__filter-buttons" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
        <button
          className={`schedule-management-page__filter-btn ${userTypeFilter === 'all' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setUserTypeFilter('all')}
        ><FaUsers /> Tất cả</button>
        <button
          className={`schedule-management-page__filter-btn ${userTypeFilter === 'doctor' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setUserTypeFilter('doctor')}
        ><FaUserMd /> Bác sĩ</button>
        <button
          className={`schedule-management-page__filter-btn ${userTypeFilter === 'staff' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setUserTypeFilter('staff')}
        ><FaUserNurse /> Nhân viên</button>
      </div>
    );
  };
  
  const renderStatusFilters = () => (
     <div className="schedule-management-page__filter-buttons" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'all' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('all')}
        ><FaArchive /> Tất cả</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'pending' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('pending')}
        ><FaExclamationCircle /> Chờ duyệt</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'approved' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('approved')}
        ><FaCheckCircle /> Đã duyệt</button>
        <button
          className={`schedule-management-page__filter-btn ${approvalStatusFilter === 'rejected' ? 'schedule-management-page__filter-btn--active' : ''}`}
          onClick={() => setApprovalStatusFilter('rejected')}
        ><FaTimesCircle /> Từ chối</button>
      </div>
  );


  // Tách JSX của bộ lọc lịch ra
  // Tách JSX của bộ lọc lịch ra
  const renderCalendarControls = (userList) => {
    const getSpecialtyId = (u) => {
      if (!u) return null;
      return u?.raw?.Specialty?.id || u?.raw?.specialty?.id || u?.raw?.specialty_id || u?.raw?.roleData?.specialty?.id || u?.specialty?.id || u?.specialty_id || null;
    };

    const getOptionUserId = (u) => {
      return u?.user_id || u?.User?.id || u?.raw?.user_id || u?.raw?.User?.id || u?.id || null;
    };

    const filteredBySpecialty = selectedSpecialty && selectedSpecialty !== 'all'
      ? userList.filter(u => String(getSpecialtyId(u)) === String(selectedSpecialty))
      : userList;
    const userOptions = filteredBySpecialty.map(u => {
      const value = u?.user_id || u?.User?.id || u?.raw?.user_id || u?.raw?.User?.id || u?.id || null;
      return {
        value,
        userId: value,
        label: u.full_name,
        avatar: u.avatar_url,
        raw: u
      };
    });
    const formatOptionLabel = ({ label, avatar }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img 
          src={avatar || 'https://placehold.co/24x24/EBF4FF/76A9FA?text=U'} 
          alt={label}
          style={{ width: 24, height: 24, borderRadius: '50%' }}
        />
        <span>{label}</span>
      </div>
    );
    
    // --- ĐIỀU KIỆN HIỂN THỊ MỚI ---
    // --- ĐIỀU KIỆN HIỂN THỊ MỚI ---
    // MỞ KHÓA DROPDOWN CHO TẤT CẢ (Danh sách người bên trong đã được bảo vệ chặt chẽ ở Bước 2)
    const canSelectUsers = true; 
    const isDoctorMode = activeTab === 'doctor-schedule';
    
    // Điều kiện vẽ Lịch: Nếu là Admin thì bắt buộc phải chọn, nếu là Staff thường thì auto xem lịch
    const shouldShowCalendar = user.role !== 'admin' || selectedUsers.length > 0;

    return (
    <>
      <div className="schedule-management-page__doctor-header">
        {/* Specialty filter */}
        {activeTab === 'doctor-schedule' && specialties.length > 0 && canSelectUsers && (
          <div style={{ marginRight: '12px' }}>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              style={{ height: 40, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }}
            >
              <option value="all">Tất cả chuyên khoa</option>
              {specialties.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name || sp.display_name || sp.title || sp}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* React-Select - Chỉ hiển thị cho Admin hoặc Quản lý */}
        {canSelectUsers && (
          <div className="schedule-management-page__form-group" style={{ flexBasis: '400px', zIndex: 10 }}>
            <Select
              isMulti={!isDoctorMode && user.role === 'admin'} 
              options={userOptions}
              value={isDoctorMode ? (selectedUsers[0] || null) : selectedUsers}
              onChange={handleUserChange}
              formatOptionLabel={formatOptionLabel}
              placeholder={`-- Chọn ${activeTab === 'doctor-schedule' ? 'bác sĩ' : 'nhân viên'} --`}
              styles={{ control: (base) => ({ ...base, minHeight: '45px' }) }}
              isClearable
            />
          </div>
        )}
        
        {/* Nút chuyển Tuần/Tháng/Hôm nay */}
        <div className="schedule-management-page__view-controls" style={{ marginLeft: canSelectUsers ? '0' : 'auto' }}>
          <button className="schedule-management-page__nav-button" onClick={goToToday}>
            <FaCalendarDay /> Hôm nay
          </button>
          <div className="schedule-management-page__view-switcher">
            <button className={`schedule-management-page__switch-btn ${calendarDisplayMode === 'calendar' ? 'active' : ''}`} onClick={() => setCalendarDisplayMode('calendar')}> <FaCalendarAlt /> Lịch </button>
            <button className={`schedule-management-page__switch-btn ${calendarDisplayMode === 'table' ? 'active' : ''}`} onClick={() => setCalendarDisplayMode('table')}> <FaList /> Bảng </button>
          </div>
          {calendarDisplayMode === 'calendar' && (
            <div className="schedule-management-page__view-switcher">
              <button className={`schedule-management-page__switch-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}> <FaCalendarWeek /> Tuần </button>
              <button className={`schedule-management-page__switch-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}> <FaCalendarAlt /> Tháng </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bộ lọc loại sự kiện */}
      {shouldShowCalendar && (
        <div className="schedule-management-page__event-type-filters">
          <span>Hiển thị:</span>
          {filteredData.showWorkSchedules && (
            <button className={`schedule-management-page__filter-btn ${eventTypeFilters.schedules ? 'active' : ''} filter-schedules`} onClick={() => handleEventTypeToggle('schedules')}><FaBusinessTime /> Lịch làm việc</button>
          )}
          <button className={`schedule-management-page__filter-btn ${eventTypeFilters.overtime ? 'active' : ''} filter-overtime`} onClick={() => handleEventTypeToggle('overtime')}><FaClock /> Tăng ca</button>
          <button className={`schedule-management-page__filter-btn ${eventTypeFilters.appointmentService ? 'active' : ''} filter-appointment-service`} onClick={() => handleEventTypeToggle('appointmentService')}><FaUserClock /> Lịch hẹn dịch vụ</button>
          <button className={`schedule-management-page__filter-btn ${eventTypeFilters.appointmentConsultation ? 'active' : ''} filter-appointment-consultation`} onClick={() => handleEventTypeToggle('appointmentConsultation')}><FaUserClock /> Lịch hẹn tư vấn</button>
           <button className={`schedule-management-page__filter-btn ${eventTypeFilters.leaves ? 'active' : ''} filter-leaves`} onClick={() => handleEventTypeToggle('leaves')}><FaExclamationTriangle /> Lịch nghỉ</button>
        </div>
      )}

      {/* Hiển thị lịch */}
      {shouldShowCalendar ? (
        <>
          <div className="schedule-management-page__month-navigation">
            <button className="schedule-management-page__nav-button" onClick={() => handleDateChange('prev')}>
              <FaChevronLeft /> {(viewMode === 'week' || calendarDisplayMode === 'table') ? 'Tuần trước' : 'Tháng trước'}
            </button>
            <h3>
              {(viewMode === 'week' || calendarDisplayMode === 'table')
                ? (() => {
                    const wk = getWeekRange(visibleWeekStart || currentDate);
                    return `Tuần từ ${formatDateLabel(wk.start)} đến ${formatDateLabel(wk.end)}`;
                  })()
                : currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
              }
            </h3>
            <button className="schedule-management-page__nav-button" onClick={() => handleDateChange('next')}>
              {(viewMode === 'week' || calendarDisplayMode === 'table') ? 'Tuần sau' : 'Tháng sau'} <FaChevronRight />
            </button>
          </div>
          
          {loading.schedules ? (
             <div className="schedule-management-page__loading"><FaSpinner className="fa-spin"/></div>
          ) : (
            calendarDisplayMode === 'calendar' ? (
              <CalendarView
                schedules={filteredData.schedules}
                overtimeSchedules={filteredData.overtime_schedules} 
                leaveRequests={filteredData.leaves}
                appointments={filteredData.appointments}
                workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
                viewMode={viewMode}
                currentDate={currentDate}
                selectedUsers={selectedUsers} 
                showWorkSchedules={filteredData.showWorkSchedules}
                onEventClick={(event) => {
                  // DEBUG: log the clicked event and current selectedUsers
                  if (process.env.NODE_ENV !== 'production') {
                    // eslint-disable-next-line no-console
                    console.log('DEBUG onEventClick payload:', event);
                    // eslint-disable-next-line no-console
                    console.log('DEBUG current selectedUsers:', selectedUsers);
                  }
                  // Nếu là sự kiện lịch hẹn, điều hướng tới AppointmentManagementPage với bộ lọc
                  if (event.type === 'appointment' && event.id) {
                    const doctorIdFromEvent = event.doctor_id || event.raw?.doctor_id || event.Doctor?.id || event.raw?.Doctor?.id;
                    const doctorUserIdFromEvent = event.user_id || event.user?.id || event.raw?.user_id || event.raw?.user?.id;
                    if (user?.role === 'doctor') {
                      navigate('/lich-hen-cua-toi', {
                        state: {
                          filters: {
                            date: event.appointment_date || event.date,
                            appointment_start_time: event.appointment_start_time || event.start_time || event.startTime
                          }
                        }
                      });
                      return;
                    }
                    navigate('/quan-ly-lich-hen', {
                      state: {
                        filters: {
                          doctor_id: doctorIdFromEvent,
                          doctor_user_id: doctorUserIdFromEvent,
                          appointment_date: event.appointment_date || event.date,
                          appointment_start_time: event.appointment_start_time || event.start_time || event.startTime
                        }
                      }
                    });
                  } else {
                    // Các sự kiện khác chỉ hiển thị toast
                    toast.info(`Sự kiện: ${event.id || event.reason}`);
                  }
                }}
                month={currentDate.getMonth() + 1}
                year={currentDate.getFullYear()}
                onDateClick={(date, leaves) => leaves.length > 0 && toast.info(`Nghỉ phép: ${leaves[0].reason}`)}
                onVisibleWeekStartChange={setVisibleWeekStart}
              />
            ) : (
              <ScheduleTableView
                schedules={filteredData.schedules}
                overtimeSchedules={filteredData.overtime_schedules}
                leaveRequests={filteredData.leaves}
                appointments={filteredData.appointments}
                showWorkSchedules={filteredData.showWorkSchedules}
                workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
                loading={loading.schedules}
                currentDate={currentDate}
                viewMode={viewMode}
                month={currentDate.getMonth() + 1}
                year={currentDate.getFullYear()}
              />
            )
          )}
        </>
      ) : (
         <div className="schedule-management-page__empty-state">
           <MdOutlineErrorOutline />
           <p>Vui lòng chọn {activeTab === 'doctor-schedule' ? 'bác sĩ' : 'nhân viên'} để xem lịch.</p>
         </div>
      )}
    </>
  );
  }

  return (
    <div className="schedule-management-page__container">
      <div className="schedule-management-page__management-container">
        <h1 className="schedule-management-page__page-title">Quản lý lịch làm việc</h1>

        {/* TABS (SỬA LOGIC BADGE) */}
        <div className="schedule-management-page__tabs">
          {user.role === 'admin' && (
            <button
              className={`schedule-management-page__tab ${activeTab === 'config' ? 'schedule-management-page__tab--active' : ''}`}
              onClick={() => handleTabChange('config')}
            >
              <FaCog /> Cấu hình ca
            </button>
          )}
          {(user.role === 'admin' || (user.role === 'staff' && (userStaffInfo?.rank === 'manager' || hasViewDoctorPerm))) && (
            <button
              className={`schedule-management-page__tab ${activeTab === 'doctor-schedule' ? 'schedule-management-page__tab--active' : ''}`}
              onClick={() => handleTabChange('doctor-schedule')}
            >
              <FaUserMd /> Lịch bác sĩ
            </button>
          )}
          <button
            className={`schedule-management-page__tab ${activeTab === 'staff-schedule' ? 'schedule-management-page__tab--active' : ''}`}
            onClick={() => handleTabChange('staff-schedule')}
          >
            <FaUserNurse /> Lịch nhân viên
          </button>
      {canApprove && (
            <button
              className={`schedule-management-page__tab ${activeTab === 'manage-registrations' ? 'schedule-management-page__tab--active' : ''}`}
              onClick={() => handleTabChange('manage-registrations')}
            >
              <FaTasks /> Phê duyệt
              {/* (SỬA) Dùng state đếm 'pending' */}
              {(pendingLeaveCount + pendingRegCount + pendingOvertimeCount) > 0 && (
                <span className="schedule-management-page__badge-count">
                  {pendingLeaveCount + pendingRegCount + pendingOvertimeCount}
                </span>
              )}
            </button>
          )}
          {(user.role === 'staff' || user.role === 'doctor') && (
             <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignSelf: 'center' }}>
                <button
                  className="schedule-management-page__button schedule-management-page__button--secondary"
                  onClick={() => window.location.href = '/lich-cua-toi'}
                  style={{ background: '#e0f2fe', color: '#1e3a8a', border: '1px solid #bae6fd', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  <FaCalendarAlt /> Đăng ký Ca làm
                </button>
                <button
                  className="schedule-management-page__button schedule-management-page__button--secondary"
                  onClick={() => window.location.href = '/lich-cua-toi'}
                  style={{ background: '#fef3c7', color: '#9a3412', border: '1px solid #fde68a', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  <FaUmbrellaBeach /> Xin Nghỉ Phép
                </button>
                <button
                          className="schedule-management-page__button schedule-management-page__button--primary"
                          onClick={() => setShowOvertimeEditor(true)}
                          style={{ padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <FaClock /> Đăng ký Tăng ca
                        </button>
                     </div>
                  )}
        </div> {/* <--- BẠN THÊM ĐÚNG DÒNG NÀY ĐỂ ĐÓNG THẺ TABS LẠI NHÉ */}

        {/* TAB 1: CONFIG (Giữ nguyên) */}
        {activeTab === 'config' && user.role === 'admin' && (
          <div className="schedule-management-page__tab-content">
            <div className="schedule-management-page__config-section">
              <h2 className="schedule-management-page__section-title">Cấu hình ca làm việc</h2>
              <p className="schedule-management-page__section-description">Thiết lập khung giờ làm việc trong tuần</p>
              {workShiftConfig.map((shift, index) => (
                shift ? (
                  <div key={shift.shift_name || index} className="schedule-management-page__shift-config-card">
                    <div className="schedule-management-page__shift-header">
                      <h3>{shift.display_name}</h3>
                      <label className="schedule-management-page__switch">
                        <input
                          type="checkbox"
                          checked={!!shift.is_active}
                          onChange={(e) => handleConfigChange(shift.shift_name, 'is_active', e.target.checked)}
                        />
                        <span className="schedule-management-page__switch-slider"></span>
                      </label>
                    </div>
                    {shift.is_active && (
                      <div className="schedule-management-page__shift-body">
                        <div className="schedule-management-page__form-row">
                          <div className="schedule-management-page__form-group">
                            <label>Bắt đầu</label>
                            <input
                              type="time"
                              className="schedule-management-page__form-control"
                              value={shift.start_time || ''}
                              onChange={(e) => handleConfigChange(shift.shift_name, 'start_time', e.target.value)}
                            />
                          </div>
                          <div className="schedule-management-page__form-group">
                            <label>Kết thúc</label>
                            <input
                              type="time"
                              className="schedule-management-page__form-control"
                              value={shift.end_time || ''}
                              onChange={(e) => handleConfigChange(shift.shift_name, 'end_time', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="schedule-management-page__form-group">
                          <label>Ngày làm việc</label>
                          <div className="schedule-management-page__day-checkboxes">
                            {weekDays.map(day => (
                              <label key={day.value} className="schedule-management-page__checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={(shift.days_of_week || []).includes(day.value)}
                                  onChange={() => handleDayToggle(shift.shift_name, day.value)}
                                />
                                <span>{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              ))}
              <button
                className="schedule-management-page__button schedule-management-page__button--primary"
                onClick={handleSaveConfig}
                disabled={loading.submit}
              >
                {loading.submit ? <FaSpinner className="fa-spin" /> : <FaCheck />} Lưu cấu hình
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH BÁC SĨ (Giữ nguyên) */}
        {activeTab === 'doctor-schedule' && (user.role === 'admin' || (user.role === 'staff' && (userStaffInfo?.rank === 'manager' || hasViewDoctorPerm))) && (
          <div className="schedule-management-page__tab-content">
             {renderCalendarControls(user.role === 'admin' ? doctors : doctors)}
          </div>
        )}
        
        {/* TAB 3: LỊCH NHÂN VIÊN (Giữ nguyên) */}
        {activeTab === 'staff-schedule' && (
          <div className="schedule-management-page__tab-content">
             {renderCalendarControls(staffList)}
          </div>
        )}

        {/* (SỬA) TAB 4: PHÊ DUYỆT (Gộp 3 loại) */}
        {activeTab === 'manage-registrations' && (
          <div className="schedule-management-page__tab-content">
            <h2 className="schedule-management-page__section-title">Danh sách chờ phê duyệt</h2>
            
            {/* Sub-tabs (Giữ nguyên) */}
            <div className="schedule-management-page__filter-buttons" style={{marginBottom: '2rem'}}>
               <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'leaves' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('leaves')}
                >
                  Đơn Nghỉ Phép
                </button>
                <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'flexible' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('flexible')}
                >
                  Đăng Ký Lịch
                </button>
                <button
                  className={`schedule-management-page__filter-btn ${activeSubTab === 'overtime' ? 'schedule-management-page__filter-btn--active' : ''}`}
                  onClick={() => setActiveSubTab('overtime')}
                >
                  Đăng Ký Tăng Ca
                </button>
            </div>
            
            {/* 1. Đơn Nghỉ Phép (SỬA) */}
            {activeSubTab === 'leaves' && (
              <div className="schedule-management-page__pending-leaves-section">
                
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc lý do..."
                      className="schedule-management-page__form-control"
                      value={leaveSearch}
                      onChange={(e) => setLeaveSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <PendingLeaveTable
                  leaves={filteredLeaves} 
                  loading={loading.leaves}
                  onRowClick={handleOpenDetailModal}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingLeaves();
                    loadAllPendingCounts();
                  }}
                />
              </div>
            )}
            
            {/* 2. Đăng Ký Lịch Linh Hoạt (SỬA) */}
            {activeSubTab === 'flexible' && (
              <>
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên nhân viên..."
                      className="schedule-management-page__form-control"
                      value={flexibleSearch}
                      onChange={(e) => setFlexibleSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <ScheduleApprovalTable
                  registrations={filteredRegistrations} 
                  loading={loading.registrations}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingRegistrations();
                    loadAllPendingCounts();
                  }}
                  workShiftConfig={workShiftConfig}
                />
              </>
            )}
            
            {/* 3. Đăng Ký Tăng Ca (SỬA) */}
            {activeSubTab === 'overtime' && (
              <>
                {/* (SỬA) Container cho 3 bộ lọc */}
                <div className="schedule-management-page__filters-container">
                  {/* Filter 1: Search */}
                  <div className="schedule-management-page__filter-section schedule-management-page__filter-section--search">
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc lý do..."
                      className="schedule-management-page__form-control"
                      value={overtimeSearch}
                      onChange={(e) => setOvertimeSearch(e.target.value)}
                    />
                  </div>
                  {/* Filter 2: Roles */}
                  {renderRoleFilters()}
                  {/* Filter 3: Status */}
                  {renderStatusFilters()}
                </div>
                
                <OvertimeApprovalTable
                  overtimes={filteredOvertimes} 
                  loading={loading.overtimes}
                  // (SỬA) Tải lại cả bảng VÀ count
                  onActionComplete={() => {
                    loadPendingOvertimes();
                    loadAllPendingCounts();
                  }}
                />
              </>
            )}
            
          </div>
        )}
      </div>

  {/* (Các Modal Đơn nghỉ - luôn hiển thị cho staff/doctor, không phụ thuộc permission toggle) */}
      {showRejectModal && (
        <div className="schedule-management-page__modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="schedule-management-page__modal-content" onClick={e => e.stopPropagation()}>
            <h2>Lý do từ chối đơn nghỉ</h2>
            <div className="schedule-management-page__form-group">
               <label>Lý do từ chối *</label>
               <textarea
                 className="schedule-management-page__form-control"
                 rows="4"
                 placeholder="Lý do từ chối..."
                 value={rejectReason}
                 onChange={e => setRejectReason(e.target.value)}
               />
            </div>
            <div className="schedule-management-page__modal-footer">
              <button 
                 className="schedule-management-page__button schedule-management-page__button--secondary" 
                 onClick={() => setShowRejectModal(false)}
                 disabled={loading.submit}
              > Hủy </button>
              <button 
                 className="schedule-management-page__button schedule-management-page__button--danger" 
                 onClick={handleRejectLeave} 
                 disabled={loading.submit || !rejectReason.trim()}
              > {loading.submit ? <FaSpinner className="fa-spin"/> : 'Xác nhận từ chối'} </button>
            </div>
          </div>
        </div>
      )}
      <LeaveDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        leave={selectedLeave}
        workShiftConfig={workShiftConfig.filter(s => s?.is_active)}
        onApprove={handleOpenConfirmModal}
        onReject={handleOpenRejectModal}
        loading={loading.submit}
      />
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApproveLeave}
        title="Xác nhận duyệt đơn"
        message={`Bạn có chắc muốn DUYỆT đơn xin nghỉ của ${selectedLeave?.user?.full_name}?`}
        loading={loading.submit}
      />
      
      {/* (Modal Tăng Ca (cho Admin) - giữ nguyên) */}
      <OvertimeEditor
        isOpen={showOvertimeEditor}
        onClose={() => setShowOvertimeEditor(false)}
        onSubmitted={() => {
          // Tải lại lịch nếu đang xem
          if(activeTab === 'doctor-schedule' || activeTab === 'staff-schedule') {
            loadUserCalendarData();
          }
          // Tải lại count
          if(activeTab === 'manage-registrations') {
            loadAllPendingCounts();
          }
        }}
        userRole={user.role}
        adminProps={{
          userList: allUsers.map(u => ({ id: u.id, full_name: u.label })), 
          selectedUserId: selectedUserForOvertime,
          onUserChange: setSelectedUserForOvertime
        }}
      />
      
    </div>
  );
};

export default ScheduleManagementPage;