// 🎨 OFFSCREEN CANVAS RENDERER (Optimized)
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\offscreenRenderer.js

import { WAVEFORM_CONFIG } from '../utils/constants';

// Helper: get waveform color based on volume level with smooth transitions
const getWaveformColor = (volume) => {
  const volumePercent = volume * 100;
  
  if (volumePercent <= 100) {
    return '#7c3aed'; // Purple for 0-100%
  } else if (volumePercent <= 150) {
    // Smooth transition from purple to orange (101-150%)
    const ratio = (volumePercent - 100) / 50;
    return interpolateColor('#7c3aed', '#f97316', ratio);
  } else {
    // Smooth transition from orange to red (151-200%)
    const ratio = Math.min((volumePercent - 150) / 50, 1);
    return interpolateColor('#f97316', '#ef4444', ratio);
  }
};

// Helper: interpolate between two hex colors
const interpolateColor = (color1, color2, ratio) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export class OffscreenWaveformRenderer {
  constructor() {
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderWorker = null;
    this.renderQueue = new Map();
    this.isInitialized = false;
    this._fallback = false;
    this.initialize();
  }

  async initialize() {
    try {
      if (typeof OffscreenCanvas === 'undefined') {
        this._fallback = true;
        return;
      }
      this.offscreenCanvas = new OffscreenCanvas(800, WAVEFORM_CONFIG.HEIGHT);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      this.offscreenCtx.imageSmoothingEnabled = false;
      this.offscreenCtx.textBaseline = 'middle';

      if (window.Worker) {
        try {
          this.renderWorker = new Worker('/workers/render-worker.js');
          this.renderWorker.onmessage = this._handleWorkerMessage.bind(this);
          this.renderWorker.onerror = this._handleWorkerError.bind(this);
        } catch {
          this._fallback = true;
        }
      }
      this.isInitialized = true;
    } catch {
      this._fallback = true;
    }
  }

  async renderWaveformBackground(waveformData, options = {}) {
    if (!this.isInitialized || this._fallback)
      return this.renderWaveformMainThread(waveformData, options);

    const width = options.width || 800;
    const height = options.height || WAVEFORM_CONFIG.HEIGHT;
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }

    const renderId = Date.now() + Math.random();
    const renderData = {
      waveformData,
      width,
      height,
      volume: options.volume ?? 1,
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 100,
      duration: options.duration ?? 100,
      fadeIn: options.fadeIn ?? 0,
      fadeOut: options.fadeOut ?? 0,      isInverted: options.isInverted ?? false,
      style: {
        backgroundColor: options.backgroundColor ?? 'transparent',
        waveformColor: options.waveformColor ?? getWaveformColor(options.volume ?? 1),
        selectionColor: options.selectionColor ?? 'rgba(139, 92, 246, 0.15)'
      }
    };

    return new Promise((resolve, reject) => {
      try {
        if (this.renderWorker) {
          this.renderWorker.postMessage(
            { type: 'render-waveform', id: renderId, data: renderData, canvas: this.offscreenCanvas },
            [this.offscreenCanvas]
          );
          this.renderQueue.set(renderId, { resolve, reject });
        } else {
          this.executeRender(renderData).then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async renderWaveformMainThread(waveformData, options = {}) {
    const width = options.width || 800;
    const height = options.height || WAVEFORM_CONFIG.HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    await this.executeRender({
      waveformData,
      width,
      height,
      volume: options.volume ?? 1,
      startTime: options.startTime ?? 0,
      endTime: options.endTime ?? 100,
      duration: options.duration ?? 100,
      fadeIn: options.fadeIn ?? 0,
      fadeOut: options.fadeOut ?? 0,
      isInverted: options.isInverted ?? false,      style: {
        backgroundColor: options.backgroundColor ?? 'transparent',
        waveformColor: options.waveformColor ?? getWaveformColor(options.volume ?? 1),
        selectionColor: options.selectionColor ?? 'rgba(139, 92, 246, 0.15)'
      }
    }, ctx);

    return canvas;
  }

  calculateFadeMultiplier(time, startTime, endTime, fadeIn, fadeOut, duration, isInverted) {
    if (!fadeIn && !fadeOut) return 1;
    
    if (isInverted) {
      let multiplier = 1;
      if (fadeIn > 0 && time < startTime) {
        const fadeInDur = Math.min(fadeIn, startTime);
        if (time <= fadeInDur) multiplier = Math.max(0.05, time / fadeInDur);
      }
      if (fadeOut > 0 && time >= endTime) {
        const fadeOutDur = Math.min(fadeOut, duration - endTime);
        const fadeStart = duration - fadeOutDur;
        if (time >= fadeStart) multiplier = Math.max(0.05, (duration - time) / fadeOutDur);
      }
      return multiplier;
    } else {
      const rel = (time - startTime) / (endTime - startTime);
      let multiplier = 1;
      if (fadeIn > 0 && rel < fadeIn / (endTime - startTime)) {
        multiplier *= Math.max(0.05, rel / (fadeIn / (endTime - startTime)));
      }
      if (fadeOut > 0 && rel > 1 - fadeOut / (endTime - startTime)) {
        multiplier *= Math.max(0.05, (1 - rel) / (fadeOut / (endTime - startTime)));
      }
      return multiplier;
    }
  }

  async executeRender(renderData, providedCtx = null) {
    const { waveformData, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted, style } = renderData;
    
    let ctx = providedCtx;
    if (!ctx) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    // Background
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Waveform bars
    const centerY = height / 2;
    const maxHeightPerSide = height * 0.225; // 22.5% per side = 45% total
    const barWidth = width / waveformData.length;

    for (let i = 0; i < waveformData.length; i++) {
      const time = (i / waveformData.length) * duration;
      const isSelected = isInverted 
        ? (time < startTime || time > endTime)
        : (time >= startTime && time <= endTime);

      let h = Math.max(1, volume * maxHeightPerSide * waveformData[i]);

      // Apply fade effect
      if ((fadeIn > 0 || fadeOut > 0) && isSelected) {
        const fadeMultiplier = this.calculateFadeMultiplier(time, startTime, endTime, fadeIn, fadeOut, duration, isInverted);
        const baseFadeHeight = Math.max(1, volume * maxHeightPerSide * waveformData[i]);
        h = Math.max(1, baseFadeHeight * fadeMultiplier);
      }

      ctx.fillStyle = isSelected ? style.waveformColor : '#e2e8f0';
      const x = i * barWidth;
      ctx.fillRect(Math.floor(x), centerY - h, barWidth, h * 2);
    }

    // Selection overlay
    if (startTime < endTime && duration > 0) {
      ctx.fillStyle = style.selectionColor;
      const sx = (startTime / duration) * width;
      const ex = (endTime / duration) * width;
      ctx.fillRect(sx, 0, ex - sx, height);
    }

    return providedCtx ? null : ctx.canvas;
  }

  _handleWorkerMessage(e) {
    const { type, id, result, error } = e.data;
    if (error) return;
    if (type === 'render-complete') this._resolveQueue(id, result);
  }

  _handleWorkerError() {
    this._fallback = true;
  }

  _resolveQueue(id, result) {
    const q = this.renderQueue.get(id);
    if (q) {
      q.resolve(result);
      this.renderQueue.delete(id);
    }
  }

  dispose() {
    if (this.renderWorker) {
      this.renderWorker.terminate();
      this.renderWorker = null;
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.renderQueue.clear();
  }
}
