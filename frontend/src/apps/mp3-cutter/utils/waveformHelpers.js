import { WAVEFORM_CONFIG } from './constants';

// 🎯 **CALCULATE FADE MULTIPLIER**: Calculate fade effect multiplier for a bar position
export const calculateFadeMultiplier = (barIndex, totalBars, startTime, endTime, fadeIn, fadeOut, duration, isInverted = false) => {
  if (!fadeIn && !fadeOut) return 1;
  
  const barTimePosition = (barIndex / totalBars) * duration;
  
  // 🆕 **INVERT MODE**: Different fade logic for inverted selection
  if (isInverted) {
    let fadeMultiplier = 1;
    
    // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to startTime)
    if (fadeIn > 0 && barTimePosition < startTime) {
      const activeRegionDuration = startTime;
      const fadeInDuration = Math.min(fadeIn, activeRegionDuration);
      
      if (barTimePosition <= fadeInDuration) {
        const fadeProgress = barTimePosition / fadeInDuration;
        fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
      }
    }
    
    // 🔥 **FADE OUT - SECOND ACTIVE REGION** (endTime to duration)
    if (fadeOut > 0 && barTimePosition >= endTime) {
      const activeRegionDuration = duration - endTime;
      const fadeOutDuration = Math.min(fadeOut, activeRegionDuration);
      const fadeOutStart = duration - fadeOutDuration;
      
      if (barTimePosition >= fadeOutStart) {
        const fadeProgress = (duration - barTimePosition) / fadeOutDuration;
        fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
      }
    }
    
    return fadeMultiplier;
  }
  
  const relativePosition = (barTimePosition - startTime) / (endTime - startTime);
  let fadeMultiplier = 1;
  
  // 🎵 **FADE IN EFFECT**: Gradual increase from start
  if (fadeIn > 0 && relativePosition < (fadeIn / (endTime - startTime))) {
    const fadeProgress = relativePosition / (fadeIn / (endTime - startTime));
    fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
  }
  
  // 🎵 **FADE OUT EFFECT**: Gradual decrease to end
  if (fadeOut > 0 && relativePosition > (1 - fadeOut / (endTime - startTime))) {
    const fadeProgress = (1 - relativePosition) / (fadeOut / (endTime - startTime));
    fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
  }
  
  return fadeMultiplier;
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