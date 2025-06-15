import React from 'react';
import { AlertCircle } from 'lucide-react';

// 🎯 **CONNECTION ERROR ALERT**: Extract error display logic for better code organization
const ConnectionErrorAlert = React.memo(({ 
  connectionError, 
  uploadError, 
  onRetryConnection 
}) => {
  // 🔥 **EARLY RETURN**: No error, no render
  if (!connectionError && !uploadError) {
    return null;
  }

  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            {connectionError ? 'Connection Error' : 'Upload Error'}
          </h3>
          <p className="text-sm text-red-700">
            {connectionError || uploadError}
          </p>
          {connectionError && onRetryConnection && (
            <div className="mt-2">
              <button
                onClick={onRetryConnection}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ConnectionErrorAlert.displayName = 'ConnectionErrorAlert';

export default ConnectionErrorAlert; 