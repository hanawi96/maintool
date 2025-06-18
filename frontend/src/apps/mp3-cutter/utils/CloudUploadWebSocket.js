/**
 * WebSocket Manager for Real-time Upload Progress
 * Provides real-time communication for upload progress and status updates
 */

class CloudUploadWebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.uploadSessions = new Map();
    this.isConnected = false;
    this.heartbeatInterval = null;
  }

  // Initialize WebSocket connection
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:3001/ws/cloud-upload'
        : `wss://${window.location.host}/ws/cloud-upload`;

      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('Cloud upload WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('Cloud upload WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('Cloud upload WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming messages
  handleMessage(data) {
    const { type, uploadId, sessionId, ...payload } = data;

    switch (type) {
      case 'upload_progress':
        this.emit('uploadProgress', {
          uploadId,
          sessionId,
          progress: payload.progress,
          uploaded: payload.uploaded,
          total: payload.total,
          speed: payload.speed,
          eta: payload.eta
        });
        break;

      case 'upload_complete':
        this.emit('uploadComplete', {
          uploadId,
          sessionId,
          result: payload.result,
          duration: payload.duration
        });
        this.uploadSessions.delete(uploadId);
        break;

      case 'upload_error':
        this.emit('uploadError', {
          uploadId,
          sessionId,
          error: payload.error,
          retryable: payload.retryable
        });
        this.uploadSessions.delete(uploadId);
        break;

      case 'upload_started':
        this.uploadSessions.set(uploadId, {
          sessionId,
          startTime: Date.now(),
          service: payload.service
        });
        this.emit('uploadStarted', { uploadId, sessionId, service: payload.service });
        break;

      case 'upload_cancelled':
        this.emit('uploadCancelled', { uploadId, sessionId });
        this.uploadSessions.delete(uploadId);
        break;

      case 'connection_status':
        this.emit('connectionStatus', {
          service: payload.service,
          connected: payload.connected,
          error: payload.error
        });
        break;

      case 'heartbeat':
        // Respond to server heartbeat
        this.send({ type: 'heartbeat_response', timestamp: Date.now() });
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  // Send message to server
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Start upload session
  startUpload(uploadId, sessionId, serviceId, metadata) {
    const success = this.send({
      type: 'start_upload',
      uploadId,
      sessionId,
      serviceId,
      metadata
    });

    if (success) {
      this.uploadSessions.set(uploadId, {
        sessionId,
        serviceId,
        startTime: Date.now(),
        metadata
      });
    }

    return success;
  }

  // Cancel upload
  cancelUpload(uploadId) {
    const session = this.uploadSessions.get(uploadId);
    if (session) {
      this.send({
        type: 'cancel_upload',
        uploadId,
        sessionId: session.sessionId
      });
    }
  }

  // Subscribe to connection status for a service
  subscribeToService(serviceId, sessionId) {
    this.send({
      type: 'subscribe_service',
      serviceId,
      sessionId
    });
  }

  // Unsubscribe from service updates
  unsubscribeFromService(serviceId, sessionId) {
    this.send({
      type: 'unsubscribe_service',
      serviceId,
      sessionId
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  // Heartbeat management
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // 30 second heartbeat
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Reconnection logic
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Get current connection status
  getStatus() {
    return {
      connected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts,
      activeUploads: Array.from(this.uploadSessions.keys())
    };
  }

  // Close connection
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.isConnected = false;
    this.uploadSessions.clear();
    this.listeners.clear();
  }

  // Get active uploads
  getActiveUploads() {
    return Array.from(this.uploadSessions.entries()).map(([uploadId, session]) => ({
      uploadId,
      ...session,
      duration: Date.now() - session.startTime
    }));
  }
}

// Singleton instance
let wsManager = null;

export const getWebSocketManager = () => {
  if (!wsManager) {
    wsManager = new CloudUploadWebSocketManager();
  }
  return wsManager;
};

export default CloudUploadWebSocketManager;
