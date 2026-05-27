const crypto = require('crypto');

// Tạo OTP 6 số ngẫu nhiên
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format ngày tháng cho code (DDMM)
exports.formatDate = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}${month}`;
};

// Validate email
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate số điện thoại (Việt Nam)
exports.isValidPhone = (phone) => {
  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Generate random token
exports.generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Kiểm tra độ mạnh mật khẩu
exports.isStrongPassword = (password) => {
  // Ít nhất 8 ký tự, có chữ hoa, chữ thường, số
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongRegex.test(password);
};

// Sanitize input để tránh XSS
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Parse JSON an toàn
exports.safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Lỗi parse JSON:', error);
    return defaultValue;
  }
};