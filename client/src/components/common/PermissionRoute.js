import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import usePermissions from '../../hooks/usePermissions';
import { FaLock } from 'react-icons/fa'; // Thêm icon ổ khóa cho đẹp

const PermissionRoute = ({ 
  children, 
  requiredRole,
  module, // THÊM MỚI: Prop quyết định việc check quyền theo nhóm chức năng
  fallbackPath = '/dashboard'
}) => {
  const { user, loading } = useAuth();
  const { canAccessModule } = usePermissions(); // Sử dụng hook phân quyền của bạn
  const location = useLocation();

  // 1. Đang loading - chờ user data load xong
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#666' }}>
        <div>Đang tải dữ liệu hệ thống...</div>
      </div>
    );
  }

  // 2. Chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Kiểm tra Role cơ bản
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      console.warn(`❌ [PermissionRoute] User role '${user.role}' không được phép`);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center' }}>
          <FaLock style={{ fontSize: '60px', color: '#dc3545', marginBottom: '20px' }} />
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>Bạn không có quyền truy cập trang này.</p>
          <button onClick={() => window.history.back()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>Quay lại</button>
        </div>
      );
    }
  }

  // 4. Kiểm tra quyền theo module: CHỈ áp dụng cho Staff.
  // Admin luôn có toàn quyền, Doctor dùng rule riêng ở route/controller.
  if (module && user.role === 'staff') {
    if (!canAccessModule(module)) {
      console.warn(`❌ [PermissionRoute] User bị chặn vì không có quyền module: ${module}`);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center' }}>
          <FaLock style={{ fontSize: '60px', color: '#dc3545', marginBottom: '20px' }} />
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
            Tài khoản của bạn chưa được cấp quyền truy cập tính năng: <strong>{module}</strong>
          </p>
          <button onClick={() => window.history.back()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>Quay lại</button>
        </div>
      );
    }
  }

  // ✅ Pass - Đủ quyền truy cập
  return children;
};

export default PermissionRoute;