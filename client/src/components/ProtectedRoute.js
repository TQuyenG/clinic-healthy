// client/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

/**
 * ProtectedRoute Component
 * 
 * Bảo vệ các route yêu cầu quyền truy cập đặc biệt
 * 
 * @param {string} requiredModule - Module cần quyền (vd: 'articles', 'payments')
 * @param {string} requiredPermission - Quyền cụ thể (vd: 'articles:view', 'payments:approve')
 * @param {JSX.Element} children - Component con cần bảo vệ
 * @param {string} redirectTo - Đường dẫn redirect nếu không có quyền (mặc định '/404')
 */
const ProtectedRoute = ({ 
  requiredModule = null, 
  requiredPermission = null, 
  children, 
  redirectTo = '/404' 
}) => {
  const { user, canAccessModule, hasPermission, isAdmin } = usePermissions();

  // Nếu chưa load user, hiển thị loading
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  // Admin có toàn quyền
  if (isAdmin) {
    return children;
  }

  // Kiểm tra quyền module (vd: canAccessModule('articles'))
  if (requiredModule && !canAccessModule(requiredModule)) {
    console.warn(`⚠️ User ${user.username} không có quyền truy cập module: ${requiredModule}`);
    return <Navigate to={redirectTo} replace />;
  }

  // Kiểm tra quyền cụ thể (vd: hasPermission('articles', 'view'))
  if (requiredPermission) {
    const [module, action] = requiredPermission.split(':');
    if (!hasPermission(module, action)) {
      console.warn(`⚠️ User ${user.username} không có quyền: ${requiredPermission}`);
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Có quyền truy cập
  return children;
};

export default ProtectedRoute;
