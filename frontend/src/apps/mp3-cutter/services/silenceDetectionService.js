// 🔇 Enhanced Silence Detection Service with WebSocket Support
import { io } from 'socket.io-client';
import { audioApi } from './audioApi';

class SilenceDetectionService {
  constructor() {
    this.socket = null;
    this.currentJobId = null;
    this.progressCallbacks = new Map();
    this.isConnected = false;
  }

  // 🌐 **WEBSOCKET CONNECTION**: Initialize socket connection for real-time updates
  async initializeSocket() {
    if (this.socket && this.isConnected) return;

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      this.socket = io(`${API_BASE_URL}/silence-detection`, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: 3
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('🔌 [SilenceDetectionService] WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('🔌 [SilenceDetectionService] WebSocket disconnected');
      });

      // 📊 **PROGRESS EVENTS**: Handle real-time progress updates
      this.socket.on('silence-progress', (data) => {
        const { jobId, progress, stage, message, timeRemaining } = data;
        const callback = this.progressCallbacks.get(jobId);
        
        if (callback) {
          callback({
            progress: Math.min(100, Math.max(0, progress)),
            stage: stage || 'processing',
            message: message || `Processing... ${progress}%`,
            timeRemaining: timeRemaining || null
          });
        }
      });

      // ✅ **COMPLETION EVENTS**: Handle job completion
      this.socket.on('silence-complete', (data) => {
        const { jobId, result, success } = data;
        const callback = this.progressCallbacks.get(jobId);
        
        if (callback) {
          callback({
            progress: 100,
            stage: 'complete',
            message: success ? 'Processing complete!' : 'Processing failed',
            result: result,
            success: success
          });
          
          // Cleanup
          this.progressCallbacks.delete(jobId);
          if (jobId === this.currentJobId) {
            this.currentJobId = null;
          }
        }
      });

      // ❌ **ERROR EVENTS**: Handle processing errors
      this.socket.on('silence-error', (data) => {
        const { jobId, error, stage } = data;
        const callback = this.progressCallbacks.get(jobId);
        
        if (callback) {
          callback({
            progress: 0,
            stage: 'error',
            message: `Error: ${error}`,
            error: error,
            success: false
          });
          
          // Cleanup
          this.progressCallbacks.delete(jobId);
          if (jobId === this.currentJobId) {
            this.currentJobId = null;
          }
        }
      });

    } catch (error) {
      console.error('❌ [SilenceDetectionService] Socket initialization failed:', error);
      throw new Error('Failed to initialize real-time connection');
    }
  }

  // 🔇 **ENHANCED DETECTION**: Start silence detection with real-time progress
  async detectSilenceWithProgress(params, onProgress) {
    await this.initializeSocket();

    const jobId = `silence_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.currentJobId = jobId;
    
    // Store progress callback
    this.progressCallbacks.set(jobId, onProgress);

    try {
      // 🚀 **START PROCESSING**: Initiate server-side processing
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/mp3-cutter/detect-silence-async/${params.fileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          jobId: jobId,
          enableProgress: true
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Join socket room for this job
        this.socket.emit('join-job', { jobId });
        
        return {
          success: true,
          jobId: jobId,
          message: 'Processing started, progress updates will be sent via WebSocket'
        };
      } else {
        throw new Error(result.error || 'Failed to start processing');
      }

    } catch (error) {
      // Cleanup on error
      this.progressCallbacks.delete(jobId);
      this.currentJobId = null;
      
      console.error('❌ [SilenceDetectionService] Detection failed:', error);
      throw error;
    }
  }

  // 🛑 **CANCEL PROCESSING**: Cancel current detection job
  async cancelDetection() {
    if (!this.currentJobId || !this.socket) return false;

    try {
      this.socket.emit('cancel-job', { jobId: this.currentJobId });
      
      // Also try to cancel via HTTP API as fallback
      await fetch(`${process.env.REACT_APP_API_URL}/api/mp3-cutter/cancel-silence/${this.currentJobId}`, {
        method: 'POST'
      });

      // Cleanup
      this.progressCallbacks.delete(this.currentJobId);
      this.currentJobId = null;
      
      return true;
    } catch (error) {
      console.error('❌ [SilenceDetectionService] Cancel failed:', error);
      return false;
    }
  }

  // 🧹 **CLEANUP**: Disconnect and cleanup resources
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.progressCallbacks.clear();
    this.currentJobId = null;
    this.isConnected = false;
  }

  // 📊 **STATUS CHECK**: Get current processing status
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasActiveJob: !!this.currentJobId,
      currentJobId: this.currentJobId,
      activeJobs: Array.from(this.progressCallbacks.keys())
    };
  }
}

// Export singleton instance
export const silenceDetectionService = new SilenceDetectionService();
export default SilenceDetectionService;
