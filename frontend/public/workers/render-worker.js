// 🎨 **RENDER WORKER** - Dedicated rendering worker for OffscreenCanvas
// filepath: d:\mp3-cutter-pro\frontend\public\workers\render-worker.js

class RenderWorker {
  constructor() {
    this.renderQueue = [];
  }

  // 🎨 **RENDER WAVEFORM**: Main rendering function
  async renderWaveform(id, renderData) {
    try {
      const {
        waveformData,
        width,
        height,
        volume,
        startTime,
        endTime,
        duration,
        fadeIn,
        fadeOut,
        isInverted,
        style
      } = renderData;

      // Create OffscreenCanvas for rendering
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // 🔧 **PERFORMANCE SETUP**
      ctx.imageSmoothingEnabled = false;
      
      // 🎯 **CLEAR CANVAS**
      ctx.clearRect(0, 0, width, height);
      
      // 🎨 **BACKGROUND GRADIENT**
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);      // 🌊 **RENDER WAVEFORM BARS**
      await this.renderWaveformBars(ctx, renderData);
      
      // 🎯 **RENDER SELECTION OVERLAY** 
      this.renderSelectionOverlay(ctx, renderData);

      // Send result back
      self.postMessage({
        type: 'render-complete',
        id,
        result: {
          canvas: canvas.transferToImageBitmap(),
          processingTime: performance.now()
        }
      });

    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message
      });
    }
  }

  // 🌊 **RENDER WAVEFORM BARS**: Core bar rendering
  async renderWaveformBars(ctx, renderData) {
    const { waveformData, width, height, volume, startTime, endTime, duration, isInverted } = renderData;
    const centerY = height / 2;
    const barWidth = width / waveformData.length;

    // 🎯 **VOLUME SYSTEM**: Simple volume scaling
    const baseHeight = 2;
    const maxHeight = height * 0.8;
    const volumeMultiplier = Math.max(0, Math.min(1, volume));

    for (let i = 0; i < waveformData.length; i++) {
      const value = waveformData[i];
      const barTime = (i / waveformData.length) * duration;
      
      // 🎨 **BAR HEIGHT CALCULATION**
      const rawHeight = baseHeight + (value * maxHeight * volumeMultiplier);
      const barHeight = Math.max(1, rawHeight);      
      // 🆕 **INVERT SELECTION LOGIC**
      const isInSelection = barTime >= startTime && barTime <= endTime;
      const shouldBeActive = isInverted ? !isInSelection : isInSelection;
      
      ctx.fillStyle = shouldBeActive ? '#7c3aed' : '#e2e8f0'; // Màu xám nhạt hơn từ #cbd5e1 thành #e2e8f0
      
      const x = i * barWidth;
      ctx.fillRect(Math.floor(x), centerY - barHeight/2, Math.max(1, barWidth - 0.5), barHeight);
    }
  }

  // 🎯 **RENDER SELECTION OVERLAY**: Selection highlight
  renderSelectionOverlay(ctx, renderData) {
    const { width, height, startTime, endTime, duration } = renderData;
    
    if (startTime < endTime && duration > 0) {
      const startPercent = startTime / duration;
      const endPercent = endTime / duration;
      const startX = startPercent * width;
      const endX = endPercent * width;
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }
  }
}

// 🎯 **WORKER MESSAGE HANDLER**
const renderWorker = new RenderWorker();

self.onmessage = async function(e) {
  const { type, id, data } = e.data;
    try {
    switch (type) {
      case 'render-waveform':
        await renderWorker.renderWaveform(id, data);
        break;
        
      default:
        // Unknown message type - silently ignore
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message,
      stack: error.stack
    });
  }
};