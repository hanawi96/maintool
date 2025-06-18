// features/cloud-storage/service.js

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { CLOUD_CONFIG } from './constants.js';

// 🔐 Encryption utilities for token storage
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export class CloudStorageService {
  
  // 🔑 Generate OAuth authorization URL
  static generateAuthUrl(serviceId, state) {
    const config = CLOUD_CONFIG.OAUTH[serviceId.toUpperCase()];
    if (!config) throw new Error(`Unsupported service: ${serviceId}`);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state: state,
      ...(config.scopes && { scope: config.scopes.join(' ') })
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  // 🎫 Exchange authorization code for access token
  static async exchangeCodeForToken(serviceId, code, state) {
    const config = CLOUD_CONFIG.OAUTH[serviceId.toUpperCase()];
    if (!config) throw new Error(`Unsupported service: ${serviceId}`);

    const params = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    };

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();
    
    // Store encrypted tokens
    const sessionId = state; // Use state as session ID
    await this.storeTokens(sessionId, serviceId, tokenData);

    return {
      sessionId,
      serviceId,
      tokenData: this.sanitizeTokenData(tokenData)
    };
  }

  // 💾 Store encrypted tokens
  static async storeTokens(sessionId, serviceId, tokenData) {
    const tokenDir = CLOUD_CONFIG.TOKEN_STORAGE_PATH;
    await fs.mkdir(tokenDir, { recursive: true });

    const tokenPath = path.join(tokenDir, `${sessionId}_${serviceId}.json`);
    const encryptedData = encrypt(JSON.stringify({
      ...tokenData,
      storedAt: Date.now(),
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    }));

    await fs.writeFile(tokenPath, encryptedData);
  }

  // 🔓 Retrieve and decrypt tokens
  static async getTokens(sessionId, serviceId) {
    const tokenPath = path.join(CLOUD_CONFIG.TOKEN_STORAGE_PATH, `${sessionId}_${serviceId}.json`);
    
    try {
      const encryptedData = await fs.readFile(tokenPath, 'utf8');
      const tokenData = JSON.parse(decrypt(encryptedData));
      
      // Check if token is expired
      if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
        if (tokenData.refresh_token) {
          return await this.refreshToken(sessionId, serviceId, tokenData.refresh_token);
        } else {
          throw new Error('Token expired and no refresh token available');
        }
      }

      return tokenData;
    } catch (error) {
      throw new Error(`Failed to retrieve tokens: ${error.message}`);
    }
  }

  // 🔄 Refresh access token
  static async refreshToken(sessionId, serviceId, refreshToken) {
    const config = CLOUD_CONFIG.OAUTH[serviceId.toUpperCase()];
    
    const params = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const newTokenData = await response.json();
    
    // Preserve refresh token if not provided in response
    if (!newTokenData.refresh_token) {
      newTokenData.refresh_token = refreshToken;
    }

    await this.storeTokens(sessionId, serviceId, newTokenData);
    return newTokenData;
  }

  // 📤 Upload file to cloud service
  static async uploadFile(sessionId, serviceId, file, options = {}) {
    const tokens = await this.getTokens(sessionId, serviceId);
    const serviceUpper = serviceId.toUpperCase();

    switch (serviceUpper) {
      case 'GOOGLE_DRIVE':
        return this.uploadToGoogleDrive(tokens, file, options);
      case 'DROPBOX':
        return this.uploadToDropbox(tokens, file, options);
      case 'ONEDRIVE':
        return this.uploadToOneDrive(tokens, file, options);
      default:
        throw new Error(`Unsupported service: ${serviceId}`);
    }
  }

  // 📁 Upload to Google Drive
  static async uploadToGoogleDrive(tokens, file, options) {
    const metadata = {
      name: options.fileName || file.originalname,
      parents: options.folderId ? [options.folderId] : undefined
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file.buffer, file.originalname);

    const response = await fetch(`${CLOUD_CONFIG.API_ENDPOINTS.GOOGLE_DRIVE.upload}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Google Drive upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      size: result.size,
      shareUrl: `https://drive.google.com/file/d/${result.id}/view`,
      downloadUrl: `https://drive.google.com/uc?id=${result.id}`
    };
  }

  // 📦 Upload to Dropbox
  static async uploadToDropbox(tokens, file, options) {
    const path = `${options.folder || '/'}/${options.fileName || file.originalname}`;

    const response = await fetch(CLOUD_CONFIG.API_ENDPOINTS.DROPBOX.upload, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: path,
          mode: 'add',
          autorename: true
        })
      },
      body: file.buffer
    });

    if (!response.ok) {
      throw new Error(`Dropbox upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      size: result.size,
      path: result.path_display,
      shareUrl: null // Dropbox sharing requires additional API call
    };
  }

  // 🗄️ Upload to OneDrive
  static async uploadToOneDrive(tokens, file, options) {
    const fileName = options.fileName || file.originalname;
    const folderPath = options.folder || '/Documents/Audio';
    const uploadUrl = `${CLOUD_CONFIG.API_ENDPOINTS.ONEDRIVE.upload}${folderPath}/${fileName}:/content`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: file.buffer
    });

    if (!response.ok) {
      throw new Error(`OneDrive upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      size: result.size,
      shareUrl: result.webUrl,
      downloadUrl: result['@microsoft.graph.downloadUrl']
    };
  }

  // 📊 Get storage usage
  static async getStorageUsage(sessionId, serviceId) {
    const tokens = await this.getTokens(sessionId, serviceId);
    const serviceUpper = serviceId.toUpperCase();

    switch (serviceUpper) {
      case 'GOOGLE_DRIVE':
        return this.getGoogleDriveUsage(tokens);
      case 'DROPBOX':
        return this.getDropboxUsage(tokens);
      case 'ONEDRIVE':
        return this.getOneDriveUsage(tokens);
      default:
        throw new Error(`Unsupported service: ${serviceId}`);
    }
  }

  // 📊 Google Drive storage usage
  static async getGoogleDriveUsage(tokens) {
    const response = await fetch(`${CLOUD_CONFIG.API_ENDPOINTS.GOOGLE_DRIVE.about}?fields=storageQuota`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    const data = await response.json();
    const quota = data.storageQuota;

    return {
      used: parseInt(quota.usage),
      total: parseInt(quota.limit),
      available: parseInt(quota.limit) - parseInt(quota.usage)
    };
  }

  // 📊 Dropbox storage usage
  static async getDropboxUsage(tokens) {
    const response = await fetch(CLOUD_CONFIG.API_ENDPOINTS.DROPBOX.space, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return {
      used: data.used,
      total: data.allocation.allocated,
      available: data.allocation.allocated - data.used
    };
  }

  // 📊 OneDrive storage usage
  static async getOneDriveUsage(tokens) {
    const response = await fetch(`${CLOUD_CONFIG.API_ENDPOINTS.ONEDRIVE.me}/drive`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    const data = await response.json();
    const quota = data.quota;

    return {
      used: quota.used,
      total: quota.total,
      available: quota.remaining
    };
  }

  // 🗑️ Delete stored tokens
  static async deleteTokens(sessionId, serviceId) {
    const tokenPath = path.join(CLOUD_CONFIG.TOKEN_STORAGE_PATH, `${sessionId}_${serviceId}.json`);
    try {
      await fs.unlink(tokenPath);
    } catch (error) {
      // File may not exist, ignore error
    }
  }

  // 🧹 Cleanup expired tokens
  static async cleanupExpiredTokens() {
    try {
      const tokenDir = CLOUD_CONFIG.TOKEN_STORAGE_PATH;
      const files = await fs.readdir(tokenDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(tokenDir, file);
          try {
            const encryptedData = await fs.readFile(filePath, 'utf8');
            const tokenData = JSON.parse(decrypt(encryptedData));
            
            // Delete if expired and no refresh token
            if (tokenData.expiresAt < Date.now() && !tokenData.refresh_token) {
              await fs.unlink(filePath);
            }
          } catch (error) {
            // If we can't read/decrypt, delete the file
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
    }
  }

  // 🔒 Sanitize token data for client
  static sanitizeTokenData(tokenData) {
    return {
      access_token: '***',
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      hasRefreshToken: !!tokenData.refresh_token
    };
  }
}
