export class EQParameterConverter {
  constructor() {
    // 🎚️ Exact same frequencies as frontend Web Audio API
    this.frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    this.qFactor = 1.0; // Fixed Q-factor matching Web Audio API
    
    console.log('🔧 EQParameterConverter initialized with frequencies:', this.frequencies);
  }
  
  /**
   * Convert Web Audio API EQ parameters to FFmpeg equalizer string
   * @param {Array} eqGains - Array of 10 gain values in dB (-12 to +12)
   * @param {Object} options - Additional options for conversion
   * @returns {Object} FFmpeg filter configuration
   */
  convertToFFmpeg(eqGains, options = {}) {
    const {
      skipZeroGains = true,          // Skip bands with 0dB gain
      gainThreshold = 0.01,          // Minimum gain to include filter
      qFactorOverride = null,        // Override Q-factor if needed
      useAccurateMapping = true      // Use precise 1:1 mapping
    } = options;
    
    console.log('🎚️ Converting EQ parameters to FFmpeg:', {
      eqGains,
      frequencies: this.frequencies,
      qFactor: qFactorOverride || this.qFactor,
      options
    });
    
    // Validate input
    if (!this.validateEQGains(eqGains)) {
      throw new Error('Invalid EQ gains array. Expected 10 values between -12 and +12 dB.');
    }
    
    const filters = [];
    const activeFilters = [];
    const qValue = qFactorOverride || this.qFactor;
    
    // Generate FFmpeg equalizer filters for each band
    eqGains.forEach((gain, index) => {
      const frequency = this.frequencies[index];
      
      // Skip near-zero gains if requested
      if (skipZeroGains && Math.abs(gain) < gainThreshold) {
        console.log(`⏩ Skipping band ${index + 1} (${frequency}Hz): gain=${gain}dB < threshold`);
        return;
      }
      
      // Create precise FFmpeg equalizer filter
      // Format: equalizer=f=<freq>:t=q:w=<Q>:g=<gain>
      const filterString = `equalizer=f=${frequency}:t=q:w=${qValue}:g=${gain.toFixed(1)}`;
      filters.push(filterString);
      
      activeFilters.push({
        bandIndex: index,
        frequency: frequency,
        gain: gain,
        qFactor: qValue,
        filterString: filterString
      });
      
      console.log(`🎚️ Band ${index + 1}: ${frequency}Hz, Q=${qValue}, Gain=${gain}dB → ${filterString}`);
    });
    
    const result = {
      filterString: filters.join(','),
      hasEQ: filters.length > 0,
      activeFilters: activeFilters,
      totalFilters: filters.length,
      skippedFilters: 10 - filters.length,
      parameters: {
        frequencies: [...this.frequencies],
        gains: [...eqGains],
        qFactor: qValue,
        filterType: 'peaking'
      }
    };
    
    console.log('🔧 FFmpeg EQ conversion result:', {
      hasEQ: result.hasEQ,
      totalFilters: result.totalFilters,
      filterString: result.filterString || 'No filters generated'
    });
    
    return result;
  }
  
  /**
   * Validate EQ gains array
   * @param {Array} eqGains - EQ gains to validate
   * @returns {boolean} True if valid
   */
  validateEQGains(eqGains) {
    if (!Array.isArray(eqGains)) {
      console.error('❌ EQ gains must be an array');
      return false;
    }
    
    if (eqGains.length !== 10) {
      console.error(`❌ EQ gains array must have exactly 10 values, got ${eqGains.length}`);
      return false;
    }
    
    // Check each gain value
    for (let i = 0; i < eqGains.length; i++) {
      const gain = eqGains[i];
      
      if (typeof gain !== 'number' || isNaN(gain)) {
        console.error(`❌ EQ gain at index ${i} is not a valid number: ${gain}`);
        return false;
      }
      
      if (gain < -12 || gain > 12) {
        console.error(`❌ EQ gain at index ${i} is out of range (-12 to +12): ${gain}dB`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Generate test FFmpeg command for validation
   * @param {string} inputFile - Input audio file path
   * @param {string} outputFile - Output audio file path
   * @param {Array} eqGains - EQ gains array
   * @returns {string} Complete FFmpeg command
   */
  generateTestCommand(inputFile, outputFile, eqGains) {
    const conversion = this.convertToFFmpeg(eqGains);
    
    if (!conversion.hasEQ) {
      return `ffmpeg -i "${inputFile}" -c copy "${outputFile}"`;
    }
    
    return `ffmpeg -i "${inputFile}" -af "${conversion.filterString}" "${outputFile}"`;
  }
  
  /**
   * Create A/B testing configuration
   * @param {Array} eqGains - EQ gains for testing
   * @returns {Object} A/B test configuration
   */
  createABTestConfig(eqGains) {
    const conversion = this.convertToFFmpeg(eqGains);
    
    return {
      webAudioConfig: {
        frequencies: [...this.frequencies],
        gains: [...eqGains],
        qFactor: this.qFactor,
        filterType: 'peaking'
      },
      ffmpegConfig: {
        filterString: conversion.filterString,
        activeFilters: conversion.activeFilters,
        totalFilters: conversion.totalFilters
      },
      testInstructions: {
        setupWebAudio: `Create 10 BiquadFilterNode with frequencies ${this.frequencies.join(', ')}Hz`,
        setupFFmpeg: `Use filter: ${conversion.filterString || 'No filters needed'}`,
        compareMethod: 'A/B listen test with same audio source'
      }
    };
  }
  
  /**
   * Apply calibration adjustments if needed
   * @param {Array} eqGains - Original EQ gains
   * @param {Object} calibrationData - Calibration coefficients
   * @returns {Array} Calibrated EQ gains
   */
  applyCalibration(eqGains, calibrationData = {}) {
    if (!calibrationData || Object.keys(calibrationData).length === 0) {
      console.log('🎚️ No calibration data provided, using original gains');
      return [...eqGains];
    }
    
    const calibratedGains = eqGains.map((gain, index) => {
      const frequency = this.frequencies[index];
      const calibration = calibrationData[frequency];
      
      if (calibration) {
        const adjustedGain = gain * (calibration.multiplier || 1.0) + (calibration.offset || 0);
        console.log(`🔧 Calibrated ${frequency}Hz: ${gain}dB → ${adjustedGain.toFixed(1)}dB`);
        return adjustedGain;
      }
      
      return gain;
    });
    
    console.log('🎚️ Applied calibration to EQ gains:', {
      original: eqGains,
      calibrated: calibratedGains
    });
    
    return calibratedGains;
  }
  
  /**
   * Generate frequency response comparison data
   * @param {Array} eqGains - EQ gains
   * @returns {Object} Frequency response data for comparison
   */
  generateFrequencyResponse(eqGains) {
    const testFrequencies = [];
    for (let freq = 20; freq <= 20000; freq *= 1.1) {
      testFrequencies.push(Math.round(freq));
    }
    
    const response = testFrequencies.map(freq => {
      let totalGain = 0;
      
      // Calculate combined effect of all EQ bands
      this.frequencies.forEach((bandFreq, index) => {
        const bandGain = eqGains[index];
        if (Math.abs(bandGain) > 0.01) {
          // Simplified peaking filter response calculation
          const ratio = freq / bandFreq;
          const qEffect = 1 / (1 + Math.pow(this.qFactor * (ratio - 1/ratio), 2));
          totalGain += bandGain * qEffect;
        }
      });
      
      return {
        frequency: freq,
        gainDB: totalGain,
        linearGain: Math.pow(10, totalGain / 20)
      };
    });
    
    return {
      testFrequencies: testFrequencies,
      response: response,
      eqParameters: this.convertToFFmpeg(eqGains)
    };
  }
}

// 🎚️ Predefined calibration data for fine-tuning
export const EQCalibrationData = {
  // Default: No calibration (1:1 mapping)
  default: {},
  
  // Fine-tuned calibration (if A/B testing reveals discrepancies)
  fine_tuned: {
    60: { multiplier: 1.0, offset: 0 },
    170: { multiplier: 1.0, offset: 0 },
    310: { multiplier: 1.0, offset: 0 },
    600: { multiplier: 1.0, offset: 0 },
    1000: { multiplier: 1.0, offset: 0 },
    3000: { multiplier: 1.0, offset: 0 },
    6000: { multiplier: 1.0, offset: 0 },
    12000: { multiplier: 1.0, offset: 0 },
    14000: { multiplier: 1.0, offset: 0 },
    16000: { multiplier: 1.0, offset: 0 }
  }
};

// 🧪 Testing utilities
export class EQTestUtils {
  static generateTestCases() {
    return [
      {
        name: 'Flat Response',
        gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        expectedResult: 'No filters should be generated'
      },
      {
        name: 'Bass Boost',
        gains: [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
        expectedResult: 'Low frequency emphasis'
      },
      {
        name: 'Treble Boost',
        gains: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8],
        expectedResult: 'High frequency emphasis'
      },
      {
        name: 'V-Shape',
        gains: [4, 2, 0, -2, -3, -2, 0, 2, 4, 6],
        expectedResult: 'Bass and treble boost, midrange cut'
      },
      {
        name: 'All Bands Active',
        gains: [1, -1, 2, -2, 3, -3, 4, -4, 5, -5],
        expectedResult: 'All 10 filters should be active'
      }
    ];
  }
  
  static async runBasicValidation(converter) {
    const testCases = this.generateTestCases();
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const result = converter.convertToFFmpeg(testCase.gains);
        results.push({
          ...testCase,
          success: true,
          result: result,
          filterCount: result.totalFilters
        });
        
        console.log(`✅ Test "${testCase.name}": ${result.totalFilters} filters generated`);
      } catch (error) {
        results.push({
          ...testCase,
          success: false,
          error: error.message
        });
        
        console.error(`❌ Test "${testCase.name}" failed:`, error.message);
      }
    }
    
    return results;
  }
}

console.log('🔧 EQParameterConverter module loaded'); 