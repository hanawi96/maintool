import React, { useState, useCallback } from 'react';
import { AlertTriangle, X, FileX, Wifi, HelpCircle, RefreshCw } from 'lucide-react';

const AudioErrorAlert = ({ 
  error, 
  compatibilityReport 
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // 🔥 **SELF-MANAGED DISMISS**: Component tự handle dismiss
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // 🔥 **SELF-MANAGED RETRY**: Simple reload action
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // 🔥 **EARLY EXIT**: Không render nếu không có error hoặc đã dismiss
  if (!error || isDismissed) return null;

  // 🎯 Get appropriate icon based on error type
  const getErrorIcon = () => {
    switch (error.type) {
      case 'validation':
        return <FileX className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'upload':
        return <Wifi className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'playback':
        return <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      default:
        return <HelpCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    }
  };

  // 🎯 Get error-specific styling
  const getErrorStyling = () => {
    const baseStyles = "mb-4 border rounded-lg p-4";
    
    switch (error.type) {
      case 'validation':
        return `${baseStyles} bg-orange-50 border-orange-200`;
      case 'upload':
        return `${baseStyles} bg-blue-50 border-blue-200`;
      case 'playback':
        return `${baseStyles} bg-red-50 border-red-200`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200`;
    }
  };

  // 🎯 Format error code for display
  const formatErrorCode = (code) => {
    const codes = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK', 
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    return codes[code] || `ERROR_${code}`;
  };

  return (
    <div className={`audio-error-alert ${getErrorStyling()}`}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        
        <div className="flex-1">
          {/* Error Title */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-red-800">
              {error.title}
              {error.code && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                  {formatErrorCode(error.code)}
                </span>
              )}
            </h3>
            
            <button
              onClick={handleDismiss}
              className="text-red-400 hover:text-red-600 transition-colors"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Message */}
          <p className="text-sm text-red-700 mb-3">
            {error.message}
          </p>

          {/* File Information */}
          {error.filename && (
            <div className="mb-3 p-2 bg-white rounded border">
              <div className="text-xs text-gray-600 mb-1">File Information:</div>
              <div className="text-sm font-mono text-gray-800">
                📄 {error.filename}
                {error.detectedFormat && (
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {error.detectedFormat}
                  </span>
                )}
              </div>
              
              {/* Browser Compatibility Info */}
              {error.compatibilityInfo && (
                <div className="mt-1 text-xs text-gray-600">
                  Browser Support: 
                  <span className={`ml-1 px-2 py-0.5 rounded ${
                    error.compatibilityInfo.level === 'high' ? 'bg-green-100 text-green-700' :
                    error.compatibilityInfo.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {error.compatibilityInfo.level} ({error.compatibilityInfo.support})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {(error.suggestion || error.suggestions) && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">💡 Suggestions:</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {error.suggestion && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 text-xs mt-1">•</span>
                    {error.suggestion}
                  </li>
                )}
                {error.suggestions && error.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 text-xs mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supported Formats */}
          {error.supportedFormats && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">✅ Supported Formats:</div>
              <div className="flex flex-wrap gap-1">
                {error.supportedFormats.map((format, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Browser Compatibility Report (for severe errors) */}
          {error.code === 4 && compatibilityReport && (
            <div className="mb-3 p-2 bg-white rounded border">
              <div className="text-xs font-medium text-gray-700 mb-2">🔍 Browser Compatibility:</div>
              <div className="space-y-1">
                <div className="text-xs">
                  <span className="font-medium text-green-700">Universal Support:</span>
                  <span className="ml-1">
                    {Object.values(compatibilityReport.universal)
                      .filter(format => format.support.level === 'high')
                      .map(format => format.displayName)
                      .join(', ') || 'None'}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-yellow-700">Limited Support:</span>
                  <span className="ml-1">
                    {Object.values(compatibilityReport.moderate)
                      .filter(format => format.support.canPlay)
                      .map(format => format.displayName)
                      .join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reload Page
            </button>
            
            {error.type === 'playback' && error.code === 4 && (
              <a
                href="https://cloudconvert.com/audio-converter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded transition-colors"
              >
                🔄 Convert File Online
              </a>
            )}
            
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioErrorAlert; 