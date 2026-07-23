// client/src/pages/CategoryManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, FaEdit, FaTrash, FaFolder, FaSearch, FaTimes, 
  FaPills, FaHeartbeat, FaNewspaper, FaInfoCircle, FaLayerGroup, 
  FaFilter, FaSortUp, FaSortDown, FaSort, FaImage, FaLink, FaCheckCircle, FaCopy
} from 'react-icons/fa';
import './CategoryManagementPage.css';

// Helper xử lý URL thông minh
const formatAdLink = (url) => {
  if (!url) return "#";
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States Modals
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  
  // States Filter & Search
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  
  // States Form Data
  const [formData, setFormData] = useState({
    category_type: '', name: '', slug: '', description: '',
    banner_image_url: '', banner_target_link: '',
    sidebar_ad_image_url: '', sidebar_ad_target_link: ''
  });

  const [bulkData, setBulkData] = useState({
    banner_image_url: '', banner_target_link: '',
    sidebar_ad_image_url: '', sidebar_ad_target_link: '',
    overwrite_all: false
  });

  // States Upload Hình Ảnh
  const [uploadModeBanner, setUploadModeBanner] = useState('url'); // 'url' hoặc 'file'
  const [uploadModeSidebar, setUploadModeSidebar] = useState('url');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingSidebar, setUploadingSidebar] = useState(false);

  // States Upload Hình Ảnh (Bulk)
  const [bulkUploadModeBanner, setBulkUploadModeBanner] = useState('url');
  const [bulkUploadModeSidebar, setBulkUploadModeSidebar] = useState('url');
  const [bulkUploadingBanner, setBulkUploadingBanner] = useState(false);
  const [bulkUploadingSidebar, setBulkUploadingSidebar] = useState(false);

  const CATEGORY_CONFIG = {
    tin_tuc: { label: 'Tin tức', icon: FaNewspaper, color: '#3b82f6', bg: '#eff6ff' },
    thuoc: { label: 'Thuốc', icon: FaPills, color: '#10b981', bg: '#ecfdf5' },
    benh_ly: { label: 'Bệnh lý', icon: FaHeartbeat, color: '#ef4444', bg: '#fef2f2' }
  };

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories`);
      if (response.data.success) setCategories(response.data.categories);
    } catch (error) {
      alert('Không thể tải dữ liệu danh mục.');
    } finally { setLoading(false); }
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleBulkChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setBulkData({ ...bulkData, [e.target.name]: value });
  };

  // Hàm xử lý upload ảnh chung
  const handleImageUpload = async (file, fieldName, isBulk = false) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    try {
      // Set loading state
      if (isBulk) {
        if (fieldName === 'banner_image_url') setBulkUploadingBanner(true);
        else setBulkUploadingSidebar(true);
      } else {
        if (fieldName === 'banner_image_url') setUploadingBanner(true);
        else setUploadingSidebar(true);
      }

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        const uploadedUrl = data.url;
        // Cập nhật state tương ứng
        if (isBulk) {
          setBulkData(prev => ({ ...prev, [fieldName]: uploadedUrl }));
        } else {
          setFormData(prev => ({ ...prev, [fieldName]: uploadedUrl }));
        }
      } else {
        alert(data.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Error during upload:', error);
      alert(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      // Clear loading state
      if (isBulk) {
        if (fieldName === 'banner_image_url') setBulkUploadingBanner(false);
        else setBulkUploadingSidebar(false);
      } else {
        if (fieldName === 'banner_image_url') setUploadingBanner(false);
        else setUploadingSidebar(false);
      }
    }
  };

  const openModal = (category = null) => {
    // Reset tabs
    setUploadModeBanner('url');
    setUploadModeSidebar('url');

    if (category) {
      setEditMode(true); setCurrentCategory(category);
      setFormData({
        category_type: category.category_type || '', name: category.name || '', slug: category.slug || '',
        description: category.description || '', banner_image_url: category.banner_image_url || '',
        banner_target_link: category.banner_target_link || '', sidebar_ad_image_url: category.sidebar_ad_image_url || '',
        sidebar_ad_target_link: category.sidebar_ad_target_link || ''
      });
    } else {
      setEditMode(false); setCurrentCategory(null);
      setFormData({ category_type: '', name: '', slug: '', description: '', banner_image_url: '', banner_target_link: '', sidebar_ad_image_url: '', sidebar_ad_target_link: '' });
    }
    setShowModal(true); document.body.classList.add('modal-open');
  };

  const closeModals = () => {
    setShowModal(false); setShowBulkModal(false);
    document.body.classList.remove('modal-open');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editMode && currentCategory) await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories/${currentCategory.id}`, formData, config);
      else await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories`, formData, config);
      alert('Lưu thành công!'); fetchCategories(); closeModals();
    } catch (error) { alert('Có lỗi xảy ra khi lưu!'); }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories/bulk/bulk-ads`, bulkData, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message); fetchCategories(); closeModals();
    } catch (error) { alert('Có lỗi xảy ra khi áp dụng hàng loạt!'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Chắc chắn muốn xóa danh mục này?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        alert('Xóa thành công!'); fetchCategories();
      } catch (error) { alert(error.response?.data?.message || 'Lỗi xóa!'); }
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredCategories = React.useMemo(() => {
    let filtered = categories.filter(cat => 
      (selectedType === 'all' || cat.category_type === selectedType) &&
      (cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || cat.slug.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [categories, selectedType, searchTerm, sortConfig]);

  const renderSortIcon = (column) => {
    if (sortConfig.key !== column) return <FaSort className="cat-sort-icon-muted" />;
    return sortConfig.direction === 'asc' ? <FaSortUp className="cat-sort-icon-active" /> : <FaSortDown className="cat-sort-icon-active" />;
  };

  return (
    <div className="cat-page-wrapper">
      
      <div className="cat-header-card">
        <div className="cat-header-info">
          <h1><FaLayerGroup /> Quản lý Danh mục & Quảng cáo</h1>
          <p>Phân loại bài viết và cấu hình Banner, Sidebar Ads cho từng chuyên mục</p>
        </div>
        <div className="cat-header-actions">
          <button className="cat-btn-bulk" onClick={() => { 
            setBulkUploadModeBanner('url');
            setBulkUploadModeSidebar('url');
            setShowBulkModal(true); 
            document.body.classList.add('modal-open'); 
          }}>
            <FaCopy /> Cấu hình hàng loạt
          </button>
          <button className="cat-btn-create" onClick={() => openModal()}>
            <FaPlus /> Thêm danh mục
          </button>
        </div>
      </div>

      <div className="cat-toolbar">
        <div className="cat-search-box">
          <FaSearch className="cat-search-icon" />
          <input type="text" placeholder="Tìm theo tên hoặc slug..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && <FaTimes className="cat-clear-icon" onClick={() => setSearchTerm('')} />}
        </div>
        <div className="cat-filter-box">
          <FaFilter className="cat-filter-icon" />
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="all">Tất cả loại danh mục</option>
            <option value="tin_tuc">Tin tức y tế</option>
            <option value="thuoc">Từ điển Thuốc</option>
            <option value="benh_ly">Tra cứu Bệnh lý</option>
          </select>
        </div>
      </div>

      <div className="cat-table-card">
        {loading ? (
          <div className="cat-loading"><div className="cat-spinner"></div><p>Đang tải dữ liệu...</p></div>
        ) : sortedAndFilteredCategories.length === 0 ? (
          <div className="cat-empty-state"><FaFolder /> <p>Không tìm thấy danh mục nào.</p></div>
        ) : (
          <div className="cat-table-responsive">
            <table className="cat-main-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('id')} style={{cursor: 'pointer', width: '80px'}}>ID {renderSortIcon('id')}</th>
                  <th onClick={() => requestSort('name')} style={{cursor: 'pointer'}}>Tên danh mục {renderSortIcon('name')}</th>
                  <th>Phân loại</th>
                  <th className="cat-text-center">Banner Ngang</th>
                  <th className="cat-text-center">Sidebar Ad</th>
                  <th className="cat-text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredCategories.map(cat => {
                  const typeConfig = CATEGORY_CONFIG[cat.category_type] || CATEGORY_CONFIG.tin_tuc;
                  return (
                    <tr key={cat.id}>
                      <td className="cat-cell-id">#{cat.id}</td>
                      <td>
                        <div className="cat-name-block">
                          <strong className="cat-name-text">{cat.name}</strong>
                          <span className="cat-slug-text">/{cat.slug}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cat-badge-type" style={{ color: typeConfig.color, backgroundColor: typeConfig.bg }}>
                          <typeConfig.icon /> {typeConfig.label}
                        </span>
                      </td>
                      <td className="cat-text-center">
                        {cat.banner_image_url ? (
                          <a href={formatAdLink(cat.banner_target_link)} target="_blank" rel="noreferrer" title="Click để test link">
                            <img src={cat.banner_image_url} alt="Banner" className="cat-ad-thumbnail banner" onError={(e) => e.target.src = '/placeholder.jpg'} />
                          </a>
                        ) : <span className="cat-status-icon empty"><FaTimes/></span>}
                      </td>
                      <td className="cat-text-center">
                        {cat.sidebar_ad_image_url ? (
                          <a href={formatAdLink(cat.sidebar_ad_target_link)} target="_blank" rel="noreferrer" title="Click để test link">
                            <img src={cat.sidebar_ad_image_url} alt="Ad" className="cat-ad-thumbnail sidebar" onError={(e) => e.target.src = '/placeholder.jpg'} />
                          </a>
                        ) : <span className="cat-status-icon empty"><FaTimes/></span>}
                      </td>
                      <td className="cat-text-center">
                        <div className="cat-action-group">
                          <button className="cat-action-btn edit" onClick={() => openModal(cat)} title="Chỉnh sửa"><FaEdit /></button>
                          <button className="cat-action-btn delete" onClick={() => handleDelete(cat.id)} title="Xóa"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. MODAL FORM THÊM / SỬA */}
      {showModal && (
        <div className="cat-modal-overlay">
          <div className="cat-modal-content">
            <div className="cat-modal-header">
              <h2>{editMode ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục mới'}</h2>
              <button type="button" className="cat-modal-close" onClick={closeModals}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="cat-modal-form">
              <div className="cat-form-layout-grid">
                <div className="cat-form-column">
                  <h3 className="cat-column-title"><FaInfoCircle /> Thông tin chung</h3>
                  <div className="cat-form-group">
                    <label>Loại danh mục <span className="cat-required">*</span></label>
                    <select name="category_type" value={formData.category_type} onChange={handleInputChange} required>
                      <option value="">-- Chọn phân loại --</option>
                      <option value="tin_tuc">Tin tức</option>
                      <option value="thuoc">Thuốc</option>
                      <option value="benh_ly">Bệnh lý</option>
                    </select>
                  </div>
                  <div className="cat-form-group">
                    <label>Tên danh mục <span className="cat-required">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="cat-form-group">
                    <label>Đường dẫn tĩnh (Slug)</label>
                    <input type="text" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="De-trong-de-tu-dong-tao" />
                  </div>
                  <div className="cat-form-group">
                    <label>Mô tả ngắn</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2"></textarea>
                  </div>
                </div>

                <div className="cat-form-column cat-column-ads">
                  <h3 className="cat-column-title"><FaImage /> Cấu hình Quảng cáo</h3>
                  
                  {/* Banner Ngang */}
                  <div className="cat-ad-block">
                    <h4>Top Banner (Ngang)</h4>
                    <span className="cat-ad-hint">Kích thước đề xuất: 1920x300px hoặc 1920x400px</span>
                    <div className="cat-form-group">
                      <label><FaImage /> Hình ảnh hiển thị</label>
                      <div className="cat-image-upload-group">
                        <div className="cat-upload-tabs">
                          <button type="button" className={`cat-upload-tab ${uploadModeBanner === 'url' ? 'active' : ''}`} onClick={() => setUploadModeBanner('url')}>URL Link</button>
                          <button type="button" className={`cat-upload-tab ${uploadModeBanner === 'file' ? 'active' : ''}`} onClick={() => setUploadModeBanner('file')}><FaImage /> Upload File</button>
                        </div>
                        {uploadModeBanner === 'url' ? (
                          <input type="url" name="banner_image_url" value={formData.banner_image_url} onChange={handleInputChange} placeholder="https://..." />
                        ) : (
                          <div>
                            <div 
                              className={`cat-upload-area ${uploadingBanner ? 'uploading' : ''}`}
                              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file && file.type.startsWith('image/')) handleImageUpload(file, 'banner_image_url', false); }}
                              onDragOver={(e) => e.preventDefault()}
                              onClick={() => document.getElementById('bannerFileInput').click()}
                            >
                              <FaImage className="cat-upload-icon" />
                              <p className="cat-upload-text">{uploadingBanner ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}</p>
                              <p className="cat-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                            </div>
                            <input type="file" id="bannerFileInput" style={{display: 'none'}} accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'banner_image_url', false)} />
                          </div>
                        )}
                        {formData.banner_image_url && (
                          <div className="cat-image-preview">
                            <img src={formData.banner_image_url} alt="Preview Banner" onError={(e) => e.target.src = '/placeholder.jpg'} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="cat-form-group">
                      <label><FaLink /> Link đích khi click</label>
                      <input type="text" name="banner_target_link" value={formData.banner_target_link} onChange={handleInputChange} placeholder="/bai-viet-abc hoặc https://..." />
                    </div>
                  </div>

                  {/* Sidebar Banner */}
                  <div className="cat-ad-block">
                    <h4>Sidebar Banner (Dọc)</h4>
                    <span className="cat-ad-hint">Kích thước đề xuất: 300x600px</span>
                    <div className="cat-form-group">
                      <label><FaImage /> Hình ảnh hiển thị</label>
                      <div className="cat-image-upload-group">
                        <div className="cat-upload-tabs">
                          <button type="button" className={`cat-upload-tab ${uploadModeSidebar === 'url' ? 'active' : ''}`} onClick={() => setUploadModeSidebar('url')}>URL Link</button>
                          <button type="button" className={`cat-upload-tab ${uploadModeSidebar === 'file' ? 'active' : ''}`} onClick={() => setUploadModeSidebar('file')}><FaImage /> Upload File</button>
                        </div>
                        {uploadModeSidebar === 'url' ? (
                          <input type="url" name="sidebar_ad_image_url" value={formData.sidebar_ad_image_url} onChange={handleInputChange} placeholder="https://..." />
                        ) : (
                          <div>
                            <div 
                              className={`cat-upload-area ${uploadingSidebar ? 'uploading' : ''}`}
                              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file && file.type.startsWith('image/')) handleImageUpload(file, 'sidebar_ad_image_url', false); }}
                              onDragOver={(e) => e.preventDefault()}
                              onClick={() => document.getElementById('sidebarFileInput').click()}
                            >
                              <FaImage className="cat-upload-icon" />
                              <p className="cat-upload-text">{uploadingSidebar ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}</p>
                              <p className="cat-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                            </div>
                            <input type="file" id="sidebarFileInput" style={{display: 'none'}} accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'sidebar_ad_image_url', false)} />
                          </div>
                        )}
                        {formData.sidebar_ad_image_url && (
                          <div className="cat-image-preview">
                            <img src={formData.sidebar_ad_image_url} alt="Preview Sidebar" onError={(e) => e.target.src = '/placeholder.jpg'} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="cat-form-group">
                      <label><FaLink /> Link đích khi click</label>
                      <input type="text" name="sidebar_ad_target_link" value={formData.sidebar_ad_target_link} onChange={handleInputChange} placeholder="/bai-viet-xyz hoặc https://..." />
                    </div>
                  </div>
                </div>
              </div>
              <div className="cat-modal-footer">
                <button type="button" className="cat-btn-cancel" onClick={closeModals}>Hủy bỏ</button>
                <button type="submit" className="cat-btn-submit"><FaCheckCircle /> {editMode ? 'Lưu thay đổi' : 'Tạo danh mục'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL FORM CẬP NHẬT HÀNG LOẠT (BULK) */}
      {showBulkModal && (
        <div className="cat-modal-overlay">
          <div className="cat-modal-content" style={{maxWidth: '600px'}}>
            <div className="cat-modal-header">
              <h2><FaCopy /> Áp dụng Quảng cáo Hàng loạt</h2>
              <button type="button" className="cat-modal-close" onClick={closeModals}><FaTimes /></button>
            </div>
            <form onSubmit={handleBulkSubmit} className="cat-modal-form">
              <p style={{marginBottom: '1.5rem', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6'}}>
                Tính năng này cho phép bạn gán Banner / Quảng cáo mặc định cho tất cả các danh mục bài viết chỉ bằng một nút bấm. Rất hữu ích cho <strong>Trang "Tất cả bài viết"</strong> và các danh mục chưa được cấu hình.
              </p>

              <div className="cat-ad-block" style={{background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                <h4>Top Banner (Ngang) - Mặc định</h4>
                <div className="cat-form-group">
                  <label><FaImage /> Hình ảnh hiển thị</label>
                  <div className="cat-image-upload-group">
                    <div className="cat-upload-tabs">
                      <button type="button" className={`cat-upload-tab ${bulkUploadModeBanner === 'url' ? 'active' : ''}`} onClick={() => setBulkUploadModeBanner('url')}>URL Link</button>
                      <button type="button" className={`cat-upload-tab ${bulkUploadModeBanner === 'file' ? 'active' : ''}`} onClick={() => setBulkUploadModeBanner('file')}><FaImage /> Upload File</button>
                    </div>
                    {bulkUploadModeBanner === 'url' ? (
                      <input type="url" name="banner_image_url" value={bulkData.banner_image_url} onChange={handleBulkChange} />
                    ) : (
                      <div>
                        <div 
                          className={`cat-upload-area ${bulkUploadingBanner ? 'uploading' : ''}`}
                          onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file && file.type.startsWith('image/')) handleImageUpload(file, 'banner_image_url', true); }}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={() => document.getElementById('bulkBannerFileInput').click()}
                        >
                          <FaImage className="cat-upload-icon" />
                          <p className="cat-upload-text">{bulkUploadingBanner ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}</p>
                          <p className="cat-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                        </div>
                        <input type="file" id="bulkBannerFileInput" style={{display: 'none'}} accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'banner_image_url', true)} />
                      </div>
                    )}
                    {bulkData.banner_image_url && (
                      <div className="cat-image-preview">
                        <img src={bulkData.banner_image_url} alt="Preview Bulk Banner" onError={(e) => e.target.src = '/placeholder.jpg'} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="cat-form-group">
                  <label><FaLink /> Link đích khi click</label>
                  <input type="text" name="banner_target_link" value={bulkData.banner_target_link} onChange={handleBulkChange} />
                </div>
              </div>

              <div className="cat-ad-block" style={{background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                <h4>Sidebar Banner (Dọc) - Mặc định</h4>
                <div className="cat-form-group">
                  <label><FaImage /> Hình ảnh hiển thị</label>
                  <div className="cat-image-upload-group">
                    <div className="cat-upload-tabs">
                      <button type="button" className={`cat-upload-tab ${bulkUploadModeSidebar === 'url' ? 'active' : ''}`} onClick={() => setBulkUploadModeSidebar('url')}>URL Link</button>
                      <button type="button" className={`cat-upload-tab ${bulkUploadModeSidebar === 'file' ? 'active' : ''}`} onClick={() => setBulkUploadModeSidebar('file')}><FaImage /> Upload File</button>
                    </div>
                    {bulkUploadModeSidebar === 'url' ? (
                      <input type="url" name="sidebar_ad_image_url" value={bulkData.sidebar_ad_image_url} onChange={handleBulkChange} />
                    ) : (
                      <div>
                        <div 
                          className={`cat-upload-area ${bulkUploadingSidebar ? 'uploading' : ''}`}
                          onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file && file.type.startsWith('image/')) handleImageUpload(file, 'sidebar_ad_image_url', true); }}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={() => document.getElementById('bulkSidebarFileInput').click()}
                        >
                          <FaImage className="cat-upload-icon" />
                          <p className="cat-upload-text">{bulkUploadingSidebar ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}</p>
                          <p className="cat-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                        </div>
                        <input type="file" id="bulkSidebarFileInput" style={{display: 'none'}} accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'sidebar_ad_image_url', true)} />
                      </div>
                    )}
                    {bulkData.sidebar_ad_image_url && (
                      <div className="cat-image-preview">
                        <img src={bulkData.sidebar_ad_image_url} alt="Preview Bulk Sidebar" onError={(e) => e.target.src = '/placeholder.jpg'} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="cat-form-group">
                  <label><FaLink /> Link đích khi click</label>
                  <input type="text" name="sidebar_ad_target_link" value={bulkData.sidebar_ad_target_link} onChange={handleBulkChange} />
                </div>
              </div>

              <div className="cat-form-group" style={{marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <input 
                  type="checkbox" 
                  id="overwrite_all" 
                  name="overwrite_all" 
                  checked={bulkData.overwrite_all} 
                  onChange={handleBulkChange} 
                  style={{width: '20px', height: '20px', cursor: 'pointer'}}
                />
                <label htmlFor="overwrite_all" style={{cursor: 'pointer', margin: 0, color: '#ef4444'}}>
                  <strong>Ghi đè luôn cả những danh mục đã có quảng cáo</strong> (Nguy hiểm)
                </label>
              </div>

              <div className="cat-modal-footer" style={{marginTop: '2rem'}}>
                <button type="button" className="cat-btn-cancel" onClick={closeModals}>Hủy bỏ</button>
                <button type="submit" className="cat-btn-submit" style={{background: '#3b82f6'}}><FaCheckCircle /> Áp dụng hàng loạt</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoryManagementPage;