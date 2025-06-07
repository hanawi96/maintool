import { API_ENDPOINTS } from '../utils/constants';

// Hardcode API URL to ensure it works
const API_BASE_URL = 'http://localhost:3001';

// Debug logging
console.log('🔧 [audioApi] API_BASE_URL:', API_BASE_URL);
console.log('🔧 [audioApi] process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('🔧 [audioApi] API_ENDPOINTS:', API_ENDPOINTS);

// 🎯 SAFE JSON PARSER - Prevents "undefined" JSON errors
const safeJsonParse = async (response) => {
  console.log('🔍 [safeJsonParse] Response status:', response.status);
  console.log('🔍 [safeJsonParse] Response headers:', {
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length')
  });

  // 🎯 Check if response has content
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  
  // 🎯 Validate content type
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('⚠️ [safeJsonParse] Non-JSON response detected:', contentType);
    
    // Try to get text content for debugging
    try {
      const textContent = await response.text();
      console.log('📝 [safeJsonParse] Response text:', textContent.substring(0, 200));
      
      // If it's HTML error page
      if (textContent.includes('<html>') || textContent.includes('<!DOCTYPE')) {
        throw new Error(`Server returned HTML error page. Status: ${response.status}`);
      }
      
      // Try to parse as JSON anyway (some servers send JSON without proper content-type)
      if (textContent.trim()) {
        return JSON.parse(textContent);
      } else {
        throw new Error('Empty response body');
      }
    } catch (parseError) {
      console.error('❌ [safeJsonParse] Failed to parse response:', parseError);
      throw new Error(`Invalid response format: ${parseError.message}`);
    }
  }

  // 🎯 Check content length
  if (contentLength === '0') {
    console.warn('⚠️ [safeJsonParse] Empty response body detected');
    throw new Error('Server returned empty response');
  }

  try {
    // 🎯 Clone response for debugging
    const responseClone = response.clone();
    const jsonData = await response.json();
    
    console.log('✅ [safeJsonParse] Successfully parsed JSON:', jsonData);
    return jsonData;
    
  } catch (jsonError) {
    console.error('❌ [safeJsonParse] JSON parsing failed:', jsonError);
    
    // 🎯 Try to get raw text for debugging
    try {
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      console.log('📝 [safeJsonParse] Raw response text:', rawText);
      
      if (!rawText || rawText.trim() === '') {
        throw new Error('Response body is empty or undefined');
      } else {
        throw new Error(`Invalid JSON: ${rawText.substring(0, 100)}...`);
      }
    } catch (textError) {
      throw new Error(`Complete response parsing failure: ${jsonError.message}`);
    }
  }
};

// 🎯 ENHANCED ERROR HANDLER
const handleApiError = async (response, operation) => {
  console.error(`❌ [${operation}] API Error:`, {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });

  let errorMessage = `${operation} failed (${response.status})`;
  
  try {
    // Try to get error details from response
    const errorData = await safeJsonParse(response);
    if (errorData && errorData.error) {
      errorMessage += `: ${errorData.error}`;
    }
  } catch (parseError) {
    console.warn('⚠️ [handleApiError] Could not parse error response:', parseError);
    
    // Try to get plain text error
    try {
      const textError = await response.text();
      if (textError) {
        errorMessage += `: ${textError.substring(0, 100)}`;
      }
    } catch (textParseError) {
      console.warn('⚠️ [handleApiError] Could not get error text:', textParseError);
    }
  }
  
  throw new Error(errorMessage);
};

export const audioApi = {
  // 🎯 ENHANCED: Upload file with comprehensive error handling
  async uploadFile(file) {
    console.log('🚀 [uploadFile] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const formData = new FormData();
    formData.append('audio', file);
    
    const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD}`;
    console.log('🚀 [uploadFile] Upload URL:', uploadUrl);
    
    let response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      console.log('📡 [uploadFile] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
    } catch (networkError) {
      console.error('🌐 [uploadFile] Network error:', networkError);
      throw new Error(`Network error: ${networkError.message}. Please check if backend is running on ${API_BASE_URL}`);
    }
    
    if (!response.ok) {
      await handleApiError(response, 'Upload');
    }
    
    // 🎯 Safe JSON parsing
    try {
      const result = await safeJsonParse(response);
      console.log('✅ [uploadFile] Upload successful:', result);
      return result;
    } catch (parseError) {
      console.error('❌ [uploadFile] Response parsing failed:', parseError);
      throw new Error(`Upload response parsing failed: ${parseError.message}`);
    }
  },

  // 🎯 ENHANCED: Cut audio with comprehensive error handling
  async cutAudio(params) {
    console.log('✂️ [cutAudio] Starting cut operation:', params);

    const cutUrl = `${API_BASE_URL}${API_ENDPOINTS.CUT}`;
    console.log('✂️ [cutAudio] Cut URL:', cutUrl);
    
    let response;
    try {
      response = await fetch(cutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      
      console.log('📡 [cutAudio] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
    } catch (networkError) {
      console.error('🌐 [cutAudio] Network error:', networkError);
      throw new Error(`Network error: ${networkError.message}. Please check if backend is running on ${API_BASE_URL}`);
    }

    if (!response.ok) {
      await handleApiError(response, 'Cut');
    }
    
    // 🎯 Safe JSON parsing
    try {
      const result = await safeJsonParse(response);
      console.log('✅ [cutAudio] Cut successful:', result);
      return result;
    } catch (parseError) {
      console.error('❌ [cutAudio] Response parsing failed:', parseError);
      throw new Error(`Cut response parsing failed: ${parseError.message}`);
    }
  },

  // 🎯 ENHANCED: Get download URL with validation
  getDownloadUrl(filename) {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }
    
    const downloadUrl = `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD}/${encodeURIComponent(filename)}`;
    console.log('📥 [getDownloadUrl] Download URL generated:', downloadUrl);
    return downloadUrl;
  },

  // 🎯 NEW: Health check for debugging
  async healthCheck() {
    console.log('🏥 [healthCheck] Checking backend health...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000 // 5 second timeout
      });
      
      console.log('🏥 [healthCheck] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await safeJsonParse(response);
      console.log('✅ [healthCheck] Backend is healthy:', result);
      return result;
      
    } catch (error) {
      // 🎯 ENHANCED: Better error reporting
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        message: errorMessage,
        url: `${API_BASE_URL}/health`,
        timestamp: new Date().toISOString()
      };
      
      console.error('❌ [healthCheck] Backend health check failed:', errorDetails);
      throw new Error(`Backend health check failed: ${errorMessage}`);
    }
  },

  // 🆕 **CUT AUDIO BY FILE ID**: Cut audio bằng fileId đã upload trước đó - HIỆU QUẢ HỠN
  async cutAudioByFileId(params) {
    console.log('✂️ [cutAudioByFileId] Starting cut by fileId:', params);

    // 🔍 **VALIDATE PARAMS**: Kiểm tra params có đủ không
    if (!params.fileId) {
      throw new Error('fileId is required for cut operation');
    }

    const cutUrl = `${API_BASE_URL}${API_ENDPOINTS.CUT_BY_FILEID}`;
    console.log('✂️ [cutAudioByFileId] Cut URL:', cutUrl);
    
    let response;
    try {
      response = await fetch(cutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      
      console.log('📡 [cutAudioByFileId] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
    } catch (networkError) {
      console.error('🌐 [cutAudioByFileId] Network error:', networkError);
      throw new Error(`Network error: ${networkError.message}. Please check if backend is running on ${API_BASE_URL}`);
    }

    if (!response.ok) {
      await handleApiError(response, 'Cut by FileId');
    }
    
    // 🎯 Safe JSON parsing
    try {
      const result = await safeJsonParse(response);
      console.log('✅ [cutAudioByFileId] Cut successful:', result);
      return result;
    } catch (parseError) {
      console.error('❌ [cutAudioByFileId] Response parsing failed:', parseError);
      throw new Error(`Cut response parsing failed: ${parseError.message}`);
    }
  }
};