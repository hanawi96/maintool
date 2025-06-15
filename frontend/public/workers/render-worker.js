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

function drawBars(ctx, data, width, height, volume, startTime, endTime, duration, fadeIn, fadeOut, isInverted) {
  const centerY = height / 2, baseHeight = 2, maxHeight = height * 0.8;
  const barCount = data.length, barWidth = width / barCount;
  const vMul = Math.max(0, Math.min(1, volume));
  let lastFill = null;

  for (let i = 0; i < barCount; i++) {
    const value = data[i];
    const barTime = (i / barCount) * duration;
    let rawHeight = baseHeight + (value * maxHeight * vMul);
    const fadeMul = getFadeMul(i, barTime, barCount, duration, startTime, endTime, fadeIn, fadeOut, isInverted);
    rawHeight = baseHeight + (rawHeight - baseHeight) * fadeMul;
    const barHeight = Math.max(1, rawHeight);

    // Selection logic (invert mode = outside region, else = inside)
    let sel = isInverted ? (barTime < startTime || barTime > endTime) : (barTime >= startTime && barTime <= endTime);
    const color = sel ? '#7c3aed' : '#e2e8f0';
    if (color !== lastFill) ctx.fillStyle = lastFill = color;

    const x = i * barWidth;
    ctx.fillRect(Math.floor(x), centerY - barHeight/2, Math.max(1, barWidth - 0.5), barHeight);
  }
}

// ---- Fade calculation helper ----

function getFadeMul(i, barTime, barCount, duration, startTime, endTime, fadeIn, fadeOut, isInverted) {
  if (!fadeIn && !fadeOut) return 1;
  if (isInverted) {
    let mul = 1;
    // FadeIn: region [0, startTime]
    if (fadeIn > 0 && barTime < startTime) {
      const dur = Math.min(fadeIn, startTime);
      if (dur > 0 && barTime <= dur) {
        mul = Math.max(0.05, barTime / dur);
      }
    }
    // FadeOut: region [endTime, duration]
    if (fadeOut > 0 && barTime >= endTime) {
      const dur = Math.min(fadeOut, duration - endTime);
      const fadeStart = duration - dur;
      if (dur > 0 && barTime >= fadeStart) {
        mul = Math.max(0.05, (duration - barTime) / dur);
      }
    }
    return mul;
  } else {
    // Normal mode: fade inside [startTime, endTime]
    const selDur = endTime - startTime;
    if (selDur <= 0) return 1;
    const relPos = (barTime - startTime) / selDur;
    let mul = 1;
    // FadeIn
    if (fadeIn > 0 && relPos < fadeIn / selDur) {
      mul *= Math.max(0.05, relPos / (fadeIn / selDur));
    }
    // FadeOut
    if (fadeOut > 0 && relPos > 1 - fadeOut / selDur) {
      mul *= Math.max(0.05, (1 - relPos) / (fadeOut / selDur));
    }
    return mul;
  }
}
