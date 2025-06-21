// server.js (Ultra Light Version with WebSocket Support)
import app from './app.js';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = process.env.PORT || 3001;

// 🚀 **CREATE HTTP SERVER**: Tạo HTTP server để tích hợp WebSocket
const httpServer = createServer(app);

// 🔌 **WEBSOCKET SERVER**: Initialize Socket.IO với CORS config
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 🔌 **WEBSOCKET CONNECTION HANDLER**
io.on('connection', (socket) => {
  console.log('🔌 New WebSocket connection:', socket.id);
  
  // 📊 **PROGRESS ROOM**: Client tham gia room để nhận progress updates
  socket.on('join-progress-room', (data) => {
    const { sessionId } = data;
    const roomName = `progress-${sessionId}`;
    socket.join(roomName);
    
    console.log(`🏠 Socket ${socket.id} joined room: ${roomName}`);
    
    // Xác nhận join room
    socket.emit('progress-room-joined', { sessionId, status: 'connected', roomName });
  });
  
  // 🔌 **DISCONNECT HANDLER**
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected:', socket.id);
  });
});

// 🌐 **EXPORT IO**: Export io instance để các module khác sử dụng
global.io = io;

// Create storage directories
['storage/mp3-cutter/uploads', 'storage/mp3-cutter/processed', 'storage/mp3-cutter/temp'].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// 🚀 **START SERVER**: Start HTTP server thay vì app.listen()
httpServer.listen(PORT, () => {
  console.log(`🎵 MP3 Cutter running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/mp3-cutter`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT} (Socket.IO)`);
});

process.on('SIGTERM', () => process.exit(0));