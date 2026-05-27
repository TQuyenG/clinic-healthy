import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';
import './PermissionDebugPage.css';

const PermissionDebugPage = () => {
  const { user } = useAuth();
  const { permissions, hasPermission, canAccessModule, isAdmin } = usePermissions();

  const criticalModules = [
    'services',
    'consultations',
    'consultation_pricing',
    'system_settings',
    'articles',
    'forum',
    'payments'
  ];

  return (
    <div className="permission-debug-page">
      <div className="debug-container">
        <h1>🔍 Permission Debug Tool</h1>
        
        {/* User Info */}
        <div className="debug-section">
          <h2>👤 User Information</h2>
          <div className="debug-info">
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
            <p><strong>Name:</strong> {user?.full_name || user?.username || 'N/A'}</p>
            {user?.role === 'staff' && (
              <>
                <p><strong>Department:</strong> {user?.department || user?.role_info?.department || 'N/A'}</p>
                <p><strong>Rank:</strong> {user?.role_info?.rank || 'N/A'}</p>
              </>
            )}
            <p><strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}</p>
          </div>
        </div>

        {/* Raw Permissions */}
        <div className="debug-section">
          <h2>🔐 Raw Permissions Object</h2>
          <pre className="debug-json">
            {JSON.stringify(permissions, null, 2)}
          </pre>
        </div>

        {/* Module Access Check */}
        <div className="debug-section">
          <h2>🎯 Module Access Status</h2>
          <table className="debug-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Has Permissions?</th>
                <th>Can Access?</th>
                <th>Permissions Detail</th>
              </tr>
            </thead>
            <tbody>
              {criticalModules.map(module => {
                const modulePerms = permissions && permissions !== 'admin' ? permissions[module] : null;
                const hasPerms = modulePerms !== undefined && modulePerms !== null;
                const canAccess = canAccessModule(module);
                
                return (
                  <tr key={module}>
                    <td><code>{module}</code></td>
                    <td className={hasPerms ? 'status-yes' : 'status-no'}>
                      {hasPerms ? '✅ Yes' : '❌ No'}
                    </td>
                    <td className={canAccess ? 'status-yes' : 'status-no'}>
                      {canAccess ? '✅ Can Access' : '❌ Blocked'}
                    </td>
                    <td>
                      {isAdmin ? (
                        <span className="admin-badge">ADMIN - Full Access</span>
                      ) : (
                        <pre className="perms-detail">
                          {JSON.stringify(modulePerms, null, 2) || 'null'}
                        </pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Specific Permission Tests */}
        {!isAdmin && permissions && typeof permissions === 'object' && (
          <div className="debug-section">
            <h2>🧪 Specific Permission Tests</h2>
            <div className="test-grid">
              <div className="test-item">
                <h3>Services</h3>
                <p>create: {hasPermission('services', 'create') ? '✅' : '❌'}</p>
                <p>edit: {hasPermission('services', 'edit') ? '✅' : '❌'}</p>
                <p>delete: {hasPermission('services', 'delete') ? '✅' : '❌'}</p>
              </div>
              
              <div className="test-item">
                <h3>Consultations</h3>
                <p>view: {hasPermission('consultations', 'view') ? '✅' : '❌'}</p>
                <p>reply: {hasPermission('consultations', 'reply') ? '✅' : '❌'}</p>
                <p>assign: {hasPermission('consultations', 'assign') ? '✅' : '❌'}</p>
              </div>

              <div className="test-item">
                <h3>Consultation Pricing</h3>
                <p>create: {hasPermission('consultation_pricing', 'create') ? '✅' : '❌'}</p>
                <p>edit: {hasPermission('consultation_pricing', 'edit') ? '✅' : '❌'}</p>
                <p>set_price: {hasPermission('consultation_pricing', 'set_price') ? '✅' : '❌'}</p>
              </div>

              <div className="test-item">
                <h3>System Settings</h3>
                <p>view: {hasPermission('system_settings', 'view') ? '✅' : '❌'}</p>
                <p>edit_home: {hasPermission('system_settings', 'edit_home') ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
        )}

        {/* LocalStorage Data */}
        <div className="debug-section">
          <h2>💾 LocalStorage User Data</h2>
          <pre className="debug-json">
            {localStorage.getItem('user') || 'No user data in localStorage'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PermissionDebugPage;
