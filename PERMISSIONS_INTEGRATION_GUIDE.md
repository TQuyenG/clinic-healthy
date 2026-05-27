/**
 * HƯỚNG DẪN INTEGRATE PERMISSIONSTAB VÀO STAFFMANAGEMENTPAGE
 * =========================================================
 * 
 * Hệ thống phân quyền chi tiết đã sẵn sàng. Sau đây là cách tích hợp vào UI.
 * 
 * PHẦN 1: IMPORT VÀ SETUP
 * ========================
 */

// 1. Thêm import PermissionsTab ở đầu file StaffManagementPage.js:
import PermissionsTab from '../components/PermissionsTab';

// 2. Thêm state để quản lý active tab:
const [activeTab, setActiveTab] = useState('info'); // 'info', 'permissions', 'history'

/**
 * PHẦN 2: LỌC TÀI KHOẢN/HỒ SƠ PHA NHÂN 
 * =====================================
 * Tìm nơi render tab "Thông tin" của staff và thêm tabs mới
 * 
 * Cấu trúc tương tự như sau:
 */

// Trong phần render right panel (nơi chi tiết staff được hiển thị):

{selectedStaff && (
  <div className="right-panel">
    {/* TAB HEADERS */}
    <div className="tab-headers">
      <button
        className={`tab-header ${activeTab === 'info' ? 'active' : ''}`}
        onClick={() => setActiveTab('info')}
      >
        ℹ️ Thông tin cá nhân
      </button>
      <button
        className={`tab-header ${activeTab === 'permissions' ? 'active' : ''}`}
        onClick={() => setActiveTab('permissions')}
      >
        🔐 Phân quyền
      </button>
      <button
        className={`tab-header ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        📜 Lịch sử
      </button>
    </div>

    {/* TAB CONTENT */}
    <div className="tab-content">
      {/* TAB: THÔNG TIN (GIỮ NGUYÊN CODE HIỆN TẠI) */}
      {activeTab === 'info' && (
        <div>
          {/* Tất cả code hiện tại ở đây */}
        </div>
      )}

      {/* TAB: PHÂN QUYỀN - COMPONENT MỚI */}
      {activeTab === 'permissions' && selectedStaff.rank !== 'admin' && (
        <PermissionsTab 
          staffId={selectedStaff.id}
          staffName={selectedStaff.user?.full_name}
          onClose={() => setActiveTab('info')}
        />
      )}

      {/* TAB: LỊCH SỬ (GIỮ NGUYÊN HOẶC TÍCH HỢP) */}
      {activeTab === 'history' && (
        <HistoryTab staffId={selectedStaff.id} />
      )}
    </div>
  </div>
)}

/**
 * PHẦN 3: CSS CHO TABS
 * ====================
 * Thêm vào StaffManagementPage.css:
 */

.tab-headers {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 20px;
  padding: 0 20px;
}

.tab-header {
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-header:hover {
  color: #333;
  background: #f5f5f5;
}

.tab-header.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
}

.tab-content {
  padding: 0 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/**
 * PHẦN 4: LIÊN KẾT DỮ LIỆU
 * ========================
 * 
 * Khi PermissionsTab lưu thay đổi, nó sẽ:
 * 1. Gọi API PUT /api/permissions/staff/:id
 * 2. Tạo AuditLog record
 * 3. Reload page hoặc gọi refreshPermissions()
 * 
 * Do đó, Sidebar sẽ tự động cập nhật menu khi:
 * - User refresh page
 * - refreshPermissions() được gọi
 * - User login lại
 */

/**
 * PHẦN 5: TESTING PERMISSIONS REALTIME
 * ====================================
 * 
 * Để TEST permissions thay đổi tức thì trên Sidebar:
 * 
 * 1. Admin phân quyền cho Staff A (VD: Tắt quyền "view" bài viết)
 * 2. Staff A vẫn thấy menu Bài viết vì page chưa reload
 * 3. Staff A tự động gọi refreshPermissions() (mỗi 30s hoặc khi Sidebar mount)
 * 4. Staff A reload page → menu Bài viết biến mất
 * 
 * CÓ THỂ THÊM AUTO-REFRESH:
 * - Trong Sidebar.js, thêm polling mỗi 30s gọi refreshPermissions()
 * - Hoặc khi phiên Sidebar được focus, gọi refreshPermissions()
 */

/**
 * PHẦN 6: CÁCH SỬ DỤNG CÓ TỪUNGS TỰ ĐỘNG CẬP NHẬT
 * ==========================================
 * 
 * Để Sidebar cập nhật tức thì khi phân quyền thay đổi,
 * hãy thêm vào Sidebar.js useEffect:
 */

// Trong Sidebar.js, thêm polling:
useEffect(() => {
  const interval = setInterval(() => {
    refreshPermissions();
  }, 30000); // Mỗi 30 giây

  return () => clearInterval(interval);
}, [refreshPermissions]);

/**
 * PHẦN 7: SỰ KIỆN TRUYỀN THÔNG
 * ============================
 * 
 * Cách advanced hơn là sử dụng Custom Events:
 * 
 * Trong PermissionsTab, khi save thành công:
 */

// Sau khi lưu permission thành công
window.dispatchEvent(new CustomEvent('permissionsUpdated', {
  detail: { staffId, permissions }
}));

// Trong Sidebar.js, lắng nghe event:
useEffect(() => {
  const handlePermissionsUpdated = (event) => {
    if (user?.staff?.id === event.detail.staffId) {
      refreshPermissions();
    }
  };

  window.addEventListener('permissionsUpdated', handlePermissionsUpdated);
  return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdated);
}, [user, refreshPermissions]);

/**
 * PHẦN 8: LOGIC SIDEBAR CHỈ RENDER NẾU CÓ PERMISSION
 * ===================================================
 * 
 * Sidebar.js đã có logic chính xác:
 * 
 * - MenuDropdown chỉ render nếu:
 *   1. canAccessModule(module) = true (có ≥1 permission)
 *   2. Hoặc hasPermission(module, action) = true
 * 
 * Lấy ví dụ:
 */

// Ví dụ 1: Menu chỉ hiển thị nếu có permission "articles.view"
{canAccessModule('articles') && (
  <MenuDropdownItems
    icon={FaNewspaper}
    label="Quản lý bài viết"
    items={[
      { to: '/quan-ly-bai-viet', label: 'Bài viết' },
      { to: '/quan-ly-thuoc', label: 'Thông tin thuốc' },
      { to: '/quan-ly-benh-ly', label: 'Thông tin bệnh lý' }
    ]}
  />
)}

// Logic bên trong: Chỉ render submenu nếu user có quyền
{canAccessModule('articles') && (
  <Link to="/quan-ly-bai-viet" 
    className={`sidebar-submenu-link ${location.pathname === '/quan-ly-bai-viet' ? 'sidebar-active' : ''}`}>
    <span className="sidebar-submenu-dot">•</span> Bài viết
  </Link>
)}

/**
 * PHẦN 9: CHI TIẾT PERMISSIONS FORMAT
 * ==================================
 * 
 * Permissions được lưu trong database (Staff.permissions) dưới dạng JSON:
 * {
 *   "articles": {
 *     "view": true,
 *     "create": true,
 *     "edit": false,
 *     "delete": false,
 *     "publish": false,
 *     "approve": false
 *   },
 *   "appointments": {
 *     "view": true,
 *     "create": true,
 *     "edit": false,
 *     ...
 *   },
 *   ...
 * }
 * 
 * Hook usePermissions.js hỗ trợ cả 2 format:
 * - Object: {module: {action: boolean}}
 * - Array: {module: [action1, action2]}
 */

/**
 * PHẦN 10: KIỂM TRA & DEBUG
 * ========================
 * 
 * Để debug permissions, mở console và chạy:
 */

// Lấy permissions hiện tại
const user = JSON.parse(localStorage.getItem('user'));
console.log('User permissions:', user.role_info?.permissions);

// Kiểm tra permission cụ thể
// Sử dụng hook usePermissions trong component
const { hasPermission, canAccessModule } = usePermissions();
console.log('Can access articles?', canAccessModule('articles'));
console.log('Can view articles?', hasPermission('articles', 'view'));
console.log('Can create articles?', hasPermission('articles', 'create'));

/**
 * PHẦN 11: FILE STRUCTURE HOÀN CHỈNH
 * ==================================
 */

/*
Backend các file đã tạo/sửa:
├── server/
│   ├── app.js (đã thêm import & mount permissionRoutes)
│   ├── config/
│   │   ├── permissionModules.js (✨ MỚI - định nghĩa 22 modules)
│   │   └── departmentPermissions.js (giữ nguyên)
│   └── routes/
│       └── permissionRoutes.js (✨ MỚI - 5 endpoints)
│           ├── GET /api/permissions/me
│           ├── GET /api/permissions/staff/:staffId
│           ├── PUT /api/permissions/staff/:staffId
│           ├── GET /api/permissions/modules
│           └── GET /api/permissions/audit-logs

Frontend các file đã tạo/sửa:
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PermissionsTab.js (✨ MỚI)
│   │   │   └── PermissionsTab.css (✨ MỚI)
│   │   ├── services/
│   │   │   └── permissionService.js (✨ MỚI)
│   │   ├── hooks/
│   │   │   └── usePermissions.js (SỬA - cập nhật refreshPermissions)
│   │   ├── pages/
│   │   │   └── StaffManagementPage.js (CẦN THÊM - PermissionsTab)
│   │   └── ...
*/

/**
 * SUMMARY TÍCH HỢP
 * ===============
 * 
 * 1. ✅ Backend API + Routes: HOÀN THÀNH
 * 2. ✅ Frontend Components + Services: HOÀN THÀNH
 * 3. ✅ Permission hooks: HOÀN THÀNH & SỬA XONG
 * 4. ⏳ Integration vào StaffManagementPage: CẦN LÀM
 * 5. ⏳ Test & Verify: CẦN LÀM
 * 
 * DO: Thêm PermissionsTab vào StaffManagementPage theo phần 2 & 3 ở trên
 */
