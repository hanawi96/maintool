export class VolumeParameterConverter {
  constructor() {
    // 🔊 Volume conversion constants
    this.minVolume = 0.0;   // 0% volume (mute)
    this.maxVolume = 2.0;   // 200% volume (2x amplification)
    this.defaultVolume = 1.0; // 100% volume (1x, no change)
    
    console.log('🔊 VolumeParameterConverter initialized');
  }
  
  /**
   * Convert Web Audio API GainNode value to FFmpeg volume filter
   * @param {number} webAudioGain - GainNode.gain.value (0.0 to 2.0)
   * @param {Object} options - Conversion options
   * @returns {Object} FFmpeg volume configuration
   */
  convertToFFmpeg(webAudioGain, options = {}) {
    const {
      precision = 3,           // Decimal precision
      skipUnityGain = true,    // Skip volume=1.0 (no effect)
      useDBScale = false       // Use dB scale instead of linear
    } = options;
    
    console.log('🔊 Converting volume to FFmpeg:', {
      webAudioGain,
      options
    });
    
    // Validate input
    if (!this.validateVolumeGain(webAudioGain)) {
      throw new Error(`Invalid volume gain: ${webAudioGain}. Expected 0.0 to 2.0`);
    }
    
    // Skip unity gain if requested
    if (skipUnityGain && Math.abs(webAudioGain - 1.0) < 0.001) {
      console.log('🔊 Skipping unity gain (1.0) - no volume effect needed');
      return {
        hasVolumeEffect: false,
        filterString: '',
        volumeValue: webAudioGain,
        skipReason: 'Unity gain'
      };
    }
    
    let filterValue;
    let filterString;
    
    if (useDBScale) {
      // Convert to dB: dB = 20 * log10(gain)
      const dbValue = webAudioGain > 0 ? 20 * Math.log10(webAudioGain) : -60; // -60dB for mute
      filterValue = dbValue.toFixed(precision);
      filterString = `volume=${filterValue}dB`;
    } else {
      // Linear scale (direct mapping)
      filterValue = webAudioGain.toFixed(precision);
      filterString = `volume=${filterValue}`;
    }
    
    const result = {
      hasVolumeEffect: true,
      filterString: filterString,
      volumeValue: webAudioGain,
      ffmpegValue: filterValue,
      scale: useDBScale ? 'dB' : 'linear',
      percentageValue: Math.round(webAudioGain * 100),
      amplification: webAudioGain > 1.0 ? 'boost' : webAudioGain < 1.0 ? 'cut' : 'unity'
    };
    
    console.log('🔊 FFmpeg volume conversion result:', {
      webAudioGain: webAudioGain,
      ffmpegFilter: filterString,
      percentage: `${result.percentageValue}%`,
      effect: result.amplification
    });
    
    return result;
  }
  
  /**
   * Validate volume gain value
   * @param {number} gain - Volume gain to validate
   * @returns {boolean} True if valid
   */
  validateVolumeGain(gain) {
    if (typeof gain !== 'number' || isNaN(gain)) {
      console.error('❌ Volume gain must be a valid number:', gain);
      return false;
    }
    
    if (gain < this.minVolume || gain > this.maxVolume) {
      console.error(`❌ Volume gain out of range (${this.minVolume}-${this.maxVolume}):`, gain);
      return false;
    }
    
    return true;
  }
  
  /**
   * Convert percentage to Web Audio gain value
   * @param {number} percentage - Volume percentage (0-200%)
   * @returns {number} Web Audio gain value (0.0-2.0)
   */
  percentageToGain(percentage) {
    const gain = Math.max(0, Math.min(200, percentage)) / 100;
    console.log(`🔊 Converted ${percentage}% → ${gain} gain`);
    return gain;
  }
  
  /**
   * Convert Web Audio gain to percentage
   * @param {number} gain - Web Audio gain (0.0-2.0)  
   * @returns {number} Percentage (0-200%)
   */
  gainToPercentage(gain) {
    const percentage = Math.round(gain * 100);
    console.log(`🔊 Converted ${gain} gain → ${percentage}%`);
    return percentage;
  }
  
  /**
   * Create A/B test configuration for volume
   * @param {number} webAudioGain - Web Audio gain value
   * @returns {Object} A/B test configuration
   */
  createABTestConfig(webAudioGain) {
    const conversion = this.convertToFFmpeg(webAudioGain);
    
    return {
      webAudioConfig: {
        gainValue: webAudioGain,
        percentage: this.gainToPercentage(webAudioGain),
        implementation: 'GainNode.gain.value'
      },
      ffmpegConfig: {
        filterString: conversion.filterString,
        volumeValue: conversion.ffmpegValue,
        scale: conversion.scale,
        implementation: 'FFmpeg volume filter'
      },
      testInstructions: {
        setupWebAudio: `Set GainNode.gain.value = ${webAudioGain}`,
        setupFFmpeg: `Use filter: ${conversion.filterString || 'No volume filter needed'}`,
        expectedResult: `${this.gainToPercentage(webAudioGain)}% volume level`
      }
    };
  }
  
  /**
   * Generate test cases for volume validation
   * @returns {Array} Test cases for volume conversion
   */
  generateTestCases() {
    return [
      { name: 'Mute', gain: 0.0, expected: 'volume=0.000' },
      { name: 'Quarter Volume', gain: 0.25, expected: 'volume=0.250' },
      { name: 'Half Volume', gain: 0.5, expected: 'volume=0.500' },
      { name: 'Unity Gain', gain: 1.0, expected: 'No filter (skipped)' },
      { name: 'Boost 150%', gain: 1.5, expected: 'volume=1.500' },
      { name: 'Max Boost', gain: 2.0, expected: 'volume=2.000' }
    ];
  }
}

// 🔊 Quick volume conversion utilities
export const VolumeUtils = {
  /**
   * Quick convert percentage to FFmpeg filter
   * @param {number} percentage - Volume percentage (0-200%)
   * @returns {string} FFmpeg filter string
   */
  percentageToFFmpeg(percentage) {
    const converter = new VolumeParameterConverter();
    const gain = converter.percentageToGain(percentage);
    const result = converter.convertToFFmpeg(gain);
    return result.filterString;
  },
  
  /**
   * Quick convert Web Audio gain to FFmpeg filter
   * @param {number} gain - Web Audio gain (0.0-2.0)
   * @returns {string} FFmpeg filter string
   */
  gainToFFmpeg(gain) {
    const converter = new VolumeParameterConverter();
    const result = converter.convertToFFmpeg(gain);
    return result.filterString;
  },
  
  /**
   * Check if volume effect is needed
   * @param {number} gain - Web Audio gain
   * @returns {boolean} True if volume filter is needed
   */
  needsVolumeFilter(gain) {
    return Math.abs(gain - 1.0) > 0.001; // Not unity gain
  }
};

console.log('🔊 VolumeParameterConverter module loaded'); 