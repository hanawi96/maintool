// 🛡️ Ultra-safe localStorage utility - Tối ưu hóa 100% logic và UI giữ nguyên

const _isStorageAvailable = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const _INVALID_VALUES = [null, '', 'undefined', 'null'];

const _validate = (key) =>
  _isStorageAvailable() && typeof key === 'string' && !!key;

const _parse = (raw, fallback) => {
  if (_INVALID_VALUES.includes(raw)) return fallback;
  try { return JSON.parse(raw); }
  catch { return raw; }
};

/** Lấy item an toàn từ localStorage */
export const safeGetItem = (key, defaultValue = null) => {
  if (!_validate(key)) return defaultValue;
  return _parse(localStorage.getItem(key), defaultValue);
};

/** Đặt item an toàn vào localStorage */
export const safeSetItem = (key, value) => {
  if (!_validate(key)) return false;
  if (value === undefined) return safeRemoveItem(key);
  try {
    localStorage.setItem(
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    );
    return true;
  } catch { return false; }
};

/** Xóa item khỏi localStorage */
export const safeRemoveItem = (key) => {
  if (!_validate(key)) return false;
  try { localStorage.removeItem(key); return true; }
  catch { return false; }
};

/** Xóa toàn bộ localStorage */
export const safeClear = () => {
  if (!_isStorageAvailable()) return false;
  try { localStorage.clear(); return true; }
  catch { return false; }
};

/** Thông tin tổng quát về storage */
export const getStorageInfo = () => {
  if (!_isStorageAvailable()) return { available: false, error: 'localStorage not supported' };
  const items = [];
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const raw = key ? localStorage.getItem(key) : '';
    const size = raw ? raw.length : 0;
    totalSize += size;
    items.push({ key, size, type: typeof _parse(raw, null) });
  }
  const maxSize = 5 * 1024 * 1024;
  return {
    available: true,
    itemCount: items.length,
    totalSize,
    maxSize,
    usagePercent: Math.round((totalSize / maxSize) * 100),
    items: items.sort((a, b) => b.size - a.size)
  };
};

/** Xóa tất cả các giá trị "undefined"/"null" khỏi localStorage */
export const cleanupUndefinedValues = () => {
  if (!_isStorageAvailable()) return 0;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = key ? localStorage.getItem(key) : null;
    if (_INVALID_VALUES.includes(val)) toRemove.push(key);
  }
  toRemove.forEach(localStorage.removeItem);
  return toRemove.length;
};

/** MP3 Cutter: Tự động return khi play xong */
export const getAutoReturnSetting = () => {
  const val = safeGetItem('mp3cutter_auto_return', true);
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return !['false', '0', 'no'].includes(v);
  }
  return true;
};

export const setAutoReturnSetting = (enable) =>
  typeof enable === 'boolean' && safeSetItem('mp3cutter_auto_return', enable);

export const getUserPreferences = () => ({
  autoReturn: getAutoReturnSetting()
});

// ⚙️ Debug interface (cho phép thao tác debug trực tiếp từ window)
if (_isStorageAvailable()) {
  window.mp3CutterStorageDebug = {
    getInfo: getStorageInfo,
    clear: safeClear,
    get: safeGetItem,
    set: safeSetItem,
    remove: safeRemoveItem,
    getAutoReturn: getAutoReturnSetting,
    setAutoReturn: setAutoReturnSetting,
  };
}
