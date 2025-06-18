/**
 * Simple Error Handler Component for Cloud Upload
 * Provides inline error handling for cloud upload operations
 */

import React from 'react';

const CloudErrorHandler = ({ error, onRetry, onDismiss, retryCount = 0, maxRetries = 3 }) => {
  if (!error) return null;

  const canRetry = retryCount < maxRetries && onRetry;
  
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
  };

  const getErrorType = (error) => {
    const message = getErrorMessage(error).toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return 'auth';
    }
    if (message.includes('size') || message.includes('limit')) {
      return 'size';
    }
    if (message.includes('format') || message.includes('type')) {
      return 'format';
    }
    return 'general';
  };

  const errorType = getErrorType(error);
  const message = getErrorMessage(error);

  const getErrorIcon = (type) => {
    switch (type) {
      case 'network':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#ef4444"/>
          </svg>
        );
      case 'auth':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="#f59e0b"/>
          </svg>
        );
      case 'size':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="#f59e0b"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#ef4444"/>
          </svg>
        );
    }
  };

  const getSuggestion = (type) => {
    switch (type) {
      case 'network':
        return 'Check your internet connection and try again.';
      case 'auth':
        return 'Please reconnect to your cloud service.';
      case 'size':
        return 'File is too large. Try reducing file size or quality.';
      case 'format':
        return 'File format not supported by this cloud service.';
      default:
        return 'Please try again or contact support if the problem persists.';
    }
  };

  return (
    <div className="cloud-error-handler">
      <div className="error-content">
        <div className="error-header">
          {getErrorIcon(errorType)}
          <span className="error-title">Upload Failed</span>
          {onDismiss && (
            <button 
              className="dismiss-btn"
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
        
        <p className="error-message">{message}</p>
        <p className="error-suggestion">{getSuggestion(errorType)}</p>
        
        {canRetry && (
          <div className="error-actions">
            <button 
              className="retry-btn"
              onClick={onRetry}
              disabled={retryCount >= maxRetries}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>
              </svg>
              Retry {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .cloud-error-handler {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 8px 0;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .error-title {
          font-weight: 600;
          color: #dc2626;
          font-size: 0.9rem;
        }

        .dismiss-btn {
          position: absolute;
          right: 0;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .dismiss-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #374151;
        }

        .error-message {
          color: #b91c1c;
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }

        .error-suggestion {
          color: #7c2d12;
          font-size: 0.8rem;
          margin: 0;
          font-style: italic;
        }

        .error-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .retry-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-btn:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
        }

        .retry-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .cloud-error-handler {
            padding: 10px 12px;
            margin: 6px 0;
          }

          .error-header {
            flex-wrap: wrap;
          }

          .dismiss-btn {
            position: relative;
            right: auto;
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default CloudErrorHandler;
