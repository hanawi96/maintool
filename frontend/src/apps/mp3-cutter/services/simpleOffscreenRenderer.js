// 🎨 **SIMPLE OFFSCREEN RENDERER** - Lightweight background rendering
export class SimpleOffscreenRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isOffscreenSupported = typeof OffscreenCanvas !== 'undefined';
    this.isInitialized = false;
  }

  // 🚀 **INITIALIZE**: Setup renderer
  async initialize(width = 800, height = 200) {
    if (this.isOffscreenSupported) {
      this.canvas = new OffscreenCanvas(width, height);
      this.ctx = this.canvas.getContext('2d');
      console.log('🎨 [OffscreenRenderer] Using OffscreenCanvas');
    } else {
      // Fallback to regular canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx = this.canvas.getContext('2d');
      console.log('🎨 [OffscreenRenderer] Using regular Canvas fallback');
    }
    
    this.isInitialized = true;
    return this.ctx;
  }

  // 🎯 **RENDER WAVEFORM**: Fast waveform rendering
  async renderWaveform(waveformData, options = {}) {
    if (!this.isInitialized) {
      await this.initialize(options.width, options.height);
    }

    const {
      width = 800,
      height = 200,
      color = '#3b82f6',
      backgroundColor = '#f8fafc',
      barWidth = 2,
      gap = 1
    } = options;

    // Ensure canvas size
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const ctx = this.ctx;
    const centerY = height / 2;
    const maxBarHeight = height * 0.8;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    ctx.fillStyle = color;
    
    const totalBars = Math.floor(width / (barWidth + gap));
    const step = waveformData.length / totalBars;

    for (let i = 0; i < totalBars; i++) {
      const dataIndex = Math.floor(i * step);
      const amplitude = waveformData[dataIndex] || 0;
      const barHeight = amplitude * maxBarHeight;
      
      const x = i * (barWidth + gap);
      const y = centerY - barHeight / 2;
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Return canvas for main thread
    if (this.isOffscreenSupported) {
      return this.canvas.transferToImageBitmap();
    } else {
      return this.canvas;
    }
  }

  // 🧹 **CLEANUP**: Clean up resources
  dispose() {
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
  }
}
