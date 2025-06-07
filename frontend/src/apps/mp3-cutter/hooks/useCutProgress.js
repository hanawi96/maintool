import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// 🔌 **WEBSOCKET PROGRESS HOOK**: Hook để kết nối WebSocket và nhận real-time progress
export const useWebSocketProgress = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const currentSessionRef = useRef(null);

  // 🔌 **INITIALIZE WEBSOCKET**: Initialize WebSocket connection
  useEffect(() => {
    console.log('🔌 [useWebSocketProgress] Initializing WebSocket connection...');
    
    try {
      // 🔌 **CREATE SOCKET**: Create socket connection
      const socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      // 🔌 **CONNECTION EVENTS**
      socket.on('connect', () => {
        console.log('✅ [WebSocket] Connected successfully:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 [WebSocket] Disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        setIsConnected(false);
        setConnectionError(`WebSocket connection failed: ${error.message}`);
      });

      // 📊 **PROGRESS EVENTS**
      socket.on('progress-room-joined', (data) => {
        console.log('📊 [WebSocket] Joined progress room:', data);
      });

      socket.on('cut-progress', (progressData) => {
        console.log('📊 [WebSocket] Progress received:', progressData);
        
        // 🎯 **UPDATE PROGRESS**: Update progress state
        setProgress(progressData);
        
        // 🎯 **AUTO-CLEAR COMPLETED**: Clear progress after completion
        if (progressData.stage === 'completed' || progressData.stage === 'error') {
          setTimeout(() => {
            console.log('🧹 [WebSocket] Auto-clearing progress after completion');
            setProgress(null);
          }, 3000); // Clear after 3 seconds
        }
      });

      // 🧹 **CLEANUP**: Return cleanup function
      return () => {
        console.log('🧹 [useWebSocketProgress] Cleaning up WebSocket connection');
        socket.disconnect();
      };

    } catch (error) {
      console.error('❌ [useWebSocketProgress] Failed to initialize WebSocket:', error);
      setConnectionError(`Failed to initialize WebSocket: ${error.message}`);
    }
  }, []);

  // 📊 **START PROGRESS SESSION**: Start tracking progress for a session
  const startProgressSession = useCallback((sessionId) => {
    console.log('📊 [startProgressSession] Starting progress tracking:', sessionId);
    
    if (!socketRef.current) {
      console.error('❌ [startProgressSession] Socket not initialized');
      return false;
    }

    if (!socketRef.current.connected) {
      console.error('❌ [startProgressSession] Socket not connected');
      return false;
    }

    // 🎯 **JOIN PROGRESS ROOM**: Join room để nhận progress updates
    currentSessionRef.current = sessionId;
    socketRef.current.emit('join-progress-room', { sessionId });
    
    // 🎯 **RESET PROGRESS**: Reset progress state
    setProgress(null);
    
    console.log('✅ [startProgressSession] Progress session started:', sessionId);
    return true;
  }, []);

  // 🧹 **CLEAR PROGRESS**: Clear current progress
  const clearProgress = useCallback(() => {
    console.log('🧹 [clearProgress] Clearing progress manually');
    setProgress(null);
    currentSessionRef.current = null;
  }, []);

  // 🔌 **RECONNECT**: Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 [reconnect] Manual reconnection attempt');
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  return {
    isConnected,
    progress,
    connectionError,
    startProgressSession,
    clearProgress,
    reconnect,
    currentSession: currentSessionRef.current
  };
};

// 🔧 **LEGACY HOOK**: Keep existing useCutProgress for backward compatibility
export const useCutProgress = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const startProgress = useCallback(() => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
  }, []);

  const updateProgress = useCallback((percent) => {
    setProgress(Math.min(100, Math.max(0, percent)));
  }, []);

  const completeProgress = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsProcessing(false);
      setProgress(0);
    }, 1000);
  }, []);

  const failProgress = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false);
    setProgress(0);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    startProgress,
    updateProgress,
    completeProgress,
    failProgress
  };
}; 