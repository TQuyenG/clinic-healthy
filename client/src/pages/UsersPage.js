// client/src/pages/UsersPage.js - HOÀN CHỈNH
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  FaUserPlus, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaLock, 
  FaUnlock,
  FaKey,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCheckSquare,
  FaSquare,
  FaFileExcel,
  FaFileCsv,
  FaChevronDown,
  FaChevronUp,
  FaUserCheck,
  FaEye,
  FaUsers,
  FaSync
} from 'react-icons/fa';
import './UsersPage.css';

const UsersPage = () => {
  // (Removed static DEPARTMENTS mapping - department filter no longer required)

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Data states
  const [users, setUsers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states (always visible)
  const [filters, setFilters] = useState({
    keyword: '',
    role: '',
    is_active: '',
    is_verified: '',
    created_from: '',
    created_to: ''
  });

  // Local sort selector state will update sortConfig
  const [sortSelector, setSortSelector] = useState('newest');
  
  // Sort states
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  
  // Pagination states
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Modal states
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create', 'edit', 'bulkPassword'
  const [bulkPassword, setBulkPassword] = useState('');
  
  // Form data state
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    address: '',
    gender: '',
    dob: '',
    role: 'patient',
    specialty_id: '',
    // For staff role
    department: '',
    rank: 'staff'
  });

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [noticeDialog, setNoticeDialog] = useState({ open: false, title: 'Thông báo', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: 'Xác nhận', message: '' });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, userId: null, password: '', loading: false });
  const confirmActionRef = useRef(null);
  
  // Hooks
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const openNoticeDialog = (message, title = 'Thông báo') => {
    setNoticeDialog({ open: true, title, message });
  };

  const closeNoticeDialog = () => {
    setNoticeDialog({ open: false, title: 'Thông báo', message: '' });
  };

  const openConfirmDialog = (message, onConfirm, title = 'Xác nhận') => {
    confirmActionRef.current = onConfirm;
    setConfirmDialog({ open: true, title, message });
  };

  const closeConfirmDialog = () => {
    confirmActionRef.current = null;
    setConfirmDialog({ open: false, title: 'Xác nhận', message: '' });
  };

  const handleConfirmAccept = async () => {
    const action = confirmActionRef.current;
    closeConfirmDialog();
    if (typeof action === 'function') {
      await action();
    }
  };

  const openPasswordDialog = (userId) => {
    setPasswordDialog({ open: true, userId, password: '', loading: false });
  };

  const closePasswordDialog = () => {
    setPasswordDialog({ open: false, userId: null, password: '', loading: false });
  };

  const updateFilter = (field, value) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setSortSelector('newest');
    setSortConfig({ key: 'created_at', direction: 'desc' });
    setFilters({
      keyword: '',
      role: '',
      is_active: '',
      is_verified: '',
      created_from: '',
      created_to: ''
    });
  };

  // ============================================
  // EFFECTS
  // ============================================
  
  // Auto open detail modal from notification link
  useEffect(() => {
    const userIdFromQuery = searchParams.get('userId');
    if (userIdFromQuery) {
      handleViewDetail({ id: parseInt(userIdFromQuery) });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('userId');
      setSearchParams(newParams);
    }
  }, []);

  // Fetch users when filters/pagination/sort change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, filters, sortConfig]);

  // Fetch specialties on mount
  useEffect(() => {
    fetchSpecialties();
  }, []);

  // Filters are always visible; no responsive toggle needed.

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...filters
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const res = await axios.get('http://localhost:3001/api/users/search', {
        params,
        ...axiosConfig
      });

      if (res.data.success) {
        setUsers(res.data.users || []);
        setPagination(prev => ({
          ...prev,
          total: res.data.total || 0,
          totalPages: res.data.totalPages || 0
        }));
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error);
      openNoticeDialog('Không thể tải danh sách người dùng', 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/specialties');
      if (res.data.success) {
        setSpecialties(res.data.specialties || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải chuyên khoa:', error);
    }
  };

  // ============================================
  // DETAIL MODAL FUNCTIONS
  // ============================================

  const handleViewDetail = async (user) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      
      const res = await axios.get(
        `http://localhost:3001/api/users/${user.id}`, 
        axiosConfig
      );

      if (res.data.success) {
        setDetailUser(res.data.user);
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết user:', error);
      openNoticeDialog('Không thể tải thông tin chi tiết người dùng', 'Lỗi');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setDetailUser(null);
  };

  const handleVerifyFromDetail = async () => {
    if (!detailUser) return;

    try {
      const res = await axios.put(
        `http://localhost:3001/api/users/${detailUser.id}/toggle-verification`,
        { is_verified: !detailUser.is_verified },
        axiosConfig
      );

      if (res.data.success) {
        openNoticeDialog(res.data.message, 'Thành công');
        setDetailUser({ ...detailUser, is_verified: !detailUser.is_verified });
        fetchUsers();
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi xác thực:', error);
      openNoticeDialog('Không thể thay đổi trạng thái xác thực', 'Lỗi');
    }
  };

  const handleToggleStatusFromDetail = async () => {
    if (!detailUser) return;

    try {
      const res = await axios.put(
        `http://localhost:3001/api/users/${detailUser.id}/toggle-status`,
        { is_active: !detailUser.is_active },
        axiosConfig
      );

      if (res.data.success) {
        openNoticeDialog(res.data.message, 'Thành công');
        setDetailUser({ ...detailUser, is_active: !detailUser.is_active });
        fetchUsers();
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái:', error);
      openNoticeDialog('Không thể thay đổi trạng thái tài khoản', 'Lỗi');
    }
  };

  const handleResetPasswordFromDetail = async () => {
    if (!detailUser) return;
    openPasswordDialog(detailUser.id);
  };

  const handleSubmitPasswordDialog = async () => {
    const newPassword = passwordDialog.password;
    if (!newPassword || newPassword.length < 6) {
      openNoticeDialog('Mật khẩu phải có ít nhất 6 ký tự', 'Dữ liệu chưa hợp lệ');
      return;
    }

    try {
      setPasswordDialog(prev => ({ ...prev, loading: true }));
      const res = await axios.put(
        `http://localhost:3001/api/users/${passwordDialog.userId}/reset-password-admin`,
        { new_password: newPassword },
        axiosConfig
      );

      if (res.data.success) {
        closePasswordDialog();
        openNoticeDialog(res.data.message, 'Thành công');
      }
    } catch (error) {
      console.error('Lỗi khi đặt lại mật khẩu:', error);
      openNoticeDialog('Không thể đặt lại mật khẩu', 'Lỗi');
    } finally {
      setPasswordDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleEditFromDetail = () => {
    if (!detailUser) return;
    handleCloseDetail();
    handleEdit(detailUser);
  };

  // ============================================
  // CRUD FUNCTIONS
  // ============================================

  const handleEdit = (user) => {
    // Fetch full user profile to get Staff/Doctor details before editing
    (async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/users/${user.id}`, axiosConfig);
        if (res.data.success) {
          const u = res.data.user || {};
          setEditingUser(u);
          setNewUserData({
            email: u.email || '',
            password: '',
            full_name: u.full_name || '',
            phone: u.phone || '',
            address: u.address || '',
            gender: u.gender || '',
            dob: u.dob ? new Date(u.dob).toISOString().split('T')[0] : '',
            role: u.role || 'patient',
            specialty_id: (u.Doctor && u.Doctor.specialty_id) || (u.roleData && u.roleData.specialty_id) || '',
            department: (u.Staff && u.Staff.department) || (u.roleData && u.roleData.department) || '',
            rank: (u.Staff && u.Staff.rank) || (u.roleData && u.roleData.rank) || 'staff'
          });
          setModalType('edit');
          setShowModal(true);
        } else {
          openNoticeDialog('Không thể tải thông tin người dùng để chỉnh sửa', 'Lỗi');
        }
      } catch (err) {
        console.error('Lỗi khi tải user để edit:', err);
        openNoticeDialog('Không thể tải thông tin người dùng để chỉnh sửa', 'Lỗi');
      }
    })();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const res = await axios.post(
        'http://localhost:3001/api/users/register',
        newUserData,
        axiosConfig
      );

      if (res.data.success) {
        openNoticeDialog('Thêm người dùng thành công!', 'Thành công');
        setShowModal(false);
        fetchUsers();
        resetNewUserData();
      }
    } catch (error) {
      console.error('Lỗi khi tạo user:', error);
      openNoticeDialog(error.response?.data?.message || 'Không thể tạo người dùng', 'Lỗi');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const res = await axios.put(
        `http://localhost:3001/api/users/${editingUser.id}`,
        newUserData,
        axiosConfig
      );

      if (res.data.success) {
        openNoticeDialog('Cập nhật người dùng thành công!', 'Thành công');
        setShowModal(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      openNoticeDialog(error.response?.data?.message || 'Không thể cập nhật người dùng', 'Lỗi');
    }
  };

  const handleToggleVerification = async (userId, currentStatus) => {
    openConfirmDialog(
      `Bạn có chắc muốn ${currentStatus ? 'hủy xác thực' : 'xác thực'} tài khoản này?`,
      async () => {
        try {
          const res = await axios.put(
            `http://localhost:3001/api/users/${userId}/toggle-verification`,
            { is_verified: !currentStatus },
            axiosConfig
          );

          if (res.data.success) {
            openNoticeDialog(res.data.message, 'Thành công');
            fetchUsers();
          }
        } catch (error) {
          console.error('Lỗi khi thay đổi xác thực:', error);
          openNoticeDialog('Không thể thay đổi trạng thái xác thực', 'Lỗi');
        }
      },
      'Xác nhận thay đổi'
    );
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    openConfirmDialog(
      `Bạn có chắc muốn ${currentStatus ? 'khóa' : 'mở khóa'} tài khoản này?`,
      async () => {
        try {
          const res = await axios.put(
            `http://localhost:3001/api/users/${userId}/toggle-status`,
            { is_active: !currentStatus },
            axiosConfig
          );

          if (res.data.success) {
            openNoticeDialog(res.data.message, 'Thành công');
            fetchUsers();
          }
        } catch (error) {
          console.error('Lỗi khi thay đổi trạng thái:', error);
          openNoticeDialog('Không thể thay đổi trạng thái tài khoản', 'Lỗi');
        }
      },
      'Xác nhận thay đổi'
    );
  };

  const handleBulkPasswordReset = async () => {
    if (!bulkPassword || bulkPassword.length < 6) {
      openNoticeDialog('Mật khẩu phải có ít nhất 6 ký tự', 'Dữ liệu chưa hợp lệ');
      return;
    }

    try {
      const promises = selectedUsers.map(userId =>
        axios.put(
          `http://localhost:3001/api/users/${userId}/reset-password-admin`,
          { new_password: bulkPassword },
          axiosConfig
        )
      );

      await Promise.all(promises);
      openNoticeDialog(`Đã đặt lại mật khẩu cho ${selectedUsers.length} tài khoản`, 'Thành công');
      setShowModal(false);
      setBulkPassword('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('Lỗi khi đặt lại mật khẩu hàng loạt:', error);
      openNoticeDialog('Không thể đặt lại mật khẩu cho một số tài khoản', 'Lỗi');
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const resetNewUserData = () => {
    setNewUserData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      address: '',
      gender: '',
      dob: '',
      role: 'patient',
      specialty_id: ''
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      const newDirection = prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc';
      // keep the sortSelector in sync when sorting by created_at
      if (key === 'created_at') {
        setSortSelector(newDirection === 'desc' ? 'newest' : 'oldest');
      }
      return { key, direction: newDirection };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="userspage-sort-icon" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="userspage-sort-icon" /> : 
      <FaSortDown className="userspage-sort-icon" />;
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  // NOTE: server now flattens role-specific code into `user.code`.

  const exportToExcel = () => {
    const exportData = users.map(user => ({
      'ID': user.id,
      'Email': user.email,
      'Họ tên': user.full_name || '',
      'SĐT': user.phone || '',
      'Địa chỉ': user.address || '',
      'Giới tính': user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác',
      'Ngày sinh': formatDate(user.dob),
      'Vai trò': user.role,
      'Trạng thái': user.is_active ? 'Hoạt động' : 'Khóa',
      'Xác thực': user.is_verified ? 'Đã xác thực' : 'Chưa xác thực',
      'Ngày tạo': formatDate(user.created_at),
      'Đăng nhập lần cuối': formatDate(user.last_login)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    const exportData = users.map(user => ({
      'ID': user.id,
      'Email': user.email,
      'Họ tên': user.full_name || '',
      'SĐT': user.phone || '',
      'Địa chỉ': user.address || '',
      'Giới tính': user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác',
      'Ngày sinh': formatDate(user.dob),
      'Vai trò': user.role,
      'Trạng thái': user.is_active ? 'Hoạt động' : 'Khóa',
      'Xác thực': user.is_verified ? 'Đã xác thực' : 'Chưa xác thực',
      'Ngày tạo': formatDate(user.created_at),
      'Đăng nhập lần cuối': formatDate(user.last_login)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="userspage-container">
      {/* Header */}
      <div className="userspage-header">
        <h1 className="userspage-title"><FaUsers /> Quản lý người dùng</h1>
        <div className="userspage-header-actions">
          <button className="userspage-button userspage-button-export" onClick={exportToExcel}>
            <FaFileExcel /> Excel
          </button>
          <button className="userspage-button userspage-button-export" onClick={exportToCSV}>
            <FaFileCsv /> CSV
          </button>
          <button className="userspage-button userspage-button-secondary" onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchUsers(); }} title="Làm mới">
            <FaSync /> Làm mới
          </button>
          <button 
            className="userspage-button userspage-button-primary" 
            onClick={() => {
              setModalType('create');
              setShowModal(true);
              resetNewUserData();
            }}
          >
            <FaUserPlus /> Thêm người dùng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="userspage-filters">
        <div className="userspage-search-box">
          <FaSearch className="userspage-search-icon" />
          <input
            type="text"
            placeholder="Tìm theo email, tên, SĐT..."
            value={filters.keyword}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            className="userspage-search-input"
          />
        </div>

        <div className="userspage-advanced-filters">
            <select
              value={filters.role}
              onChange={(e) => updateFilter('role', e.target.value)}
              className="userspage-filter-select"
            >
              <option value="">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
              <option value="patient">Patient</option>
            </select>

            <select
              value={filters.is_active}
              onChange={(e) => updateFilter('is_active', e.target.value)}
              className="userspage-filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Khóa</option>
            </select>

            <select
              value={filters.is_verified}
              onChange={(e) => updateFilter('is_verified', e.target.value)}
              className="userspage-filter-select"
            >
              <option value="">Tất cả xác thực</option>
              <option value="true">Đã xác thực</option>
              <option value="false">Chưa xác thực</option>
            </select>

            <input
              type="date"
              value={filters.created_from}
              onChange={(e) => updateFilter('created_from', e.target.value)}
              className="userspage-filter-select"
              title="Ngày tạo từ"
            />

            <input
              type="date"
              value={filters.created_to}
              onChange={(e) => updateFilter('created_to', e.target.value)}
              className="userspage-filter-select"
              title="Ngày tạo đến"
            />

            <select
              value={sortSelector}
              onChange={(e) => {
                const v = e.target.value;
                setSortSelector(v);
                if (v === 'newest') setSortConfig({ key: 'created_at', direction: 'desc' });
                else if (v === 'oldest') setSortConfig({ key: 'created_at', direction: 'asc' });
              }}
              className="userspage-filter-select"
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="oldest">Sắp xếp: Cũ nhất</option>
            </select>

            <button
              type="button"
              className="userspage-button userspage-button-secondary"
              onClick={resetFilters}
              title="Xóa toàn bộ bộ lọc"
            >
              <FaTimes /> Xóa lọc
            </button>
          </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="userspage-bulk-actions">
          <span className="userspage-bulk-count">Đã chọn: {selectedUsers.length}</span>
          <button 
            className="userspage-button userspage-button-secondary"
            onClick={() => {
              setModalType('bulkPassword');
              setShowModal(true);
            }}
          >
            <FaKey /> Đặt mật khẩu hàng loạt
          </button>
          <button 
            className="userspage-button userspage-button-secondary"
            onClick={() => setSelectedUsers([])}
          >
            <FaTimes /> Bỏ chọn
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="userspage-loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="userspage-table-wrapper">
            <div className="userspage-table-container">
              <table className="userspage-table">
                <thead>
                  <tr>
                    <th className="userspage-th-sticky">
                      {selectedUsers.length === users.length && users.length > 0 ?
                        <FaCheckSquare onClick={handleSelectAll} className="userspage-checkbox-icon userspage-checkbox-checked" /> :
                        <FaSquare onClick={handleSelectAll} className="userspage-checkbox-icon" />
                      }
                    </th>
                    <th className="userspage-th-sticky userspage-th-sticky-id" onClick={() => handleSort('id')}>
                      Mã {getSortIcon('id')}
                    </th>
                    <th className="userspage-th-sticky userspage-th-sticky-email" onClick={() => handleSort('email')}>
                      Email {getSortIcon('email')}
                    </th>
                    <th>Họ tên</th>
                    <th>SĐT</th>
                    <th>Địa chỉ</th>
                    <th>Giới tính</th>
                    <th>Ngày sinh</th>
                    <th onClick={() => handleSort('role')} className="userspage-th-sortable">
                      Vai trò {getSortIcon('role')}
                    </th>
                    <th>Trạng thái</th>
                    <th>Xác thực</th>
                    <th onClick={() => handleSort('created_at')} className="userspage-th-sortable">
                      Ngày tạo {getSortIcon('created_at')}
                    </th>
                    <th>Đăng nhập</th>
                    <th className="userspage-th-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="userspage-td-empty">
                        Không tìm thấy người dùng nào
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr 
                        key={user.id} 
                        className={selectedUsers.includes(user.id) ? 'userspage-tr-selected' : ''}
                      >
                        <td className="userspage-td-sticky">
                          {selectedUsers.includes(user.id) ?
                            <FaCheckSquare onClick={() => handleSelectUser(user.id)} className="userspage-checkbox-icon userspage-checkbox-checked" /> :
                            <FaSquare onClick={() => handleSelectUser(user.id)} className="userspage-checkbox-icon" />
                          }
                        </td>
                        <td className="userspage-td-id userspage-td-sticky userspage-td-sticky-id">{user.code || user.username || user.id}</td>
                        <td className="userspage-td-email userspage-td-sticky userspage-td-sticky-email">{user.email}</td>
                        <td>{user.full_name || '-'}</td>
                        <td>{user.phone || '-'}</td>
                        <td className="userspage-td-address">{user.address || '-'}</td>
                        <td>
                          {user.gender === 'male' ? 'Nam' : 
                           user.gender === 'female' ? 'Nữ' : 
                           user.gender === 'other' ? 'Khác' : '-'}
                        </td>
                        <td>{formatDate(user.dob)}</td>
                        <td>
                          <span className={`userspage-badge userspage-badge-${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`userspage-status ${user.is_active ? 'userspage-status-active' : 'userspage-status-inactive'}`}>
                            {user.is_active ? 'Hoạt động' : 'Khóa'}
                          </span>
                        </td>
                        <td>
                          <span className={`userspage-status ${user.is_verified ? 'userspage-status-verified' : 'userspage-status-unverified'}`}>
                            {user.is_verified ? '✓' : '✗'}
                          </span>
                        </td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>{formatDate(user.last_login)}</td>
                        <td className="userspage-td-actions">
                          <button 
                            onClick={() => handleViewDetail(user)} 
                            className="userspage-btn-icon userspage-btn-icon-view" 
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button onClick={() => handleEdit(user)} className="userspage-btn-icon" title="Sửa">
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleToggleVerification(user.id, user.is_verified)} 
                            className="userspage-btn-icon"
                            title={user.is_verified ? 'Hủy xác thực' : 'Xác thực'}
                          >
                            <FaUserCheck style={{ color: user.is_verified ? '#10b981' : '#9ca3af' }} />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user.id, user.is_active)} 
                            className="userspage-btn-icon"
                            title={user.is_active ? 'Khóa' : 'Mở khóa'}
                          >
                            {user.is_active ? <FaLock /> : <FaUnlock />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="userspage-pagination">
            <div className="userspage-pagination-info">
              Hiển thị {users.length} / {pagination.total} người dùng
            </div>
            <div className="userspage-pagination-controls">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="userspage-btn-page"
                title="Trang đầu"
              >
                <FaAngleDoubleLeft />
              </button>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="userspage-btn-page"
                title="Trang trước"
              >
                <FaChevronLeft />
              </button>
              <span className="userspage-page-info">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="userspage-btn-page"
                title="Trang sau"
              >
                <FaChevronRight />
              </button>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                disabled={pagination.page >= pagination.totalPages}
                className="userspage-btn-page"
                title="Trang cuối"
              >
                <FaAngleDoubleRight />
              </button>
              <select 
                value={pagination.limit} 
                onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="userspage-limit-select"
              >
                <option value="10">10/trang</option>
                <option value="15">15/trang</option>
                <option value="25">25/trang</option>
                <option value="50">50/trang</option>
                <option value="100">100/trang</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* POPUP CHI TIẾT USER */}
      {showDetailModal && (
        <div className="userspage-modal-overlay" onClick={handleCloseDetail}>
          <div className="userspage-modal-content userspage-modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="userspage-modal-header">
              <h2>Chi tiết người dùng</h2>
              <button className="userspage-modal-close" onClick={handleCloseDetail}>
                <FaTimes />
              </button>
            </div>

            <div className="userspage-modal-body">
              {loadingDetail ? (
                <div className="userspage-loading">Đang tải thông tin...</div>
              ) : detailUser ? (
                <>
                  <div className="userspage-detail-section">
                    <h3 className="userspage-detail-section-title">Thông tin cơ bản</h3>
                    <div className="userspage-detail-grid">
                      <div className="userspage-detail-item">
                        <strong>ID:</strong>
                        <span>{detailUser.id}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Email:</strong>
                        <span>{detailUser.email}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Họ tên:</strong>
                        <span>{detailUser.full_name || '-'}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>SĐT:</strong>
                        <span>{detailUser.phone || '-'}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Địa chỉ:</strong>
                        <span>{detailUser.address || '-'}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Giới tính:</strong>
                        <span>
                          {detailUser.gender === 'male' ? 'Nam' : 
                           detailUser.gender === 'female' ? 'Nữ' : 
                           detailUser.gender === 'other' ? 'Khác' : '-'}
                        </span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Ngày sinh:</strong>
                        <span>{formatDate(detailUser.dob)}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Vai trò:</strong>
                        <span className={`userspage-badge userspage-badge-${detailUser.role}`}>
                          {detailUser.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="userspage-detail-section">
                    <h3 className="userspage-detail-section-title">Trạng thái tài khoản</h3>
                    <div className="userspage-detail-grid">
                      <div className="userspage-detail-item">
                        <strong>Trạng thái:</strong>
                        <span className={`userspage-status ${detailUser.is_active ? 'userspage-status-active' : 'userspage-status-inactive'}`}>
                          {detailUser.is_active ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Xác thực:</strong>
                        <span className={`userspage-status ${detailUser.is_verified ? 'userspage-status-verified' : 'userspage-status-unverified'}`}>
                          {detailUser.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                        </span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Ngày tạo:</strong>
                        <span>{formatDate(detailUser.created_at)}</span>
                      </div>
                      <div className="userspage-detail-item">
                        <strong>Đăng nhập lần cuối:</strong>
                        <span>{formatDate(detailUser.last_login)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="userspage-detail-actions">
                    <button 
                      className={`userspage-button ${detailUser.is_verified ? 'userspage-button-warning' : 'userspage-button-success'}`}
                      onClick={handleVerifyFromDetail}
                    >
                      <FaUserCheck /> {detailUser.is_verified ? 'Hủy xác thực' : 'Xác thực'}
                    </button>
                    <button 
                      className={`userspage-button ${detailUser.is_active ? 'userspage-button-danger' : 'userspage-button-success'}`}
                      onClick={handleToggleStatusFromDetail}
                    >
                      {detailUser.is_active ? <FaLock /> : <FaUnlock />}
                      {detailUser.is_active ? ' Khóa tài khoản' : ' Mở khóa tài khoản'}
                    </button>
                    <button 
                      className="userspage-button userspage-button-secondary"
                      onClick={handleResetPasswordFromDetail}
                    >
                      <FaKey /> Đặt lại mật khẩu
                    </button>
                    <button 
                      className="userspage-button userspage-button-primary"
                      onClick={handleEditFromDetail}
                    >
                      <FaEdit /> Chỉnh sửa thông tin
                    </button>
                  </div>
                </>
              ) : (
                <div className="userspage-error">Không thể tải thông tin người dùng</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE/EDIT/BULK PASSWORD */}
      {showModal && (
        <div className="userspage-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="userspage-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="userspage-modal-header">
              <h2>
                {modalType === 'create' && 'Thêm người dùng mới'}
                {modalType === 'edit' && 'Chỉnh sửa người dùng'}
                {modalType === 'bulkPassword' && `Đặt mật khẩu cho ${selectedUsers.length} tài khoản`}
              </h2>
              <button className="userspage-modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="userspage-modal-body">
              {modalType === 'bulkPassword' ? (
                <div className="userspage-form-section">
                  <div className="userspage-form-group">
                    <label>Mật khẩu mới <span className="userspage-required">*</span></label>
                    <input 
                      type="password" 
                      value={bulkPassword} 
                      onChange={(e) => setBulkPassword(e.target.value)}
                      required
                      minLength="6"
                      className="userspage-input"
                      placeholder="Ít nhất 6 ký tự"
                    />
                  </div>
                  <div className="userspage-modal-footer">
                    <button type="button" onClick={() => setShowModal(false)} className="userspage-button userspage-button-secondary">
                      Hủy
                    </button>
                    <button onClick={handleBulkPasswordReset} className="userspage-button userspage-button-primary">
                      Đặt mật khẩu
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={modalType === 'create' ? handleCreateUser : handleUpdateUser}>
                  <div className="userspage-form-section">
                    <h3 className="userspage-form-section-title">Thông tin đăng nhập</h3>
                    <div className="userspage-form-row">
                      <div className="userspage-form-group">
                        <label>Email <span className="userspage-required">*</span></label>
                        <input 
                          type="email" 
                          value={newUserData.email} 
                          onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                          required
                          disabled={modalType === 'edit'}
                          className="userspage-input"
                        />
                      </div>
                      {modalType === 'create' && (
                        <div className="userspage-form-group">
                          <label>Mật khẩu <span className="userspage-required">*</span></label>
                          <input 
                            type="password" 
                            value={newUserData.password} 
                            onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                            required
                            minLength="6"
                            className="userspage-input"
                            placeholder="Ít nhất 6 ký tự"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="userspage-form-section">
                    <h3 className="userspage-form-section-title">Thông tin cá nhân</h3>
                    <div className="userspage-form-row">
                      <div className="userspage-form-group">
                        <label>Họ và tên</label>
                        <input 
                          type="text" 
                          value={newUserData.full_name} 
                          onChange={(e) => setNewUserData({...newUserData, full_name: e.target.value})}
                          className="userspage-input"
                        />
                      </div>
                      <div className="userspage-form-group">
                        <label>Số điện thoại</label>
                        <input 
                          type="text" 
                          value={newUserData.phone} 
                          onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                          className="userspage-input"
                        />
                      </div>
                    </div>
                    <div className="userspage-form-group">
                      <label>Địa chỉ</label>
                      <input 
                        type="text" 
                        value={newUserData.address} 
                        onChange={(e) => setNewUserData({...newUserData, address: e.target.value})}
                        className="userspage-input"
                      />
                    </div>
                    <div className="userspage-form-row">
                      <div className="userspage-form-group">
                        <label>Giới tính</label>
                        <select 
                          value={newUserData.gender} 
                          onChange={(e) => setNewUserData({...newUserData, gender: e.target.value})}
                          className="userspage-select"
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      <div className="userspage-form-group">
                        <label>Ngày sinh</label>
                        <input 
                          type="date" 
                          value={newUserData.dob} 
                          onChange={(e) => setNewUserData({...newUserData, dob: e.target.value})}
                          className="userspage-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="userspage-form-section">
                    <h3 className="userspage-form-section-title">Vai trò & Phân quyền</h3>
                    <div className="userspage-form-row">
                      <div className="userspage-form-group">
                        <label>Vai trò</label>
                        <select 
                          value={newUserData.role} 
                          onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                          className="userspage-select"
                        >
                          <option value="patient">Patient</option>
                          <option value="staff">Staff</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                        {newUserData.role === 'doctor' && (
                        <div className="userspage-form-group">
                          <label>Chuyên khoa</label>
                          <select 
                            value={newUserData.specialty_id} 
                            onChange={(e) => setNewUserData({...newUserData, specialty_id: e.target.value})}
                            className="userspage-select"
                          >
                            <option value="">Chọn chuyên khoa</option>
                            {specialties.map(specialty => (
                              <option key={specialty.id} value={specialty.id}>
                                {specialty.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        )}

                        {newUserData.role === 'staff' && (
                          <>
                            <div className="userspage-form-group">
                              <label>Phòng ban</label>
                              <select
                                value={newUserData.department}
                                onChange={(e) => setNewUserData({...newUserData, department: e.target.value})}
                                className="userspage-select"
                              >
                                <option value="">Chọn phòng ban</option>
                                <option value="clinical">Vận hành lâm sàng</option>
                                <option value="system">Hệ thống & IT</option>
                                <option value="support">Chăm sóc KH</option>
                                <option value="finance">Tài chính</option>
                                <option value="content">Nội dung</option>
                              </select>
                            </div>

                            <div className="userspage-form-group">
                              <label>Cấp bậc</label>
                              <select
                                value={newUserData.rank}
                                onChange={(e) => setNewUserData({...newUserData, rank: e.target.value})}
                                className="userspage-select"
                              >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                              </select>
                            </div>
                          </>
                        )}
                    </div>
                  </div>

                  <div className="userspage-modal-footer">
                    <button type="button" onClick={() => setShowModal(false)} className="userspage-button userspage-button-secondary">
                      Hủy
                    </button>
                    <button type="submit" className="userspage-button userspage-button-primary">
                      {modalType === 'create' ? 'Tạo mới' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {noticeDialog.open && (
        <div className="userspage-modal-overlay" onClick={closeNoticeDialog}>
          <div className="userspage-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="userspage-modal-header">
              <h2>{noticeDialog.title}</h2>
              <button className="userspage-modal-close" onClick={closeNoticeDialog}>
                <FaTimes />
              </button>
            </div>
            <div className="userspage-modal-body">
              <p>{noticeDialog.message}</p>
            </div>
            <div className="userspage-modal-footer">
              <button className="userspage-button userspage-button-primary" onClick={closeNoticeDialog}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="userspage-modal-overlay" onClick={closeConfirmDialog}>
          <div className="userspage-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="userspage-modal-header">
              <h2>{confirmDialog.title}</h2>
              <button className="userspage-modal-close" onClick={closeConfirmDialog}>
                <FaTimes />
              </button>
            </div>
            <div className="userspage-modal-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="userspage-modal-footer">
              <button className="userspage-button userspage-button-secondary" onClick={closeConfirmDialog}>
                Hủy
              </button>
              <button className="userspage-button userspage-button-primary" onClick={handleConfirmAccept}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordDialog.open && (
        <div className="userspage-modal-overlay" onClick={closePasswordDialog}>
          <div className="userspage-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="userspage-modal-header">
              <h2>Đặt lại mật khẩu</h2>
              <button className="userspage-modal-close" onClick={closePasswordDialog}>
                <FaTimes />
              </button>
            </div>
            <div className="userspage-modal-body">
              <div className="userspage-form-group">
                <label>Mật khẩu mới <span className="userspage-required">*</span></label>
                <input
                  type="password"
                  className="userspage-input"
                  placeholder="Ít nhất 6 ký tự"
                  value={passwordDialog.password}
                  onChange={(e) => setPasswordDialog(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="userspage-modal-footer">
              <button className="userspage-button userspage-button-secondary" onClick={closePasswordDialog}>
                Hủy
              </button>
              <button
                className="userspage-button userspage-button-primary"
                onClick={handleSubmitPasswordDialog}
                disabled={passwordDialog.loading}
              >
                {passwordDialog.loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;