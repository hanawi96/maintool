import { useState, useCallback, useRef, useEffect } from 'react';
import webSocketUploadManager from '../utils/WebSocketUploadManager';

// 🌤️ Cloud Storage Services Configuration
const CLOUD_SERVICES = {
  GOOGLE_DRIVE: {
    id: 'google_drive',
    name: 'Google Drive',
    icon: 'FolderOpen', // Lucide icon name
    color: '#4285F4',
    maxFileSize: 750 * 1024 * 1024, // 750MB
    freeStorage: 15 * 1024 * 1024 * 1024, // 15GB
  },
  DROPBOX: {
    id: 'dropbox',
    name: 'Dropbox',
    icon: 'Database', // Lucide icon name
    color: '#0061FF',
    maxFileSize: 150 * 1024 * 1024, // 150MB for free accounts
    freeStorage: 2 * 1024 * 1024 * 1024, // 2GB
  },
  ONEDRIVE: {
    id: 'onedrive',
    name: 'OneDrive',
    icon: 'HardDrive', // Lucide icon name
    color: '#0078D4',
    maxFileSize: 250 * 1024 * 1024, // 250MB
    freeStorage: 5 * 1024 * 1024 * 1024, // 5GB
  }
};

// 🔐 Storage key for persisting connections
const STORAGE_KEY = 'mp3_cutter_cloud_connections';

/**
 * 🌤️ Cloud Storage Hook - Manages cloud service connections and uploads
 */
export const useCloudStorage = () => {
  // State management
  const [connections, setConnections] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [activeUploads, setActiveUploads] = useState(new Set());
  const [uploadHistory, setUploadHistory] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [settings, setSettings] = useState({
    autoUpload: false,
    createMonthlyFolders: true,
    compressLargeFiles: true,
    showNotifications: true,
    enableRealTimeProgress: true,
    defaultFolders: {
      google_drive: '/Music/MP3Cutter',
      dropbox: '/Apps/MP3Cutter',
      onedrive: '/Documents/Audio'
    },
    fileNamingPattern: '[timestamp]_[original]_cut.[format]'
  });

  // Refs for cleanup
  const uploadControllersRef = useRef(new Map());
  const wsManagerRef = useRef(null);  // Initialize WebSocket connection (temporarily disabled to prevent errors)
  useEffect(() => {
    // WebSocket functionality temporarily disabled for stability
    // TODO: Re-enable once backend WebSocket server is implemented
    
    const isWebSocketEnabled = false; // Set to true once backend supports WebSocket
    
    if (!isWebSocketEnabled) {
      console.log('WebSocket disabled - using polling fallback');
      setIsWebSocketConnected(false);
      return;
    }

    const wsManager = webSocketUploadManager;
    wsManagerRef.current = wsManager;

    // Set up WebSocket event listeners
    const handleUploadProgress = (data) => {
      setUploadProgress(prev => ({
        ...prev,
        [data.uploadId]: {
          progress: data.progress,
          uploaded: data.uploaded,
          total: data.total,
          speed: data.speed,
          eta: data.eta
        }
      }));
    };

    const handleUploadComplete = (data) => {
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.uploadId);
        return newSet;
      });
      
      setUploadProgress(prev => {
        const { [data.uploadId]: removed, ...rest } = prev;
        return rest;
      });

      // Add to upload history
      setUploadHistory(prev => [
        {
          id: data.uploadId,
          sessionId: data.sessionId,
          result: data.result,
          completedAt: Date.now(),
          duration: data.duration
        },
        ...prev.slice(0, 49) // Keep last 50 uploads
      ]);
    };

    const handleUploadError = (data) => {
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.uploadId);
        return newSet;
      });
      
      setUploadProgress(prev => {
        const { [data.uploadId]: removed, ...rest } = prev;
        return rest;
      });

      console.error('Upload error:', data);
    };

    // Connect WebSocket and set up listeners
    if (settings.enableRealTimeProgress) {
      wsManager.connect().then(() => {
        wsManager.on('uploadProgress', handleUploadProgress);
        wsManager.on('uploadComplete', handleUploadComplete);
        wsManager.on('uploadError', handleUploadError);
        setIsWebSocketConnected(true);
      }).catch(error => {
        console.warn('WebSocket connection failed, falling back to polling:', error);
        setIsWebSocketConnected(false);
      });
    }

    return () => {
      // Cleanup event listeners
      if (wsManager && typeof wsManager.off === 'function') {
        wsManager.off('uploadProgress', handleUploadProgress);
        wsManager.off('uploadComplete', handleUploadComplete);
        wsManager.off('uploadError', handleUploadError);
      }
    };
  }, [settings.enableRealTimeProgress]);

  // 💾 Load saved connections and settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setConnections(data.connections || {});
        setSettings(prev => ({ ...prev, ...data.settings }));
        setUploadHistory(data.history || []);
      }
    } catch (error) {
      console.warn('Failed to load cloud storage data:', error);
    }
  }, []);

  // 💾 Save connections and settings to localStorage
  const saveToStorage = useCallback((newConnections, newSettings, newHistory) => {
    try {
      const data = {
        connections: newConnections || connections,
        settings: newSettings || settings,
        history: newHistory || uploadHistory,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cloud storage data:', error);
    }
  }, [connections, settings, uploadHistory]);

  // 🔗 Connect to a cloud service
  const connectService = useCallback(async (serviceId) => {
    try {
      // Simulate OAuth flow - in real implementation, this would open OAuth popup
      const authWindow = window.open(
        `/api/cloud/auth/${serviceId}`,
        'cloud-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            
            // Check for auth result in localStorage (set by popup)
            const authResult = localStorage.getItem(`cloud_auth_${serviceId}`);
            if (authResult) {
              const result = JSON.parse(authResult);
              localStorage.removeItem(`cloud_auth_${serviceId}`);
              
              if (result.success) {
                const newConnections = {
                  ...connections,
                  [serviceId]: {
                    ...result.connection,
                    connectedAt: Date.now(),
                    status: 'connected'
                  }
                };
                setConnections(newConnections);
                saveToStorage(newConnections);
                resolve(result.connection);
              } else {
                reject(new Error(result.error));
              }
            } else {
              reject(new Error('Authentication cancelled'));
            }
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          if (!authWindow.closed) {
            authWindow.close();
          }
          reject(new Error('Authentication timeout'));
        }, 5 * 60 * 1000);
      });
    } catch (error) {
      console.error(`Failed to connect to ${serviceId}:`, error);
      throw error;
    }
  }, [connections, saveToStorage]);

  // ❌ Disconnect from a cloud service
  const disconnectService = useCallback(async (serviceId) => {
    try {
      // Cancel any active uploads for this service
      const activeUploadsForService = Array.from(activeUploads).filter(
        uploadId => uploadId.startsWith(serviceId)
      );
      
      for (const uploadId of activeUploadsForService) {
        const controller = uploadControllersRef.current.get(uploadId);
        if (controller) {
          controller.abort();
          uploadControllersRef.current.delete(uploadId);
        }
      }

      // Remove from active uploads
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        activeUploadsForService.forEach(id => newSet.delete(id));
        return newSet;
      });

      // Remove connection
      const newConnections = { ...connections };
      delete newConnections[serviceId];
      setConnections(newConnections);
      saveToStorage(newConnections);

      // TODO: Revoke tokens on server side
      await fetch(`/api/cloud/disconnect/${serviceId}`, { method: 'POST' });
    } catch (error) {
      console.error(`Failed to disconnect from ${serviceId}:`, error);
      throw error;
    }
  }, [connections, activeUploads, saveToStorage]);

  // 🔄 Refresh service status
  const refreshServiceStatus = useCallback(async (serviceId) => {
    try {
      const response = await fetch(`/api/cloud/status/${serviceId}`);
      const status = await response.json();
      
      const newConnections = {
        ...connections,
        [serviceId]: {
          ...connections[serviceId],
          ...status,
          lastRefresh: Date.now()
        }
      };
      setConnections(newConnections);
      saveToStorage(newConnections);
      
      return status;
    } catch (error) {
      console.error(`Failed to refresh status for ${serviceId}:`, error);
      throw error;
    }
  }, [connections, saveToStorage]);

  // 📤 Upload file to cloud service
  const uploadFile = useCallback(async (file, serviceId, options = {}) => {
    const uploadId = `${serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    uploadControllersRef.current.set(uploadId, controller);

    try {
      // Add to active uploads
      setActiveUploads(prev => new Set([...prev, uploadId]));

      // Initialize progress
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: {
          serviceId,
          fileName: file.name,
          fileSize: file.size,
          uploaded: 0,
          progress: 0,
          status: 'preparing',
          startTime: Date.now()
        }
      }));

      // Generate file name based on pattern
      const fileName = generateFileName(file.name, settings.fileNamingPattern, options);
      
      // Determine upload folder
      const folder = options.folder || settings.defaultFolders[serviceId] || '/';
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('folder', folder);
      formData.append('serviceId', serviceId);

      // Upload with progress tracking
      const response = await fetch('/api/cloud/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Custom upload progress handler would be implemented here
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update progress to complete
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          progress: 100,
          status: 'completed',
          result,
          endTime: Date.now()
        }
      }));

      // Add to history
      const historyItem = {
        id: uploadId,
        fileName,
        fileSize: file.size,
        serviceId,
        serviceIcon: CLOUD_SERVICES[serviceId.toUpperCase()]?.icon || '☁️',
        uploadedAt: Date.now(),
        result
      };
      
      setUploadHistory(prev => {
        const newHistory = [historyItem, ...prev].slice(0, 50); // Keep last 50 uploads
        saveToStorage(undefined, undefined, newHistory);
        return newHistory;
      });

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        setUploadProgress(prev => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'cancelled',
            error: 'Upload cancelled'
          }
        }));
      } else {
        setUploadProgress(prev => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'failed',
            error: error.message
          }
        }));
      }
      throw error;
    } finally {
      // Remove from active uploads
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadId);
        return newSet;
      });
      
      // Clean up controller
      uploadControllersRef.current.delete(uploadId);
    }
  }, [settings, saveToStorage]);

  // 🛑 Cancel upload
  const cancelUpload = useCallback((uploadId) => {
    const controller = uploadControllersRef.current.get(uploadId);
    if (controller) {
      controller.abort();
    }
  }, []);

  // ⚙️ Update settings
  const updateSettings = useCallback((newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveToStorage(undefined, updated);
  }, [settings, saveToStorage]);  // 🧹 Cleanup on unmount
  useEffect(() => {
    const controllers = uploadControllersRef.current;
    return () => {
      // Cancel all active uploads
      controllers.forEach(controller => {
        controller.abort();
      });
      controllers.clear();
    };
  }, []);

  // 📊 Get service info
  const getServiceInfo = useCallback((serviceId) => {
    const service = CLOUD_SERVICES[serviceId.toUpperCase()];
    const connection = connections[serviceId];
    
    return {
      ...service,
      connection,
      isConnected: !!connection && connection.status === 'connected',
      isExpired: connection && connection.expiresAt && connection.expiresAt < Date.now()
    };
  }, [connections]);

  return {
    // Services and connections
    services: CLOUD_SERVICES,
    connections,
    getServiceInfo,
    
    // Connection management
    connectService,
    disconnectService,
    refreshServiceStatus,
    
    // Upload functionality
    uploadFile,
    cancelUpload,
    uploadProgress,
    activeUploads,
    uploadHistory,
    
    // Settings
    settings,
    updateSettings,
    
    // Utilities
    isUploading: activeUploads.size > 0,
    isWebSocketConnected
  };
};

// 🏷️ Generate file name based on pattern
function generateFileName(originalName, pattern, options = {}) {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const extension = originalName.split('.').pop();
  
  return pattern
    .replace('[timestamp]', timestamp)
    .replace('[original]', nameWithoutExt)
    .replace('[format]', extension)
    .replace(/[<>:"/\\|?*]/g, '_'); // Replace invalid characters
}

export default useCloudStorage;
