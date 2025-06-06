// server.js (Ultra Light Version - 15 lines)
import app from './app.js';
import fs from 'fs';

const PORT = process.env.PORT || 3001;

// Create storage directories
['storage/mp3-cutter/uploads', 'storage/mp3-cutter/processed', 'storage/mp3-cutter/temp'].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 MP3 Cutter running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/mp3-cutter`);
});

process.on('SIGTERM', () => process.exit(0));