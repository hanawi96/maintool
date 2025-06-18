import React, { useState, useMemo, useCallback } from 'react';
import { 
  Cloud, ChevronDown, Upload, Check, X, 
  AlertCircle, ExternalLink, Loader, Clock,
  FolderOpen, HardDrive, Database, Settings, FileText
} from 'lucide-react';
import useCloudStorage from '../../hooks/useCloudStorage';
import CloudErrorHandler from './CloudErrorHandler';

const CloudUploadPanel = ({ 
  processedFile, 
  isEnabled = false,
  onUploadComplete,
  className = '' 
}) => {
  const {
    services,
    connections,
    getServiceInfo,
    connectService,
    uploadFile,
    cancelUpload,
    uploadProgress,
    activeUploads,
    settings,
    isUploading
  } = useCloudStorage();
  // Local state
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notification, setNotification] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Get connected services
  const connectedServices = useMemo(() => {
    return Object.values(services).filter(service => {
      const info = getServiceInfo(service.id);
      return info.isConnected && !info.isExpired;
    });
  }, [services, getServiceInfo]);
  // Handle service connection
  const handleConnect = useCallback(async (serviceId) => {
    try {
      setUploadError(null);
      setNotification({ type: 'info', message: 'Opening authorization window...' });
      await connectService(serviceId);
      setNotification({ type: 'success', message: 'Successfully connected!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setUploadError(error);
      setNotification({ type: 'error', message: error.message });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [connectService]);

  // Handle file upload
  const handleUpload = useCallback(async (serviceId) => {
    if (!processedFile) return;

    try {
      setUploadError(null);
      const result = await uploadFile(processedFile.blob || processedFile.file, serviceId, {
        originalName: processedFile.filename
      });
      
      setNotification({ 
        type: 'success', 
        message: `Uploaded to ${services[serviceId.toUpperCase()].name}!`,
        action: result.shareUrl ? { label: 'View', url: result.shareUrl } : null
      });
      
      setRetryCount(0); // Reset retry count on success
      onUploadComplete?.(serviceId, result);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      setUploadError(error);
      setNotification({ type: 'error', message: error.message });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [processedFile, uploadFile, services, onUploadComplete]);

  // Handle retry upload
  const handleRetryUpload = useCallback((serviceId) => {
    setRetryCount(prev => prev + 1);
    handleUpload(serviceId);
  }, [handleUpload]);

  // Handle dismiss error
  const handleDismissError = useCallback(() => {
    setUploadError(null);
    setRetryCount(0);
  }, []);  // Render service button with modern design
  const renderServiceButton = useCallback((service, isConnected) => {
    const activeUpload = Array.from(activeUploads).find(id => id.startsWith(service.id));
    const progress = activeUpload ? uploadProgress[activeUpload] : null;

    // Get the appropriate Lucide icon component with consistent design
    const getServiceIcon = (iconName) => {
      switch (iconName) {
        case 'FolderOpen': return <FolderOpen className="w-4 h-4" />;
        case 'Database': return <Database className="w-4 h-4" />;
        case 'HardDrive': return <HardDrive className="w-4 h-4" />;
        default: return <Cloud className="w-4 h-4" />;
      }
    };    return (
      <div
        key={service.id}
        onClick={() => {
          if (!isEnabled || isUploading) return;
          setSelectedService(service.id);
          isConnected ? handleUpload(service.id) : handleConnect(service.id);
        }}
        className={`
          relative group p-3 rounded-xl font-medium cursor-pointer
          transition-all duration-300 border-2 hover:shadow-md transform hover:scale-[1.02]
          ${isConnected
            ? `bg-gradient-to-br from-white via-green-50/30 to-green-100/20 border-green-200 hover:border-green-300 shadow-sm`
            : 'bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/50 border-slate-200 hover:border-slate-300'
          }
          ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        {/* Service Header - Compact Version */}
        <div className="text-center space-y-2">          {/* Service Icon Container */}
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-all duration-300 shadow-sm
            ${progress ? 'animate-pulse' : ''}
            ${service.id === 'googledrive' ? 'bg-gradient-to-br from-yellow-100 to-orange-200 text-orange-600' : ''}
            ${service.id === 'dropbox' ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600' : ''}
            ${service.id === 'onedrive' ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600' : ''}
            ${!service.id.match(/googledrive|dropbox|onedrive/) ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600' : ''}
          `}>
            {progress ? (
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              getServiceIcon(service.icon)
            )}
          </div>

          {/* Service Name */}
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-800 truncate">{service.name}</div>
            
            {/* Status */}
            {progress ? (
              <div className="text-xs text-blue-600 font-medium">
                {Math.round(progress.progress)}%
              </div>
            ) : isConnected ? (
              <div className="flex items-center justify-center gap-1">
                <Check className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">Ready</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Connect</div>
            )}
          </div>          {/* Upload Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent parent div click
              setSelectedService(service.id);
              isConnected ? handleUpload(service.id) : handleConnect(service.id);
            }}
            disabled={!isEnabled || isUploading}
            className={`
              w-full flex items-center justify-center py-2 px-3 rounded-lg font-medium text-sm
              transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isConnected
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg focus:ring-green-500'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg focus:ring-purple-500'
              }
              ${!isEnabled || isUploading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
            `}
          >
            {progress ? (
              <span className="text-xs font-bold">
                {Math.round(progress.progress)}%
              </span>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                {isConnected ? 'Upload' : 'Connect'}
              </>
            )}
          </button>
        </div>
        
        {/* Progress Bar */}
        {progress && (
          <div className="mt-3 space-y-1">
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-500 shadow-sm"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="text-xs text-slate-600 text-center">
              Uploading...
            </div>
          </div>
        )}

        {/* Hover Effect Overlay */}
        <div className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
          ${isConnected
            ? 'bg-gradient-to-br from-green-100/20 to-green-200/10'
            : 'bg-gradient-to-br from-slate-100/20 to-slate-200/10'
          }
        `} />
      </div>
    );
  }, [isEnabled, isUploading, activeUploads, uploadProgress, handleUpload, handleConnect]);// Don't render if no processed file - logic này giờ được handle bởi parent component
  // Vì CutDownload chỉ render component này khi có processedFile
  
  return (
    <div className={`bg-gradient-to-br from-white/90 via-slate-50/50 to-slate-100/30 backdrop-blur-lg rounded-2xl border-2 border-slate-200/60 shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/60 transition-all duration-200 rounded-t-2xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm">
            <Cloud className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Save to Cloud Storage</h3>
            <p className="text-sm text-slate-500">Upload your processed audio to the cloud</p>
          </div>
          {connectedServices.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <div className="flex -space-x-2">
                {connectedServices.slice(0, 3).map(service => {
                  const getServiceIcon = (iconName) => {
                    switch (iconName) {
                      case 'FolderOpen': return <FolderOpen className="w-3 h-3" />;
                      case 'Database': return <Database className="w-3 h-3" />;
                      case 'HardDrive': return <HardDrive className="w-3 h-3" />;
                      default: return <Cloud className="w-3 h-3" />;
                    }
                  };
                  
                  return (
                    <div 
                      key={service.id}
                      className="w-7 h-7 rounded-full bg-green-100 border-2 border-white flex items-center justify-center shadow-sm"
                      title={`${service.name} - Connected`}
                    >
                      <div className="text-green-600">
                        {getServiceIcon(service.icon)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {connectedServices.length > 3 && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  +{connectedServices.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          )}
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
            isExpanded ? 'bg-slate-200 rotate-180' : 'bg-slate-100 hover:bg-slate-200'
          }`}>
            <ChevronDown className="w-4 h-4 text-slate-600" />
          </div>
        </div>
      </div>      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* File Info */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Ready to upload:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Format:</span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-200 px-2 py-1 rounded-full">
                  {processedFile.outputFormat?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 truncate flex-1">{processedFile.filename}</span>
              <span className="text-sm text-slate-600 ml-2">
                {formatFileSize(processedFile.fileSize)}
              </span>
            </div>
          </div>

          {/* Quick Upload Buttons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-600" />
                <span className="text-base font-semibold text-slate-700">Quick Upload</span>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
              <div className="grid grid-cols-3 gap-3">
              {Object.values(services).map(service => {
                const info = getServiceInfo(service.id);
                return renderServiceButton(service, info.isConnected && !info.isExpired);
              })}
            </div>
          </div>          {/* Notification */}
          {notification && (
            <div className={`
              rounded-xl p-4 flex items-center justify-between border-2 shadow-sm
              ${notification.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-200' : ''}
              ${notification.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200' : ''}
              ${notification.type === 'info' ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200' : ''}
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-lg
                  ${notification.type === 'success' ? 'bg-green-100' : ''}
                  ${notification.type === 'error' ? 'bg-red-100' : ''}
                  ${notification.type === 'info' ? 'bg-blue-100' : ''}
                `}>
                  {notification.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
                  {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {notification.type === 'info' && <Clock className="w-4 h-4 text-blue-600" />}
                </div>
                <span className={`text-sm font-medium 
                  ${notification.type === 'success' ? 'text-green-800' : ''}
                  ${notification.type === 'error' ? 'text-red-800' : ''}
                  ${notification.type === 'info' ? 'text-blue-800' : ''}
                `}>
                  {notification.message}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {notification.action && (
                  <button
                    onClick={() => window.open(notification.action.url, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-all duration-200"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {notification.action.label}
                  </button>
                )}
                <button
                  onClick={() => setNotification(null)}
                  className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>          )}

          {/* Error Handler */}
          {uploadError && (
            <CloudErrorHandler
              error={uploadError}
              onRetry={() => handleRetryUpload(selectedService)}
              onDismiss={handleDismissError}
              retryCount={retryCount}
              maxRetries={3}
            />
          )}          {/* Active Uploads Progress */}
          {Array.from(activeUploads).map(uploadId => {
            const progress = uploadProgress[uploadId];
            if (!progress) return null;

            const getServiceIcon = (iconName) => {
              switch (iconName) {
                case 'FolderOpen': return <FolderOpen className="w-5 h-5" />;
                case 'Database': return <Database className="w-5 h-5" />;
                case 'HardDrive': return <HardDrive className="w-5 h-5" />;
                default: return <Cloud className="w-5 h-5" />;
              }
            };

            return (
              <div key={uploadId} className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-4 border-2 border-blue-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 animate-pulse">
                      {getServiceIcon(services[progress.serviceId?.toUpperCase()]?.icon)}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-blue-800">
                        Uploading to {services[progress.serviceId?.toUpperCase()]?.name}
                      </span>
                      <div className="text-xs text-blue-600">{progress.fileName}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelUpload(uploadId)}
                    className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700 font-medium">{Math.round(progress.progress)}% Complete</span>
                    <span className="text-blue-600">{calculateTimeRemaining(progress)}</span>
                  </div>
                  <div className="w-full bg-blue-200/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  {progress.progress > 0 && (
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>{formatFileSize(progress.uploaded)} of {formatFileSize(progress.fileSize)}</span>
                      <span className="font-medium">
                        {Math.round((progress.uploaded / progress.fileSize) * 100)}% uploaded
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateTimeRemaining(progress) {
  if (!progress.startTime || progress.progress === 0) return '...';
  
  const elapsed = Date.now() - progress.startTime;
  const rate = progress.progress / elapsed;
  const remaining = (100 - progress.progress) / rate;
  
  if (remaining < 60000) {
    return Math.round(remaining / 1000) + 's';
  } else {
    return Math.round(remaining / 60000) + 'm';
  }
}

export default CloudUploadPanel;
