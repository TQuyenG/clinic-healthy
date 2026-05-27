// client/src/hooks/usePermissions.js
/**
 * 🔐 CUSTOM HOOK KIỂM TRA QUYỀN NGƯỜI DÙNG
 * 
 * Hook này kiểm tra xem user có quyền cụ thể hay không
 * Hỗ trợ 3 format permissions:
 * 1. Boolean: {articles: true} - Có toàn quyền
 * 2. Array: {articles: ['view', 'create']} - Có quyền cụ thể
 * 3. Object: {articles: {view: true, create: false}} - Chi tiết từng quyền
 * 
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
 * 
 * // Kiểm tra 1 quyền
 * if (hasPermission('payments', 'view')) {
 *   // Hiển thị menu Thanh toán
 * }
 * 
 * // Kiểm tra có ÍT NHẤT 1 quyền trong module
 * if (hasAnyPermission('articles', ['view', 'create'])) {
 *   // Hiển thị menu Bài viết
 * }
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';

const usePermissions = () => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});

  // --- [BẮT ĐẦU ĐOẠN SỬA] ---
  useEffect(() => {
    const loadPermissions = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          if (userData.role === 'staff' || userData.role === 'doctor') { // Bổ sung doctor
              const perms = userData.role_info?.permissions || 
                            userData.staff?.permissions || 
                            userData.doctor?.permissions || // Bổ sung quyền từ profile doctor
                            userData.roleData?.permissions || 
                            {};
              setPermissions(perms);
          }
else if (userData.role === 'admin') {
    setPermissions('admin');
}
        } catch (e) { setPermissions({}); }
      }
    };

    loadPermissions();

    // Tự động gọi API lấy quyền mới nhất từ server khi mount (tránh stale permissions)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        // Refresh permissions for staff and doctors on mount to avoid stale/empty permissions
        if (userData?.role === 'staff' || userData?.role === 'doctor') {
          refreshPermissions();
        }
      } catch (e) {}
    }

    window.addEventListener('storage', loadPermissions);
    return () => window.removeEventListener('storage', loadPermissions);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hàm gọi API lấy quyền mới nhất từ Server để cập nhật LocalStorage
  const refreshPermissions = useCallback(async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (!currentUser) return;

      // Nếu là staff hoặc doctor, load từ API permissions mới
      if (currentUser.role === 'staff' || currentUser.role === 'doctor') {
        try {
          // Lấy từ API permissions chi tiết (/me endpoint)
          const { data: permData } = await api.get('/permissions/me');
          if (permData.success && permData.data?.permissions) {
            const updatedUser = { 
              ...currentUser, 
              role_info: {
                ...currentUser.role_info,
                permissions: permData.data.permissions
              }
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setPermissions(permData.data.permissions);
            window.dispatchEvent(new Event('storage'));
            return;
          }
        } catch (err) {
          console.warn('Không thể lấy permissions từ /permissions/me:', err);
          // Fallback: Lấy từ role-info endpoint cũ
        }
      }

      // Fallback: Lấy từ endpoint role-info cũ
      const { data } = await api.get('/users/profile/role-info');
      if (data.success && data.user?.role_info) {
        const updatedUser = { 
          ...currentUser, 
          role_info: data.user.role_info 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setPermissions(data.user.role_info.permissions || {});
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) { console.error("Không thể cập nhật quyền:", err); }
  }, []);
  // --- [KẾT THÚC ĐOẠN SỬA] ---

  /**
   * Kiểm tra 1 quyền cụ thể
   * @param {string} module - Tên module (vd: 'articles', 'payments')
   * @param {string} action - Tên action (vd: 'view', 'create', 'edit')
   * @returns {boolean}
   */
  const hasPermission = useMemo(() => {
    return (module, action) => {
      // ✅ Admin có toàn quyền
      if (permissions === 'admin') return true;
      
      // ✅ Không có permissions → false
      if (!permissions || typeof permissions !== 'object') return false;
      
      const modulePermissions = permissions[module];
      
      // ✅ Module không tồn tại → false
      if (!modulePermissions) return false;
      
      // ✅ Format 1: Boolean (toàn quyền module)
      if (modulePermissions === true) return true;
      
      // ✅ Format 2: Array ['view', 'create']
      if (Array.isArray(modulePermissions)) {
        return modulePermissions.includes(action);
      }
      
      // ✅ Format 3: Object {view: true, create: false}
      if (typeof modulePermissions === 'object') {
        return modulePermissions[action] === true;
      }
      
      return false;
    };
  }, [permissions]);

  /**
   * Kiểm tra có ÍT NHẤT 1 quyền trong module
   * @param {string} module - Tên module
   * @param {string[]} actions - Danh sách actions cần check (optional)
   * @returns {boolean}
   */
  const hasAnyPermission = useMemo(() => {
    return (module, actions = []) => {
      // ✅ Admin có toàn quyền
      if (permissions === 'admin') return true;
      
      if (!permissions || typeof permissions !== 'object') return false;
      
      const modulePermissions = permissions[module];
      
      // ✅ Module không tồn tại → false
      if (!modulePermissions) return false;
      
      // ✅ Format 1: Boolean → Có toàn quyền
      if (modulePermissions === true) return true;
      
      // ✅ Nếu không truyền actions → Chỉ check có module không
      if (actions.length === 0) {
        // Array có ít nhất 1 phần tử HỢP LỆ
        if (Array.isArray(modulePermissions)) {
          const validActions = modulePermissions.filter(action => action && typeof action === 'string' && action.trim() !== '');
          return validActions.length > 0;
        }
        // Object có ít nhất 1 key = true
        if (typeof modulePermissions === 'object') {
          return Object.values(modulePermissions).some(v => v === true);
        }
      }
      
      // ✅ Check từng action
      return actions.some(action => {
        if (Array.isArray(modulePermissions)) {
          return modulePermissions.includes(action);
        }
        if (typeof modulePermissions === 'object') {
          return modulePermissions[action] === true;
        }
        return false;
      });
    };
  }, [permissions]);

  /**
   * Kiểm tra có TẤT CẢ quyền trong module
   * @param {string} module - Tên module
   * @param {string[]} actions - Danh sách actions cần check
   * @returns {boolean}
   */
  const hasAllPermissions = useMemo(() => {
    return (module, actions) => {
      // ✅ Admin có toàn quyền
      if (permissions === 'admin') return true;
      
      if (!permissions || typeof permissions !== 'object') return false;
      if (!actions || actions.length === 0) return false;
      
      const modulePermissions = permissions[module];
      if (!modulePermissions) return false;
      
      // ✅ Boolean → Có toàn quyền
      if (modulePermissions === true) return true;
      
      // ✅ Check từng action
      return actions.every(action => {
        if (Array.isArray(modulePermissions)) {
          return modulePermissions.includes(action);
        }
        if (typeof modulePermissions === 'object') {
          return modulePermissions[action] === true;
        }
        return false;
      });
    };
  }, [permissions]);

  /**
   * Kiểm tra có quyền truy cập module (có ít nhất 1 quyền bất kỳ)
   * @param {string} module - Tên module
   * @returns {boolean}
   */
  const canAccessModule = useMemo(() => {
    return (module) => {
      // ✅ Admin có toàn quyền
      if (permissions === 'admin') return true;
      
      if (!permissions || typeof permissions !== 'object') return false;
      
      const modulePermissions = permissions[module];
      
      // ✅ Module không tồn tại → false
      if (!modulePermissions) return false;

      // ✅ Boolean → Có quyền
      if (modulePermissions === true) return true;
      
      // ✅ Array → Có ít nhất 1 phần tử HỢP LỆ (Lọc bỏ chuỗi rỗng/null do form submit sinh ra)
      if (Array.isArray(modulePermissions)) {
        const validActions = modulePermissions.filter(action => action && typeof action === 'string' && action.trim() !== '');
        return validActions.length > 0;
      }
      
      // ✅ Object → Có ít nhất 1 key = true
      if (typeof modulePermissions === 'object') {
        return Object.values(modulePermissions).some(v => v === true);
      }
      
      return false;
    };
  }, [permissions]);

  return {
    user,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    refreshPermissions,
    isAdmin: permissions === 'admin'
  };
};

export default usePermissions;
