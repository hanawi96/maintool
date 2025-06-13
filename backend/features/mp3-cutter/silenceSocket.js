// 🔇 WebSocket Support for Silence Detection Progress
const { Server } = require('socket.io');
const { MP3Utils } = require('./utils');

class SilenceDetectionSocket {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: '/socket.io'
    });

    this.activeJobs = new Map();
    this.setupNamespace();
  }

  setupNamespace() {
    // Create dedicated namespace for silence detection
    this.silenceNamespace = this.io.of('/silence-detection');
    
    this.silenceNamespace.on('connection', (socket) => {
      console.log('🔌 [SilenceSocket] Client connected:', socket.id);

      // Join job room for progress updates
      socket.on('join-job', ({ jobId }) => {
        socket.join(jobId);
        console.log(`📡 [SilenceSocket] Client joined job room: ${jobId}`);
      });

      // Handle job cancellation
      socket.on('cancel-job', ({ jobId }) => {
        this.cancelJob(jobId);
        console.log(`🛑 [SilenceSocket] Job cancellation requested: ${jobId}`);
      });

      socket.on('disconnect', () => {
        console.log('🔌 [SilenceSocket] Client disconnected:', socket.id);
      });
    });
  }

  // 📊 **EMIT PROGRESS**: Send progress update to specific job
  emitProgress(jobId, progressData) {
    this.silenceNamespace.to(jobId).emit('silence-progress', {
      jobId,
      ...progressData
    });
  }

  // ✅ **EMIT COMPLETION**: Send completion notification
  emitComplete(jobId, result) {
    this.silenceNamespace.to(jobId).emit('silence-complete', {
      jobId,
      result,
      success: true
    });
    
    // Cleanup
    this.activeJobs.delete(jobId);
  }

  // ❌ **EMIT ERROR**: Send error notification
  emitError(jobId, error, stage = 'processing') {
    this.silenceNamespace.to(jobId).emit('silence-error', {
      jobId,
      error: error.message || error,
      stage,
      success: false
    });
    
    // Cleanup
    this.activeJobs.delete(jobId);
  }

  // 🛑 **CANCEL JOB**: Cancel active processing job
  cancelJob(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    if (jobInfo) {
      jobInfo.cancelled = true;
      this.activeJobs.set(jobId, jobInfo);
      
      // Emit cancellation
      this.silenceNamespace.to(jobId).emit('silence-cancelled', {
        jobId,
        message: 'Processing cancelled by user'
      });
    }
  }

  // 📝 **REGISTER JOB**: Register new processing job
  registerJob(jobId, jobInfo) {
    this.activeJobs.set(jobId, {
      ...jobInfo,
      startTime: Date.now(),
      cancelled: false
    });
  }

  // 🔍 **CHECK CANCELLATION**: Check if job was cancelled
  isJobCancelled(jobId) {
    const jobInfo = this.activeJobs.get(jobId);
    return jobInfo ? jobInfo.cancelled : false;
  }

  // 📊 **GET STATS**: Get active jobs statistics
  getStats() {
    return {
      activeJobs: this.activeJobs.size,
      connectedClients: this.silenceNamespace.sockets.size,
      jobs: Array.from(this.activeJobs.keys())
    };
  }
}

module.exports = { SilenceDetectionSocket };
