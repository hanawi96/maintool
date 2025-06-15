// 🛡️ ULTRA-SAFE STORAGE UTILITY (Optimized)

// 🎯 Check storage availability once
const hasLocalStorage =
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined';

// 🎯 Validate key helper
const validateKey = (key, action) => {
  if (typeof key !== 'string' || !key) {
    console.warn(`⚠️ [safeStorage] Invalid key for ${action}:`, key);
    return false;
  }
  if (!hasLocalStorage) {
    console.warn(`⚠️ [safeStorage] localStorage not available for ${action}`);
    return false;
  }
  return true;
};

/**
 * 🔧 SAFE GET ITEM
 */
export const safeGetItem = (key, defaultValue = null) => {
  if (!validateKey(key, 'get')) return defaultValue;

  const raw = localStorage.getItem(key);
  if (raw == null || raw === '' || raw === 'undefined' || raw === 'null') {
    if (raw === 'undefined' || raw === 'null') {
      console.warn(`⚠️ [safeStorage] Key "${key}" contains literal "${raw}"; using default.`);
    }
    return defaultValue;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/**
 * 🔧 SAFE SET ITEM
 */
export const safeSetItem = (key, value) => {
  if (!validateKey(key, 'set')) return false;

  if (value === undefined) {
    console.warn(`⚠️ [safeStorage] Undefined value for "${key}"; removing item.`);
    return safeRemoveItem(key);
  }

  let toStore;
  if (typeof value === 'string') {
    toStore = value;
  } else {
    try {
      toStore = JSON.stringify(value);
    } catch (err) {
      console.error(`❌ [safeStorage] Serialize failed for "${key}":`, err.message);
      return false;
    }
  }

  try {
    localStorage.setItem(key, toStore);
    return true;
  } catch (err) {
    console.error(`❌ [safeStorage] Error setting "${key}":`, err.message);
    if (err.name === 'QuotaExceededError') {
      console.warn('⚠️ [safeStorage] Quota exceeded.');
    }
    return false;
  }
};

/**
 * 🔧 SAFE REMOVE ITEM
 */
export const safeRemoveItem = (key) => {
  if (!validateKey(key, 'remove')) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`❌ [safeStorage] Remove failed for "${key}":`, err.message);
    return false;
  }
};

/**
 * 🔧 SAFE CLEAR
 */
export const safeClear = () => {
  if (!hasLocalStorage) {
    console.warn('⚠️ [safeStorage] localStorage not available for clear');
    return false;
  }
  try {
    localStorage.clear();
    return true;
  } catch (err) {
    console.error('❌ [safeStorage] Clear failed:', err.message);
    return false;
  }
};

/**
 * 🔧 GET STORAGE INFO
 */
export const getStorageInfo = () => {
  if (!hasLocalStorage) {
    return { available: false, error: 'localStorage not supported' };
  }

  const count = localStorage.length;
  const items = Array.from({ length: count }, (_, i) => {
    const key = localStorage.key(i);
    const raw = key ? localStorage.getItem(key) : null;
    return key
      ? { key, size: raw?.length || 0, type: typeof safeGetItem(key) }
      : null;
  }).filter(Boolean);

  const totalSize = items.reduce((sum, { size }) => sum + size, 0);
  const maxSize = 5 * 1024 * 1024;

  return {
    available: true,
    itemCount: count,
    totalSize,
    items: items.sort((a, b) => b.size - a.size),
    maxSize,
    usagePercent: Math.round((totalSize / maxSize) * 100),
  };
};

/**
 * 🔧 CLEANUP UNDEFINED VALUES
 */
export const cleanupUndefinedValues = () => {
  if (!hasLocalStorage) return 0;

  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = key ? localStorage.getItem(key) : null;
    if (val == null || val === '' || val === 'undefined' || val === 'null') {
      toRemove.push(key);
    }
  }

  toRemove.forEach(k => localStorage.removeItem(k));
  return toRemove.length;
};

// 🎯 MP3 CUTTER HELPERS

/**
 * Auto-return setting
 */
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
  autoReturn: getAutoReturnSetting(),
});

// ⚙️ Debug interface
if (hasLocalStorage) {
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
