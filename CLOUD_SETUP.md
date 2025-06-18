# 🌤️ Cloud Storage Setup Guide

This guide will help you set up cloud storage integration for MP3 Cutter Pro.

## 📋 Prerequisites

1. **Environment Variables**: Copy `.env.example` to `.env` and fill in your OAuth credentials
2. **Cloud Service Accounts**: Create OAuth applications for each service you want to support

---

## 🔧 Service Setup Instructions

### 📁 Google Drive Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Drive API

2. **Create OAuth 2.0 Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3001/api/cloud/callback/google_drive`
   - Copy Client ID and Client Secret to `.env`

3. **Environment Variables**:
   ```
   GOOGLE_DRIVE_CLIENT_ID=your-client-id
   GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
   ```

### 📦 Dropbox Setup

1. **Create a Dropbox App**:
   - Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
   - Create new app → "Scoped access" → "App folder" or "Full Dropbox"
   - Choose a unique app name

2. **Configure OAuth Settings**:
   - Redirect URIs: `http://localhost:3001/api/cloud/callback/dropbox`
   - Permissions: `files.content.write`, `files.content.read`
   - Copy App key and App secret to `.env`

3. **Environment Variables**:
   ```
   DROPBOX_CLIENT_ID=your-app-key
   DROPBOX_CLIENT_SECRET=your-app-secret
   ```

### 🗄️ OneDrive Setup

1. **Register an Azure App**:
   - Go to [Azure Portal](https://portal.azure.com/) → "App registrations"
   - Create new registration
   - Redirect URI: `http://localhost:3001/api/cloud/callback/onedrive`

2. **Configure Permissions**:
   - API permissions → "Add permission" → "Microsoft Graph"
   - Add `Files.ReadWrite` permission
   - Grant admin consent

3. **Create Client Secret**:
   - Go to "Certificates & secrets" → "New client secret"
   - Copy Application ID and Client secret to `.env`

4. **Environment Variables**:
   ```
   ONEDRIVE_CLIENT_ID=your-application-id
   ONEDRIVE_CLIENT_SECRET=your-client-secret
   ```

---

## 🚀 Quick Start

### For Development (Mock Mode)
If you don't want to set up OAuth immediately, you can start with mock mode:

```bash
# Start backend without OAuth credentials
cd backend
npm start

# Frontend will show mock upload interface
cd ../frontend  
npm start
```

### For Production Setup
1. **Set up OAuth credentials** for at least one service (follow guides above)
2. **Update environment variables** in `.env`
3. **Restart the backend server**:
   ```bash
   cd backend
   npm start
   ```
4. **Test the integration**:
   - Open MP3 Cutter Pro
   - Cut an audio file
   - Click "Save to Cloud Storage"
   - Connect your cloud service
   - Upload should work! 🎉

---

## 🧪 Testing the Integration

### Manual Testing Steps:
1. **Process an audio file** using the MP3 cutter
2. **Click "Save to Cloud Storage"** in the export panel
3. **Connect a service** (Google Drive/Dropbox/OneDrive)
4. **Authorize the application** in the popup window
5. **Upload the file** using quick upload buttons
6. **Verify the file** appears in your cloud storage

### Debugging Tips:
- Check browser console for errors
- Verify environment variables are loaded
- Check backend logs for API errors
- Ensure redirect URIs match exactly

---

## 📊 Monitoring & Maintenance

### Health Check Endpoints:
- Backend health: `GET /health`
- Cloud services health: `GET /api/cloud/health`
- Service status: `GET /api/cloud/services`

### Token Management:
- Tokens are encrypted and stored securely
- Automatic refresh for expired tokens
- Cleanup utility: `POST /api/cloud/cleanup`

### Storage Monitoring:
Each service has different limits:
- **Google Drive**: 15GB free, 750MB max file size
- **Dropbox**: 2GB free, 150MB max file size  
- **OneDrive**: 5GB free, 250MB max file size

---

## 🔐 Security Notes

1. **Environment Variables**: Never commit `.env` files to version control
2. **Token Storage**: Tokens are encrypted using AES-256
3. **Session Management**: Sessions expire after 24 hours
4. **HTTPS**: Use HTTPS in production for secure OAuth flows
5. **Scope Limitation**: Only request minimum required permissions

---

## 🆘 Troubleshooting

### Common Issues:

**"Authentication failed"**
- Check OAuth credentials in `.env`
- Verify redirect URIs match exactly
- Ensure APIs are enabled in cloud consoles

**"Upload failed"**  
- Check file size limits
- Verify storage quota available
- Check internet connectivity

**"Token expired"**
- Tokens refresh automatically
- Manual reconnection may be needed
- Check token storage permissions

### Getting Help:
- Check the browser console for detailed error messages
- Backend logs provide OAuth flow debugging info
- Test individual services using health check endpoints

---

## 🎯 Next Steps

Once basic integration is working:

1. **Add more services**: Implement additional cloud providers
2. **Enhance UX**: Add upload progress, batch uploads, retry logic
3. **Monitor usage**: Track upload success rates and errors
4. **Scale**: Implement rate limiting and caching for production

Happy cloud uploading! ☁️✨
