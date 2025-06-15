import { API_ENDPOINTS } from '../utils/constants';

// Hardcode API URL to ensure it works
const API_BASE_URL = 'http://localhost:3001';

// 🎯 SAFE JSON PARSER - Prevents "undefined" JSON errors
const safeJsonParse = async (response) => {


  // 🎯 Check if response has content
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  
  // 🎯 Validate content type
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('⚠️ [safeJsonParse] Non-JSON response detected:', contentType);
    
    // Try to get text content for debugging
    try {
      const textContent = await response.text();
      
      // 🎯 ULTRA SAFE: Check for undefined/null/empty content
      if (!textContent || textContent === 'undefined' || textContent === 'null' || textContent.trim() === '') {
        throw new Error('Empty or invalid response content');
      }
      
      // If it's HTML error page
      if (textContent.includes('<html>') || textContent.includes('<!DOCTYPE')) {
        throw new Error(`Server returned HTML error page. Status: ${response.status}`);
      }
      
      // 🎯 ULTRA SAFE: Get text first, then validate before parsing
      const trimmedText = textContent.trim();
      
      // 🎯 VALIDATE JSON FORMAT
      if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        throw new Error(`Invalid JSON format: content doesn't start with { or [ - got: ${trimmedText.substring(0, 50)}`);
      }
      
      // 🎯 SAFE JSON PARSE
      const jsonData = JSON.parse(trimmedText);
      
      // 🎯 VALIDATE PARSED DATA
      if (jsonData === undefined || jsonData === null) {
        throw new Error('Parsed JSON is undefined or null');
      }
      
      return jsonData;
      
    } catch (textError) {
      console.error('❌ [safeJsonParse] Failed to get response text:', textError);
      throw new Error(`Response text extraction failed: ${textError.message}`);
    }
  }

  // 🎯 Check content length
  if (contentLength === '0') {
    console.warn('⚠️ [safeJsonParse] Empty response body detected');
    throw new Error('Server returned empty response');
  }

  try {
    // 🎯 ULTRA SAFE: Always get text first, never use response.json() directly
    const responseText = await response.text();
    
    // 🎯 COMPREHENSIVE VALIDATION
    if (!responseText || responseText === 'undefined' || responseText === 'null' || responseText.trim() === '') {
      throw new Error('Response body is empty, undefined, or null');
    }
    
    const trimmedText = responseText.trim();
    
    // 🎯 VALIDATE JSON FORMAT
    if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
      throw new Error(`Invalid JSON format: content doesn't start with { or [ - got: ${trimmedText.substring(0, 50)}`);
    }
    
    // 🎯 SAFE JSON PARSE
    const jsonData = JSON.parse(trimmedText);
    
    // 🎯 VALIDATE PARSED DATA
    if (jsonData === undefined || jsonData === null) {
      throw new Error('Parsed JSON is undefined or null');
    }
    
    return jsonData;
    
  } catch (jsonError) {
    console.error('❌ [safeJsonParse] JSON parsing failed:', jsonError);
    
    // 🎯 Fallback: Try to get raw text for debugging
    try {
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      
      if (!rawText || rawText.trim() === '' || rawText === 'undefined' || rawText === 'null') {
        throw new Error('Response body is empty, undefined, or null');
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

    const formData = new FormData();
    formData.append('audio', file);
    
    const uploadUrl = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD}`;
    
    let response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
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
      return result;
    } catch (parseError) {
      console.error('❌ [uploadFile] Response parsing failed:', parseError);
      throw new Error(`Upload response parsing failed: ${parseError.message}`);
    }
  },

  // 🎯 ENHANCED: Cut audio with comprehensive error handling
  async cutAudio(params) {

    const cutUrl = `${API_BASE_URL}${API_ENDPOINTS.CUT}`;
    
    let response;
    try {
      response = await fetch(cutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
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
    return downloadUrl;
  },

  // 🎯 NEW: Health check for debugging
  async healthCheck() {
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await safeJsonParse(response);
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

  // 🎯 ENHANCED: Cut audio by fileId with comprehensive error handling and WebSocket support
  async cutAudioByFileId(params) {

    const cutUrl = `${API_BASE_URL}${API_ENDPOINTS.CUT_BY_FILEID}`;
    
    // 🆕 **ADD SESSION ID**: Add sessionId để backend có thể track progress
    const requestBody = {
      ...params,
      sessionId: params.sessionId || `cut-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    };

    console.log('🎯 [cutAudioByFileId] Request URL:', cutUrl);
    console.log('🎯 [cutAudioByFileId] Request body:', requestBody);

    let response;
    try {
      response = await fetch(cutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
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
      
      // 🆕 **RETURN WITH SESSION ID**: Include sessionId in result for WebSocket tracking
      return {
        ...result,
        sessionId: requestBody.sessionId
      };
    } catch (parseError) {
      console.error('❌ [cutAudioByFileId] Response parsing failed:', parseError);
      throw new Error(`Cut response parsing failed: ${parseError.message}`);
    }
  },

  // 🎯 **CHANGE SPEED BY FILE ID**: Change audio speed using fileId
  async changeSpeedByFileId(params) {
    if (!params.fileId) {
      throw new Error('fileId is required for speed change');
    }

    const { fileId, playbackRate = 1, outputFormat = 'mp3', quality = 'medium' } = params;

    try {
      console.log('⚡ [changeSpeedByFileId] Sending parameters:', {
        fileId,
        playbackRate,
        outputFormat,
        quality
      });

      const speedUrl = `${API_BASE_URL}${API_ENDPOINTS.CHANGE_SPEED}/${fileId}`;

      let response;
      try {
        response = await fetch(speedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playbackRate,
            outputFormat,
            quality
          })
        });
      } catch (networkError) {
        console.error('🌐 [changeSpeedByFileId] Network error:', networkError);
        throw new Error(`Network error: ${networkError.message}`);
      }

      await handleApiError(response, 'Speed Change');

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ [changeSpeedByFileId] Response parsing failed:', parseError);
        throw new Error(`Speed change response parsing failed: ${parseError.message}`);
      }

      console.log('⚡ [changeSpeedByFileId] Success:', {
        outputFilename: result.data?.output?.filename,
        playbackRate: result.data?.processing?.playbackRate
      });

      return result;

    } catch (error) {
      console.error('❌ [changeSpeedByFileId] Failed:', error);
      throw error;
    }
  },
};