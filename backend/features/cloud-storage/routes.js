// features/cloud-storage/routes.js

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { CloudStorageService } from './service.js';
import { CLOUD_CONFIG } from './constants.js';
// Import mock service for testing
import MockCloudStorageService from './mockService.js';

const router = express.Router();

// Initialize services
const cloudService = new CloudStorageService();
const mockService = new MockCloudStorageService();

// Check if we're in mock mode (for testing without OAuth setup)
const isMockMode = process.env.NODE_ENV === 'development' && process.env.CLOUD_MOCK_MODE === 'true';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(...Object.values(CLOUD_CONFIG.FILE_SIZE_LIMITS)) // Use largest limit
  }
});

// 🧪 Mock authentication routes (for testing)
if (isMockMode) {
  // Mock auth initiation
  router.get('/mock/auth', async (req, res) => {
    const { service, state } = req.query;
    
    // Simulate successful OAuth and redirect back
    const mockCode = `mock_code_${Date.now()}`;
    const redirectUrl = `http://localhost:3000/export?code=${mockCode}&state=${state}&service=${service}`;
    
    res.redirect(redirectUrl);
  });

  // Mock file view
  router.get('/mock/view/:uploadId', async (req, res) => {
    try {
      const { uploadId } = req.params;
      const htmlContent = mockService.getMockViewPage(uploadId);
      res.send(htmlContent);
    } catch (error) {
      res.status(404).send('<html><body><h1>File not found</h1></body></html>');
    }
  });

  // Mock file download
  router.get('/mock/download/:uploadId', async (req, res) => {
    try {
      const { uploadId } = req.params;
      const { buffer, metadata } = await mockService.downloadFile(uploadId);
      
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
      res.setHeader('Content-Type', metadata.mimeType);
      res.send(buffer);
    } catch (error) {
      res.status(404).json({ error: 'File not found' });
    }
  });
}

// 🔑 Initiate OAuth authentication
router.get('/auth/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const state = crypto.randomUUID(); // Generate unique state for CSRF protection
    
    // Store state in session or temporary storage
    req.session = req.session || {};
    req.session.cloudAuthState = state;
    
    let authUrl;
    if (isMockMode) {
      authUrl = await mockService.getAuthUrl(serviceId, state);
    } else {
      authUrl = CloudStorageService.generateAuthUrl(serviceId, state);
    }
    
    res.json({
      success: true,
      authUrl,
      state,
      message: isMockMode ? 'Using mock authentication for testing' : 'Please complete authentication in the popup window'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 🎫 OAuth callback handler
router.get('/callback/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { code, state, error } = req.query;
    
    if (error) {
      return res.send(`
        <script>
          localStorage.setItem('cloud_auth_${serviceId}', JSON.stringify({
            success: false,
            error: '${error}'
          }));
          window.close();
        </script>
      `);
    }
    
    if (!code || !state) {
      return res.send(`
        <script>
          localStorage.setItem('cloud_auth_${serviceId}', JSON.stringify({
            success: false,
            error: 'Missing authorization code'
          }));
          window.close();
        </script>
      `);
    }
      // Exchange code for tokens
    let result, storageUsage;
    
    if (isMockMode) {
      // Mock token exchange
      const tokens = await mockService.exchangeCodeForTokens(serviceId, code);
      const userInfo = await mockService.getUserInfo(serviceId, tokens.access_token);
      const storageInfo = await mockService.getStorageInfo(serviceId, tokens.access_token);
      
      result = {
        sessionId: `mock_session_${Date.now()}`,
        tokenData: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          userInfo
        }
      };
      
      storageUsage = {
        used: storageInfo.used || storageInfo.usage || 0,
        total: storageInfo.total || storageInfo.limit || storageInfo.allocated || 0,
        available: (storageInfo.total || storageInfo.limit || storageInfo.allocated || 0) - (storageInfo.used || storageInfo.usage || 0)
      };
    } else {
      // Real OAuth flow
      result = await CloudStorageService.exchangeCodeForToken(serviceId, code, state);
      storageUsage = await CloudStorageService.getStorageUsage(result.sessionId, serviceId);
    }
    
    // Get user info and storage usage
    const connection = {
      sessionId: result.sessionId,
      serviceId: serviceId,
      connectedAt: Date.now(),
      status: 'connected',
      storage: storageUsage,
      tokenInfo: result.tokenData,
      isMock: isMockMode
    };
    
    res.send(`
      <script>
        localStorage.setItem('cloud_auth_${serviceId}', JSON.stringify({
          success: true,
          connection: ${JSON.stringify(connection)}
        }));
        window.close();
      </script>
    `);
  } catch (error) {
    res.send(`
      <script>
        localStorage.setItem('cloud_auth_${req.params.serviceId}', JSON.stringify({
          success: false,
          error: '${error.message}'
        }));
        window.close();
      </script>
    `);
  }
});

// 📤 Upload file to cloud service
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { serviceId, fileName, folder, sessionId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    if (!serviceId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing serviceId or sessionId'
      });
    }
    
    // Check file size against service limits
    const sizeLimit = CLOUD_CONFIG.FILE_SIZE_LIMITS[serviceId.toUpperCase()];
    if (req.file.size > sizeLimit) {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size for ${serviceId} is ${Math.round(sizeLimit / 1024 / 1024)}MB`
      });
    }
      const result = isMockMode ? 
      await mockService.uploadFile(serviceId, 'mock_token', req.file.buffer, fileName || req.file.originalname, { folder }) :
      await CloudStorageService.uploadFile(sessionId, serviceId, req.file, { fileName, folder });
    
    res.json({
      success: true,
      data: result,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 Get service status and storage info
router.get('/status/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }
    
    try {
      const tokens = await CloudStorageService.getTokens(sessionId, serviceId);
      const storageUsage = await CloudStorageService.getStorageUsage(sessionId, serviceId);
      
      res.json({
        success: true,
        status: 'connected',
        storage: storageUsage,
        lastRefresh: Date.now(),
        tokenValid: true
      });
    } catch (error) {
      res.json({
        success: false,
        status: 'disconnected',
        error: error.message,
        tokenValid: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ❌ Disconnect service (revoke tokens)
router.post('/disconnect/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }
    
    await CloudStorageService.deleteTokens(sessionId, serviceId);
    
    res.json({
      success: true,
      message: 'Service disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📋 Get supported services and their limits
router.get('/services', (req, res) => {
  const services = Object.keys(CLOUD_CONFIG.OAUTH).map(serviceKey => {
    const service = serviceKey.toLowerCase();
    return {
      id: service,
      name: service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' '),
      maxFileSize: CLOUD_CONFIG.FILE_SIZE_LIMITS[serviceKey],
      storageLimit: CLOUD_CONFIG.STORAGE_LIMITS[serviceKey],
      requiredEnv: [
        `${serviceKey}_CLIENT_ID`,
        `${serviceKey}_CLIENT_SECRET`
      ]
    };
  });
  
  res.json({
    success: true,
    services,
    message: 'Supported cloud storage services'
  });
});

// 🧹 Cleanup expired tokens (admin endpoint)
router.post('/cleanup', async (req, res) => {
  try {
    await CloudStorageService.cleanupExpiredTokens();
    res.json({
      success: true,
      message: 'Expired tokens cleaned up'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔍 Health check
router.get('/health', (req, res) => {
  const requiredEnvVars = [
    'GOOGLE_DRIVE_CLIENT_ID',
    'DROPBOX_CLIENT_ID',
    'ONEDRIVE_CLIENT_ID'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  res.json({
    success: true,
    status: 'healthy',
    services: {
      googleDrive: !!process.env.GOOGLE_DRIVE_CLIENT_ID,
      dropbox: !!process.env.DROPBOX_CLIENT_ID,
      oneDrive: !!process.env.ONEDRIVE_CLIENT_ID
    },
    missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : undefined,
    message: 'Cloud storage service is running'
  });
});

export default router;
