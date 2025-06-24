// 🎯 ENHANCED TIME FORMATTER - Ultra Optimized, single logic, UI & output giữ nguyên

const pad = (n, l = 2) => n.toString().padStart(l, '0');

// ==== Core formatter: Unified logic for all use-cases ====
/**
 * Format time by pattern.
 * @param {number} time - Time in seconds
 * @param {'ms'|'cs'|'legacy'} mode - Display milliseconds, centiseconds (0.1s), or legacy mm:ss
 * @returns {string}
 */
function coreFormatTime(time, mode = 'cs') {
  if (typeof time !== 'number' || isNaN(time)) return '00:00';

  const totalSeconds = Math.floor(time);
  const decimal = time - totalSeconds;
  
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  
  // 🔧 FIXED: Proper centiseconds calculation
  let centiseconds = Math.round(decimal * 10);
  
  // 🔧 CRITICAL FIX: Handle centiseconds overflow
  if (centiseconds >= 10) {
    seconds += 1;
    centiseconds = 0;
    
    // Handle seconds overflow
    if (seconds >= 60) {
      minutes += 1;
      seconds = 0;
    }
  }
  
  if (mode === 'ms') {
    const ms = Math.floor(decimal * 1000);
    return `${pad(minutes)}:${pad(seconds)}.${pad(ms,3)}`;
  }
  
  if (mode === 'cs') {
    return `${pad(minutes)}.${pad(seconds)}.${centiseconds}`;
  }
  
  // legacy
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ==== EXPORTS (Public API) ====

// Mặc định hiển thị milliseconds
export const formatTime = (time, showMs = true) =>
  coreFormatTime(time, showMs ? 'ms' : 'legacy');

// Chỉ mm:ss
export const formatTimeSimple = (time) => coreFormatTime(time, 'legacy');

// Rõ ràng ms
export const formatTimeWithMs = (time) => coreFormatTime(time, 'ms');

// MM.SS.CS với 0.1s precision, chuẩn unified
export const formatTimeUnified = (time) => coreFormatTime(time, 'cs');

// MM.SS.CS (chuẩn Compact/Selector)
export const formatTimeWithCS = formatTimeUnified;

// Auto format by context
export const formatTimeContext = (time, context = 'display') =>
  coreFormatTime(time, 
    context === 'legacy' || context === 'simple'
      ? 'legacy'
      : context === 'ms'
        ? 'ms'
        : 'cs'
  );

// ==== PARSE (giữ nguyên logic gốc, tối ưu gọn) ====
export const parseTimeFromString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(/[.:]/).filter(Boolean);
  if (parts.length >= 3) {
    // MM.SS.CS (or ms)
    const [mm, ss, cs] = parts.map(Number);
    if (
      [mm, ss, cs].some(isNaN) ||
      mm < 0 || ss < 0 || ss >= 60 || cs < 0 || cs >= 100
    ) return null;
    return mm * 60 + ss + cs / 100;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts.map(Number);
    if (
      [mm, ss].some(isNaN) ||
      mm < 0 || ss < 0 || ss >= 60
    ) return null;
    return mm * 60 + ss;
  }
  return null;
};

// ==== FILE SIZE ====
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
