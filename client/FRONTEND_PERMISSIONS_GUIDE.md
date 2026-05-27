# 🎨 CẬP NHẬT GIAO DIỆN VỚI PERMISSIONS

## ✅ ĐÃ HOÀN THÀNH

### 1. Tạo Hook `usePermissions`

**File:** `client/src/hooks/usePermissions.js`

**Chức năng:**
- Tự động load permissions từ localStorage
- Kiểm tra quyền theo 3 format: Boolean, Array, Object
- Cung cấp các hàm tiện ích:
  - `canAccessModule(module)` - Có quyền truy cập module?
  - `hasPermission(module, action)` - Có quyền cụ thể?
  - `hasAnyPermission(module, actions)` - Có ít nhất 1 quyền?
  - `hasAllPermissions(module, actions)` - Có tất cả quyền?
  - `isAdmin` - Là admin?

**Cách sử dụng:**
```javascript
import usePermissions from '../../hooks/usePermissions';

const MyComponent = () => {
  const { canAccessModule, hasPermission, isAdmin } = usePermissions();
  
  return (
    <>
      {/* Ẩn menu nếu không có quyền */}
      {canAccessModule('payments') && (
        <Link to="/payments">Thanh toán</Link>
      )}
      
      {/* Ẩn nút nếu không có quyền cụ thể */}
      {hasPermission('payments', 'approve') && (
        <button>Duyệt thanh toán</button>
      )}
      
      {/* Admin thấy tất cả */}
      {isAdmin && (
        <button>Xóa dữ liệu</button>
      )}
    </>
  );
};
```

---

### 2. Cập nhật Sidebar

**File:** `client/src/components/common/Sidebar.js`

**Thay đổi:**

#### ❌ TRƯỚC (Dựa vào department):
```javascript
{/* Chỉ Finance thấy menu Payments */}
{(user.department === 'finance' || user.staff?.department === 'finance') && (
  <MenuItem to="/payments" label="Thanh toán" />
)}
```

**Vấn đề:**
- Mọi Staff Finance đều thấy, kể cả nhân viên thường
- Không linh hoạt khi phân quyền chi tiết

#### ✅ SAU (Dựa vào permissions):
```javascript
{/* Chỉ Staff có quyền payments mới thấy */}
{canAccessModule('payments') && (
  <MenuItem to="/payments" label="Thanh toán" />
)}
```

**Ưu điểm:**
- Admin phân quyền chi tiết trong UI
- Staff Finance Manager thấy, Staff Finance thường KHÔNG thấy
- Linh hoạt: Có thể cấp quyền cho bất kỳ phòng ban nào

---

### 3. Các module đã được bảo vệ

| Module | Menu | Điều kiện hiển thị |
|--------|------|-------------------|
| **💰 Payments** | Quản lý Tài chính | `canAccessModule('payments')` |
| **📰 Articles** | Quản lý Bài viết | `canAccessModule('articles')` |
| **💬 Forum** | Quản lý Diễn đàn | `canAccessModule('forum')` |
| **💡 Consultations** | Quản lý Tư vấn | `canAccessModule('consultations')` |
| **🛠️ Services** | Quản lý Dịch vụ | `canAccessModule('services')` |
| **⚙️ System** | Quản lý Hệ thống | `canAccessModule('system_settings')` |
| **📅 Appointments** | Quản lý Lịch hẹn | `canAccessModule('appointments')` |

---

## 🔧 HƯỚNG DẪN SỬ DỤNG CHO DEV

### A. Ẩn menu trong Sidebar

```javascript
// client/src/components/common/Sidebar.js

import usePermissions from '../../hooks/usePermissions';

const Sidebar = () => {
  const { canAccessModule } = usePermissions();
  
  return (
    <nav>
      {/* ✅ Menu chỉ hiện khi có quyền */}
      {canAccessModule('payments') && (
        <MenuItem to="/payments" label="Thanh toán" />
      )}
    </nav>
  );
};
```

### B. Ẩn nút trong Page

```javascript
// client/src/pages/PaymentPage.js

import usePermissions from '../hooks/usePermissions';

const PaymentPage = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      <h1>Danh sách thanh toán</h1>
      
      {/* ✅ Nút "Duyệt" chỉ hiện khi có quyền approve */}
      {hasPermission('payments', 'approve') && (
        <button onClick={handleApprove}>
          Duyệt thanh toán
        </button>
      )}
      
      {/* ✅ Nút "Hoàn tiền" chỉ hiện khi có quyền refund */}
      {hasPermission('payments', 'refund') && (
        <button onClick={handleRefund}>
          Hoàn tiền
        </button>
      )}
    </div>
  );
};
```

### C. Ẩn cột trong Table

```javascript
// client/src/pages/ArticlePage.js

import usePermissions from '../hooks/usePermissions';

const ArticlePage = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <table>
      <thead>
        <tr>
          <th>Tiêu đề</th>
          <th>Tác giả</th>
          {/* ✅ Cột "Hành động" chỉ hiện khi có quyền edit hoặc delete */}
          {(hasPermission('articles', 'edit') || hasPermission('articles', 'delete')) && (
            <th>Hành động</th>
          )}
        </tr>
      </thead>
      <tbody>
        {articles.map(article => (
          <tr key={article.id}>
            <td>{article.title}</td>
            <td>{article.author}</td>
            {(hasPermission('articles', 'edit') || hasPermission('articles', 'delete')) && (
              <td>
                {hasPermission('articles', 'edit') && <button>Sửa</button>}
                {hasPermission('articles', 'delete') && <button>Xóa</button>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### D. Redirect khi không có quyền

```javascript
// client/src/pages/PaymentPage.js

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const PaymentPage = () => {
  const { canAccessModule } = usePermissions();
  const navigate = useNavigate();
  
  useEffect(() => {
    // ✅ Nếu không có quyền → Redirect về dashboard
    if (!canAccessModule('payments')) {
      alert('Bạn không có quyền truy cập trang này');
      navigate('/dashboard');
    }
  }, [canAccessModule, navigate]);
  
  return (
    <div>
      {/* Nội dung trang */}
    </div>
  );
};
```

---

## 🧪 TEST CASE

### Test 1: Staff Finance không thấy menu Articles

**Setup:**
```javascript
// Database: staff.permissions
{
  "payments": ["view", "verify", "approve"],
  "articles": []  // ❌ Không có quyền
}
```

**Kết quả:**
- ✅ Menu "Quản lý Tài chính" **HIỆN**
- ❌ Menu "Quản lý Bài viết" **ẨN**

### Test 2: Staff Content không thấy menu Payments

**Setup:**
```javascript
// Database: staff.permissions
{
  "articles": ["view", "create", "edit", "approve"],
  "payments": []  // ❌ Không có quyền
}
```

**Kết quả:**
- ✅ Menu "Quản lý Bài viết" **HIỆN**
- ❌ Menu "Quản lý Tài chính" **ẨN**

### Test 3: Admin thấy tất cả

**Setup:**
```javascript
// User role: admin
```

**Kết quả:**
- ✅ **TẤT CẢ** menu đều **HIỆN**

---

## 📋 CHECKLIST THÊM PERMISSIONS VÀO PAGE MỚI

- [ ] Import `usePermissions` hook
- [ ] Sử dụng `canAccessModule()` để ẩn menu trong Sidebar
- [ ] Sử dụng `hasPermission()` để ẩn nút/cột trong page
- [ ] Thêm redirect nếu user không có quyền
- [ ] Test với staff có quyền → ✅ Thấy UI
- [ ] Test với staff KHÔNG có quyền → ❌ Không thấy UI
- [ ] Test với Admin → ✅ Thấy tất cả

---

## 🎯 BEST PRACTICES

### 1. Ẩn menu NGAY TẠI SIDEBAR
```javascript
// ✅ ĐÚNG - Ẩn menu trong Sidebar
{canAccessModule('payments') && (
  <MenuItem to="/payments" label="Thanh toán" />
)}

// ❌ SAI - Vẫn hiện menu, chỉ redirect trong page
<MenuItem to="/payments" label="Thanh toán" />
// → User thấy menu, click vào bị redirect → Trải nghiệm tệ
```

### 2. Ẩn nút THEO QUYỀN CỤ THỂ
```javascript
// ✅ ĐÚNG - Check quyền chi tiết
{hasPermission('payments', 'approve') && (
  <button>Duyệt</button>
)}

// ❌ SAI - Check quyền module chung
{canAccessModule('payments') && (
  <button>Duyệt</button>
)}
// → Staff có quyền 'view' vẫn thấy nút "Duyệt" nhưng không dùng được
```

### 3. Kết hợp Frontend + Backend
```javascript
// ✅ Frontend: Ẩn nút
{hasPermission('payments', 'approve') && (
  <button onClick={handleApprove}>Duyệt</button>
)}

// ✅ Backend: Check quyền trong route
router.put('/:id/approve', 
  roleMiddleware('payments:approve'),
  controller.approve
);

// → Bảo mật 2 lớp: Frontend ẩn UI + Backend từ chối request
```

---

**🎉 HOÀN TẤT CẬP NHẬT GIAO DIỆN!**
