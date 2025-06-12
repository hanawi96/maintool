/**
 * 🛡️ **ULTRA-SAFE STORAGE UTILITY**
 * Xử lý localStorage một cách an toàn, tránh mọi lỗi JSON parsing
 */

/**
 * 🔧 **SAFE GET ITEM** - Lấy dữ liệu từ localStorage an toàn
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value nếu không tìm thấy hoặc lỗi
 * @returns {any} - Parsed value hoặc default value
 */
export const safeGetItem = (key, defaultValue = null) => {
  try {
    // 🎯 VALIDATE INPUT
    if (!key || typeof key !== 'string') {
      console.warn('⚠️ [safeStorage] Invalid key provided:', key);
      return defaultValue;
    }
    
    // 🎯 CHECK LOCALSTORAGE AVAILABILITY
    if (typeof Storage === 'undefined' || !window.localStorage) {
      console.warn('⚠️ [safeStorage] localStorage not available');
      return defaultValue;
    }
    
    // 🎯 GET RAW VALUE
    const rawValue = localStorage.getItem(key);
    
    // 🎯 HANDLE NULL/UNDEFINED
    if (rawValue === null || rawValue === undefined) {
      return defaultValue;
    }
    
    // 🎯 HANDLE EMPTY STRING
    if (rawValue === '') {
      return defaultValue;
    }
    
    // 🎯 HANDLE LITERAL "undefined" STRING
    if (rawValue === 'undefined') {
      console.warn(`⚠️ [safeStorage] Key "${key}" contains literal "undefined" string, using default:`, defaultValue);
      return defaultValue;
    }
    
    // 🎯 HANDLE LITERAL "null" STRING
    if (rawValue === 'null') {
      console.warn(`⚠️ [safeStorage] Key "${key}" contains literal "null" string, using default:`, defaultValue);
      return defaultValue;
    }
    
    // 🎯 TRY JSON PARSING (for complex data)
    try {
      const parsedValue = JSON.parse(rawValue);
      console.log(`✅ [safeStorage] Successfully parsed JSON for "${key}":`, parsedValue);
      return parsedValue;
    } catch (jsonError) {
      // 🎯 FALLBACK: Return raw string value
      console.log(`📝 [safeStorage] JSON parse failed for "${key}", returning raw string:`, rawValue);
      return rawValue;
    }
    
  } catch (error) {
    console.error(`❌ [safeStorage] Error getting item "${key}":`, error.message);
    return defaultValue;
  }
};

/**
 * 🔧 **SAFE SET ITEM** - Lưu dữ liệu vào localStorage an toàn
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} - Success status
 */
export const safeSetItem = (key, value) => {
  try {
    // 🎯 VALIDATE INPUT
    if (!key || typeof key !== 'string') {
      console.warn('⚠️ [safeStorage] Invalid key provided for set:', key);
      return false;
    }
    
    // 🎯 CHECK LOCALSTORAGE AVAILABILITY
    if (typeof Storage === 'undefined' || !window.localStorage) {
      console.warn('⚠️ [safeStorage] localStorage not available for set');
      return false;
    }
    
    // 🎯 HANDLE UNDEFINED VALUE
    if (value === undefined) {
      console.warn(`⚠️ [safeStorage] Attempting to store undefined value for "${key}", removing item instead`);
      return safeRemoveItem(key);
    }
    
    // 🎯 SERIALIZE VALUE
    let serializedValue;
    if (typeof value === 'string') {
      serializedValue = value;
    } else {
      try {
        serializedValue = JSON.stringify(value);
      } catch (jsonError) {
        console.error(`❌ [safeStorage] Failed to serialize value for "${key}":`, jsonError.message);
        return false;
      }
    }
    
    // 🎯 STORE VALUE
    localStorage.setItem(key, serializedValue);
    return true;
    
  } catch (error) {
    console.error(`❌ [safeStorage] Error setting item "${key}":`, error.message);
    
    // 🎯 HANDLE QUOTA EXCEEDED
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ [safeStorage] localStorage quota exceeded, attempting cleanup...');
      // Có thể implement cleanup logic here nếu cần
    }
    
    return false;
  }
};

/**
 * 🔧 **SAFE REMOVE ITEM** - Xóa item từ localStorage an toàn
 * @param {string} key - Storage key
 * @returns {boolean} - Success status
 */
export const safeRemoveItem = (key) => {
  try {
    // 🎯 VALIDATE INPUT
    if (!key || typeof key !== 'string') {
      console.warn('⚠️ [safeStorage] Invalid key provided for remove:', key);
      return false;
    }
    
    // 🎯 CHECK LOCALSTORAGE AVAILABILITY
    if (typeof Storage === 'undefined' || !window.localStorage) {
      console.warn('⚠️ [safeStorage] localStorage not available for remove');
      return false;
    }
    
    localStorage.removeItem(key);
    return true;
    
  } catch (error) {
    console.error(`❌ [safeStorage] Error removing item "${key}":`, error.message);
    return false;
  }
};

/**
 * 🔧 **SAFE CLEAR** - Xóa toàn bộ localStorage an toàn
 * @returns {boolean} - Success status
 */
export const safeClear = () => {
  try {
    // 🎯 CHECK LOCALSTORAGE AVAILABILITY
    if (typeof Storage === 'undefined' || !window.localStorage) {
      console.warn('⚠️ [safeStorage] localStorage not available for clear');
      return false;
    }
    
    localStorage.clear();
    console.log('🧹 [safeStorage] Successfully cleared all localStorage');
    return true;
    
  } catch (error) {
    console.error('❌ [safeStorage] Error clearing localStorage:', error.message);
    return false;
  }
};

/**
 * 🔧 **GET STORAGE INFO** - Lấy thông tin về localStorage usage
 * @returns {object} - Storage information
 */
export const getStorageInfo = () => {
  try {
    // 🎯 CHECK LOCALSTORAGE AVAILABILITY
    if (typeof Storage === 'undefined' || !window.localStorage) {
      return { available: false, error: 'localStorage not supported' };
    }
    
    // 🎯 COUNT ITEMS
    const itemCount = localStorage.length;
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        items.push({
          key,
          size: value ? value.length : 0,
          type: typeof safeGetItem(key)
        });
      }
    }
    
    // 🎯 CALCULATE TOTAL SIZE (approximate)
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    
    const info = {
      available: true,
      itemCount,
      totalSize,
      items: items.sort((a, b) => b.size - a.size), // Sort by size descending
      maxSize: 5 * 1024 * 1024, // Approximate 5MB limit
      usagePercent: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
    };
    
    return info;
    
  } catch (error) {
    console.error('❌ [safeStorage] Error getting storage info:', error.message);
    return { available: false, error: error.message };
  }
};

/**
 * 🎯 **MP3 CUTTER SPECIFIC HELPERS**
 */

/**
 * 🔧 **GET AUTO RETURN SETTING** - Lấy setting auto-return an toàn
 * @returns {boolean} - Auto return enabled status
 */
export const getAutoReturnSetting = () => {
  const value = safeGetItem('mp3cutter_auto_return', 'true'); // Default true
  
  // 🎯 HANDLE VARIOUS FORMATS
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lowercaseValue = value.toLowerCase().trim();
    return lowercaseValue !== 'false' && lowercaseValue !== '0' && lowercaseValue !== 'no';
  }
  
  // 🎯 FALLBACK
  return true; // Default to enabled
};

/**
 * 🔧 **SET AUTO RETURN SETTING** - Lưu setting auto-return an toàn
 * @param {boolean} enabled - Enable auto-return
 * @returns {boolean} - Success status
 */
export const setAutoReturnSetting = (enabled) => {
  if (typeof enabled !== 'boolean') {
    console.warn('⚠️ [safeStorage] Invalid auto-return value, must be boolean:', enabled);
    return false;
  }
  
  const success = safeSetItem('mp3cutter_auto_return', enabled);
  
  if (success) {
    console.log(`⚙️ [MP3Cutter] Auto-return ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  
  return success;
};

/**
 * 🔧 **GET USER PREFERENCES** - Lấy tất cả preferences an toàn
 * @returns {object} - User preferences object
 */
export const getUserPreferences = () => {
  return {
    autoReturn: getAutoReturnSetting(),
    // Có thể thêm các preferences khác ở đây
  };
};

/**
 * 🧹 **CLEANUP UNDEFINED VALUES** - Remove any localStorage entries with "undefined" values
 * @returns {number} - Number of cleaned entries
 */
export const cleanupUndefinedValues = () => {
  try {
    if (typeof Storage === 'undefined' || !window.localStorage) {
      console.warn('⚠️ [cleanupUndefinedValues] localStorage not available');
      return 0;
    }
    
    let cleanedCount = 0;
    const keysToRemove = [];
    
    // 🔍 Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        
        // 🎯 Check for problematic values
        if (value === 'undefined' || value === 'null' || value === '' || !value) {
          keysToRemove.push(key);
          console.log(`🧹 [cleanupUndefinedValues] Marked for removal: "${key}" = "${value}"`);
        }
      }
    }
    
    // 🗑️ Remove problematic entries
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleanedCount++;
      console.log(`✅ [cleanupUndefinedValues] Removed: "${key}"`);
    });
    
    if (cleanedCount > 0) {
      console.log(`🎉 [cleanupUndefinedValues] Cleaned ${cleanedCount} problematic localStorage entries`);
    } else {
      console.log('✨ [cleanupUndefinedValues] No problematic entries found - localStorage is clean');
    }
    
    return cleanedCount;
    
  } catch (error) {
    console.error('❌ [cleanupUndefinedValues] Error during cleanup:', error.message);
    return 0;
  }
};

// 🎯 **GLOBAL DEBUG FUNCTIONS** - Để debug localStorage issues
if (typeof window !== 'undefined') {
  window.mp3CutterStorageDebug = {
    getInfo: getStorageInfo,
    clear: safeClear,
    get: safeGetItem,
    set: safeSetItem,
    remove: safeRemoveItem,
    getAutoReturn: getAutoReturnSetting,
    setAutoReturn: setAutoReturnSetting
  };
  
} 