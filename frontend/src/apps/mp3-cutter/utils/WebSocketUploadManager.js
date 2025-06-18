/**
 * WebSocket Upload Progress Manager
 * Provides real-time upload progress tracking for cloud uploads
 */

class WebSocketUploadManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.eventListeners = new Map(); // Add event listener system
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
  }

  // Event system methods
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
      if (this.eventListeners.get(event).size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Initialize WebSocket connection
  connect(serverUrl = 'ws://localhost:3001') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${serverUrl}/upload-progress`);
        
        // Connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          console.log('WebSocket connected for upload progress');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }
  // Handle incoming WebSocket messages
  handleMessage(data) {
    switch (data.type) {
      case 'upload_progress':
        this.notifySubscribers('progress', data);
        this.emit('uploadProgress', data);
        break;
      case 'upload_complete':
        this.notifySubscribers('complete', data);
        this.emit('uploadComplete', data);
        break;
      case 'upload_error':
        this.notifySubscribers('error', data);
        this.emit('uploadError', data);
        break;
      case 'upload_cancelled':
        this.notifySubscribers('cancelled', data);
        this.emit('uploadCancelled', data);
        break;
      case 'heartbeat':
        // Respond to server heartbeat
        this.send({ type: 'heartbeat_response' });
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  // Subscribe to upload progress updates
  subscribe(uploadId, callback) {
    if (!this.subscribers.has(uploadId)) {
      this.subscribers.set(uploadId, new Set());
    }
    this.subscribers.get(uploadId).add(callback);

    // Request current progress for this upload
    this.send({
      type: 'subscribe_upload',
      uploadId
    });

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(uploadId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(uploadId);
          this.send({
            type: 'unsubscribe_upload',
            uploadId
          });
        }
      }
    };
  }

  // Notify all subscribers of an event
  notifySubscribers(eventType, data) {
    const uploadId = data.uploadId;
    const callbacks = this.subscribers.get(uploadId);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(eventType, data);
        } catch (error) {
          console.error('Error in upload progress callback:', error);
        }
      });
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

  // Start heartbeat to keep connection alive
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.send({ type: 'heartbeat' })) {
        this.stopHeartbeat();
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Schedule reconnection attempt
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('WebSocket reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Start tracking an upload
  startUploadTracking(uploadId, metadata = {}) {
    this.send({
      type: 'start_tracking',
      uploadId,
      metadata
    });
  }

  // Cancel an upload
  cancelUpload(uploadId) {
    this.send({
      type: 'cancel_upload',
      uploadId
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect WebSocket
  disconnect() {
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.subscribers.clear();
  }

  // Clean up resources
  destroy() {
    this.disconnect();
    this.subscribers.clear();
  }
}

// Create singleton instance
const webSocketUploadManager = new WebSocketUploadManager();

// Auto-connect in browser environment - DISABLED for now
if (typeof window !== 'undefined') {
  // WebSocket auto-connection disabled until backend WebSocket server is implemented
  // webSocketUploadManager.connect().catch(error => {
  //   console.warn('Initial WebSocket connection failed:', error.message);
  // });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    webSocketUploadManager.disconnect();
  });
}

export default webSocketUploadManager;
