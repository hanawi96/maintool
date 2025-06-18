// features/cloud-storage/constants.js

export const CLOUD_CONFIG = {
  // OAuth configurations
  OAUTH: {
    GOOGLE_DRIVE: {
      clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3001/api/cloud/callback/google_drive',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    DROPBOX: {
      clientId: process.env.DROPBOX_CLIENT_ID,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET,
      redirectUri: process.env.DROPBOX_REDIRECT_URI || 'http://localhost:3001/api/cloud/callback/dropbox',
      authUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token'
    },
    ONEDRIVE: {
      clientId: process.env.ONEDRIVE_CLIENT_ID,
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
      redirectUri: process.env.ONEDRIVE_REDIRECT_URI || 'http://localhost:3001/api/cloud/callback/onedrive',
      scopes: ['Files.ReadWrite'],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    }
  },

  // API endpoints
  API_ENDPOINTS: {
    GOOGLE_DRIVE: {
      upload: 'https://www.googleapis.com/upload/drive/v3/files',
      files: 'https://www.googleapis.com/drive/v3/files',
      about: 'https://www.googleapis.com/drive/v3/about'
    },
    DROPBOX: {
      upload: 'https://content.dropboxapi.com/2/files/upload',
      files: 'https://api.dropboxapi.com/2/files',
      space: 'https://api.dropboxapi.com/2/users/get_space_usage'
    },
    ONEDRIVE: {
      upload: 'https://graph.microsoft.com/v1.0/me/drive/root:',
      files: 'https://graph.microsoft.com/v1.0/me/drive',
      me: 'https://graph.microsoft.com/v1.0/me'
    }
  },

  // File size limits (in bytes)
  FILE_SIZE_LIMITS: {
    GOOGLE_DRIVE: 750 * 1024 * 1024, // 750MB
    DROPBOX: 150 * 1024 * 1024,      // 150MB for free accounts
    ONEDRIVE: 250 * 1024 * 1024      // 250MB
  },

  // Storage limits (in bytes)
  STORAGE_LIMITS: {
    GOOGLE_DRIVE: 15 * 1024 * 1024 * 1024,  // 15GB
    DROPBOX: 2 * 1024 * 1024 * 1024,        // 2GB
    ONEDRIVE: 5 * 1024 * 1024 * 1024        // 5GB
  },

  // Token storage path
  TOKEN_STORAGE_PATH: 'storage/cloud-tokens',
  
  // Session timeout (24 hours)
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000
};
