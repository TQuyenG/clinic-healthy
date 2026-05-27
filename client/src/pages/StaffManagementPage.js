// client/src/pages/StaffManagementPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import auditService from '../services/auditService';
import { normalizeUserList } from '../utils/normalizeUser';
import { 
  FaUserMd, FaSearch, FaFilter, FaUserTie, FaCheckCircle, 
  FaExclamationCircle, FaBuilding, FaEdit, FaTimes, FaCheck, 
  FaChartPie, FaChartBar, FaHospital, FaHeadset, FaMoneyBillWave, 
  FaPenFancy, FaCog, FaChevronDown, FaPlus, FaFileExport, FaSitemap,
  FaCalendarAlt, FaClipboardList, FaUmbrellaBeach, FaClock, FaExchangeAlt,
  FaUserNurse, FaBed, FaFileAlt, FaNewspaper, FaComments, FaLightbulb,
  FaCreditCard, FaCogs, FaTools, FaUsers, FaUserShield, FaChartLine, FaHistory,
  FaMoneyCheckAlt, FaBoxes, FaList, FaStethoscope, FaGift
} from 'react-icons/fa';

import './StaffManagementPage.css';
import OrganizationChart from '../components/OrganizationChart';
import HistoryTab from '../components/HistoryTab';
import DepartmentAssignmentTab from '../components/DepartmentAssignmentTab';
import { PERMISSION_MODULES } from '../config/permissionModules';
import { useDepartmentColors } from '../contexts/DepartmentColorContext';
import { getRoleProfile, findRoleProfileByPermissions } from '../config/departmentRoleProfiles';

const DEPARTMENTS = {
  BGD: { name: 'Ban Giám Đốc', icon: <FaUserShield /> },
  clinical: { name: 'Vận hành lâm sàng', icon: <FaHospital /> },
  system: { name: 'Hệ thống & IT', icon: <FaCog /> },
  support: { name: 'Chăm sóc KH', icon: <FaHeadset /> },
  finance: { name: 'Tài chính', icon: <FaMoneyBillWave /> },
  content: { name: 'Nội dung', icon: <FaPenFancy /> }
};

const DEPARTMENT_MODULE_ACCESS = {
  system: ['system_settings', 'staff_management', 'consultation_realtime', 'video_call'],
  clinical: ['work_shift', 'appointments', 'medical_records', 'consultations', 'schedule', 'medicines', 'diseases'],
  support: ['forum', 'community', 'contact'],
  finance: ['payments', 'refund_requests', 'statistics', 'pharmacy'],
  content: ['articles', 'medicines', 'diseases', 'events_vouchers'],
  BGD: [] 
};

// --- StatusBadge & RankBadge Components ---
const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch(status) {
      case 'active':
        return { backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #81c784' };
      case 'inactive':
        return { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef5350' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' };
    }
  };

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      ...getStatusStyle()
    }}>
      {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
    </span>
  );
};

const RankBadge = ({ rank }) => {
  const getRankStyle = () => {
    switch(rank) {
      case 'admin':
        return { backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffb74d' };
      case 'manager':
        return { backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px solid #64b5f6' };
      case 'staff':
        return { backgroundColor: '#f5f5f5', color: '#616161', border: '1px solid #e0e0e0' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' };
    }
  };

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      ...getRankStyle()
    }}>
      {getRankLabel(rank)}
    </span>
  );
};

// Helper function để hiển thị rank
const getRankLabel = (rank) => {
  if (rank === 'admin') return 'Ban Giám Đốc';
  if (rank === 'manager') return 'Trưởng phòng';
  return 'Nhân viên';
};

const buildEmptyPermissionState = () => {
  return Object.keys(PERMISSION_MODULES).reduce((accumulator, moduleKey) => {
    accumulator[moduleKey] = [];
    return accumulator;
  }, {});
};

const LEGACY_MODULE_ALIASES = {
  medicine: 'medicines',
  medicines: 'medicines',
  disease: 'diseases',
  diseases: 'diseases',
  article: 'articles',
  articles: 'articles',
  payment: 'payments',
  payments: 'payments',
  refund: 'refund_requests',
  report: 'forum_reports',
  reports: 'forum_reports',
  topic: 'forum',
  topics: 'forum',
  question: 'forum',
  questions: 'forum',
  staff: 'staff_management'
};

const mapLegacyStringToModuleAction = (str) => {
  // Accept formats: 'module.action', 'action_module', 'action_moduleplural', 'create_medicine'
  if (typeof str !== 'string' || !str) return null;
  if (str.includes('.')) {
    const [m, a] = str.split('.');
    if (PERMISSION_MODULES[m]) return { module: m, action: a };
  }

  // action_module pattern
  const parts = str.split('_');
  if (parts.length >= 2) {
    const action = parts[0];
    const moduleCandidate = parts.slice(1).join('_');
    const mapped = LEGACY_MODULE_ALIASES[moduleCandidate] || Object.keys(PERMISSION_MODULES).find(k => k === moduleCandidate || k === `${moduleCandidate}s` || k === `${moduleCandidate}es`);
    if (mapped) return { module: mapped, action };
  }

  // Fallback: if string equals action present in any module, return that module (first match)
  for (const [moduleKey, module] of Object.entries(PERMISSION_MODULES)) {
    if (module.permissions.some(p => p.key === str)) return { module: moduleKey, action: str };
  }

  return null;
};

const normalizeAndMapPermissions = (permissions = {}) => {
  const normalized = buildEmptyPermissionState();

  // If permissions is an array of strings (legacy flat list)
  if (Array.isArray(permissions)) {
    permissions.forEach(item => {
      const mapped = mapLegacyStringToModuleAction(item);
      if (mapped) {
        if (!normalized[mapped.module]) normalized[mapped.module] = [];
        if (!normalized[mapped.module].includes(mapped.action)) normalized[mapped.module].push(mapped.action);
      }
    });
    return normalized;
  }

  // If permissions is object: could be module->array/object or legacy action:true pairs
  Object.entries(permissions).forEach(([key, val]) => {
    // If key is a known module
    if (PERMISSION_MODULES[key]) {
      if (Array.isArray(val)) {
        normalized[key] = val.filter(a => typeof a === 'string' && a.trim() !== '');
        return;
      }

      if (val && typeof val === 'object') {
        normalized[key] = Object.entries(val).filter(([, v]) => v === true).map(([a]) => a);
        return;
      }

      if (val === true) {
        normalized[key] = PERMISSION_MODULES[key].permissions.map(p => p.key);
        return;
      }
    }

    // Otherwise treat key as legacy action name
    const mapped = mapLegacyStringToModuleAction(key);
    if (mapped) {
      if (!normalized[mapped.module]) normalized[mapped.module] = [];
      if (val === true) {
        if (!normalized[mapped.module].includes(mapped.action)) normalized[mapped.module].push(mapped.action);
      } else if (Array.isArray(val)) {
        // unlikely, but handle
        val.forEach(item => {
          const am = typeof item === 'string' ? item : null;
          if (am && !normalized[mapped.module].includes(am)) normalized[mapped.module].push(am);
        });
      }
    }
  });

  return normalized;
};

// --- SUB-COMPONENTS ĐÃ ĐƯỢC TỐI ƯU ---

// 1. Overview Dashboard: Khôi phục bố cục gần với bản cũ
const OverviewDashboard = ({
  departmentStats = [],
  DEPARTMENTS,
  onSelectDepartment,
  staffByDepartment = {},
  adminUsers = [],
  setSelectedStaff,
  departmentColors = {}
}) => {
  const [hoveredDept, setHoveredDept] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  const totalStaff = departmentStats.reduce((sum, dept) => sum + (dept.total_staff || 0), 0);
  const totalManagers = departmentStats.reduce((sum, dept) => sum + (dept.managers || 0), 0);
  const totalActive = departmentStats.reduce((sum, dept) => sum + (dept.active_staff || 0), 0);

  const pieData = departmentStats.map(stat => ({
    ...stat,
    dept: DEPARTMENTS[stat.code],
    angle: totalStaff > 0 ? ((stat.total_staff || 0) / totalStaff) * 360 : 0
  }));

  let cumulativeAngle = 0;
  const slices = pieData.map(data => {
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + data.angle;
    cumulativeAngle = endAngle;

    const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
    const largeArc = data.angle > 180 ? 1 : 0;

    return {
      ...data,
      pathData: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`
    };
  });

  return (
    <div className="overview-dashboard">
      <div className="overview-top-grid">
        <div className="dashboard-card overview-org-card">
          <div className="card-header overview-card-header">
            <h3><FaSitemap /> Sơ đồ tổ chức</h3>
          </div>
          <div className="overview-org-chart-wrap">
            <OrganizationChart
              departmentStats={departmentStats}
              DEPARTMENTS={DEPARTMENTS}
              onSelectDepartment={onSelectDepartment}
              staffByDepartment={staffByDepartment}
              showDetail={false}
              adminUsers={adminUsers}
              departmentColors={departmentColors}
              onSelectStaff={(deptCode, staffId) => {
                onSelectDepartment(deptCode);
                setTimeout(() => {
                  const deptStaff = staffByDepartment[deptCode];
                  if (deptStaff) {
                    const staff = deptStaff.find(item => item.id === staffId);
                    if (staff) {
                      setSelectedStaff && setSelectedStaff(staff);
                    }
                  }
                }, 800);
              }}
            />
          </div>
        </div>

        <div className="overview-side-column">
          <div className="overview-stat-grid">
            <div className="stat-box overview-stat-card">
              <FaUsers className="overview-stat-icon stat-users" />
              <h3>{totalStaff + adminUsers.length}</h3>
              <p>TỔNG NHÂN VIÊN</p>
            </div>
            <div className="stat-box overview-stat-card">
              <FaBuilding className="overview-stat-icon stat-departments" />
              <h3>{departmentStats.length + 1}</h3>
              <p>PHÒNG BAN</p>
            </div>
            <div className="stat-box overview-stat-card">
              <FaCheckCircle className="overview-stat-icon stat-active" />
              <h3>{totalActive + adminUsers.length}</h3>
              <p>HOẠT ĐỘNG</p>
            </div>
            <div className="stat-box overview-stat-card">
              <FaUserTie className="overview-stat-icon stat-managers" />
              <h3>{totalManagers}</h3>
              <p>QUẢN LÝ</p>
            </div>
          </div>

          <div className="dashboard-card overview-pie-card">
            <div className="card-header overview-card-header">
              <h3><FaChartPie /> Biểu đồ nhân sự</h3>
            </div>
            <div className="overview-pie-content">
              <svg
                viewBox="0 0 200 200"
                className="overview-pie-svg"
              >
                {slices.map((slice) => (
                  <path
                    key={slice.code}
                    d={slice.pathData}
                    fill={departmentColors[slice.code] || '#ccc'}
                    stroke="#fff"
                    strokeWidth="2"
                    onClick={() => onSelectDepartment && onSelectDepartment(slice.code)}
                    className={`overview-pie-slice ${hoveredDept && hoveredDept !== slice.code ? 'is-faded' : ''}`}
                    onMouseEnter={() => {
                      setHoveredDept(slice.code);
                      const percentage = totalStaff > 0 ? ((slice.total_staff / totalStaff) * 100).toFixed(1) : '0.0';
                      setTooltipData({
                        name: slice.dept?.name,
                        count: slice.total_staff,
                        percentage
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredDept(null);
                      setTooltipData(null);
                    }}
                  />
                ))}
                <circle cx="100" cy="100" r="35" fill="white" />
                <text x="100" y="105" textAnchor="middle" fontSize="20" fontWeight="bold">{totalStaff + adminUsers.length}</text>
              </svg>

              {tooltipData && (
                <div className="overview-pie-tooltip">
                  <div className="overview-tooltip-title">{tooltipData.name}</div>
                  <div>Nhân viên: {tooltipData.count}</div>
                  <div>Tỷ lệ: {tooltipData.percentage}%</div>
                </div>
              )}

              <div className="overview-legend-list">
                {pieData.map(item => (
                  <div
                    key={item.code}
                    onClick={() => onSelectDepartment && onSelectDepartment(item.code)}
                    onMouseEnter={() => setHoveredDept(item.code)}
                    onMouseLeave={() => setHoveredDept(null)}
                    className={`overview-legend-item ${hoveredDept === item.code ? 'is-hovered' : ''}`}
                  >
                    <div className="overview-legend-left">
                      <span
                        className="overview-legend-color"
                        style={{ background: departmentColors[item.code] || '#ccc' }}
                      ></span>
                      <span className="overview-legend-name">{item.dept?.name}</span>
                    </div>
                    <span className="overview-legend-value" style={{ color: departmentColors[item.code] || '#4CAF50' }}>{item.total_staff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-bottom-grid">
        <div className="dashboard-card">
          <div className="card-header overview-card-header">
            <h3><FaUserShield /> Ban Giám Đốc ({adminUsers.length})</h3>
          </div>
          <div className="overview-table-wrapper">
            <table className="overview-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="overview-admin-name-cell">
                        <div className="overview-admin-avatar">
                          {admin.full_name?.charAt(0) || 'A'}
                        </div>
                        <span className="overview-admin-name">{admin.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{admin.username}</td>
                    <td>{admin.email || 'N/A'}</td>
                    <td>Ban Giám Đốc</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header overview-card-header">
            <h3><FaUsers /> Nhân viên theo phòng ban</h3>
          </div>
          <div className="overview-table-wrapper">
            <table className="overview-table">
              <thead>
                <tr>
                  <th>Phòng ban</th>
                  <th>Quản lý</th>
                  <th>Nhân viên</th>
                  <th>Tổng</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept) => {
                  const deptInfo = DEPARTMENTS[dept.code];
                  const color = departmentColors[dept.code] || '#4CAF50';
                  return (
                    <tr key={dept.code}>
                      <td>
                        <div className="overview-dept-cell">
                          <span className="overview-dept-icon">{deptInfo?.icon}</span>
                          <span className="overview-dept-name">{deptInfo?.name}</span>
                        </div>
                      </td>
                      <td className="overview-cell-center">
                        <span className="overview-manager-badge" style={{ background: `${color}20`, color }}>
                          {dept.managers || 0}
                        </span>
                      </td>
                      <td className="overview-cell-center overview-cell-strong">
                        {(dept.total_staff || 0) - (dept.managers || 0)}
                      </td>
                      <td className="overview-cell-center overview-cell-bold">
                        {dept.total_staff || 0}
                      </td>
                      <td className="overview-cell-center">
                        <button
                          onClick={() => onSelectDepartment && onSelectDepartment(dept.code)}
                          className="overview-detail-btn"
                          style={{ background: color }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


// 2. Main Page Component
const StaffManagementPage = () => {
  // === DEPARTMENT COLORS CONTEXT ===
  const { departmentColors, getDepartmentColor } = useDepartmentColors();
  
  // === STATE MANAGEMENT ===
  const [user, setUser] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [activeDepartment, setActiveDepartment] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRank, setFilterRank] = useState('all');
  const [filterRoleProfile, setFilterRoleProfile] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // === DATA STATE ===
  const [departmentStats, setDepartmentStats] = useState([]);
  const [staffByDepartment, setStaffByDepartment] = useState({});
  const [allDoctors, setAllDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedDoctorSpecialty, setSelectedDoctorSpecialty] = useState('all');
  const [allStaff, setAllStaff] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  
  // === PERMISSIONS & DOCTORS EDITING STATE ===
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({});
  const [editingDoctors, setEditingDoctors] = useState(false);
  const [editingJobDesc, setEditingJobDesc] = useState(false);
  const [jobDescDraft, setJobDescDraft] = useState('');
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);


  // === INIT: Load user & data ===
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      window.location.href = '/login';
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    
    // Load admin users for organization chart
    loadAdminUsers();
    
    if (userData.role === 'staff') {
      loadCurrentStaffInfo();
      // Nếu staff có quyền staff_management → load thêm data phòng ban của mình
      const perms = userData?.role_info?.permissions ||
                    userData?.staff?.permissions ||
                    userData?.roleData?.permissions || {};
      const staffMgmt = perms['staff_management'];
      const hasStaffMgmt = Array.isArray(staffMgmt)
        ? staffMgmt.includes('view') || staffMgmt.includes('assign_permissions')
        : staffMgmt?.view === true || staffMgmt?.assign_permissions === true;
      if (hasStaffMgmt) {
        loadDepartmentStats();
        // Load phòng ban của staff (sẽ được set sau khi currentStaff load xong)
        const dept = userData?.role_info?.department ||
                     userData?.staff?.department ||
                     userData?.roleData?.department;
        if (dept) loadStaffByDepartment(dept);
      }
    } else if (userData.role === 'admin') {
      loadDepartmentStats();
      loadAllStaff();
      Object.keys(DEPARTMENTS).forEach(dept => loadStaffByDepartment(dept));
      setActiveDepartment('overview');
    }
    
    loadAllDoctors();
    loadSpecialties();
  }, []);

  // Auto-select department for staff manager / staff có quyền staff_management
  useEffect(() => {
    if (currentStaff && currentStaff.department) {
      setActiveDepartment(currentStaff.department);
      // Load staff của phòng ban nếu chưa có
      if (!staffByDepartment[currentStaff.department] ||
          staffByDepartment[currentStaff.department].length === 0) {
        loadStaffByDepartment(currentStaff.department);
      }
    }
  }, [currentStaff]);

  // Load staff when department changes
  useEffect(() => {
    if (activeDepartment && activeDepartment !== 'overview') {
      loadStaffByDepartment(activeDepartment);
      setSelectedStaff(null);
      setEditingDoctors(false);
      setEditingPermissions(false);
    }
  }, [activeDepartment]);

  // Update temp permissions when selected staff changes
  useEffect(() => {
    if (selectedStaff) {
      setTempPermissions(normalizeAndMapPermissions(selectedStaff.permissions || {}));
      if (selectedStaff.managed_doctors?.doctor_ids) {
        setSelectedDoctorIds(selectedStaff.managed_doctors.doctor_ids);
      } else {
        setSelectedDoctorIds([]);
      }
    }
  }, [selectedStaff]);



  // === API CALLS ===
  const loadCurrentStaffInfo = async () => {
    try {
      const response = await api.get('/staff/my-profile');
      if (response.data.success) {
        setCurrentStaff(response.data.data);
      }
    } catch (error) {
      console.error('Load current staff error:', error);
    }
  };

  const loadDepartmentStats = async () => {
    try {
      const response = await api.get('/staff/statistics/by-department');
      if (response.data.success) {
        setDepartmentStats(response.data.data);
      }
    } catch (error) {
      console.error('Load department stats error:', error);
    }
  };

  const loadAllStaff = async () => {
    try {
      const response = await api.get('/staff/all');
      if (response.data.success) {
        setAllStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Load all staff error:', error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const response = await api.get('/users/by-role?role=admin&limit=100');
      if (response.data.success) {
        setAdminUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Load admin users error:', error);
    }
  };

  const loadStaffByDepartment = async (deptCode) => {
    try {
      setLoading(true);
      const response = await api.get(`/staff/by-department/${deptCode}`);
      if (response.data.success) {
        setStaffByDepartment(prev => ({
          ...prev,
          [deptCode]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Load staff by department error:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const loadAllDoctors = async () => {
    try {
      const response = await api.get('/users/by-role?role=doctor&limit=1000');
      if (response.data.success) {
        const normalizedDoctors = normalizeUserList(response.data.users || [], 'doctor');
        setAllDoctors(normalizedDoctors);
        console.log('DEBUG allDoctors:', normalizedDoctors);
      }
    } catch (error) {
      console.error('Load all doctors error:', error);
    }
  };

  const loadSpecialties = async () => {
    try {
      const response = await api.get('/specialties');
      if (response.data.success) {
        setSpecialties(response.data.data || response.data.specialties || []);
      }
    } catch (error) {
      console.error('Load specialties error:', error);
    }
  };

  const getStaffRoleLabel = (staff) => {
    if (!staff) return '';

    const roleInfo = staff.role_info || staff.roleInfo || staff.role_meta || null;
    const roleProfileCode = roleInfo?.role_profile || staff.role_profile || null;
    const roleProfileName = roleInfo?.role_name || roleInfo?.job_description || null;
    const matchedProfile = roleInfo?.role_profile
      ? getRoleProfile(staff.department, roleInfo.role_profile)
      : findRoleProfileByPermissions(staff.department, staff.permissions, staff.job_description);

    if (roleProfileName) return roleProfileName;
    if (matchedProfile?.name) return matchedProfile.name;
    if (roleProfileCode) {
      const dept = staff.department;
      const profile = getRoleProfile(dept, roleProfileCode);
      if (profile) return profile.name;
      return roleProfileCode;
    }

    return staff.job_description || '';
  };

  const getStaffRoleProfileCode = (staff) => {
    if (!staff) return '';
    const roleInfo = staff.role_info || staff.roleInfo || staff.role_meta || null;
    const matchedProfile = roleInfo?.role_profile
      ? getRoleProfile(staff.department, roleInfo.role_profile)
      : findRoleProfileByPermissions(staff.department, staff.permissions, staff.job_description);

    return roleInfo?.role_profile || staff.role_profile || matchedProfile?.code || '';
  };

  const updateStaffPermissions = async (staffId, permissions) => {
    try {
      const response = await api.put(`/staff/${staffId}/permissions`, { permissions });
      if (response.data.success) {
        toast.success('Cập nhật quyền thành công');
        loadStaffByDepartment(activeDepartment);
        setEditingPermissions(false);
        // Reload selected staff
        const updatedStaff = staffByDepartment[activeDepartment]?.find(s => s.id === staffId);
        if (updatedStaff) setSelectedStaff({...updatedStaff, permissions});
      }
    } catch (error) {
      console.error('Update permissions error:', error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật quyền');
    }
  };

  const updateStaffJobDescription = async (staffId, job_description) => {
    try {
      const res = await api.put(`/staff/${staffId}`, { job_description });
      if (res.data.success) {
        toast.success('Cập nhật mô tả công việc thành công');
        // Reload staff list for the department
        loadStaffByDepartment(activeDepartment);
        setEditingJobDesc(false);
        // Update selectedStaff locally
        setSelectedStaff(prev => ({ ...prev, job_description }));
      }
    } catch (error) {
      console.error('Update job description error:', error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật mô tả công việc');
    }
  };

  const assignDoctorsToStaff = async (staffId, doctorIds) => {
    try {
      const response = await api.put(`/staff/${staffId}/assign-doctors`, { doctor_ids: doctorIds });
      if (response.data.success) {
        toast.success('Phân công bác sĩ thành công');
        loadStaffByDepartment(activeDepartment);
        setEditingDoctors(false);
        // Reload selected staff
        const updatedStaff = staffByDepartment[activeDepartment]?.find(s => s.id === staffId);
        if (updatedStaff) setSelectedStaff({...updatedStaff, managed_doctors: {doctor_ids: doctorIds}});
      }
    } catch (error) {
      console.error('Assign doctors error:', error);
      toast.error(error.response?.data?.message || 'Không thể phân công bác sĩ');
    }
  };

  // === COMPUTED VALUES ===
  const canManage = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'staff') {
      const perms = user?.role_info?.permissions ||
                    user?.staff?.permissions ||
                    user?.roleData?.permissions || {};
      const staffMgmt = perms['staff_management'];
      const hasAssignPerm = Array.isArray(staffMgmt)
        ? staffMgmt.includes('assign_permissions')
        : staffMgmt?.assign_permissions === true;
        
      // BẮT ĐẦU SỬA: Nếu có quyền IT, cho phép quản lý mọi phòng ban!
      if (hasAssignPerm) {
        return true;
      }

      // Nếu không có quyền IT, phải là Manager của đúng phòng ban
      if (currentStaff?.rank === 'manager' && currentStaff.department === activeDepartment) {
        return true;
      }
    }
    return false;
  }, [user, currentStaff, activeDepartment]);

  const currentDepartmentStaff = useMemo(() => {
    if (activeDepartment === 'overview') return [];
    
    // Tab BGD: hiển thị admin users với format giống staff
    if (activeDepartment === 'BGD') {
      const formattedAdmins = adminUsers.map(admin => ({
        id: admin.id,
        code: admin.username || `ADMIN${admin.id}`,
        username: admin.username,
        rank: 'admin',
        work_status: 'active',
        department: 'BGD',
        phone: admin.phone || 'N/A',
        hire_date: admin.created_at || null,
        User: {
          full_name: admin.full_name,
          email: admin.email,
          avatar_url: admin.avatar_url || null,
          phone: admin.phone || 'N/A'
        },
        // Admin có tất cả quyền mặc định
        permissions: Object.keys(PERMISSION_MODULES).reduce((acc, module) => {
          acc[module] = PERMISSION_MODULES[module].permissions.reduce((permAcc, perm) => {
            permAcc[perm.key] = true;
            return permAcc;
          }, {});
          return acc;
        }, {})
      })).filter(admin => {
        const matchSearch = searchTerm === '' || 
          admin.User?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.code?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch;
      });
      
      return formattedAdmins;
    }
    
    const staff = staffByDepartment[activeDepartment] || [];
    return staff.filter(s => {
      const matchSearch = searchTerm === '' || 
        s.User?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRank = filterRank === 'all' || s.rank === filterRank;
      const roleProfileCode = getStaffRoleProfileCode(s);
      const matchRoleProfile = filterRoleProfile === 'all' || roleProfileCode === filterRoleProfile;
      return matchSearch && matchRank && matchRoleProfile;
    });
  }, [activeDepartment, staffByDepartment, searchTerm, filterRank, filterRoleProfile, adminUsers, PERMISSION_MODULES]);

  const availableRoleProfiles = useMemo(() => {
    if (activeDepartment === 'overview' || activeDepartment === 'assignment' || activeDepartment === 'history') {
      return [];
    }

    const staff = staffByDepartment[activeDepartment] || [];
    const codes = new Set();

    staff.forEach(item => {
      const roleCode = getStaffRoleProfileCode(item);
      if (roleCode) codes.add(roleCode);
    });

    return Array.from(codes).map(code => {
      const role = getRoleProfile(activeDepartment, code);
      return {
        code,
        name: role?.name || code
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [activeDepartment, staffByDepartment]);

  const managers = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'manager'), [currentDepartmentStaff]);
  const normalStaff = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'staff'), [currentDepartmentStaff]);
  const adminStaff = useMemo(() => currentDepartmentStaff.filter(s => s.rank === 'admin'), [currentDepartmentStaff]);

  // === EXPORT REPORT FUNCTION ===
  const handleExportReport = () => {
    try {
      const reportData = {
        department: activeDepartment === 'overview' ? 'Tất cả' : DEPARTMENTS[activeDepartment]?.name,
        totalStaff: activeDepartment === 'overview' 
          ? departmentStats.reduce((sum, d) => sum + d.total_staff, 0)
          : currentDepartmentStaff.length,
        managers: activeDepartment === 'overview'
          ? departmentStats.reduce((sum, d) => sum + d.managers, 0)
          : managers.length,
        activeStaff: activeDepartment === 'overview'
          ? departmentStats.reduce((sum, d) => sum + d.active_staff, 0)
          : currentDepartmentStaff.filter(s => s.work_status === 'active').length,
        generatedAt: new Date().toLocaleString('vi-VN')
      };

      // Create CSV content
      let csvContent = "Báo cáo Nhân sự\n\n";
      csvContent += `Phòng ban:,${reportData.department}\n`;
      csvContent += `Tổng nhân viên:,${reportData.totalStaff}\n`;
      csvContent += `Quản lý:,${reportData.managers}\n`;
      csvContent += `Đang hoạt động:,${reportData.activeStaff}\n`;
      csvContent += `Ngày tạo:,${reportData.generatedAt}\n\n`;
      
      if (activeDepartment !== 'overview') {
        csvContent += "STT,Họ tên,Mã NV,Email,Chức vụ,Vai trò,Trạng thái\n";
        currentDepartmentStaff.forEach((staff, index) => {
          const roleLabel = getStaffRoleLabel(staff) || '';
          csvContent += `${index + 1},${staff.User?.full_name || staff.username},${staff.code},${staff.User?.email || 'N/A'},${getRankLabel(staff.rank)},${roleLabel},${staff.work_status === 'active' ? 'Hoạt động' : 'Không hoạt động'}\n`;
        });
      }

      // Download file
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `BaoCao_NhanSu_${activeDepartment}_${Date.now()}.csv`);
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };
  
  // === RENDER STAFF LIST WITH REAL DATA ===
  const renderStaffList = () => (
     <div className="smp-list-panel">
        <div className="smp-toolbar" style={{border: 'none', borderBottom: '1px solid #eee', borderRadius: 0}}>
           <div className="search-box-compact">
              <FaSearch color="#ccc"/>
              <input 
                placeholder="Tìm tên, mã NV..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
           </div>
           <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
             <select 
               value={filterRank} 
               onChange={e => setFilterRank(e.target.value)}
               style={{padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px'}}
             >
               <option value="all">Tất cả</option>
               <option value="manager">Manager</option>
               <option value="staff">Staff</option>
             </select>

             <select
               value={filterRoleProfile}
               onChange={e => setFilterRoleProfile(e.target.value)}
               style={{padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px'}}
             >
               <option value="all">Tất cả vai trò con</option>
               {availableRoleProfiles.map(profile => (
                 <option key={profile.code} value={profile.code}>
                   {profile.name}
                 </option>
               ))}
             </select>
           </div>
        </div>
        
        <div className="list-scroll-area">
           {loading ? (
             <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>
               Đang tải...
             </div>
           ) : (
             <>
               {/* Admin Section (chỉ hiện ở tab BGD) */}
               {adminStaff.length > 0 && (
                 <>
                   <div className="smp-section-header" style={{background: '#FFF3E0', color: '#E65100'}}>
                     Giám đốc ({adminStaff.length})
                   </div>
                   {adminStaff.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar" style={{background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', color: 'white', fontWeight: 'bold'}}>
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'A'
                         )}
                       </div>
                       <div className="staff-info">
                        <strong>{staff.User?.full_name || staff.username}</strong>
                        {/* Hiển thị vai trò con nếu có */}
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          {staff.code} |
                          <span style={{color: '#2e7d32', fontWeight: '500'}}>{getRankLabel(staff.rank)} | {getStaffRoleLabel(staff) || ''}</span>
                        </span>
                      </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {managers.length > 0 && (
                 <>
                   <div className="smp-section-header">Quản lý ({managers.length})</div>
                   {managers.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar">
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'M'
                         )}
                       </div>
                       <div className="staff-info">
                         <strong>{staff.User?.full_name || staff.username}</strong>
                        <span>{staff.code} | {getRankLabel(staff.rank)} | {getStaffRoleLabel(staff) || 'Manager'}</span>
                       </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {normalStaff.length > 0 && (
                 <>
                   <div className="smp-section-header">Nhân viên ({normalStaff.length})</div>
                   {normalStaff.map(staff => (
                     <div 
                       key={staff.id} 
                       className={`smp-staff-item ${selectedStaff?.id === staff.id ? 'selected' : ''}`} 
                       onClick={() => setSelectedStaff(staff)}
                     >
                       <div className="staff-avatar" style={{color: '#666', background: '#f5f5f5'}}>
                         {staff.User?.avatar_url ? (
                           <img src={staff.User.avatar_url} alt={staff.User.full_name} />
                         ) : (
                           staff.User?.full_name?.charAt(0) || 'S'
                         )}
                       </div>
                       <div className="staff-info">
                         <strong>{staff.User?.full_name || staff.username}</strong>
                         <span>{staff.code} | {getRankLabel(staff.rank)} | {getStaffRoleLabel(staff) || 'Staff'}</span>
                       </div>
                       <StatusBadge status={staff.work_status} />
                     </div>
                   ))}
                 </>
               )}

               {currentDepartmentStaff.length === 0 && (
                 <div style={{padding: '40px 20px', textAlign: 'center', color: '#999'}}>
                   <FaUserMd size={32} style={{opacity: 0.3, marginBottom: '12px'}} />
                   <p>Chưa có nhân viên trong phòng ban này</p>
                 </div>
               )}
             </>
           )}
        </div>
     </div>
  );

  return (
    <div className="smp-container">
      {/* 1. Header cố định */}
      <div className="smp-header">
        <div className="header-left">
          <h1><FaUserMd /> Quản lý Nhân sự</h1>
        </div>
        <div className="header-actions">
           <button className="btn-secondary" onClick={handleExportReport}>
             <FaFileExport /> Xuất báo cáo
           </button>
        </div>
      </div>

      {/* 2. Tabs Bar - Hiển thị tất cả tab nếu có quyền IT */}
      <div className="smp-tabs-bar">
        {/* Kiểm tra nhanh nếu là Admin HOẶC Staff có quyền quản lý nhân sự (canManage = true) */}
        {(user?.role === 'admin' || canManage) ? (
          <>
            <button 
                className={`dept-tab ${activeDepartment === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('overview')}
            >
                <FaChartPie /> Tổng quan
            </button>
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => {
                const isActive = activeDepartment === key;
                const deptColor = departmentColors[key] || '#4CAF50'; 

              return (
                <button 
                    key={key}
                    className={`dept-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveDepartment(key)}
                    data-dept={key}
                    style={isActive ? {
                      backgroundColor: `${deptColor}20`,
                      color: deptColor,
                      borderBottom: `3px solid ${deptColor}`,
                      fontWeight: 600
                    } : {}}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = `${deptColor}15`; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    {dept.icon} {dept.name}
                </button>
              );
            })}
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            <button 
                className={`dept-tab ${activeDepartment === 'assignment' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('assignment')}
            >
                <FaExchangeAlt /> Phân ban
            </button>
            <button 
                className={`dept-tab ${activeDepartment === 'history' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('history')}
            >
                <FaChartLine /> Lịch sử
            </button>
          </>
        ) : (
          // Dành cho Staff bình thường (không có quyền phân quyền) chỉ thấy phòng ban mình
          user?.role === 'staff' && currentStaff && (
          <>
            <button 
                className={`dept-tab ${activeDepartment === currentStaff.department ? 'active' : ''}`}
                onClick={() => setActiveDepartment(currentStaff.department)}
                style={activeDepartment === currentStaff.department ? {
                  backgroundColor: `${departmentColors[currentStaff.department] || '#4CAF50'}20`,
                  color: departmentColors[currentStaff.department] || '#4CAF50',
                  borderBottom: `3px solid ${departmentColors[currentStaff.department] || '#4CAF50'}`,
                  fontWeight: 600
                } : {}}
            >
                {DEPARTMENTS[currentStaff.department]?.icon} {DEPARTMENTS[currentStaff.department]?.name}
            </button>
            <div style={{width: 1, height: 20, background: '#e0e0e0', margin: '0 8px'}}></div>
            <button 
                className={`dept-tab ${activeDepartment === 'history' ? 'active' : ''}`}
                onClick={() => setActiveDepartment('history')}
            >
                <FaChartLine /> Lịch sử
            </button>
          </>
          )
        )}
      </div>
        
        

      {/* 3. Main Body (Scrollable inside) */}
      <div className="smp-body">
        {activeDepartment === 'overview' ? (
            <OverviewDashboard 
                departmentStats={departmentStats} 
                DEPARTMENTS={DEPARTMENTS}
                onSelectDepartment={setActiveDepartment}
                staffByDepartment={staffByDepartment}
                adminUsers={adminUsers}
                setActiveDepartment={setActiveDepartment}
                setSelectedStaff={setSelectedStaff}
                departmentColors={departmentColors}
            />
        ) : activeDepartment === 'assignment' ? (
            /* Tab Phân ban */
            <DepartmentAssignmentTab 
                DEPARTMENTS={DEPARTMENTS}
                departmentColors={departmentColors}
            />
        ) : activeDepartment === 'history' ? (
            /* Tab Lịch sử */
            <HistoryTab />
        ) : (
            <div className="smp-split-view">{renderStaffList()}
                
                {/* Right Panel: Staff Detail với tabs */}
                <div className="smp-detail-panel">
                    {selectedStaff ? (
                        <>
                            {/* Detail Header */}
                            <div className="detail-header" style={{padding: '16px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                <div style={{display:'flex', gap:'12px', alignItems: 'center'}}>
                                    <div className="staff-avatar" style={{width: 48, height: 48, fontSize: 20}}>
                                      {selectedStaff.User?.avatar_url ? (
                                        <img src={selectedStaff.User.avatar_url} alt={selectedStaff.User.full_name} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                      ) : (
                                        selectedStaff.User?.full_name?.charAt(0) || 'U'
                                      )}
                                    </div>
                                    <div>
                                        <h2 style={{margin:0, fontSize: 18}}>{selectedStaff.User?.full_name || selectedStaff.username}</h2>
                                        {/* --- SỬA ĐOẠN NÀY --- */}
                                    <p style={{margin:0, color:'#666', fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        <span style={{fontWeight: 'bold', color: '#2e7d32'}}>{getRankLabel(selectedStaff.rank)} | {getStaffRoleLabel(selectedStaff) || ''}</span>
                                        <span>|</span>
                                        <span>{DEPARTMENTS[selectedStaff.department]?.name || DEPARTMENTS[activeDepartment]?.name}</span>
                                    </p>
                                    {/* ------------------- */}
                                    </div>
                                </div>
                                <div className="header-actions">
                                    <StatusBadge status={selectedStaff.work_status} />
                                </div>
                            </div>

                            {/* Tabs for Info, Permissions, Doctors (chỉ clinical) */}
                            <div className="detail-tabs-bar">
                              <button 
                                className={`detail-tab ${!editingPermissions && !editingDoctors ? 'active' : ''}`}
                                onClick={() => { setEditingPermissions(false); setEditingDoctors(false); }}
                              >
                                Thông tin
                              </button>
                              {canManage && (
                                <>
                                  <button 
                                    className={`detail-tab ${editingPermissions ? 'active' : ''}`}
                                    onClick={() => { setEditingPermissions(true); setEditingDoctors(false); }}
                                  >
                                    Quyền hạn
                                  </button>
                                  {activeDepartment === 'clinical' && selectedStaff.rank !== 'manager' && (
                                    <button 
                                      className={`detail-tab ${editingDoctors ? 'active' : ''}`}
                                      onClick={() => { setEditingDoctors(true); setEditingPermissions(false); }}
                                    >
                                      Phân công bác sĩ
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Tab Content */}
                            <div className="detail-scroll-area" style={{padding: '16px'}}>
                                {!editingPermissions && !editingDoctors && (
                                  // INFO TAB
                                  <div className="info-section">
                                    <h4 style={{marginBottom: '12px', fontSize: '14px', fontWeight: 600}}>Thông tin cá nhân</h4>
                                    <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px'}}>
                                      <div style={{color: '#666'}}>Email:</div>
                                      <div>{selectedStaff.User?.email || 'N/A'}</div>
                                      
                                      <div style={{color: '#666'}}>Số điện thoại:</div>
                                      <div>{selectedStaff.User?.phone || 'N/A'}</div>
                                      
                                      <div style={{color: '#666'}}>Mã nhân viên:</div>
                                      <div>{selectedStaff.code}</div>
                                      
                                      <div style={{color: '#666'}}>Chức vụ:</div>
                                      <div>{getRankLabel(selectedStaff.rank)}</div>
                                      
                                      <div style={{color: '#666'}}>Ngày tham gia:</div>
                                      <div>{new Date(selectedStaff.created_at).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13px', marginTop: '8px'}}>
                                      <div style={{color: '#666'}}>Vai trò:</div>
                                      <div>{getStaffRoleLabel(selectedStaff) || selectedStaff.job_description || ''}</div>
                                    </div>
                                    
                                    {selectedStaff.job_description && (
                                        <div style={{marginTop: '16px'}}>
                                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <h4 style={{marginBottom: '8px', fontSize: '14px', fontWeight: 600}}>Mô tả công việc</h4>
                                            {canManage && !editingJobDesc && (
                                              <button className="btn-link" onClick={() => { setEditingJobDesc(true); setJobDescDraft(selectedStaff.job_description || ''); }}>Chỉnh sửa</button>
                                            )}
                                          </div>

                                          {!editingJobDesc && (
                                            <p style={{fontSize: '13px', color: '#555', lineHeight: 1.6}}>{selectedStaff.job_description}</p>
                                          )}

                                          {editingJobDesc && (
                                            <div>
                                              <textarea value={jobDescDraft} onChange={(e) => setJobDescDraft(e.target.value)} rows={4} style={{width: '100%', fontSize: '13px', padding: '8px'}} />
                                              <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                                                <button className="btn-primary btn-sm" onClick={() => updateStaffJobDescription(selectedStaff.id, jobDescDraft)}><FaCheck /> Lưu</button>
                                                <button className="btn-secondary btn-sm" onClick={() => { setEditingJobDesc(false); setJobDescDraft(''); }}><FaTimes /> Hủy</button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                    )}
                                  </div>
                                )}

                                {editingPermissions && canManage && (
                                  // PERMISSIONS TAB - REDESIGNED WITH MODULES
                                  <div className="permissions-section">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                      <h4 style={{margin: 0, fontSize: '15px', fontWeight: 600}}>Cấu hình quyền hạn chi tiết</h4>
                                      <div style={{display: 'flex', gap: '8px'}}>
                                        <button 
                                          className="btn-secondary btn-sm"
                                          onClick={() => {
                                            setTempPermissions(selectedStaff.permissions || {});
                                            setEditingPermissions(false);
                                          }}
                                        >
                                          <FaTimes /> Hủy
                                        </button>
                                        <button 
                                          className="btn-primary btn-sm"
                                          onClick={() => updateStaffPermissions(selectedStaff.id, tempPermissions)}
                                        >
                                          <FaCheck /> Lưu thay đổi
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Thông báo cho admin */}
                                    {selectedStaff.rank === 'admin' && (
                                      <div style={{
                                        background: '#FFF3E0',
                                        border: '2px solid #FF9800',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                      }}>
                                        <FaUserShield style={{ fontSize: '24px', color: '#FF9800' }} />
                                        <div>
                                          <div style={{ fontWeight: 'bold', color: '#E65100', marginBottom: '4px' }}>
                                            Thành viên Ban Giám Đốc
                                          </div>
                                          <div style={{ fontSize: '13px', color: '#666' }}>
                                            Người dùng này có toàn quyền quản lý hệ thống. Tất cả quyền hạn đã được cấp mặc định và không thể chỉnh sửa.
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '28px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px'}}>
                                      {Object.entries(PERMISSION_MODULES).map(([moduleKey, module]) => {
                                        const ModuleIcon = module.icon;
                                        const modulePermissions = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                        const isAllChecked = module.permissions.length > 0 && module.permissions.every(permission => modulePermissions.includes(permission.key));
                                        const isAnyChecked = modulePermissions.length > 0;

                                        return (
                                          <div
                                            key={moduleKey}
                                            className="permission-module"
                                            style={{
                                              background: isAnyChecked ? '#FAFAFA' : '#F5F5F5',
                                              border: isAnyChecked ? '1px solid #E0E0E0' : '1px dashed #BDBDBD',
                                              borderRadius: '8px',
                                              padding: '16px',
                                              opacity: 1
                                            }}
                                          >
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '2px solid #E0E0E0'}}>
                                              <span style={{fontSize: '20px', color: isAnyChecked ? '#4CAF50' : '#BDBDBD'}}>
                                                <ModuleIcon />
                                              </span>
                                              <div style={{display: 'flex', flexDirection: 'column'}}>
                                                <h5 style={{margin: 0, fontSize: '14px', fontWeight: 600, color: '#333'}}>{module.name}</h5>
                                                <span style={{fontSize: '11px', color: '#777'}}>{module.description}</span>
                                              </div>
                                              <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, cursor: selectedStaff.rank === 'admin' ? 'not-allowed' : 'pointer'}}>
                                                <input
                                                  type="checkbox"
                                                  disabled={selectedStaff.rank === 'admin'}
                                                  checked={isAllChecked}
                                                  onChange={e => {
                                                    const currentPerms = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                                    if (e.target.checked) {
                                                      const keysToAdd = module.permissions.map(permission => permission.key);
                                                      const newPerms = [...new Set([...currentPerms, ...keysToAdd])];
                                                      setTempPermissions({ ...tempPermissions, [moduleKey]: newPerms });
                                                    } else {
                                                      const keysToRemove = module.permissions.map(permission => permission.key);
                                                      const newPerms = currentPerms.filter(permissionKey => !keysToRemove.includes(permissionKey));
                                                      setTempPermissions({ ...tempPermissions, [moduleKey]: newPerms });
                                                    }
                                                  }}
                                                  style={{marginRight: 4}}
                                                />
                                                Bật/tắt tất cả
                                              </label>
                                            </div>

                                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px'}}>
                                              {module.permissions.map(permission => {
                                                const hasPermission = modulePermissions.includes(permission.key);

                                                return (
                                                  <div
                                                    key={permission.key}
                                                    onClick={() => {
                                                      if (selectedStaff.rank === 'admin') return;
                                                      const currentPerms = Array.isArray(tempPermissions[moduleKey]) ? tempPermissions[moduleKey] : [];
                                                      const newPerms = hasPermission
                                                        ? currentPerms.filter(permissionKey => permissionKey !== permission.key)
                                                        : [...currentPerms, permission.key];
                                                      setTempPermissions({ ...tempPermissions, [moduleKey]: newPerms });
                                                    }}
                                                    style={{
                                                      background: hasPermission ? '#E8F5E9' : 'white',
                                                      border: hasPermission ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                                                      borderRadius: '6px',
                                                      padding: '12px',
                                                      cursor: selectedStaff.rank === 'admin' ? 'not-allowed' : 'pointer',
                                                      transition: 'all 0.2s',
                                                      position: 'relative',
                                                      opacity: selectedStaff.rank === 'admin' ? 0.7 : 1
                                                    }}
                                                    className="permission-card"
                                                  >
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '8px',
                                                      right: '8px',
                                                      width: '18px',
                                                      height: '18px',
                                                      borderRadius: '4px',
                                                      border: hasPermission ? '2px solid #4CAF50' : '2px solid #CCC',
                                                      background: hasPermission ? '#4CAF50' : 'white',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      color: 'white',
                                                      fontSize: '12px'
                                                    }}>
                                                      {hasPermission && <FaCheck size={10} />}
                                                    </div>

                                                    <div style={{fontSize: '13px', fontWeight: 600, color: hasPermission ? '#2E7D32' : '#555', marginBottom: '4px', paddingRight: '24px'}}>
                                                      {permission.label}
                                                    </div>
                                                    <div style={{fontSize: '11px', color: hasPermission ? '#66BB6A' : '#999', lineHeight: 1.4, paddingRight: '24px'}}>
                                                      {permission.description}
                                                    </div>
                                                    {(permission.allowedRanks || permission.allowedDepts) && (
                                                      <div style={{marginTop: '8px', fontSize: '10px', color: '#777'}}>
                                                        {permission.allowedRanks && `Rank: ${permission.allowedRanks.join(', ')}`}
                                                        {permission.allowedRanks && permission.allowedDepts && ' | '}
                                                        {permission.allowedDepts && `Dept: ${permission.allowedDepts.join(', ')}`}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}



                                    </div>
                                  </div>
                                )}

                                {editingDoctors && canManage && selectedStaff.rank !== 'manager' && (
                                  // DOCTORS TAB
                                  <div className="doctors-section">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                      <h4 style={{margin: 0, fontSize: '14px', fontWeight: 600}}>Phân công bác sĩ</h4>
                                      <div style={{display: 'flex', gap: '8px'}}>
                                        <button 
                                          className="btn-secondary btn-sm"
                                          onClick={() => {
                                            setSelectedDoctorIds(selectedStaff.managed_doctors?.doctor_ids || []);
                                            setEditingDoctors(false);
                                          }}
                                        >
                                          <FaTimes /> Hủy
                                        </button>
                                        <button 
                                          className="btn-primary btn-sm"
                                          onClick={() => assignDoctorsToStaff(selectedStaff.id, selectedDoctorIds)}
                                        >
                                          <FaCheck /> Lưu
                                        </button>
                                      </div>
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px'}}>
                                      <label style={{fontSize: '12px', fontWeight: 600, color: '#666'}}>Lọc theo chuyên khoa</label>
                                      <select
                                        value={selectedDoctorSpecialty}
                                        onChange={(e) => setSelectedDoctorSpecialty(e.target.value)}
                                        style={{
                                          minWidth: '240px',
                                          padding: '8px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid #d9d9d9',
                                          background: '#fff'
                                        }}
                                      >
                                        <option value="all">Tất cả chuyên khoa</option>
                                        {specialties.map(sp => (
                                          <option key={sp.id} value={String(sp.id)}>{sp.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                                      {Object.entries(
                                        allDoctors
                                          .filter(doctor => {
                                            if (selectedDoctorSpecialty === 'all') return true;
                                            const doctorSpecialtyId = doctor.specialty?.id || doctor.specialty_id || doctor.raw?.specialty_id || doctor.raw?.Doctor?.specialty_id;
                                            return String(doctorSpecialtyId) === String(selectedDoctorSpecialty);
                                          })
                                          .reduce((groups, doctor) => {
                                          const specialty = doctor.specialty?.name || doctor.Specialty?.name || 'Chưa phân loại';
                                          console.log('DEBUG doctor specialty:', doctor.id, doctor.specialty, specialty);
                                          if (!groups[specialty]) groups[specialty] = [];
                                          groups[specialty].push(doctor);
                                          return groups;
                                        }, {})
                                      ).map(([specialty, doctors]) => (
                                        <div key={specialty} style={{marginBottom: '16px'}}>
                                          <div style={{
                                            fontSize: '12px', 
                                            fontWeight: 600, 
                                            color: '#666', 
                                            marginBottom: '8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}>
                                            <FaStethoscope size={14} /> {specialty}
                                          </div>
                                          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                            {doctors.map(doctor => {
                                              const isSelected = selectedDoctorIds.includes(doctor.id);
                                              return (
                                                <div 
                                                  key={doctor.id} 
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      setSelectedDoctorIds(selectedDoctorIds.filter(id => id !== doctor.id));
                                                    } else {
                                                      setSelectedDoctorIds([...selectedDoctorIds, doctor.id]);
                                                    }
                                                  }}
                                                  style={{
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '12px', 
                                                    padding: '10px', 
                                                    background: isSelected ? '#E8F5E9' : '#f9f9f9', 
                                                    borderRadius: '6px',
                                                    border: isSelected ? '1px solid #4CAF50' : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    zIndex: 100
                                                  }}
                                                >
                                                  {isSelected && <FaCheck color="#4CAF50" />}
                                                  <div className="staff-avatar" style={{width: 32, height: 32, fontSize: 14}}>
                                                    {doctor.avatar_url ? (
                                                      <img src={doctor.avatar_url} alt={doctor.full_name} style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                                    ) : (
                                                      doctor.full_name?.charAt(0) || 'D'
                                                    )}
                                                  </div>
                                                  <div style={{flex: 1}}>
                                                    <div style={{fontSize: '13px', fontWeight: 500}}>{doctor.full_name}</div>
                                                    <div style={{fontSize: '12px', color: '#666'}}>{doctor.email}</div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#999', flexDirection:'column'}}>
                            <FaUserMd size={48} style={{marginBottom: 16, opacity: 0.5}}/>
                            <p>Chọn nhân viên để xem chi tiết</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagementPage;
