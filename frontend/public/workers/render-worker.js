// 🚀 Fast, lightweight OffscreenCanvas waveform renderer worker

self.onmessage = function(e) {
  const { type, id, data } = e.data;
  try {
    if (type === 'render-waveform') {
      const { canvasBitmap, timeMs } = renderWaveform(data);
      self.postMessage({ type: 'render-complete', id, result: { canvas: canvasBitmap, processingTime: timeMs } });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, error: error.message, stack: error.stack });
  }
};

// ---- Main render logic ----

function renderWaveform(renderData) {
  const t0 = performance.now();
  const { waveformData, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted } = renderData;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;

  // --- Background gradient ---
  ctx.clearRect(0, 0, width, height);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(99,102,241,0.04)');
  grad.addColorStop(1, 'rgba(168,85,247,0.04)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // --- Render waveform bars ---
  drawBars(ctx, waveformData, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted);

  // --- Render selection overlay ---
  if (startTime < endTime && duration > 0) {
    ctx.fillStyle = 'rgba(139,92,246,0.15)';
    const sx = (startTime / duration) * width;
    const ex = (endTime / duration) * width;
    ctx.fillRect(sx, 0, ex - sx, height);
  }

  return { canvasBitmap: canvas.transferToImageBitmap(), timeMs: performance.now() - t0 };
}

// ---- Draw bars (main waveform) ----

function getWaveformColor(volume) {
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
}

function interpolateColor(color1, color2, ratio) {
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
}

function drawBars(ctx, data, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted) {
  const centerY = height / 2;
  const maxHeightTotal = height * 0.45; // 45% total canvas height
  const barCount = data.length, barWidth = width / barCount;
  let lastFill = null;

  for (let i = 0; i < barCount; i++) {
    const value = data[i];
    const barTime = (i / barCount) * duration;
    let rawHeight = Math.max(1, volume * maxHeightTotal * value);
    
    const fadeMul = getFadeMul(i, barTime, barCount, duration, startTime, endTime, fadeIn, fadeOut, isInverted);
    const baseFadeHeight = Math.max(1, volume * maxHeightTotal * value);
    rawHeight = Math.max(1, baseFadeHeight * fadeMul);

    // Selection logic (invert mode = outside region, else = inside)
    let sel = isInverted ? (barTime < startTime || barTime > endTime) : (barTime >= startTime && barTime <= endTime);
    const color = sel ? getWaveformColor(volume) : '#e2e8f0';
    if (color !== lastFill) ctx.fillStyle = lastFill = color;

    const x = i * barWidth;
    ctx.fillRect(Math.floor(x), centerY - rawHeight/2, Math.max(1, barWidth - 0.5), rawHeight);
  }
}

// ---- Fade calculation helper ----

// Helper: clamp fade duration to maximum 50% of region duration
function clampFadeDuration(fadeValue, regionDuration) {
  if (regionDuration <= 0) return 0;
  const maxFade = regionDuration * 0.5;
  return Math.min(fadeValue, maxFade);
}

function getFadeMul(i, barTime, barCount, duration, startTime, endTime, fadeIn, fadeOut, isInverted) {
  if (!fadeIn && !fadeOut) return 1;
  if (isInverted) {
    // Clamp fade durations to available space
    const clampedFadeIn = clampFadeDuration(fadeIn, startTime);
    const clampedFadeOut = clampFadeDuration(fadeOut, duration - endTime);
    
    let mul = 1;
    // FadeIn: region [0, startTime]
    if (clampedFadeIn > 0 && barTime < startTime) {
      const dur = Math.min(clampedFadeIn, startTime);
      if (dur > 0 && barTime <= dur) {
        mul = Math.max(0.05, barTime / dur);
      }
    }
    // FadeOut: region [endTime, duration]
    if (clampedFadeOut > 0 && barTime >= endTime) {
      const dur = Math.min(clampedFadeOut, duration - endTime);
      const fadeStart = duration - dur;
      if (dur > 0 && barTime >= fadeStart) {
        mul = Math.max(0.05, (duration - barTime) / dur);
      }
    }
    return mul;
  } else {
    // Normal mode: fade inside [startTime, endTime] - clamp to 50% of selection duration
    const selDur = endTime - startTime;
    if (selDur <= 0) return 1;
    
    const clampedFadeIn = clampFadeDuration(fadeIn, selDur);
    const clampedFadeOut = clampFadeDuration(fadeOut, selDur);
    
    const relPos = (barTime - startTime) / selDur;
    let mul = 1;
    // FadeIn
    if (clampedFadeIn > 0 && relPos < clampedFadeIn / selDur) {
      mul *= Math.max(0.05, relPos / (clampedFadeIn / selDur));
    }
    // FadeOut
    if (clampedFadeOut > 0 && relPos > 1 - clampedFadeOut / selDur) {
      mul *= Math.max(0.05, (1 - relPos) / (clampedFadeOut / selDur));
    }
    return mul;
  }
}
