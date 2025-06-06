const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Helper function to clean up old files
const cleanupOldFiles = () => {
  const cleanupDir = (dir) => {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > oneHour) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    });
  };

  cleanupDir(uploadsDir);
  cleanupDir(outputsDir);
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Routes

// Upload and get audio info
app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const filePath = req.file.path;
  
  // Get audio metadata using ffprobe
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      console.error('Error getting metadata:', err);
      return res.status(500).json({ error: 'Failed to process audio file' });
    }

    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
    
    if (!audioStream) {
      return res.status(400).json({ error: 'No audio stream found in file' });
    }

    res.json({
      success: true,
      fileId: path.basename(filePath, path.extname(filePath)),
      filename: req.file.originalname,
      duration: parseFloat(audioStream.duration),
      format: audioStream.codec_name,
      sampleRate: audioStream.sample_rate,
      channels: audioStream.channels,
      bitrate: audioStream.bit_rate
    });
  });
});

// Cut audio endpoint
app.post('/api/cut', async (req, res) => {
  try {
    const {
      fileId,
      startTime,
      endTime,
      outputFormat = 'mp3',
      fadeIn = 0,
      fadeOut = 0,
      quality = 'high'
    } = req.body;

    if (!fileId || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Find the input file
    const inputFiles = fs.readdirSync(uploadsDir).filter(file => 
      file.startsWith(fileId)
    );

    if (inputFiles.length === 0) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    const inputPath = path.join(uploadsDir, inputFiles[0]);
    const outputFileName = `${uuidv4()}.${outputFormat}`;
    const outputPath = path.join(outputsDir, outputFileName);

    // Calculate duration
    const duration = endTime - startTime;

    if (duration <= 0) {
      return res.status(400).json({ error: 'Invalid time range' });
    }

    // FFmpeg command builder
    let command = ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration);

    // Set quality based on format
    switch (outputFormat.toLowerCase()) {
      case 'mp3':
        const mp3Bitrate = quality === 'high' ? '320k' : quality === 'medium' ? '192k' : '128k';
        command = command.audioBitrate(mp3Bitrate).audioCodec('libmp3lame');
        break;
      case 'wav':
        command = command.audioCodec('pcm_s16le');
        break;
      case 'm4a':
        const aacBitrate = quality === 'high' ? '256k' : quality === 'medium' ? '128k' : '96k';
        command = command.audioBitrate(aacBitrate).audioCodec('aac');
        break;
      case 'ogg':
        const oggQuality = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
        command = command.audioCodec('libvorbis').audioQuality(oggQuality);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported output format' });
    }

    // Add fade effects if specified
    const filters = [];
    
    if (fadeIn > 0) {
      filters.push(`afade=t=in:ss=0:d=${fadeIn}`);
    }
    
    if (fadeOut > 0) {
      filters.push(`afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`);
    }
    
    if (filters.length > 0) {
      command = command.audioFilters(filters);
    }

    // Execute the cutting operation
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg started with command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing progress:', progress.percent, '%');
      })
      .on('end', () => {
        console.log('Audio cutting completed successfully');
        
        // Get file stats
        const stats = fs.statSync(outputPath);
        
        res.json({
          success: true,
          outputFile: outputFileName,
          downloadUrl: `/api/download/${outputFileName}`,
          fileSize: stats.size,
          duration: duration,
          format: outputFormat
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        res.status(500).json({ 
          error: 'Failed to process audio',
          details: err.message 
        });
      })
      .save(outputPath);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Download processed file
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set appropriate headers
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg'
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (err) => {
    console.error('File stream error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MP3 Cutter Backend running on port ${PORT}`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  
  // Initial cleanup
  cleanupOldFiles();
});

module.exports = app;