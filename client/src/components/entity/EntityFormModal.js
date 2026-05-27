// client/src/components/entity/EntityFormModal.js - VERSION 2.0 - HOÀN CHỈNH
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaSave, FaFileImport, FaExclamationTriangle, FaInfoCircle, 
  FaFileExcel, FaImage, FaSpinner, FaLink 
} from 'react-icons/fa';
import './EntityFormModal.css';

// Helper function to standardize column names (headers)
const standardizeKey = (key) => {
  if (!key) return '';
  
  let cleanKey = key.trim().toLowerCase().replace(/\s/g, '');
  cleanKey = cleanKey.replace(/[^a-z0-9_]/g, '');

  const keyMap = {
    'medicinename': 'name',
    'tênthuốc': 'name',
    'name': 'name',
    'composition': 'composition',
    'thànhphần': 'composition',
    'uses': 'uses',
    'côngdụng': 'uses',
    'sideeffects': 'side_effects',
    'side_effects': 'side_effects',
    'tácdụngphụ': 'side_effects',
    'manufacturer': 'manufacturer',
    'nhàsảnxuất': 'manufacturer',
    'imageurl': 'image_url',
    'image_url': 'image_url',
    'urlhìnhảnh': 'image_url',
    'description': 'description',
    'môtả': 'description',
    'categoryid': 'category_id',
    'category_id': 'category_id',
    'symptoms': 'symptoms',
    'triệuchứng': 'symptoms',
    'treatments': 'treatments',
    'phươngphápđiềutrị': 'treatments',
    'excellentreviewpercent': 'excellent_review_percent',
    'excellent_review_percent': 'excellent_review_percent',
    'averagereviewpercent': 'average_review_percent',
    'average_review_percent': 'average_review_percent',
    'poorreviewpercent': 'poor_review_percent',
    'poor_review_percent': 'poor_review_percent',
    'components': 'components',
    'medicineusage': 'medicine_usage',
    'medicine_usage': 'medicine_usage',
    'slug': 'slug'
  };

  return keyMap[cleanKey] || null;
};

// CSV parsing function
const parseCSVLine = (line, delimiter = ',') => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  line = line.trim().replace(/^"|"$/g, '').replace(/\r/g, ''); 

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

// Helper: Generate slug from name
const generateSlug = (text) => {
  if (!text) return '';
  
  let slug = text.toLowerCase();
  
  // Bỏ dấu tiếng Việt
  slug = slug.replace(/á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
  slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
  slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
  slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
  slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
  slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
  slug = slug.replace(/đ/gi, 'd');
  
  slug = slug.replace(/[^a-z0-9 -]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
};


const EntityFormModal = ({ entityType, mode, entity, categories, onClose, onSuccess }) => {
  // mode: 'create' | 'edit' | 'import'
  
  const API_BASE_URL = 'http://localhost:3001';
  const token = localStorage.getItem('token');

  // ============================================
  // CONFIG - ĐỊNH NGHĨA CÁC TRƯỜNG ĐẦY ĐỦ TỪ MODEL
  // ============================================
  const config = {
    medicine: {
      apiPath: 'medicines',
      title: 'Thuốc',
      fields: {
        // Thông tin cơ bản
        name: { label: 'Tên thuốc', type: 'text', required: true, group: 'basic' },
        // --- [SỬA] Thêm input nhập đơn vị tính ---
       // [SỬA] Chuyển sang dạng chọn (select) và thêm đầy đủ các loại
        unit: { 
          label: 'Đơn vị tính', 
          type: 'datalist', 
          required: true, 
          group: 'basic',
          options: [
            { value: 'Viên', label: 'Viên' },
            { value: 'Vỉ', label: 'Vỉ' },
            { value: 'Hộp', label: 'Hộp' },
            { value: 'Lọ', label: 'Lọ' },
            { value: 'Chai', label: 'Chai' },
            { value: 'Tuýp', label: 'Tuýp' },
            { value: 'Gói', label: 'Gói' },
            { value: 'Ống', label: 'Ống' },
            { value: 'Túi', label: 'Túi' }
          ]
        },
        price: { label: 'Giá tiền (VNĐ)', type: 'number', required: true, group: 'basic', min: 0 },
        slug: { label: 'Slug (URL)', type: 'slug', required: false, group: 'basic', autoGenerate: true },
        category_id: { label: 'Danh mục', type: 'select', required: false, group: 'basic' },
        image_url: { label: 'URL hình ảnh', type: 'image', required: false, group: 'basic' },
        
        // Thông tin chi tiết
        composition: { label: 'Thành phần', type: 'textarea', required: false, group: 'detail' },
        uses: { label: 'Công dụng', type: 'textarea', required: false, group: 'detail' },
        side_effects: { label: 'Tác dụng phụ', type: 'textarea', required: false, group: 'detail' },
        manufacturer: { label: 'Nhà sản xuất', type: 'text', required: false, group: 'detail' },
        description: { label: 'Mô tả chung', type: 'textarea', required: false, group: 'detail' },
        
        // Cột cũ để tương thích
        components: { label: 'Components (cũ)', type: 'textarea', required: false, group: 'legacy', hidden: true },
        medicine_usage: { label: 'Cách dùng (cũ)', type: 'textarea', required: false, group: 'legacy', hidden: true },
        
        // Đánh giá
        excellent_review_percent: { label: '% Đánh giá xuất sắc', type: 'number', required: false, group: 'review', min: 0, max: 100 },
        average_review_percent: { label: '% Đánh giá trung bình', type: 'number', required: false, group: 'review', min: 0, max: 100 },
        poor_review_percent: { label: '% Đánh giá kém', type: 'number', required: false, group: 'review', min: 0, max: 100 }
      },
      groups: {
        basic: { label: 'Thông tin cơ bản', order: 1 },
        detail: { label: 'Chi tiết thuốc', order: 2 },
        review: { label: 'Đánh giá', order: 3 },
        legacy: { label: 'Dữ liệu cũ (tương thích)', order: 4 }
      }
    },
    disease: {
      apiPath: 'diseases',
      title: 'Bệnh lý',
      fields: {
        // Thông tin cơ bản
        name: { label: 'Tên bệnh lý', type: 'text', required: true, group: 'basic' },
        slug: { label: 'Slug (URL)', type: 'slug', required: false, group: 'basic', autoGenerate: true },
        category_id: { label: 'Danh mục', type: 'select', required: false, group: 'basic' },
        
        // Thông tin chi tiết
        symptoms: { label: 'Triệu chứng', type: 'textarea', required: false, group: 'detail' },
        treatments: { label: 'Phương pháp điều trị', type: 'textarea', required: false, group: 'detail' },
        description: { label: 'Mô tả', type: 'textarea', required: false, group: 'detail' }
      },
      groups: {
        basic: { label: 'Thông tin cơ bản', order: 1 },
        detail: { label: 'Chi tiết bệnh lý', order: 2 }
      }
    }
  };

  const currentConfig = config[entityType];

  // ============================================
  // STATE
  // ============================================
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [duplicates, setDuplicates] = useState([]); 
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [csvDelimiter, setCsvDelimiter] = useState(','); 

  // Image preview
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (mode === 'edit' && entity) {
      setFormData(entity);
      if (entity.image_url) {
        setImagePreview(entity.image_url);
      }
    } else if (mode === 'create') {
      const initialData = {};
      Object.keys(currentConfig.fields).forEach(key => {
        const field = currentConfig.fields[key];
        if (field.type === 'number') {
          initialData[key] = 0;
        } else {
          initialData[key] = '';
        }
      });
      setFormData(initialData);
    }
  }, [entity, mode, entityType]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    
    // Xử lý số
    if (type === 'number') {
      // FIX: Cho phép chuỗi rỗng để người dùng xóa được số 0
      if (value === '') {
        newValue = '';
      } else {
        // FIX: Dùng parseInt thay vì parseFloat vì tiền Việt không có số lẻ
        newValue = parseInt(value, 10);
        if (isNaN(newValue)) newValue = 0;
      }
      
      // Chỉ validate min/max nếu newValue là số
      if (newValue !== '') {
        const field = currentConfig.fields[name];
        if (field?.min !== undefined && newValue < field.min) newValue = field.min;
        if (field?.max !== undefined && newValue > field.max) newValue = field.max;
      }
    }
    
    const newFormData = { ...formData, [name]: newValue };
    
    // Auto-generate slug từ name
    if (name === 'name' && currentConfig.fields.slug?.autoGenerate) {
      newFormData.slug = generateSlug(value);
    }
    
    setFormData(newFormData);
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({ ...formData, image_url: url });
    setImagePreview(url);
    setImageError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Chuẩn bị dữ liệu gửi đi
      const submitData = { ...formData };

      // FIX: Chuyển các trường số đang để trống về 0 trước khi gửi
      Object.keys(currentConfig.fields).forEach(key => {
        if (currentConfig.fields[key].type === 'number' && submitData[key] === '') {
          submitData[key] = 0;
        }
      });
      
      // Loại bỏ các trường không cần thiết
      delete submitData.id;
      delete submitData.created_at;
      delete submitData.updated_at;
      delete submitData.Category;
      
      let response;
      if (mode === 'create') {
        response = await axios.post(
          `${API_BASE_URL}/api/articles/${currentConfig.apiPath}`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (mode === 'edit') {
        response = await axios.put(
          `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/${entity.id}`,
          submitData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (response.data.success) {
        alert(mode === 'create' ? 'Tạo mới thành công!' : 'Cập nhật thành công!');
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // IMPORT HANDLING
  // ============================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      alert('Vui lòng chuyển file Excel sang định dạng CSV hoặc JSON trước khi import.');
      setImportFile(null);
      setImportData([]);
      return;
    }

    const reader = new FileReader();
    
    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          setImportData(Array.isArray(data) ? data : [data]);
          setImportFile(file);
        } catch (err) {
          alert('File JSON không hợp lệ');
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim()); 

        if (lines.length === 0) {
          alert('File CSV không có dữ liệu.');
          setImportFile(null);
          setImportData([]);
          return;
        }
        
        const rawHeaders = parseCSVLine(lines[0], csvDelimiter);
        const standardHeaders = rawHeaders.map(h => standardizeKey(h)); 
        
        if (!standardHeaders.includes('name')) {
          alert(`Lỗi: Không tìm thấy cột tên (name) trong file CSV. Các header được nhận diện: ${rawHeaders.join(', ')}`);
          setImportFile(null);
          setImportData([]);
          return;
        }

        const data = lines.slice(1).map(line => {
          const values = parseCSVLine(line, csvDelimiter); 
          const obj = {};
          
          standardHeaders.forEach((standardHeader, index) => {
            if (standardHeader && values[index]) {
              obj[standardHeader] = values[index];
            }
          });
          
          return obj;
        }).filter(obj => obj.name && obj.name.trim() !== '');
        
        if (data.length === 0 && lines.length > 1) {
          alert('Lỗi: Dữ liệu trống hoặc tất cả bản ghi đều thiếu tên.');
          setImportFile(null);
          setImportData([]);
          return;
        }

        setImportData(data);
        setImportFile(file);
      };
      reader.readAsText(file);
    } else {
      alert('Chỉ hỗ trợ file .json và .csv');
      setImportFile(null);
      setImportData([]);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      alert('Không có dữ liệu để import');
      return;
    }

    setLoading(true);
    setError('');
    setDuplicates([]); 

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/import`,
        {
          [currentConfig.apiPath]: importData,
          handleDuplicates: duplicateAction
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const results = response.data.results;
        
        if (results.duplicates.length > 0 && duplicateAction === 'skip') {
          setDuplicates(results.duplicates); 
          setShowDuplicateModal(true);
        } else {
          let finalMessage = `Import thành công!\n`;
          finalMessage += `Thành công: ${results.success}\n`;
          finalMessage += `Bỏ qua/Trùng lặp: ${results.skipped}\n`;
          finalMessage += `Lỗi thất bại: ${results.errors.length}`;

          if (results.errors.length > 0) {
            const firstError = results.errors[0];
            finalMessage += `\n\nChi tiết lỗi đầu tiên: ${firstError.name || 'N/A'} - ${(firstError.reason || '').substring(0, 50)}...`;
          }
          
          alert(finalMessage);
          onSuccess();
        }
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Lỗi Server không xác định.';
      setError(`Lỗi import: ${serverMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateResolve = async (action) => {
    setDuplicateAction(action);
    setShowDuplicateModal(false);
    
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/import`,
        {
          [currentConfig.apiPath]: importData,
          handleDuplicates: action
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const results = response.data.results;
        
        let finalMessage = `Import hoàn tất với hành động "${action}":\n`;
        finalMessage += `Thành công: ${results.success}\n`;
        finalMessage += `Bỏ qua/Trùng lặp: ${results.skipped}\n`;
        finalMessage += `Lỗi thất bại: ${results.errors.length}`;
        
        alert(finalMessage);
        onSuccess();
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Lỗi Server không xác định.';
      setError(`Lỗi import: ${serverMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderField = (fieldName, fieldConfig) => {
    if (fieldConfig.hidden && !showAdvanced) return null;
    
    const value = formData[fieldName] ?? '';
    
    switch (fieldConfig.type) {
      case 'select':
        // [SỬA] Logic mới: Nếu cấu hình có danh sách options riêng (như Đơn vị) thì dùng nó
        // Nếu không thì mặc định lấy từ danh sách categories (như Danh mục)
        const optionsList = fieldConfig.options || categories.map(c => ({ value: c.id, label: c.name }));
        
        return (
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            className="entity-form-select"
          >
            <option value="">-- Chọn --</option>
            {optionsList.map((opt, idx) => (
              <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

        // [THÊM ĐOẠN NÀY VÀO SAU CASE SELECT HOẶC TRƯỚC CASE TEXTAREA]
      case 'datalist':
        return (
          <>
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={fieldConfig.required}
              className="entity-form-input"
              list={`list-${fieldName}`}
              placeholder={`Nhập hoặc chọn ${fieldConfig.label.toLowerCase()}...`}
            />
            <datalist id={`list-${fieldName}`}>
              {fieldConfig.options.map((opt, idx) => (
                <option key={idx} value={opt.value} />
              ))}
            </datalist>
          </>
        )
        
      case 'textarea':
        return (
          <textarea
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            rows={4}
            className="entity-form-textarea"
            placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            className="entity-form-input entity-form-input-number"
            min={fieldConfig.min}
            max={fieldConfig.max}
            step="1000"  // FIX: Bước nhảy là 1000đ thay vì 0.01
          />
        );
        
      case 'slug':
        return (
          <div className="entity-form-slug-wrapper">
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleChange}
              required={fieldConfig.required}
              className="entity-form-input entity-form-input-slug"
              placeholder="tu-dong-tao-tu-ten"
            />
            {fieldConfig.autoGenerate && (
              <span className="entity-form-slug-hint">
                <FaLink /> Tự động tạo từ tên
              </span>
            )}
          </div>
        );
        
      case 'image':
        return (
          <div className="entity-form-image-wrapper">
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleImageUrlChange}
              className="entity-form-input"
              placeholder="https://example.com/image.jpg"
            />
            {imagePreview && (
              <div className="entity-form-image-preview">
                {imageError ? (
                  <div className="entity-form-image-error">
                    <FaImage />
                    <span>Không thể tải ảnh</span>
                  </div>
                ) : (
                  <img 
                    src={imagePreview} 
                    alt="Preview"
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                  />
                )}
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <input
            type={fieldConfig.type}
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            className="entity-form-input"
            placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
          />
        );
    }
  };

  const renderFieldsByGroup = () => {
    const groups = currentConfig.groups || {};
    const sortedGroups = Object.entries(groups)
      .sort(([, a], [, b]) => a.order - b.order);
    
    return sortedGroups.map(([groupKey, groupConfig]) => {
      // Lọc các field thuộc group này
      const groupFields = Object.entries(currentConfig.fields)
        .filter(([, field]) => field.group === groupKey)
        .filter(([, field]) => !field.hidden || showAdvanced);
      
      if (groupFields.length === 0) return null;
      
      // Ẩn group legacy nếu không showAdvanced
      if (groupKey === 'legacy' && !showAdvanced) return null;
      
      return (
        <div key={groupKey} className="entity-form-group-section">
          <h4 className="entity-form-group-title">{groupConfig.label}</h4>
          <div className="entity-form-group-fields">
            {groupFields.map(([fieldName, fieldConfig]) => (
              <div key={fieldName} className={`entity-form-group ${fieldConfig.type === 'textarea' ? 'entity-form-group-full' : ''}`}>
                <label className="entity-form-label">
                  {fieldConfig.label}
                  {fieldConfig.required && <span className="entity-form-required">*</span>}
                </label>
                {renderField(fieldName, fieldConfig)}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="entity-form-modal-overlay" onClick={onClose}>
      <div className="entity-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="entity-form-modal-header">
          <h2>
            {mode === 'create' && `Thêm ${currentConfig.title} mới`}
            {mode === 'edit' && `Chỉnh sửa ${currentConfig.title}`}
            {mode === 'import' && `Import ${currentConfig.title}`}
          </h2>
          <button className="entity-form-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="entity-form-modal-body">
          {error && (
            <div className="entity-form-alert entity-form-alert-danger">
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}

          {mode === 'import' ? (
            <div className="entity-form-import-section">
              <div className="entity-form-info-box">
                <FaInfoCircle />
                <div>
                  <strong>Hướng dẫn import:</strong>
                  <p>Chọn file JSON hoặc CSV chứa dữ liệu {currentConfig.title}.</p>
                  <p className="entity-form-import-note">
                    <span className="entity-form-text-danger">LƯU Ý:</span> Cột tên phải có header là{' '}
                    <code>name</code> hoặc <code>Tên thuốc</code>/<code>Tên bệnh lý</code>.
                  </p>
                  <p className="entity-form-import-note">
                    <FaFileExcel className="entity-form-text-success" /> 
                    <span className="entity-form-text-danger">EXCEL:</span> Vui lòng chuyển sang CSV.
                  </p>
                </div>
              </div>

              <div className="entity-form-group">
                <label className="entity-form-label">Chọn dấu phân tách CSV</label>
                <select
                  value={csvDelimiter}
                  onChange={(e) => setCsvDelimiter(e.target.value)}
                  className="entity-form-select"
                >
                  <option value=",">Dấu phẩy (,)</option>
                  <option value=";">Dấu chấm phẩy (;)</option>
                  <option value="\t">Dấu Tab</option>
                </select>
              </div>

              <div className="entity-form-group">
                <label className="entity-form-label">Chọn file (.json, .csv)</label>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="entity-form-file-input"
                />
                {importFile && (
                  <span className="entity-form-file-name">
                    {importFile.name}
                  </span>
                )}
              </div>

              {importData.length > 0 && (
                <div className="entity-form-import-preview">
                  <h4>Xem trước ({importData.length} bản ghi)</h4>
                  <div className="entity-form-import-table-wrapper">
                    <table className="entity-form-import-table">
                      <thead>
                        <tr>
                          {Object.keys(importData[0]).slice(0, 5).map(key => (
                            <th key={key}>{key}</th>
                          ))}
                          {Object.keys(importData[0]).length > 5 && <th>...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).slice(0, 5).map((val, i) => (
                              <td key={i}>{String(val).substring(0, 50)}</td>
                            ))}
                            {Object.values(row).length > 5 && <td>...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importData.length > 5 && (
                    <p className="entity-form-preview-note">
                      ... và {importData.length - 5} bản ghi khác
                    </p>
                  )}

                  <div className="entity-form-group">
                    <label className="entity-form-label">Xử lý trùng lặp</label>
                    <select
                      value={duplicateAction}
                      onChange={(e) => setDuplicateAction(e.target.value)}
                      className="entity-form-select"
                    >
                      <option value="skip">Bỏ qua</option>
                      <option value="replace">Ghi đè</option>
                      <option value="rename">Đổi tên (thêm timestamp)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="entity-form-form">
              {renderFieldsByGroup()}
              
              {/* Toggle Advanced Fields */}
              {entityType === 'medicine' && (
                <button
                  type="button"
                  className="entity-form-toggle-advanced"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Ẩn trường nâng cao' : 'Hiện trường nâng cao'}
                </button>
              )}
            </form>
          )}
        </div>

        <div className="entity-form-modal-footer">
          <button
            type="button"
            className="entity-form-btn entity-form-btn-secondary"
            onClick={onClose}
          >
            Hủy
          </button>
          {mode === 'import' ? (
            <button
              type="button"
              className="entity-form-btn entity-form-btn-primary"
              onClick={handleImport}
              disabled={loading || importData.length === 0}
            >
              {loading ? <FaSpinner className="entity-form-spinner" /> : <FaFileImport />}
              <span>{loading ? 'Đang import...' : 'Import'}</span>
            </button>
          ) : (
            <button
              type="submit"
              className="entity-form-btn entity-form-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <FaSpinner className="entity-form-spinner" /> : <FaSave />}
              <span>{loading ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
          )}
        </div>

        {/* Duplicate Check Modal */}
        {showDuplicateModal && (
          <div className="entity-form-duplicate-overlay">
            <div className="entity-form-duplicate-modal">
              <div className="entity-form-duplicate-header">
                <h3>
                  <FaExclamationTriangle />
                  <span>Phát hiện dữ liệu trùng lặp</span>
                </h3>
              </div>
              <div className="entity-form-duplicate-body">
                <p>Có {duplicates.length} bản ghi trùng tên:</p>
                <ul className="entity-form-duplicate-list">
                  {duplicates.slice(0, 10).map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                  {duplicates.length > 10 && (
                    <li className="entity-form-duplicate-more">
                      ... và {duplicates.length - 10} bản ghi khác
                    </li>
                  )}
                </ul>
                <p className="entity-form-duplicate-question">Bạn muốn xử lý như thế nào?</p>
              </div>
              <div className="entity-form-duplicate-footer">
                <button
                  className="entity-form-btn entity-form-btn-secondary"
                  onClick={() => handleDuplicateResolve('skip')}
                >
                  Bỏ qua
                </button>
                <button
                  className="entity-form-btn entity-form-btn-warning"
                  onClick={() => handleDuplicateResolve('replace')}
                >
                  Ghi đè
                </button>
                <button
                  className="entity-form-btn entity-form-btn-primary"
                  onClick={() => handleDuplicateResolve('rename')}
                >
                  Đổi tên
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityFormModal; 