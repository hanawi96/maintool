import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// WebSocket Progress Hook - Tối ưu hiệu năng, cleanup kỹ, không đổi logic
export const useWebSocketProgress = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const currentSessionRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.log('🔌 WebSocket connection error:', error.message);
      setIsConnected(false);
      setConnectionError(`WebSocket connection failed: ${error.message}`);
    });

    socket.on('progress-room-joined', (data) => {
      console.log('🏠 Joined progress room:', data);
    });
    
    socket.on('cut-progress', (progressData) => {
      console.log('📊 Frontend received progress:', progressData);
      setProgress(progressData);
      if (progressData.percent >= 100) {
        setTimeout(() => setProgress(null), 3000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startProgressSession = useCallback((sessionId) => {
    const socket = socketRef.current;
    console.log('🚀 Starting progress session:', { sessionId, connected: socket?.connected });
    
    if (!socket || !socket.connected) {
      console.log('❌ Cannot start progress session - socket not connected');
      return false;
    }
    
    currentSessionRef.current = sessionId;
    socket.emit('join-progress-room', { sessionId });
    console.log('📡 Emitted join-progress-room for sessionId:', sessionId);
    setProgress(null);
    return true;
  }, []);

  const clearProgress = useCallback(() => {
    console.log('🧹 Clearing progress');
    setProgress(null);
    currentSessionRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  return {
    isConnected, progress, connectionError,
    startProgressSession, clearProgress, reconnect,
    currentSession: currentSessionRef.current,
  };
};

// Legacy progress hook - Không đổi logic cũ
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
    isProcessing, progress, error,
    startProgress, updateProgress, completeProgress, failProgress,
  };
};
