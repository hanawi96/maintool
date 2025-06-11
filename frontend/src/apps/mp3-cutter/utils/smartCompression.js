// 🗜️ **SMART COMPRESSION UTILITIES** - Advanced compression for large audio files
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\utils\smartCompression.js

import pako from 'pako'; // Import pako for gzip compression (npm install pako)

export class SmartCompression {
  constructor() {
    this.compressionThresholds = {
      small: 1 * 1024 * 1024,      // 1MB - No compression
      medium: 5 * 1024 * 1024,     // 5MB - Light compression  
      large: 15 * 1024 * 1024,     // 15MB - Standard compression
      xlarge: 50 * 1024 * 1024     // 50MB - Aggressive compression
    };
    
    this.compressionStrategies = {
      none: { ratio: 1.0, quality: 1.0, speed: 1.0 },
      light: { ratio: 0.8, quality: 0.95, speed: 0.9 },
      standard: { ratio: 0.6, quality: 0.9, speed: 0.7 },
      aggressive: { ratio: 0.4, quality: 0.8, speed: 0.5 }
    };
    
    console.log('🗜️ [SmartCompression] Initialized with thresholds:', this.compressionThresholds);
  }

  // 🎯 **INTELLIGENT COMPRESSION**: Choose optimal compression strategy
  async compressWaveformData(data, options = {}) {
    const startTime = performance.now();
    const { 
      quality = 'auto',
      maxSize = null,
      preserveQuality = false,
      forceStrategy = null 
    } = options;
    
    // 📏 **SIZE CALCULATION**: Estimate data size
    const originalSize = this.estimateDataSize(data);
    console.log('🎯 [SmartCompression] Starting compression:', {
      originalSize: this.formatBytes(originalSize),
      dataPoints: Array.isArray(data) ? data.length : 'unknown',
      quality
    });
    
    // 🚀 **STRATEGY SELECTION**: Choose compression strategy
    const strategy = forceStrategy || this.selectCompressionStrategy(originalSize, {
      quality,
      maxSize,
      preserveQuality
    });
    
    try {
      let compressedData;
      let compressionMetadata;
      
      switch (strategy) {
        case 'none':
          compressedData = await this.compressNone(data);
          break;
        case 'light':
          compressedData = await this.compressLight(data);
          break;
        case 'standard':
          compressedData = await this.compressStandard(data);
          break;
        case 'aggressive':
          compressedData = await this.compressAggressive(data);
          break;
        default:
          throw new Error(`Unknown compression strategy: ${strategy}`);
      }
      
      const compressedSize = this.estimateDataSize(compressedData);
      const compressionRatio = compressedSize / originalSize;
      const compressionTime = performance.now() - startTime;
      
      compressionMetadata = {
        originalSize,
        compressedSize,
        compressionRatio,
        compressionTime,
        strategy,
        timestamp: Date.now()
      };
      
      console.log('✅ [SmartCompression] Compression complete:', {
        strategy,
        originalSize: this.formatBytes(originalSize),
        compressedSize: this.formatBytes(compressedSize),
        ratio: (compressionRatio * 100).toFixed(1) + '%',
        timeTaken: compressionTime.toFixed(2) + 'ms'
      });
      
      return {
        data: compressedData,
        metadata: compressionMetadata,
        compressed: strategy !== 'none'
      };
      
    } catch (error) {
      console.error('❌ [SmartCompression] Compression failed:', error);
      throw error;
    }
  }

  // 🔄 **DECOMPRESSION**: Restore original data
  async decompressWaveformData(compressedResult) {
    if (!compressedResult.compressed) {
      return compressedResult.data; // No decompression needed
    }
    
    const startTime = performance.now();
    const { data, metadata } = compressedResult;
    
    console.log('🔄 [SmartCompression] Starting decompression:', {
      strategy: metadata.strategy,
      compressedSize: this.formatBytes(metadata.compressedSize)
    });
    
    try {
      let decompressedData;
      
      switch (metadata.strategy) {
        case 'light':
          decompressedData = await this.decompressLight(data);
          break;
        case 'standard':
          decompressedData = await this.decompressStandard(data);
          break;
        case 'aggressive':
          decompressedData = await this.decompressAggressive(data);
          break;
        default:
          throw new Error(`Unknown decompression strategy: ${metadata.strategy}`);
      }
      
      const decompressionTime = performance.now() - startTime;
      
      console.log('✅ [SmartCompression] Decompression complete:', {
        strategy: metadata.strategy,
        decompressedSize: this.formatBytes(this.estimateDataSize(decompressedData)),
        timeTaken: decompressionTime.toFixed(2) + 'ms'
      });
      
      return decompressedData;
      
    } catch (error) {
      console.error('❌ [SmartCompression] Decompression failed:', error);
      throw error;
    }
  }

  // 🎯 **STRATEGY SELECTION**: Choose optimal compression strategy
  selectCompressionStrategy(dataSize, options = {}) {
    const { quality, maxSize, preserveQuality } = options;
    
    // 🛡️ **PRESERVE QUALITY**: No compression if quality is critical
    if (preserveQuality) {
      return 'none';
    }
    
    // 📏 **SIZE-BASED SELECTION**: Choose based on data size
    if (dataSize < this.compressionThresholds.small) {
      return 'none';
    } else if (dataSize < this.compressionThresholds.medium) {
      return 'light';
    } else if (dataSize < this.compressionThresholds.large) {
      return 'standard';
    } else {
      return 'aggressive';
    }
    
    // 🎯 **MAX SIZE CONSTRAINT**: Ensure we meet size requirements
    if (maxSize && dataSize > maxSize) {
      return 'aggressive';
    }
    
    // 🎨 **QUALITY-BASED SELECTION**: Choose based on quality requirements
    switch (quality) {
      case 'low': return 'aggressive';
      case 'standard': return 'standard';
      case 'high': return 'light';
      case 'premium': return 'none';
      default: return this.selectCompressionStrategy(dataSize, { ...options, quality: 'standard' });
    }
  }

  // 🚫 **NO COMPRESSION**: Pass through unchanged
  async compressNone(data) {
    return data;
  }

  // 🔍 **LIGHT COMPRESSION**: Minimal quality loss, good speed
  async compressLight(data) {
    if (!Array.isArray(data)) {
      return this.compressGenericLight(data);
    }
    
    // 🎵 **WAVEFORM-SPECIFIC LIGHT COMPRESSION**
    // Remove micro-variations (< 0.01) that are not perceptible
    const compressed = data.map(value => {
      if (value < 0.01) return 0;
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    });
    
    // 🗜️ **GZIP COMPRESSION**: Apply gzip for additional compression
    const jsonString = JSON.stringify(compressed);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array);
    
    return {
      type: 'light',
      data: Array.from(gzipped),
      originalLength: data.length
    };
  }

  // 📊 **STANDARD COMPRESSION**: Balanced quality and size
  async compressStandard(data) {
    if (!Array.isArray(data)) {
      return this.compressGenericStandard(data);
    }
    
    // 🎵 **WAVEFORM-SPECIFIC STANDARD COMPRESSION**
    // Apply more aggressive quantization and run-length encoding
    const quantized = data.map(value => {
      if (value < 0.02) return 0;
      return Math.round(value * 50) / 50; // Round to 0.02 increments
    });
    
    // 🔄 **RUN-LENGTH ENCODING**: Compress sequences of similar values
    const rleCompressed = this.runLengthEncode(quantized);
    
    // 🗜️ **GZIP COMPRESSION**: Additional compression
    const jsonString = JSON.stringify(rleCompressed);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array);
    
    return {
      type: 'standard',
      data: Array.from(gzipped),
      originalLength: data.length
    };
  }

  // 💪 **AGGRESSIVE COMPRESSION**: Maximum compression, some quality loss
  async compressAggressive(data) {
    if (!Array.isArray(data)) {
      return this.compressGenericAggressive(data);
    }
    
    // 🎵 **WAVEFORM-SPECIFIC AGGRESSIVE COMPRESSION**
    // Heavy quantization + downsampling + RLE
    
    // 📉 **DOWNSAMPLE**: Reduce data points by 50%
    const downsampled = [];
    for (let i = 0; i < data.length; i += 2) {
      const avg = i + 1 < data.length ? (data[i] + data[i + 1]) / 2 : data[i];
      downsampled.push(avg);
    }
    
    // 🎯 **AGGRESSIVE QUANTIZATION**: Round to 0.1 increments
    const quantized = downsampled.map(value => {
      if (value < 0.05) return 0;
      return Math.round(value * 10) / 10;
    });
    
    // 🔄 **RUN-LENGTH ENCODING**: Compress sequences
    const rleCompressed = this.runLengthEncode(quantized);
    
    // 🗜️ **GZIP COMPRESSION**: Final compression
    const jsonString = JSON.stringify(rleCompressed);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array, { level: 9 }); // Maximum gzip compression
    
    return {
      type: 'aggressive',
      data: Array.from(gzipped),
      originalLength: data.length,
      downsampleFactor: 2
    };
  }

  // 🔄 **DECOMPRESSION METHODS**: Reverse compression
  async decompressLight(compressedData) {
    const { data } = compressedData;
    
    // 🗜️ **GUNZIP**: Decompress gzip
    const gzipped = new Uint8Array(data);
    const decompressed = pako.ungzip(gzipped);
    const jsonString = new TextDecoder().decode(decompressed);
    
    return JSON.parse(jsonString);
  }

  async decompressStandard(compressedData) {
    const { data } = compressedData;
    
    // 🗜️ **GUNZIP**: Decompress gzip
    const gzipped = new Uint8Array(data);
    const decompressed = pako.ungzip(gzipped);
    const jsonString = new TextDecoder().decode(decompressed);
    const rleCompressed = JSON.parse(jsonString);
    
    // 🔄 **RUN-LENGTH DECODE**: Decompress RLE
    return this.runLengthDecode(rleCompressed);
  }

  async decompressAggressive(compressedData) {
    const { data, downsampleFactor = 2 } = compressedData;
    
    // 🗜️ **GUNZIP**: Decompress gzip
    const gzipped = new Uint8Array(data);
    const decompressed = pako.ungzip(gzipped);
    const jsonString = new TextDecoder().decode(decompressed);
    const rleCompressed = JSON.parse(jsonString);
    
    // 🔄 **RUN-LENGTH DECODE**: Decompress RLE
    const quantized = this.runLengthDecode(rleCompressed);
    
    // 📈 **UPSAMPLE**: Restore original length with interpolation
    const upsampled = [];
    for (let i = 0; i < quantized.length; i++) {
      upsampled.push(quantized[i]);
      
      // 🔄 **LINEAR INTERPOLATION**: Add interpolated values
      if (i < quantized.length - 1 && downsampleFactor > 1) {
        const current = quantized[i];
        const next = quantized[i + 1];
        const interpolated = (current + next) / 2;
        upsampled.push(interpolated);
      }
    }
    
    return upsampled;
  }

  // 🔄 **RUN-LENGTH ENCODING**: Compress repetitive sequences
  runLengthEncode(data) {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const result = [];
    let current = data[0];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        result.push(count, current);
        current = data[i];
        count = 1;
      }
    }
    
    result.push(count, current);
    return result;
  }

  runLengthDecode(encodedData) {
    if (!Array.isArray(encodedData)) return [];
    
    const result = [];
    
    for (let i = 0; i < encodedData.length; i += 2) {
      const count = encodedData[i];
      const value = encodedData[i + 1];
      
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
    }
    
    return result;
  }

  // 🔧 **GENERIC COMPRESSION**: For non-waveform data
  async compressGenericLight(data) {
    const jsonString = JSON.stringify(data);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array);
    
    return {
      type: 'generic-light',
      data: Array.from(gzipped)
    };
  }

  async compressGenericStandard(data) {
    const jsonString = JSON.stringify(data);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array, { level: 6 });
    
    return {
      type: 'generic-standard',
      data: Array.from(gzipped)
    };
  }

  async compressGenericAggressive(data) {
    const jsonString = JSON.stringify(data);
    const uint8Array = new TextEncoder().encode(jsonString);
    const gzipped = pako.gzip(uint8Array, { level: 9 });
    
    return {
      type: 'generic-aggressive',
      data: Array.from(gzipped)
    };
  }

  // 🔧 **UTILITY FUNCTIONS**: Helper functions
  estimateDataSize(data) {
    return JSON.stringify(data).length * 2; // UTF-16 approximation
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 📊 **COMPRESSION ANALYSIS**: Analyze compression effectiveness
  analyzeCompressionEffectiveness(originalData, compressedResult) {
    const { metadata } = compressedResult;
    const effectiveness = {
      compressionRatio: metadata.compressionRatio,
      spaceSaved: metadata.originalSize - metadata.compressedSize,
      spaceSavedPercent: ((1 - metadata.compressionRatio) * 100).toFixed(1),
      strategy: metadata.strategy,
      timeTaken: metadata.compressionTime,
      efficiency: (1 - metadata.compressionRatio) / (metadata.compressionTime / 1000) // Compression per second
    };
    
    console.log('📊 [SmartCompression] Compression analysis:', effectiveness);
    return effectiveness;
  }

  // 🎯 **OPTIMAL STRATEGY FINDER**: Find best strategy for specific data
  async findOptimalStrategy(data, requirements = {}) {
    const { maxSize, maxTime, minQuality = 0.8 } = requirements;
    
    const strategies = ['light', 'standard', 'aggressive'];
    const results = [];
    
    for (const strategy of strategies) {
      try {
        const startTime = performance.now();
        const compressed = await this.compressWaveformData(data, { forceStrategy: strategy });
        const endTime = performance.now();
        
        const analysis = this.analyzeCompressionEffectiveness(data, compressed);
        analysis.timeTaken = endTime - startTime;
        analysis.strategy = strategy;
        
        results.push(analysis);
      } catch (error) {
        console.warn(`⚠️ Strategy ${strategy} failed:`, error);
      }
    }
    
    // 🏆 **SELECT BEST**: Choose optimal strategy based on requirements
    let best = results[0];
    
    for (const result of results) {
      // Check constraints
      if (maxSize && result.compressedSize > maxSize) continue;
      if (maxTime && result.timeTaken > maxTime) continue;
      if (result.compressionRatio > (1 - minQuality)) continue;
      
      // Choose based on efficiency
      if (result.efficiency > best.efficiency) {
        best = result;
      }
    }
    
    console.log('🏆 [SmartCompression] Optimal strategy found:', best);
    return best;
  }
}

// 🏭 **FACTORY FUNCTION**: Create compression instance
export const createSmartCompression = () => {
  return new SmartCompression();
};

export default SmartCompression;
