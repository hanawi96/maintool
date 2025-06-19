// Volume Correction System: Fix volume mismatch between Web Audio API & FFmpeg
import { VolumeParameterConverter } from './volume-converter.js';

export class VolumeCorrection {
  constructor() {
    this.volumeConverter = new VolumeParameterConverter();
    
    // 🎯 Calibration data based on typical MP3 encoding behavior
    this.calibrationData = {
      // MP3 encoding typically reduces volume by ~6-12%
      mp3: {
        gainReduction: 0.88,  // Typical 12% reduction
        description: 'MP3 LAME encoder gain reduction',
        verified: false
      },
      
      // Other formats (less reduction)
      wav: {
        gainReduction: 1.0,   // No reduction for WAV
        description: 'WAV PCM no compression',
        verified: true
      },
      
      flac: {
        gainReduction: 0.98,  // Minimal reduction for FLAC
        description: 'FLAC lossless minimal reduction',
        verified: false
      },
      
      aac: {
        gainReduction: 0.90,  // AAC encoding reduction
        description: 'AAC encoder gain reduction',
        verified: false
      }
    };
    
    console.log('🔧 VolumeCorrection initialized with calibration data');
  }
  
  /**
   * Apply volume correction for specific format
   */
  applyCorrectionForFormat(webAudioGain, format = 'mp3', options = {}) {
    const {
      enableCorrection = true,
      customCorrectionFactor = null,
      precision = 3
    } = options;
    
    if (!enableCorrection) {
      console.log('🔧 Volume correction disabled - using raw Web Audio gain');
      return this.volumeConverter.convertToFFmpeg(webAudioGain, { precision });
    }
    
    // Get format-specific correction
    const formatCorrection = this.calibrationData[format] || this.calibrationData.mp3;
    const correctionFactor = customCorrectionFactor || (1 / formatCorrection.gainReduction);
    
    // Apply correction to compensate for encoding loss
    const correctedGain = webAudioGain * correctionFactor;
    
    console.log('🔧 Applying volume correction:', {
      originalWebAudioGain: webAudioGain,
      format: format,
      encodingGainReduction: formatCorrection.gainReduction,
      correctionFactor: correctionFactor.toFixed(3),
      correctedGain: correctedGain.toFixed(3),
      description: formatCorrection.description
    });
    
    // Convert corrected gain to FFmpeg
    const conversion = this.volumeConverter.convertToFFmpeg(correctedGain, { precision });
    
    // Add correction metadata
    conversion.correction = {
      applied: true,
      originalGain: webAudioGain,
      correctedGain: correctedGain,
      correctionFactor: correctionFactor,
      format: format,
      encodingLoss: formatCorrection.gainReduction
    };
    
    return conversion;
  }
  
  /**
   * Smart volume correction with automatic format detection
   */
  smartVolumeCorrection(webAudioGain, format, quality = 'medium') {
    console.log(`🧠 Smart volume correction for ${format} (${quality})`);
    
    // 🔧 ALWAYS apply correction for lossy formats, even at unity gain
    const needsCorrection = ['mp3', 'aac', 'ogg'].includes(format.toLowerCase());
    
    if (!needsCorrection) {
      // For lossless formats (WAV, FLAC), use standard conversion
      return this.volumeConverter.convertToFFmpeg(webAudioGain, {
        precision: 3,
        skipUnityGain: true
      });
    }
    
    // Quality-based correction factors
    const qualityFactors = {
      low: 1.02,     // Low quality might need slight boost
      medium: 1.0,   // Medium quality baseline
      high: 0.99     // High quality might have less loss
    };
    
    const qualityFactor = qualityFactors[quality] || 1.0;
    
    // 🎯 Get base correction for format (FORCE correction even for unity gain)
    const baseCorrection = this.applyCorrectionForFormat(webAudioGain, format, {
      enableCorrection: true,
      customCorrectionFactor: null,
      precision: 3
    });
    
    // Apply quality adjustment
    if (qualityFactor !== 1.0) {
      const qualityAdjustedGain = parseFloat(baseCorrection.ffmpegValue) * qualityFactor;
      
      console.log('🎚️ Applying quality adjustment:', {
        baseFFmpegGain: baseCorrection.ffmpegValue,
        qualityFactor: qualityFactor,
        adjustedGain: qualityAdjustedGain.toFixed(3)
      });
      
      baseCorrection.ffmpegValue = qualityAdjustedGain.toFixed(3);
      baseCorrection.filterString = `volume=${qualityAdjustedGain.toFixed(3)}`;
      baseCorrection.correction.qualityFactor = qualityFactor;
    }
    
    // 🔧 FORCE hasVolumeEffect for lossy formats to ensure correction is applied
    baseCorrection.hasVolumeEffect = true;
    
    console.log('🔧 Smart volume correction result:', {
      format: format,
      webAudioGain: webAudioGain,
      correctedGain: baseCorrection.correction?.correctedGain,
      ffmpegFilter: baseCorrection.filterString,
      forcedCorrection: needsCorrection,
      reason: needsCorrection ? 'Lossy format encoding compensation' : 'Standard conversion'
    });
    
    return baseCorrection;
  }
  
  /**
   * Create A/B test configuration with correction
   */
  createCorrectedABTest(webAudioGain, format, quality) {
    const uncorrectedConversion = this.volumeConverter.convertToFFmpeg(webAudioGain);
    const correctedConversion = this.smartVolumeCorrection(webAudioGain, format, quality);
    
    return {
      webAudio: {
        gain: webAudioGain,
        percentage: Math.round(webAudioGain * 100),
        description: 'Web Audio API GainNode value'
      },
      
      uncorrected: {
        ffmpegFilter: uncorrectedConversion.filterString,
        gain: uncorrectedConversion.ffmpegValue,
        description: 'Raw FFmpeg volume filter (no correction)'
      },
      
      corrected: {
        ffmpegFilter: correctedConversion.filterString,
        gain: correctedConversion.ffmpegValue,
        correctionFactor: correctedConversion.correction?.correctionFactor,
        description: `Corrected for ${format} encoding loss`
      },
      
      testInstructions: {
        webAudioSetup: `gainNode.gain.value = ${webAudioGain}`,
        ffmpegUncorrected: `volume=${uncorrectedConversion.ffmpegValue}`,
        ffmpegCorrected: `volume=${correctedConversion.ffmpegValue}`,
        expectedResult: 'Corrected version should match Web Audio preview'
      }
    };
  }
  
  /**
   * Update calibration data based on measured results
   */
  updateCalibration(format, measuredGainReduction) {
    if (this.calibrationData[format]) {
      const oldValue = this.calibrationData[format].gainReduction;
      this.calibrationData[format].gainReduction = measuredGainReduction;
      this.calibrationData[format].verified = true;
      
      console.log(`🔧 Updated ${format} calibration:`, {
        oldGainReduction: oldValue,
        newGainReduction: measuredGainReduction,
        improvement: Math.abs(measuredGainReduction - oldValue) < 0.01 ? 'Minor' : 'Significant'
      });
    } else {
      this.calibrationData[format] = {
        gainReduction: measuredGainReduction,
        description: `User-measured ${format} gain reduction`,
        verified: true
      };
      
      console.log(`🔧 Added new ${format} calibration:`, {
        gainReduction: measuredGainReduction
      });
    }
  }
  
  /**
   * Get current calibration status
   */
  getCalibrationStatus() {
    const status = {};
    
    Object.keys(this.calibrationData).forEach(format => {
      status[format] = {
        gainReduction: this.calibrationData[format].gainReduction,
        correctionFactor: (1 / this.calibrationData[format].gainReduction).toFixed(3),
        verified: this.calibrationData[format].verified,
        description: this.calibrationData[format].description
      };
    });
    
    console.log('📊 Current calibration status:', status);
    return status;
  }
}

// Quick correction utilities
export const VolumeCorrectionUtils = {
  /**
   * Quick MP3 volume correction
   */
  correctForMP3(webAudioGain, quality = 'medium') {
    const corrector = new VolumeCorrection();
    return corrector.smartVolumeCorrection(webAudioGain, 'mp3', quality);
  },
  
  /**
   * Check if volume correction is recommended
   */
  isCorrectionsRecommended(format) {
    // Recommend correction for lossy formats
    const lossyFormats = ['mp3', 'aac', 'ogg'];
    return lossyFormats.includes(format.toLowerCase());
  },
  
  /**
   * Calculate recommended correction factor
   */
  calculateCorrectionFactor(format, quality) {
    const corrector = new VolumeCorrection();
    const formatData = corrector.calibrationData[format];
    
    if (!formatData) return 1.0;
    
    let baseFactor = 1 / formatData.gainReduction;
    
    // Adjust for quality
    const qualityAdjustments = {
      low: 1.02,
      medium: 1.0,
      high: 0.99
    };
    
    return baseFactor * (qualityAdjustments[quality] || 1.0);
  }
};

console.log('🔧 VolumeCorrection module loaded'); 