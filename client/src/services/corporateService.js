// client/src/services/corporateService.js
// Gọi API corporate booking windows

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const corporateService = {
  /**
   * Lấy thông tin corporate window public (không cần login)
   */
  getWindowByCode: async (windowCode) => {
    console.log('[CorporateService] 🔍 getWindowByCode:', windowCode);
    try {
      const response = await axios.get(`${API_BASE_URL}/corporate/windows/${windowCode}`);
      console.log('[CorporateService] ✅ Tìm thấy window:', response.data.data);
      return response;
    } catch (error) {
      console.error('[CorporateService] ❌ Error getWindowByCode:', error.message);
      throw error;
    }
  },

  /**
   * Đăng ký nhân viên vào corporate window
   */
  registerToWindow: async (windowCode, participantInfo) => {
    console.log('[CorporateService] 📝 registerToWindow:', { windowCode, participantInfo });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/corporate/windows/${windowCode}/register`,
        participantInfo
      );
      console.log('[CorporateService] ✅ Đăng ký thành công:', response.data.data);
      return response;
    } catch (error) {
      console.error('[CorporateService] ❌ Error registerToWindow:', error.message);
      throw error;
    }
  },

  /**
   * [ADMIN] Tạo corporate window (cần login & quyền admin)
   */
  createWindow: async (windowData, token) => {
    console.log('[CorporateService] ✏️ createWindow:', windowData);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/corporate/windows`,
        windowData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[CorporateService] ✅ Tạo window thành công:', response.data.data);
      return response;
    } catch (error) {
      console.error('[CorporateService] ❌ Error createWindow:', error.message);
      throw error;
    }
  },

  /**
   * [ADMIN] Danh sách corporate windows
   */
  listWindows: async (query = {}, token) => {
    console.log('[CorporateService] 📋 listWindows:', query);
    try {
      const response = await axios.get(`${API_BASE_URL}/corporate/windows`, {
        params: query,
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[CorporateService] ✅ Danh sách:', response.data.data.length, 'windows');
      return response;
    } catch (error) {
      console.error('[CorporateService] ❌ Error listWindows:', error.message);
      throw error;
    }
  },

  /**
   * [ADMIN] Đóng corporate window
   */
  closeWindow: async (windowCode, reason, token) => {
    console.log('[CorporateService] 🔐 closeWindow:', { windowCode, reason });
    try {
      const response = await axios.put(
        `${API_BASE_URL}/corporate/windows/${windowCode}/close`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[CorporateService] ✅ Đóng window thành công');
      return response;
    } catch (error) {
      console.error('[CorporateService] ❌ Error closeWindow:', error.message);
      throw error;
    }
  },

  /**
   * [DEBUG] Export toàn bộ corporate windows (chỉ cho test)
   */
  debugExportWindows: async (token) => {
    console.log('[CorporateService-DEBUG] 💾 exportWindows');
    try {
      const response = await axios.get(
        `${API_BASE_URL}/corporate/debug/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[CorporateService-DEBUG] ✅ Export:', response.data.data.length, 'windows');
      return response;
    } catch (error) {
      console.error('[CorporateService-DEBUG] ❌ Error:', error.message);
      throw error;
    }
  }
};

export default corporateService;
