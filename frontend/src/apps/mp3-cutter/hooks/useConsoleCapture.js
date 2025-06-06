import { useState, useEffect, useCallback } from 'react';

export const useConsoleCapture = () => {
  const [logs, setLogs] = useState([]);
  const [isCapturing, setIsCapturing] = useState(true);

  // 🎯 Add new log entry
  const addLog = useCallback((type, args, timestamp = new Date()) => {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      type,
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            // 🎯 ENHANCED: Better handling of empty objects and error objects
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            
            // Handle Error objects specially
            if (arg instanceof Error) {
              return `Error: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
            }
            
            // Handle MediaError objects (common in audio/video)
            if (arg instanceof MediaError) {
              const errorCodes = {
                1: 'MEDIA_ERR_ABORTED - The user canceled the download',
                2: 'MEDIA_ERR_NETWORK - A network error occurred',
                3: 'MEDIA_ERR_DECODE - A decoding error occurred',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio/video format is not supported'
              };
              return `MediaError (${arg.code}): ${errorCodes[arg.code] || 'Unknown media error'}`;
            }
            
            // Handle DOMException (common in fetch errors)
            if (arg instanceof DOMException) {
              return `DOMException: ${arg.message} (${arg.name})`;
            }
            
            // Handle empty objects
            const stringified = JSON.stringify(arg, null, 2);
            if (stringified === '{}') {
              // Try to extract more info from the object
              const keys = Object.keys(arg);
              const proto = Object.getPrototypeOf(arg);
              
              if (keys.length === 0 && proto !== Object.prototype) {
                return `{} (${proto.constructor?.name || 'Unknown'} instance)`;
              } else if (keys.length === 0) {
                return '(empty object)';
              }
            }
            
            return stringified;
          } catch (e) {
            // 🎯 Fallback for non-serializable objects
            return `[${typeof arg}${arg.constructor?.name ? ` ${arg.constructor.name}` : ''}]: ${String(arg)}`;
          }
        }
        return String(arg);
      }).join(' '),
      args
    };

    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // Keep only last 100 logs to prevent memory issues
      return newLogs.slice(-100);
    });
  }, []);

  // 🎯 Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // 🎯 Toggle capturing
  const toggleCapturing = useCallback(() => {
    setIsCapturing(prev => !prev);
  }, []);

  // 🎯 Filter logs by type
  const getLogsByType = useCallback((type) => {
    return logs.filter(log => log.type === type);
  }, [logs]);

  // 🎯 Get logs count by type
  const getLogsCounts = useCallback(() => {
    const counts = { info: 0, warn: 0, error: 0, log: 0 };
    logs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });
    return counts;
  }, [logs]);

  // 🎯 Capture console methods
  useEffect(() => {
    if (!isCapturing) return;

    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args);
      addLog('log', args);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      addLog('info', args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addLog('error', args);
    };

    // Capture unhandled errors
    const handleError = (event) => {
      addLog('error', ['Unhandled Error:', event.error?.message || event.message]);
    };

    const handleRejection = (event) => {
      addLog('error', ['Unhandled Promise Rejection:', event.reason]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Cleanup function
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [isCapturing, addLog]);

  return {
    logs,
    isCapturing,
    clearLogs,
    toggleCapturing,
    getLogsByType,
    getLogsCounts,
    addManualLog: addLog
  };
}; 