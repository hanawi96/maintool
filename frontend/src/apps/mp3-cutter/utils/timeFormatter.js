// 🎯 **ENHANCED TIME FORMATTER** - Với hỗ trợ milliseconds mặc định

/**
 * 🕒 **FORMAT TIME WITH MILLISECONDS** - Mặc định hiển thị milliseconds
 * @param {number} time - Time in seconds 
 * @param {boolean} showMs - Show milliseconds (default: true)
 * @returns {string} - Formatted time string
 */
export const formatTime = (time, showMs = true) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  
  if (showMs) {
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};

/**
 * 🕒 **FORMAT TIME LEGACY** - Chỉ MM:SS cho backward compatibility
 * @param {number} time - Time in seconds
 * @returns {string} - Formatted time string without milliseconds
 */
export const formatTimeSimple = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * 🕒 **FORMAT TIME WITH MILLISECONDS** - Explicit milliseconds function
 * @param {number} time - Time in seconds
 * @returns {string} - Formatted time string with milliseconds
 */
export const formatTimeWithMs = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * 🎯 **UNIFIED TIME FORMATTER** - Single source of truth cho tất cả time displays
 * 🔥 **PERFECT CONSISTENCY**: Đảm bảo CompactTimeSelector và tooltip hiển thị y hệt nhau
 * @param {number} time - Time in seconds
 * @returns {string} - Formatted time string MM.SS.CS with perfect 0.1s precision
 */
export const formatTimeUnified = (time) => {
  if (typeof time !== 'number' || isNaN(time)) return '00.00.00';
  
  // 🔥 **DECISECOND ARITHMETIC**: Same exact logic as CompactTimeSelector
  const normalizedTime = Math.round(time * 10) / 10; // Round to 0.1s precision
  const minutes = Math.floor(normalizedTime / 60);
  const seconds = Math.floor(normalizedTime % 60);
  const deciseconds = Math.round((normalizedTime % 1) * 10); // Extract deciseconds (0-9)
  
  // 🔥 **CENTISECONDS DISPLAY**: Convert to display format (00, 10, 20, 30...)
  const centiseconds = deciseconds * 10; // Always multiples of 10
  
  return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

/**
 * 🔄 **UPDATE EXISTING FUNCTION**: Use unified logic
 * 🎯 **FORMAT TIME WITH CENTISECONDS** - Format MM.SS.CS với 0.1s precision cho consistency
 * 🚀 **UPDATED**: Same exact logic as CompactTimeSelector để đảm bảo perfect consistency
 * @param {number} time - Time in seconds
 * @returns {string} - Formatted time string with centiseconds (0.1s steps)
 */
export const formatTimeWithCS = formatTimeUnified;

/**
 * 🕒 **SMART TIME FORMATTER** - Auto-choose format based on context
 * @param {number} time - Time in seconds
 * @param {string} context - Context: 'display', 'input', 'compact', 'selector'
 * @returns {string} - Formatted time string
 */
export const formatTimeContext = (time, context = 'display') => {
  switch (context) {
    case 'compact':
      // For mobile/compact views - MM:SS
      return formatTimeSimple(time);
    case 'input':
      // For time inputs - MM:SS.mmm
      return formatTimeWithMs(time);
    case 'selector':
    case 'tooltip':
    case 'unified':
      // 🚀 **UNIFIED FORMAT**: For time selectors và tooltips - MM.SS.CS với perfect consistency
      return formatTimeUnified(time);
    case 'display':
    default:
      // Default display - MM:SS.mmm
      return formatTime(time, true);
  }
};

/**
 * 🎯 **PARSE TIME FROM STRING** - Enhanced parsing với error handling
 * @param {string} timeStr - Time string in MM:SS.mmm or MM:SS format
 * @returns {number|null} - Parsed time in seconds or null if invalid
 */
export const parseTimeFromString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return null;
  
  const minutes = parseInt(parts[0]);
  if (isNaN(minutes) || minutes < 0) return null;
  
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0]);
  if (isNaN(seconds) || seconds < 0 || seconds >= 60) return null;
  
  const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) : 0;
  if (isNaN(milliseconds) || milliseconds < 0 || milliseconds >= 1000) return null;
  
  return minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * 📁 **FORMAT FILE SIZE** - Unchanged utility
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};