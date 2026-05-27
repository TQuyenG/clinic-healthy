// src/utils/imageHelpers.js
// Utility functions để xử lý ảnh placeholder và lỗi load ảnh

/**
 * Tạo placeholder image SVG
 * @param {number} width - Chiều rộng ảnh
 * @param {number} height - Chiều cao ảnh
 * @param {string} text - Text hiển thị
 * @returns {string} Data URI của SVG
 */
export const getPlaceholderImage = (width = 400, height = 300, text = 'Image') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect fill="#f0f0f0" width="${width}" height="${height}"/>
      <text 
        fill="#999" 
        font-family="Arial, sans-serif" 
        font-size="18" 
        font-weight="bold" 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Xử lý lỗi khi load ảnh
 * @param {Event} e - Event object
 * @param {number} width - Chiều rộng placeholder
 * @param {number} height - Chiều cao placeholder
 * @param {string} text - Text hiển thị trên placeholder
 */
export const handleImageError = (e, width = 400, height = 300, text = 'Image') => {
  e.target.onerror = null; // Prevent infinite loop
  e.target.src = getPlaceholderImage(width, height, text);
};

// Export default
export default {
  getPlaceholderImage,
  handleImageError
};