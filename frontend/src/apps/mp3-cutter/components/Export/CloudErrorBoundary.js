/**
 * Error Boundary Component for Cloud Upload
 * Catches and handles errors in the cloud upload components
 */

import React from 'react';

class CloudErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Cloud Upload Error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report error to monitoring service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `Cloud Upload Error: ${error.message}`,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;

      return (
        <div className="cloud-error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" 
                  fill="#ff6b6b"
                />
              </svg>
            </div>
            
            <h3>Cloud Upload Error</h3>
            
            <p className="error-message">
              {error?.message || 'An unexpected error occurred with cloud upload functionality.'}
            </p>
            
            <div className="error-actions">
              {canRetry && (
                <button 
                  className="retry-btn"
                  onClick={this.handleRetry}
                  aria-label={`Retry upload (${retryCount}/${maxRetries} attempts)`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" 
                      fill="currentColor"
                    />
                  </svg>
                  Try Again ({retryCount}/{maxRetries})
                </button>
              )}
              
              <button 
                className="reset-btn"
                onClick={this.handleReset}
                aria-label="Reset cloud upload"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" 
                    fill="currentColor"
                  />
                </svg>
                Reset
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Technical Details (Development Mode)</summary>
                <pre className="error-stack">
                  {error?.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="error-component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            
            <div className="error-help">
              <p>
                <strong>Common Solutions:</strong>
              </p>
              <ul>
                <li>Check your internet connection</li>
                <li>Ensure cloud service is properly connected</li>
                <li>Verify file size is within limits</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          </div>

          <style jsx>{`
            .cloud-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 20px;
              background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
              border: 1px solid #feb2b2;
              border-radius: 12px;
              margin: 16px 0;
            }

            .error-container {
              text-align: center;
              max-width: 500px;
              padding: 20px;
            }

            .error-icon {
              margin-bottom: 16px;
              display: flex;
              justify-content: center;
            }

            .error-container h3 {
              color: #c53030;
              margin: 0 0 12px 0;
              font-size: 1.25rem;
              font-weight: 600;
            }

            .error-message {
              color: #742a2a;
              margin-bottom: 20px;
              line-height: 1.5;
              font-size: 0.95rem;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 20px;
              flex-wrap: wrap;
            }

            .retry-btn, .reset-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 0.9rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }

            .retry-btn {
              background: #3182ce;
              color: white;
            }

            .retry-btn:hover {
              background: #2c5aa0;
              transform: translateY(-1px);
            }

            .reset-btn {
              background: #718096;
              color: white;
            }

            .reset-btn:hover {
              background: #4a5568;
              transform: translateY(-1px);
            }

            .error-details {
              margin: 20px 0;
              text-align: left;
              background: rgba(255, 255, 255, 0.8);
              border-radius: 6px;
              padding: 12px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              color: #2d3748;
              margin-bottom: 8px;
            }

            .error-stack, .error-component-stack {
              background: #1a202c;
              color: #e2e8f0;
              padding: 12px;
              border-radius: 4px;
              font-size: 0.8rem;
              overflow-x: auto;
              margin: 8px 0;
            }

            .error-help {
              background: rgba(255, 255, 255, 0.9);
              border-radius: 8px;
              padding: 16px;
              text-align: left;
              border: 1px solid #fed7d7;
            }

            .error-help p {
              margin: 0 0 8px 0;
              color: #2d3748;
              font-weight: 500;
            }

            .error-help ul {
              margin: 8px 0 0 0;
              padding-left: 20px;
              color: #4a5568;
            }

            .error-help li {
              margin-bottom: 4px;
            }

            @media (max-width: 480px) {
              .cloud-error-boundary {
                margin: 8px 0;
                padding: 12px;
              }

              .error-container {
                padding: 12px;
              }

              .error-actions {
                flex-direction: column;
                align-items: center;
              }

              .retry-btn, .reset-btn {
                width: 100%;
                max-width: 200px;
                justify-content: center;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CloudErrorBoundary;
