import { WAVEFORM_CONFIG } from './constants';

// Fade effects calculator
export const calculateFadeMultiplier = (barTime, selectionStart, selectionEnd, fadeInDuration, fadeOutDuration, isInverted = false, duration = 0) => {
  if (isInverted) {
    // 🆕 **INVERT MODE**: Silence region has absolute priority
    if (barTime >= selectionStart && barTime <= selectionEnd) {
      return 0.05; // Silence region - no fade effects apply here
    }
    
    // 🔥 **FADE EFFECTS FOR ACTIVE REGIONS**: Apply to regions before startTime and after endTime
    if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
    
    let fadeMultiplier = 1.0;
    
    // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to selectionStart)
    if (fadeInDuration > 0 && barTime < selectionStart) {
      const activeRegionDuration = selectionStart; // From 0 to selectionStart
      const fadeInEnd = Math.min(fadeInDuration, activeRegionDuration);
      
      if (barTime <= fadeInEnd) {
        const fadeProgress = barTime / fadeInEnd;
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // 🔥 **FADE OUT - SECOND ACTIVE REGION** (selectionEnd to duration)
    if (fadeOutDuration > 0 && barTime >= selectionEnd) {
      const activeRegionDuration = duration - selectionEnd; // From selectionEnd to duration
      const actualFadeOutDuration = Math.min(fadeOutDuration, activeRegionDuration);
      const fadeOutStart = duration - actualFadeOutDuration; // Fade at the END of this region
      
      if (barTime >= fadeOutStart) {
        const fadeProgress = (duration - barTime) / actualFadeOutDuration;
        fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
      }
    }
    
    return Math.max(0.05, Math.min(1.0, fadeMultiplier));
  } else {
    // 🎯 **NORMAL MODE**: Original logic
    if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
    if (barTime < selectionStart || barTime > selectionEnd) return 1.0;
    
    let fadeMultiplier = 1.0;
    const selectionDuration = selectionEnd - selectionStart;
    
    // Fade in effect
    if (fadeInDuration > 0) {
      const fadeInEnd = selectionStart + Math.min(fadeInDuration, selectionDuration / 2);
      if (barTime <= fadeInEnd) {
        const fadeProgress = Math.max(0, (barTime - selectionStart) / fadeInDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // Fade out effect
    if (fadeOutDuration > 0) {
      const fadeOutStart = selectionEnd - Math.min(fadeOutDuration, selectionDuration / 2);
      if (barTime >= fadeOutStart) {
        const fadeProgress = Math.max(0, (selectionEnd - barTime) / fadeOutDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    return Math.max(0.05, Math.min(1.0, fadeMultiplier));
  }
};

// Adaptive waveform data processing
export const processAdaptiveWaveformData = (waveformData, canvasWidth) => {
  if (!waveformData.length || !canvasWidth) return [];
  
  const { SAMPLING_RULES } = WAVEFORM_CONFIG.RESPONSIVE;
  let rule;
  
  if (canvasWidth <= SAMPLING_RULES.SMALL.maxWidth) {
    rule = SAMPLING_RULES.SMALL;
  } else if (canvasWidth <= SAMPLING_RULES.MEDIUM.maxWidth) {
    rule = SAMPLING_RULES.MEDIUM;  
  } else {
    rule = SAMPLING_RULES.LARGE;
  }
  
  const targetSamples = Math.max(100, Math.floor(canvasWidth * rule.samplesPerPx));
  const finalSamples = Math.min(waveformData.length, targetSamples);
  
  if (waveformData.length > finalSamples) {
    const step = waveformData.length / finalSamples;
    const adaptedData = [];
    
    for (let i = 0; i < finalSamples; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), waveformData.length);
      
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += waveformData[j];
        count++;
      }
      adaptedData.push(count > 0 ? sum / count : 0);
    }
    
    return adaptedData;
  }
  
  return waveformData;
};

// Performance measurement utilities
export const measureRenderTime = (renderFunction) => {
  const startTime = performance.now();
  const result = renderFunction();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration > WAVEFORM_CONFIG.PERFORMANCE.NORMAL_RENDER) {
    console.warn(`🐌 [Performance] SLOW render: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

// Throttling utility
export const createThrottledFunction = (fn, interval) => {
  let lastCall = 0;
  return (...args) => {
    const now = performance.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
};