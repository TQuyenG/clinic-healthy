// client/src/pages/EntityManagementPage.js - VERSION 2.0 - HOÀN CHỈNH
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, 
  FaFileImport, FaLightbulb, FaSearch, FaTimes, 
  FaCheck, FaClock, FaBan, FaList, FaCog, FaSort,
  FaSortAmountDown, FaSortAmountUp, FaCheckSquare,
  FaRegSquare, FaFolder, FaImage, FaExclamationTriangle,
  FaFileExport, FaSpinner, FaFilter, FaSyncAlt 
} from 'react-icons/fa';
import EntityFormModal from '../components/entity/EntityFormModal';
import SuggestionModal from '../components/entity/SuggestionModal';
import usePermissions from '../hooks/usePermissions';
import './EntityManagementPage.css';

const EntityManagementPage = ({ entityType }) => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;
  const isDoctor = userRole === 'doctor';
  
  // 🔐 PERMISSION HOOKS
  const { hasPermission } = usePermissions();
  const isAdmin = userRole === 'admin';

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [activeTab, setActiveTab] = useState('list');
  const [entities, setEntities] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  
  // Filters với sắp xếp
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    category_id: '',
    letter: '',
    hidden: '',
    sort_by: 'created_at',
    sort_order: 'DESC'
  });

  const [suggestionFilters, setSuggestionFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    suggestion_type: ''
  });

  // ============================================
  // BULK ACTIONS STATE
  // ============================================
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkHideReason, setBulkHideReason] = useState('');
  const [showBulkHideModal, setShowBulkHideModal] = useState(false);

  // ============================================
  // COLUMN VISIBILITY STATE
  // ============================================
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Cấu hình cột cho Medicine
  const medicineColumns = {
    stt: { label: 'STT', visible: true, fixed: true },
    checkbox: { label: '', visible: true, fixed: true },
    name: { label: 'Tên thuốc', visible: true, fixed: true },
    unit: { label: 'Đơn vị', visible: true },
    price: { label: 'Giá tiền', visible: true },
    category: { label: 'Danh mục', visible: true },
    image_url: { label: 'Hình ảnh', visible: false },
    composition: { label: 'Thành phần', visible: false },
    uses: { label: 'Công dụng', visible: false },
    side_effects: { label: 'Tác dụng phụ', visible: false },
    manufacturer: { label: 'Nhà sản xuất', visible: true },
    excellent_review_percent: { label: '% Xuất sắc', visible: false },
    average_review_percent: { label: '% Trung bình', visible: false },
    poor_review_percent: { label: '% Kém', visible: false },
    slug: { label: 'Slug', visible: false },
    hidden: { label: 'Trạng thái', visible: true },
    hidden_reason: { label: 'Lý do ẩn', visible: false },
    created_at: { label: 'Ngày tạo', visible: true },
    updated_at: { label: 'Cập nhật', visible: false },
    actions: { label: 'Thao tác', visible: true, fixed: true }
  };

  // Cấu hình cột cho Disease
  const diseaseColumns = {
    stt: { label: 'STT', visible: true, fixed: true },
    checkbox: { label: '', visible: true, fixed: true },
    name: { label: 'Tên bệnh lý', visible: true, fixed: true },
    category: { label: 'Danh mục', visible: true },
    symptoms: { label: 'Triệu chứng', visible: false },
    treatments: { label: 'Điều trị', visible: false },
    description: { label: 'Mô tả', visible: false },
    slug: { label: 'Slug', visible: false },
    hidden: { label: 'Trạng thái', visible: true },
    hidden_reason: { label: 'Lý do ẩn', visible: false },
    created_at: { label: 'Ngày tạo', visible: true },
    updated_at: { label: 'Cập nhật', visible: false },
    actions: { label: 'Thao tác', visible: true, fixed: true }
  };

  const [visibleColumns, setVisibleColumns] = useState(
    entityType === 'medicine' ? medicineColumns : diseaseColumns
  );

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState('create');
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const config = {
    medicine: {
      title: 'Quản lý Thuốc',
      singular: 'Thuốc',
      plural: 'Thuốc',
      apiPath: 'medicines',
      publicPath: 'tra-cuu-thuoc'
    },
    disease: {
      title: 'Quản lý Bệnh lý',
      singular: 'Bệnh lý',
      plural: 'Bệnh lý',
      apiPath: 'diseases',
      publicPath: 'tra-cuu-benh-ly'
    }
  };

  const currentConfig = config[entityType];

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchCategories();
    
    // 🔗 Xử lý URL query params để mở suggestion modal
    const urlParams = new URLSearchParams(window.location.search);
    const suggestionId = urlParams.get('suggestionId');
    const tab = urlParams.get('tab');
    
    if (suggestionId) {
      // Chuyển sang tab suggestions
      if (tab === 'suggestions') {
        setActiveTab('suggestions');
      }
      
      // Fetch suggestion detail và mở modal
      fetchSuggestionDetail(suggestionId);
    }
  }, []);

  useEffect(() => {
    // Reset columns khi đổi entityType
    setVisibleColumns(entityType === 'medicine' ? medicineColumns : diseaseColumns);
    setSelectedIds([]);
    setSelectAll(false);
  }, [entityType]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchEntities();
    } else {
      fetchSuggestions();
    }
  }, [activeTab, filters, suggestionFilters]);

  useEffect(() => {
    // Reset selection khi data thay đổi
    setSelectedIds([]);
    setSelectAll(false);
  }, [entities]);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================
  const fetchSuggestionDetail = async (suggestionId) => {
    try {
      const endpoint = entityType === 'medicine' 
        ? '/api/articles/medicines/suggestions' 
        : '/api/articles/diseases/suggestions';
        
      const response = await axios.get(
        `${API_BASE_URL}${endpoint}?page=1&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const suggestion = response.data.suggestions.find(s => s.id === parseInt(suggestionId));
        if (suggestion) {
          setSelectedSuggestion(suggestion);
          setSuggestionMode('review');
          setShowSuggestionModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching suggestion detail:', error);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCategories(response.data.categories.filter(c => 
          c.category_type === (entityType === 'medicine' ? 'thuoc' : 'benh_ly')
        ));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== '')
      ).toString();

      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setEntities(response.data[currentConfig.apiPath] || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(suggestionFilters).toString();

      // 🔥 GỌI ĐÚNG ENDPOINT: /medicines/suggestions hoặc /diseases/suggestions
      const endpoint = entityType === 'medicine' 
        ? `/api/articles/medicines/suggestions`
        : `/api/articles/diseases/suggestions`;

      console.log(`📡 Fetching suggestions from: ${endpoint}?${params}`);

      const response = await axios.get(
        `${API_BASE_URL}${endpoint}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`✓ Response:`, response.data);

      if (response.data.success) {
        setSuggestions(response.data.suggestions || []);
        setPagination(response.data.pagination || {});
        console.log(`✓ Loaded ${response.data.suggestions?.length || 0} suggestions`);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SINGLE ITEM ACTIONS
  // ============================================
  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${currentConfig.singular.toLowerCase()} này?`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã xóa thành công');
        fetchEntities();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleToggleHide = async (entity) => {
    const newHidden = !entity.hidden;
    let reason = null;

    if (newHidden) {
      reason = prompt('Nhập lý do ẩn:');
      if (!reason) return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/${entity.id}/toggle-hide`,
        { hidden: newHidden, hidden_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      ); 

      if (response.data.success) {
        alert(response.data.message);
        fetchEntities();
      }
    } catch (error) {
      alert('Lỗi khi thay đổi trạng thái');
    }
  };

  const handleViewPublic = (slug) => {
    window.open(`/${currentConfig.publicPath}/${slug}`, '_blank');
  };

  // ============================================
  // BULK ACTIONS
  // ============================================
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entities.map(e => e.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một mục');
      return;
    }

    if (action === 'hide') {
      setShowBulkHideModal(true);
      return;
    }

    if (action === 'update_category') {
      setShowBulkCategoryModal(true);
      return;
    }

    if (action === 'delete') {
      if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} ${currentConfig.plural.toLowerCase()}?`)) {
        return;
      }
    }

    if (action === 'unhide') {
      if (!window.confirm(`Bạn có chắc muốn hiện ${selectedIds.length} ${currentConfig.plural.toLowerCase()}?`)) {
        return;
      }
    }

    await executeBulkAction(action, {});
  };

  const executeBulkAction = async (action, data) => {
    setBulkLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/bulk`,
        {
          ids: selectedIds,
          action,
          ...data
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        setSelectedIds([]);
        setSelectAll(false);
        setShowBulkCategoryModal(false);
        setShowBulkHideModal(false);
        setBulkCategoryId('');
        setBulkHideReason('');
        fetchEntities();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi thực hiện thao tác hàng loạt');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkHide = () => {
    if (!bulkHideReason.trim()) {
      alert('Vui lòng nhập lý do ẩn');
      return;
    }
    executeBulkAction('hide', { hidden_reason: bulkHideReason });
  };

  const handleBulkUpdateCategory = () => {
    if (!bulkCategoryId) {
      alert('Vui lòng chọn danh mục');
      return;
    }
    executeBulkAction('update_category', { category_id: bulkCategoryId });
  };

  // ============================================
  // SORTING
  // ============================================
  const handleSort = (field) => {
    const newOrder = filters.sort_by === field && filters.sort_order === 'ASC' ? 'DESC' : 'ASC';
    setFilters({ ...filters, sort_by: field, sort_order: newOrder, page: 1 });
  };

  const getSortIcon = (field) => {
    if (filters.sort_by !== field) return <FaSort className="entity-mgmt-sort-icon" />;
    return filters.sort_order === 'ASC' 
      ? <FaSortAmountUp className="entity-mgmt-sort-icon active" />
      : <FaSortAmountDown className="entity-mgmt-sort-icon active" />;
  };

  // ============================================
  // COLUMN VISIBILITY
  // ============================================
  const toggleColumn = (key) => {
    if (visibleColumns[key]?.fixed) return; // Không cho ẩn cột cố định
    setVisibleColumns({
      ...visibleColumns,
      [key]: { ...visibleColumns[key], visible: !visibleColumns[key].visible }
    });
  };

  // ============================================
  // HELPERS
  // ============================================
  const getSTT = (index) => {
    return (filters.page - 1) * filters.limit + index + 1;
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // 🔐 PERMISSION HELPERS
  const createPermKey = entityType === 'medicine' ? 'create_medicine' : 'create_disease';
  const approvePermKey = entityType === 'medicine' ? 'approve_medicine' : 'approve_disease';
  const suggestPermKey = entityType === 'medicine' ? 'suggest_medicine' : 'suggest_disease';
  
  const canCreate = isAdmin || hasPermission('articles', createPermKey);
  const canApprove = isAdmin || hasPermission('articles', approvePermKey);
  const canSuggest = isDoctor || hasPermission('articles', suggestPermKey);
  
  // ⚠️ Thuốc/Bệnh lý: Chỉ admin hoặc manager mới được sửa trực tiếp
  // Nhân viên thường chỉ có quyền đề xuất chỉnh sửa
  const canEdit = isAdmin || canCreate; // Người tạo mới có quyền sửa
  const canDelete = isAdmin; // Chỉ admin xóa được
  const canHide = isAdmin || hasPermission('articles', 'hide');
  
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="entity-mgmt-page">
      <div className="entity-mgmt-container">
        {/* Header */}
        <div className="entity-mgmt-header">
          <div className="entity-mgmt-header-title">
            <h1>{currentConfig.title}</h1>
            <p className="entity-mgmt-header-subtitle">
              Tổng số: {pagination.totalItems || 0} {currentConfig.plural.toLowerCase()}
            </p>
          </div>
          
          <div className="entity-mgmt-header-actions">
            {/* Nút Tải lại - Luôn hiển thị */}
            <button 
              className="entity-mgmt-btn entity-mgmt-btn-secondary"
              onClick={() => {
                if (activeTab === 'list') {
                  fetchEntities();
                } else if (activeTab === 'suggestions') {
                  fetchSuggestions();
                }
              }}
              title="Tải lại dữ liệu"
            >
              <FaSyncAlt />
              <span>Tải lại</span>
            </button>

            {canCreate && activeTab === 'list' && (
              <>
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-primary"
                  onClick={() => {
                    setFormMode('create');
                    setSelectedEntity(null);
                    setShowFormModal(true);
                  }}
                >
                  <FaPlus />
                  <span>Thêm {currentConfig.singular}</span>
                </button>
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-secondary"
                  onClick={() => {
                    setFormMode('import');
                    setShowFormModal(true);
                  }}
                >
                  <FaFileImport />
                  <span>Import</span>
                </button>
              </>
            )}
            
            {!canCreate && canSuggest && activeTab === 'list' && (
              <button
                className="entity-mgmt-btn entity-mgmt-btn-primary"
                onClick={() => {
                  setSuggestionMode('create');
                  setSelectedEntity(null);
                  setShowSuggestionModal(true);
                }}
              >
                <FaLightbulb />
                <span>Đề xuất thêm</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="entity-mgmt-tabs">
          <button
            className={`entity-mgmt-tab ${activeTab === 'list' ? 'entity-mgmt-tab-active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <FaList />
            <span>Danh sách {currentConfig.plural}</span>
          </button>
          {(canSuggest || canApprove) && (
            <button
              className={`entity-mgmt-tab ${activeTab === 'suggestions' ? 'entity-mgmt-tab-active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              <FaLightbulb />
              <span>Đề xuất</span>
              {pendingCount > 0 && (
                <span className="entity-mgmt-tab-badge">{pendingCount}</span>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'list' ? (
          <>
            {/* Bulk Actions Bar */}
            {canDelete && selectedIds.length > 0 && (
              <div className="entity-mgmt-bulk-bar">
                <div className="entity-mgmt-bulk-info">
                  <FaCheckSquare />
                  <span>Đã chọn <strong>{selectedIds.length}</strong> mục</span>
                </div>
                <div className="entity-mgmt-bulk-actions">
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-secondary"
                    onClick={() => handleBulkAction('hide')}
                    disabled={bulkLoading}
                  >
                    <FaEyeSlash /> Ẩn
                  </button>
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-secondary"
                    onClick={() => handleBulkAction('unhide')}
                    disabled={bulkLoading}
                  >
                    <FaEye /> Hiện
                  </button>
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-secondary"
                    onClick={() => handleBulkAction('update_category')}
                    disabled={bulkLoading}
                  >
                    <FaFolder /> Đổi danh mục
                  </button>
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-danger"
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkLoading}
                  >
                    <FaTrash /> Xóa
                  </button>
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-sm"
                    onClick={() => {
                      setSelectedIds([]);
                      setSelectAll(false);
                    }}
                  >
                    <FaTimes /> Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="entity-mgmt-filters">
              <div className="entity-mgmt-filters-row">
                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Tìm kiếm</label>
                  <div className="entity-mgmt-search-box">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    />
                    {filters.search && (
                      <button 
                        className="entity-mgmt-search-clear"
                        onClick={() => setFilters({ ...filters, search: '', page: 1 })}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>

                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Danh mục</label>
                  <select
                    value={filters.category_id}
                    onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {isAdmin && (
                  <div className="entity-mgmt-filter-group">
                    <label className="entity-mgmt-filter-label">Trạng thái</label>
                    <select
                      value={filters.hidden}
                      onChange={(e) => setFilters({ ...filters, hidden: e.target.value, page: 1 })}
                    >
                      <option value="">Tất cả</option>
                      <option value="false">Hiện</option>
                      <option value="true">Ẩn</option>
                    </select>
                  </div>
                )}

                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Chữ cái đầu</label>
                  <select
                    value={filters.letter}
                    onChange={(e) => setFilters({ ...filters, letter: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả</option>
                    {alphabet.map(letter => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                </div>

                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Sắp xếp</label>
                  <select
                    value={`${filters.sort_by}-${filters.sort_order}`}
                    onChange={(e) => {
                      const [sort_by, sort_order] = e.target.value.split('-');
                      setFilters({ ...filters, sort_by, sort_order, page: 1 });
                    }}
                  >
                    <option value="created_at-DESC">Mới nhất</option>
                    <option value="created_at-ASC">Cũ nhất</option>
                    <option value="name-ASC">Tên A-Z</option>
                    <option value="name-DESC">Tên Z-A</option>
                    <option value="updated_at-DESC">Cập nhật gần nhất</option>
                  </select>
                </div>

                {/* Column Selector */}
                <div className="entity-mgmt-filter-group entity-mgmt-column-selector-wrapper">
                  <label className="entity-mgmt-filter-label">Hiển thị</label>
                  <button
                    className="entity-mgmt-btn entity-mgmt-btn-secondary entity-mgmt-column-btn"
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                  >
                    <FaCog /> Cột
                  </button>
                  
                  {showColumnSelector && (
                    <div className="entity-mgmt-column-dropdown">
                      <div className="entity-mgmt-column-dropdown-header">
                        <span>Chọn cột hiển thị</span>
                        <button onClick={() => setShowColumnSelector(false)}>
                          <FaTimes />
                        </button>
                      </div>
                      <div className="entity-mgmt-column-dropdown-body">
                        {Object.entries(visibleColumns)
                          .filter(([key]) => !['stt', 'checkbox', 'actions'].includes(key))
                          .map(([key, col]) => (
                            <label key={key} className="entity-mgmt-column-checkbox">
                              <input
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => toggleColumn(key)}
                                disabled={col.fixed}
                              />
                              <span>{col.label}</span>
                              {col.fixed && <span className="entity-mgmt-fixed-badge">Cố định</span>}
                            </label>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-loading">
                  <FaSpinner className="entity-mgmt-spinner" />
                  <span>Đang tải...</span>
                </div>
              </div>
            ) : entities.length === 0 ? (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-empty">
                  <h3>Chưa có {currentConfig.plural.toLowerCase()} nào</h3>
                  <p>Bắt đầu bằng cách thêm {currentConfig.singular.toLowerCase()} mới</p>
                </div>
              </div>
            ) : (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-table-container">
                  <table className="entity-mgmt-table">
                    <thead>
                      <tr>
                        {/* Checkbox Header */}
                        {isAdmin && (
                          <th className="entity-mgmt-col-checkbox">
                            <button 
                              className="entity-mgmt-checkbox-btn"
                              onClick={handleSelectAll}
                            >
                              {selectAll ? <FaCheckSquare /> : <FaRegSquare />}
                            </button>
                          </th>
                        )}
                        
                        {/* STT */}
                        <th className="entity-mgmt-col-stt">STT</th>

                        {/* Name - Sortable */}
                        <th 
                          className="entity-mgmt-col-name entity-mgmt-sortable"
                          onClick={() => handleSort('name')}
                        >
                          {entityType === 'medicine' ? 'Tên thuốc' : 'Tên bệnh lý'}
                          {getSortIcon('name')}
                        </th>

                        {/* [MỚI] CỘT ĐƠN VỊ TÍNH */}
                        {entityType === 'medicine' && visibleColumns.unit?.visible && (
                          <th>Đơn vị</th>
                        )}

                        {/* --- THÊM ĐOẠN NÀY --- */}
                        {entityType === 'medicine' && visibleColumns.price?.visible && (
                                                
                      
                          <th className="entity-mgmt-sortable" onClick={() => handleSort('price')}>
                             Giá tiền {getSortIcon('price')}
                          </th>
                        )}
                        {/* --------------------- */}
                        
                        {/* Category */}
                        {visibleColumns.category?.visible && (
                          <th>Danh mục</th>
                        )}
                        
                        {/* Medicine specific columns */}
                        {entityType === 'medicine' && (
                          <>
                            {visibleColumns.image_url?.visible && <th>Hình ảnh</th>}
                            {visibleColumns.composition?.visible && <th>Thành phần</th>}
                            {visibleColumns.uses?.visible && <th>Công dụng</th>}
                            {visibleColumns.side_effects?.visible && <th>Tác dụng phụ</th>}
                            {visibleColumns.manufacturer?.visible && <th>Nhà sản xuất</th>}
                            {visibleColumns.excellent_review_percent?.visible && <th>% Xuất sắc</th>}
                            {visibleColumns.average_review_percent?.visible && <th>% TB</th>}
                            {visibleColumns.poor_review_percent?.visible && <th>% Kém</th>}
                          </>
                        )}
                        
                        {/* Disease specific columns */}
                        {entityType === 'disease' && (
                          <>
                            {visibleColumns.symptoms?.visible && <th>Triệu chứng</th>}
                            {visibleColumns.treatments?.visible && <th>Điều trị</th>}
                            {visibleColumns.description?.visible && <th>Mô tả</th>}
                          </>
                        )}
                        
                        {/* Common columns */}
                        {visibleColumns.slug?.visible && <th>Slug</th>}
                        {visibleColumns.hidden?.visible && <th>Trạng thái</th>}
                        {visibleColumns.hidden_reason?.visible && <th>Lý do ẩn</th>}
                        
                        {visibleColumns.created_at?.visible && (
                          <th 
                            className="entity-mgmt-sortable"
                            onClick={() => handleSort('created_at')}
                          >
                            Ngày tạo {getSortIcon('created_at')}
                          </th>
                        )}
                        
                        {visibleColumns.updated_at?.visible && (
                          <th 
                            className="entity-mgmt-sortable"
                            onClick={() => handleSort('updated_at')}
                          >
                            Cập nhật {getSortIcon('updated_at')}
                          </th>
                        )}
                        
                        {/* Actions */}
                        <th className="entity-mgmt-col-actions">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entities.map((entity, index) => (
                        <tr 
                          key={entity.id}
                          className={selectedIds.includes(entity.id) ? 'entity-mgmt-row-selected' : ''}
                        >
                          {/* Checkbox */}
                          {isAdmin && (
                            <td className="entity-mgmt-col-checkbox">
                              <button 
                                className="entity-mgmt-checkbox-btn"
                                onClick={() => handleSelectItem(entity.id)}
                              >
                                {selectedIds.includes(entity.id) ? <FaCheckSquare /> : <FaRegSquare />}
                              </button>
                            </td>
                          )}
                          
                          {/* STT */}
                          <td className="entity-mgmt-col-stt">{getSTT(index)}</td>
                          
                          {/* Name */}
                          <td className="entity-mgmt-col-name">
                            <span className="entity-mgmt-table-name" title={entity.name}>
                              {entity.name}
                            </span>
                          </td>

                          {/* [MỚI] DỮ LIỆU ĐƠN VỊ TÍNH */}
                          {entityType === 'medicine' && visibleColumns.unit?.visible && (
                            <td>
                              <span className="entity-mgmt-badge entity-mgmt-badge-secondary">
                                {entity.unit || 'Hộp'}
                              </span>
                            </td>
                          )}

                          {entityType === 'medicine' && visibleColumns.price?.visible && (
                            <td>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entity.price || 0)}
                            </td>
                          )}
                          
                          {/* Category */}
                          {visibleColumns.category?.visible && (
                            <td>
                              {entity.Category && (
                                <span className="entity-mgmt-table-category">
                                  {entity.Category.name}
                                </span>
                              )}
                            </td>
                          )}
                          
                          {/* Medicine specific columns */}
                          {entityType === 'medicine' && (
                            <>
                              {visibleColumns.image_url?.visible && (
                                <td>
                                  {entity.image_url ? (
                                    <img 
                                      src={entity.image_url} 
                                      alt={entity.name}
                                      className="entity-mgmt-thumbnail"
                                    />
                                  ) : (
                                    <span className="entity-mgmt-no-image">
                                      <FaImage />
                                    </span>
                                  )}
                                </td>
                              )}
                              {visibleColumns.composition?.visible && (
                                <td title={entity.composition}>{truncateText(entity.composition)}</td>
                              )}
                              {visibleColumns.uses?.visible && (
                                <td title={entity.uses}>{truncateText(entity.uses)}</td>
                              )}
                              {visibleColumns.side_effects?.visible && (
                                <td title={entity.side_effects}>{truncateText(entity.side_effects)}</td>
                              )}
                              {visibleColumns.manufacturer?.visible && (
                                <td>{entity.manufacturer || '-'}</td>
                              )}
                              {visibleColumns.excellent_review_percent?.visible && (
                                <td>{entity.excellent_review_percent || 0}%</td>
                              )}
                              {visibleColumns.average_review_percent?.visible && (
                                <td>{entity.average_review_percent || 0}%</td>
                              )}
                              {visibleColumns.poor_review_percent?.visible && (
                                <td>{entity.poor_review_percent || 0}%</td>
                              )}
                            </>
                          )}
                          
                          {/* Disease specific columns */}
                          {entityType === 'disease' && (
                            <>
                              {visibleColumns.symptoms?.visible && (
                                <td title={entity.symptoms}>{truncateText(entity.symptoms)}</td>
                              )}
                              {visibleColumns.treatments?.visible && (
                                <td title={entity.treatments}>{truncateText(entity.treatments)}</td>
                              )}
                              {visibleColumns.description?.visible && (
                                <td title={entity.description}>{truncateText(entity.description)}</td>
                              )}
                            </>
                          )}
                          
                          {/* Common columns */}
                          {visibleColumns.slug?.visible && (
                            <td>
                              <code className="entity-mgmt-slug">{entity.slug || '-'}</code>
                            </td>
                          )}
                          
                          {visibleColumns.hidden?.visible && (
                            <td>
                              {entity.hidden ? (
                                <span className="entity-mgmt-badge entity-mgmt-badge-danger">
                                  <FaEyeSlash /> Ẩn
                                </span>
                              ) : (
                                <span className="entity-mgmt-badge entity-mgmt-badge-success">
                                  <FaEye /> Hiện
                                </span>
                              )}
                            </td>
                          )}
                          
                          {visibleColumns.hidden_reason?.visible && (
                            <td title={entity.hidden_reason}>
                              {truncateText(entity.hidden_reason, 30)}
                            </td>
                          )}
                          
                          {visibleColumns.created_at?.visible && (
                            <td>{new Date(entity.created_at).toLocaleDateString('vi-VN')}</td>
                          )}
                          
                          {visibleColumns.updated_at?.visible && (
                            <td>{new Date(entity.updated_at).toLocaleDateString('vi-VN')}</td>
                          )}
                          
                          {/* Actions */}
                          <td className="entity-mgmt-col-actions">
                            <div className="entity-mgmt-table-actions">
                              <button
                                className="entity-mgmt-btn entity-mgmt-btn-sm"
                                onClick={() => handleViewPublic(entity.slug || entity.id)}
                                title="Xem công khai"
                              >
                                <FaEye />
                              </button>
                              
                              {canEdit && (
                                <button
                                  className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-secondary"
                                  onClick={() => {
                                    setFormMode('edit');
                                    setSelectedEntity(entity);
                                    setShowFormModal(true);
                                  }}
                                  title="Chỉnh sửa"
                                >
                                  <FaEdit />
                                </button>
                              )}
                              
                              {canHide && (
                                <button
                                  className="entity-mgmt-btn entity-mgmt-btn-sm"
                                  onClick={() => handleToggleHide(entity)}
                                  title={entity.hidden ? 'Hiện' : 'Ẩn'}
                                >
                                  {entity.hidden ? <FaEye /> : <FaEyeSlash />}
                                </button>
                              )}
                              
                              {canDelete && (
                                <button
                                  className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-danger"
                                  onClick={() => handleDelete(entity.id)}
                                  title="Xóa"
                                >
                                  <FaTrash />
                                </button>
                              )}
                              
                              {!canEdit && canSuggest && (
                                <button
                                  className="entity-mgmt-btn entity-mgmt-btn-sm entity-mgmt-btn-primary"
                                  onClick={() => {
                                    setSuggestionMode('update');
                                    setSelectedEntity(entity);
                                    setShowSuggestionModal(true);
                                  }}
                                  title="Đề xuất chỉnh sửa"
                                >
                                  <FaLightbulb />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="entity-mgmt-pagination">
                    <span className="entity-mgmt-pagination-info">
                      Hiển thị {((filters.page - 1) * filters.limit) + 1} - {Math.min(filters.page * filters.limit, pagination.totalItems)} / {pagination.totalItems}
                    </span>
                    <div className="entity-mgmt-pagination-controls">
                      <button
                        onClick={() => setFilters({ ...filters, page: 1 })}
                        disabled={filters.page === 1}
                      >
                        Đầu
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                        disabled={filters.page === 1}
                      >
                        Trước
                      </button>
                      {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (filters.page <= 3) {
                          pageNum = i + 1;
                        } else if (filters.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = filters.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            className={filters.page === pageNum ? 'active' : ''}
                            onClick={() => setFilters({ ...filters, page: pageNum })}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                        disabled={filters.page === pagination.totalPages}
                      >
                        Sau
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, page: pagination.totalPages })}
                        disabled={filters.page === pagination.totalPages}
                      >
                        Cuối
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Suggestions Tab */}
            <div className="entity-mgmt-filters">
              <div className="entity-mgmt-filters-row">
                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Trạng thái</label>
                  <select
                    value={suggestionFilters.status}
                    onChange={(e) => setSuggestionFilters({ ...suggestionFilters, status: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã chấp thuận</option>
                    <option value="rejected">Đã từ chối</option>
                  </select>
                </div>

                <div className="entity-mgmt-filter-group">
                  <label className="entity-mgmt-filter-label">Loại đề xuất</label>
                  <select
                    value={suggestionFilters.suggestion_type}
                    onChange={(e) => setSuggestionFilters({ ...suggestionFilters, suggestion_type: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả loại</option>
                    <option value="create">Thêm mới</option>
                    <option value="update">Cập nhật</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-loading">
                  <FaSpinner className="entity-mgmt-spinner" />
                  <span>Đang tải...</span>
                </div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-empty">
                  <h3>Chưa có đề xuất nào</h3>
                  <p>Người dùng có thể đề xuất thêm mới hoặc chỉnh sửa {currentConfig.plural.toLowerCase()}</p>
                </div>
              </div>
            ) : (
              <div className="entity-mgmt-table-wrapper">
                <div className="entity-mgmt-table-container">
                  <table className="entity-mgmt-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Loại</th>
                        <th>Tên {currentConfig.singular}</th>
                        <th>Người đề xuất</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((suggestion, index) => (
                        <tr key={suggestion.id}>
                          <td>{(suggestionFilters.page - 1) * suggestionFilters.limit + index + 1}</td>
                          <td>
                            <span className={`entity-mgmt-badge ${suggestion.suggestion_type === 'create' ? 'entity-mgmt-badge-success' : 'entity-mgmt-badge-warning'}`}>
                              {suggestion.suggestion_type === 'create' ? 'Thêm mới' : 'Cập nhật'}
                            </span>
                          </td>
                          <td>
                            <span className="entity-mgmt-table-name">
                              {suggestion.suggestion_type === 'create' 
                                ? suggestion.suggested_data.name 
                                : (suggestion[entityType]?.name || '-')}
                            </span>
                          </td>
                          <td>{suggestion.user?.full_name}</td>
                          <td>
                            {suggestion.status === 'pending' && (
                              <span className="entity-mgmt-badge entity-mgmt-badge-warning">
                                <FaClock /> Chờ duyệt
                              </span>
                            )}
                            {suggestion.status === 'approved' && (
                              <span className="entity-mgmt-badge entity-mgmt-badge-success">
                                <FaCheck /> Đã duyệt
                              </span>
                            )}
                            {suggestion.status === 'rejected' && (
                              <span className="entity-mgmt-badge entity-mgmt-badge-danger">
                                <FaBan /> Đã từ chối
                              </span>
                            )}
                          </td>
                          <td>{new Date(suggestion.created_at).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div className="entity-mgmt-table-actions">
                              <button
                                className={`entity-mgmt-btn entity-mgmt-btn-sm ${canApprove && suggestion.status === 'pending' ? 'entity-mgmt-btn-primary' : 'entity-mgmt-btn-secondary'}`}
                                onClick={() => {
                                  setSuggestionMode('review');
                                  setSelectedSuggestion(suggestion);
                                  setShowSuggestionModal(true);
                                }}
                                title={canApprove && suggestion.status === 'pending' ? 'Phê duyệt' : 'Xem chi tiết'}
                              >
                                {canApprove && suggestion.status === 'pending' ? <FaCheck /> : <FaEye />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="entity-mgmt-pagination">
                    <span className="entity-mgmt-pagination-info">
                      Trang {suggestionFilters.page} / {pagination.totalPages}
                    </span>
                    <div className="entity-mgmt-pagination-controls">
                      <button
                        onClick={() => setSuggestionFilters({ ...suggestionFilters, page: suggestionFilters.page - 1 })}
                        disabled={suggestionFilters.page === 1}
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => setSuggestionFilters({ ...suggestionFilters, page: suggestionFilters.page + 1 })}
                        disabled={suggestionFilters.page === pagination.totalPages}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ============================================ */}
        {/* MODALS */}
        {/* ============================================ */}
        
        {/* Form Modal */}
        {showFormModal && (
          <EntityFormModal
            entityType={entityType}
            mode={formMode}
            entity={selectedEntity}
            categories={categories}
            onClose={() => {
              setShowFormModal(false);
              setSelectedEntity(null);
            }}
            onSuccess={() => {
              setShowFormModal(false);
              setSelectedEntity(null);
              fetchEntities();
            }}
          />
        )}

        {/* Suggestion Modal */}
        {showSuggestionModal && (
          <SuggestionModal
            entityType={entityType}
            mode={suggestionMode}
            entity={selectedEntity}
            suggestion={selectedSuggestion}
            categories={categories}
            onClose={() => {
              setShowSuggestionModal(false);
              setSelectedEntity(null);
              setSelectedSuggestion(null);
            }}
            onSuccess={() => {
              setShowSuggestionModal(false);
              setSelectedEntity(null);
              setSelectedSuggestion(null);
              if (suggestionMode === 'review') {
                fetchSuggestions();
                fetchEntities();
              } else {
                fetchSuggestions();
              }
            }}
          />
        )}

        {/* Bulk Hide Modal */}
        {showBulkHideModal && (
          <div className="entity-mgmt-modal-overlay" onClick={() => setShowBulkHideModal(false)}>
            <div className="entity-mgmt-modal" onClick={e => e.stopPropagation()}>
              <div className="entity-mgmt-modal-header">
                <h3>
                  <FaEyeSlash /> Ẩn {selectedIds.length} {currentConfig.plural.toLowerCase()}
                </h3>
                <button onClick={() => setShowBulkHideModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="entity-mgmt-modal-body">
                <div className="entity-mgmt-form-group">
                  <label>Lý do ẩn <span className="entity-mgmt-required">*</span></label>
                  <textarea
                    value={bulkHideReason}
                    onChange={(e) => setBulkHideReason(e.target.value)}
                    placeholder="Nhập lý do ẩn..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="entity-mgmt-modal-footer">
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-secondary"
                  onClick={() => setShowBulkHideModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-primary"
                  onClick={handleBulkHide}
                  disabled={bulkLoading || !bulkHideReason.trim()}
                >
                  {bulkLoading ? <FaSpinner className="entity-mgmt-spinner" /> : <FaEyeSlash />}
                  <span>{bulkLoading ? 'Đang xử lý...' : 'Xác nhận ẩn'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Category Modal */}
        {showBulkCategoryModal && (
          <div className="entity-mgmt-modal-overlay" onClick={() => setShowBulkCategoryModal(false)}>
            <div className="entity-mgmt-modal" onClick={e => e.stopPropagation()}>
              <div className="entity-mgmt-modal-header">
                <h3>
                  <FaFolder /> Đổi danh mục cho {selectedIds.length} {currentConfig.plural.toLowerCase()}
                </h3>
                <button onClick={() => setShowBulkCategoryModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="entity-mgmt-modal-body">
                <div className="entity-mgmt-form-group">
                  <label>Chọn danh mục <span className="entity-mgmt-required">*</span></label>
                  <select
                    value={bulkCategoryId}
                    onChange={(e) => setBulkCategoryId(e.target.value)}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="entity-mgmt-modal-footer">
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-secondary"
                  onClick={() => setShowBulkCategoryModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="entity-mgmt-btn entity-mgmt-btn-primary"
                  onClick={handleBulkUpdateCategory}
                  disabled={bulkLoading || !bulkCategoryId}
                >
                  {bulkLoading ? <FaSpinner className="entity-mgmt-spinner" /> : <FaCheck />}
                  <span>{bulkLoading ? 'Đang xử lý...' : 'Xác nhận'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityManagementPage; 