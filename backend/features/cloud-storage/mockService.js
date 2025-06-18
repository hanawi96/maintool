/**
 * Mock Cloud Storage Service for Testing
 * Simulates cloud storage operations without requiring actual OAuth setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockCloudStorageService {
  constructor() {
    this.mockUploadsDir = path.join(__dirname, '../../uploads/mock-cloud');
    this.mockTokens = new Map();
    this.mockUploads = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    // Create mock uploads directory
    if (!fs.existsSync(this.mockUploadsDir)) {
      fs.mkdirSync(this.mockUploadsDir, { recursive: true });
    }
    
    this.isInitialized = true;
  }

  // Mock OAuth flow
  async getAuthUrl(service, state) {
    await this.initialize();
    
    const mockAuthUrls = {
      'google-drive': `http://localhost:3001/api/cloud/mock/auth?service=google-drive&state=${state}`,
      'dropbox': `http://localhost:3001/api/cloud/mock/auth?service=dropbox&state=${state}`,
      'onedrive': `http://localhost:3001/api/cloud/mock/auth?service=onedrive&state=${state}`
    };
    
    return mockAuthUrls[service] || null;
  }

  // Mock token exchange
  async exchangeCodeForTokens(service, code) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(1000);
    
    const mockTokens = {
      access_token: `mock_access_token_${uuidv4()}`,
      refresh_token: `mock_refresh_token_${uuidv4()}`,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: this.getMockScope(service)
    };
    
    return mockTokens;
  }

  // Mock token refresh
  async refreshTokens(service, refreshToken) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(500);
    
    return {
      access_token: `mock_refreshed_token_${uuidv4()}`,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }

  // Mock user info
  async getUserInfo(service, accessToken) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(300);
    
    const mockUsers = {
      'google-drive': {
        id: 'mock_google_user_123',
        name: 'Test User (Google Drive)',
        email: 'testuser@gmail.com',
        picture: null
      },
      'dropbox': {
        id: 'mock_dropbox_user_456',
        name: 'Test User (Dropbox)',
        email: 'testuser@dropbox.com',
        picture: null
      },
      'onedrive': {
        id: 'mock_onedrive_user_789',
        name: 'Test User (OneDrive)',
        email: 'testuser@outlook.com',
        picture: null
      }
    };
    
    return mockUsers[service] || null;
  }

  // Mock file upload
  async uploadFile(service, accessToken, fileBuffer, fileName, options = {}) {
    await this.initialize();
    
    const uploadId = uuidv4();
    const mockFilePath = path.join(this.mockUploadsDir, `${uploadId}_${fileName}`);
    
    // Store upload metadata
    const uploadMetadata = {
      uploadId,
      service,
      fileName,
      originalName: fileName,
      size: fileBuffer.length,
      mimeType: this.getMimeType(fileName),
      folder: options.folder || 'MP3 Cutter Pro',
      uploadedAt: new Date().toISOString(),
      mockFilePath,
      status: 'uploading'
    };
    
    this.mockUploads.set(uploadId, uploadMetadata);
    
    // Simulate upload progress
    const progressCallback = options.onProgress;
    if (progressCallback) {
      for (let progress = 0; progress <= 100; progress += 10) {
        await this.delay(100);
        progressCallback(progress, fileBuffer.length, fileBuffer.length * progress / 100);
      }
    }
    
    // Save file to mock directory
    fs.writeFileSync(mockFilePath, fileBuffer);
    
    // Update upload status
    uploadMetadata.status = 'completed';
    uploadMetadata.completedAt = new Date().toISOString();
    
    // Mock cloud file response
    const mockFileResponse = {
      id: uploadId,
      name: fileName,
      size: fileBuffer.length,
      mimeType: uploadMetadata.mimeType,
      createdTime: uploadMetadata.uploadedAt,
      modifiedTime: uploadMetadata.completedAt,
      webViewLink: `http://localhost:3001/api/cloud/mock/view/${uploadId}`,
      webContentLink: `http://localhost:3001/api/cloud/mock/download/${uploadId}`,
      parents: [options.folder || 'MP3 Cutter Pro']
    };
    
    return mockFileResponse;
  }

  // Mock storage info
  async getStorageInfo(service, accessToken) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(200);
    
    const mockStorageInfo = {
      'google-drive': {
        limit: 15 * 1024 * 1024 * 1024, // 15GB
        usage: 5 * 1024 * 1024 * 1024,  // 5GB used
        usageInDrive: 3 * 1024 * 1024 * 1024,
        usageInDriveTrash: 500 * 1024 * 1024
      },
      'dropbox': {
        used: 2 * 1024 * 1024 * 1024,   // 2GB used
        allocated: 10 * 1024 * 1024 * 1024 // 10GB total
      },
      'onedrive': {
        used: 4 * 1024 * 1024 * 1024,   // 4GB used
        total: 20 * 1024 * 1024 * 1024  // 20GB total
      }
    };
    
    return mockStorageInfo[service] || null;
  }

  // Mock folder creation
  async createFolder(service, accessToken, folderName, parentId = null) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(400);
    
    const folderId = uuidv4();
    
    return {
      id: folderId,
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
      createdTime: new Date().toISOString()
    };
  }

  // Mock list files
  async listFiles(service, accessToken, options = {}) {
    await this.initialize();
    
    // Simulate API delay
    await this.delay(300);
    
    // Return mock files from our uploads
    const mockFiles = Array.from(this.mockUploads.values())
      .filter(upload => upload.service === service && upload.status === 'completed')
      .map(upload => ({
        id: upload.uploadId,
        name: upload.fileName,
        size: upload.size,
        mimeType: upload.mimeType,
        createdTime: upload.uploadedAt,
        modifiedTime: upload.completedAt,
        parents: [upload.folder]
      }));
    
    return {
      files: mockFiles,
      nextPageToken: null
    };
  }

  // Mock download file
  async downloadFile(uploadId) {
    const upload = this.mockUploads.get(uploadId);
    if (!upload || !fs.existsSync(upload.mockFilePath)) {
      throw new Error('File not found');
    }
    
    return {
      buffer: fs.readFileSync(upload.mockFilePath),
      metadata: upload
    };
  }

  // Mock view file (returns HTML page)
  getMockViewPage(uploadId) {
    const upload = this.mockUploads.get(uploadId);
    if (!upload) {
      return '<html><body><h1>File not found</h1></body></html>';
    }
    
    return `
      <html>
        <head>
          <title>Mock Cloud Storage - ${upload.fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .file-info { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .download-btn { 
              background: #4285f4; color: white; padding: 10px 20px; 
              text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px; 
            }
          </style>
        </head>
        <body>
          <h1>Mock Cloud Storage</h1>
          <div class="file-info">
            <h2>${upload.fileName}</h2>
            <p><strong>Service:</strong> ${upload.service}</p>
            <p><strong>Size:</strong> ${this.formatFileSize(upload.size)}</p>
            <p><strong>Type:</strong> ${upload.mimeType}</p>
            <p><strong>Uploaded:</strong> ${new Date(upload.uploadedAt).toLocaleString()}</p>
            <p><strong>Folder:</strong> ${upload.folder}</p>
            <a href="/api/cloud/mock/download/${uploadId}" class="download-btn">Download File</a>
          </div>
          <p><em>This is a mock cloud storage service for testing purposes.</em></p>
        </body>
      </html>
    `;
  }

  // Helper methods
  getMockScope(service) {
    const scopes = {
      'google-drive': 'https://www.googleapis.com/auth/drive.file',
      'dropbox': 'files.content.write files.content.read',
      'onedrive': 'files.readwrite offline_access'
    };
    return scopes[service] || '';
  }

  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up method for testing
  cleanup() {
    this.mockUploads.clear();
    this.mockTokens.clear();
    
    // Optionally clean up mock files
    if (fs.existsSync(this.mockUploadsDir)) {
      const files = fs.readdirSync(this.mockUploadsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(this.mockUploadsDir, file));
      });
    }
  }
}

export default MockCloudStorageService;