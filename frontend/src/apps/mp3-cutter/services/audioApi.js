// api/audioApi.js

import { API_ENDPOINTS } from '../utils/constants';

const API_BASE_URL = 'http://localhost:3001';

// --- Utility: Safe JSON parse for API response ---
async function safeJsonParse(response) {
  // Single use of response.text(), response is one-time stream!
  const text = await response.text();
  const type = response.headers.get('content-type');
  const isJson = type && type.includes('application/json');
  const trimmed = text && text.trim();

  // Fail for empty
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    throw new Error('Empty or invalid response content');
  }

  // HTML error page
  if (trimmed.startsWith('<')) {
    throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
  }

  // Not JSON type but try to parse if looks like JSON
  if (!isJson && !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    throw new Error('Response is not valid JSON');
  }

  try {
    const data = JSON.parse(trimmed);
    if (data === undefined || data === null) throw new Error('Parsed JSON is undefined/null');
    return data;
  } catch (err) {
    throw new Error('Response body is not valid JSON');
  }
}

// --- Utility: Error handler for API responses ---
async function handleApiError(response, operation) {
  let msg = `${operation} failed (${response.status})`;

  try {
    const err = await safeJsonParse(response);
    if (err?.error) msg += `: ${err.error}`;
    else if (typeof err === 'string') msg += `: ${err}`;
  } catch {
    // Fallback: just status text
    msg += `: ${response.statusText || 'Unknown error'}`;
  }
  throw new Error(msg);
}

// --- Main API ---
export const audioApi = {
  async uploadFile(file) {
    const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD}`;
    const formData = new FormData();
    formData.append('audio', file);

    let res;
    try {
      res = await fetch(url, { method: 'POST', body: formData });
    } catch (err) {
      throw new Error(`Network error: ${err.message}. Is backend running at ${API_BASE_URL}?`);
    }
    if (!res.ok) await handleApiError(res, 'Upload');
    return safeJsonParse(res);
  },

  async cutAudio(params) {
    const url = `${API_BASE_URL}${API_ENDPOINTS.CUT}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch (err) {
      throw new Error(`Network error: ${err.message}. Is backend running at ${API_BASE_URL}?`);
    }
    if (!res.ok) await handleApiError(res, 'Cut');
    return safeJsonParse(res);
  },

  getDownloadUrl(filename) {
    if (!filename || typeof filename !== 'string') throw new Error('Invalid filename provided');
    return `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD}/${encodeURIComponent(filename)}`;
  },

  async healthCheck() {
    const url = `${API_BASE_URL}/health`;
    let res;
    try {
      res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
      return safeJsonParse(res);
    } catch (err) {
      throw new Error(`Backend health check failed: ${err.message}`);
    }
  },

  async cutAudioByFileId(params) {
    const url = `${API_BASE_URL}${API_ENDPOINTS.CUT_BY_FILEID}`;
    const sessionId = params.sessionId || `cut-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    console.log('🔄 Starting cut request with sessionId:', sessionId);
    
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, sessionId })
      });
      
      if (!res.ok) await handleApiError(res, 'Cut by FileId');
      const result = await safeJsonParse(res);
      console.log('✅ Cut request completed for sessionId:', sessionId);
      return { ...result, sessionId };
      
    } catch (err) {
      console.log('❌ Cut request failed for sessionId:', sessionId, 'Error:', err.message);
      throw new Error(`Network error: ${err.message}. Is backend running at ${API_BASE_URL}?`);
    }
  },

  async changeSpeedByFileId(params) {
    const { fileId, playbackRate = 1, outputFormat = 'mp3', quality = 'medium' } = params || {};
    if (!fileId) throw new Error('fileId is required for speed change');
    const url = `${API_BASE_URL}${API_ENDPOINTS.CHANGE_SPEED}/${fileId}`;

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbackRate, outputFormat, quality })
      });
    } catch (err) {
      throw new Error(`Network error: ${err.message}. Is backend running at ${API_BASE_URL}?`);
    }
    if (!res.ok) await handleApiError(res, 'Speed Change');
    return safeJsonParse(res);
  }
};
