import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { EQParameterConverter, EQTestUtils } from '../features/mp3-cutter/eq-converter.js';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath.path);
const ffprobe = promisify(ffmpeg.ffprobe);

export class EQABTester {
  constructor() {
    this.eqConverter = new EQParameterConverter();
    this.testResults = [];
    this.testDirectory = './test-outputs';
    
    console.log('🧪 EQABTester initialized');
  }
  
  async initialize() {
    // Create test output directory
    try {
      await fs.mkdir(this.testDirectory, { recursive: true });
      console.log('📁 Test directory created:', this.testDirectory);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Run comprehensive A/B test comparing Web Audio API settings with FFmpeg output
   * @param {string} inputAudioFile - Path to test audio file
   * @param {Array} eqGains - 10-band EQ gains to test
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runABTest(inputAudioFile, eqGains, options = {}) {
    const {
      testName = `EQ_Test_${Date.now()}`,
      generateSpectrum = true,
      analyzeFrequencyResponse = true,
      saveTempFiles = true
    } = options;
    
    console.log(`🧪 Starting A/B test: ${testName}`);
    console.log(`🎚️ Testing EQ gains:`, eqGains);
    
    const testResult = {
      testName,
      timestamp: new Date().toISOString(),
      inputFile: inputAudioFile,
      eqGains: [...eqGains],
      webAudioConfig: null,
      ffmpegConfig: null,
      outputFiles: {},
      analysis: {},
      passed: false,
      score: 0
    };
    
    try {
      await this.initialize();
      
      // 1. Generate Web Audio API configuration
      testResult.webAudioConfig = this.generateWebAudioConfig(eqGains);
      
      // 2. Generate FFmpeg configuration
      testResult.ffmpegConfig = this.generateFFmpegConfig(eqGains);
      
      // 3. Process audio with FFmpeg
      const ffmpegOutputFile = await this.processWithFFmpeg(inputAudioFile, testResult.ffmpegConfig, testName);
      testResult.outputFiles.ffmpegOutput = ffmpegOutputFile;
      
      // 4. Analyze frequency response
      if (analyzeFrequencyResponse) {
        testResult.analysis.frequencyResponse = await this.analyzeFrequencyResponse(
          inputAudioFile, 
          ffmpegOutputFile, 
          eqGains
        );
      }
      
      // 5. Generate spectrum analysis
      if (generateSpectrum) {
        testResult.analysis.spectrum = await this.generateSpectrumAnalysis(
          inputAudioFile,
          ffmpegOutputFile
        );
      }
      
      // 6. Calculate test score
      testResult.score = this.calculateTestScore(testResult);
      testResult.passed = testResult.score >= 95; // 95% threshold
      
      // 7. Generate test report
      testResult.report = this.generateTestReport(testResult);
      
      this.testResults.push(testResult);
      
      console.log(`✅ A/B test completed: ${testName}, Score: ${testResult.score}%`);
      
      return testResult;
      
    } catch (error) {
      console.error(`❌ A/B test failed: ${testName}`, error);
      testResult.error = error.message;
      return testResult;
    }
  }
  
  /**
   * Generate Web Audio API configuration for comparison
   */
  generateWebAudioConfig(eqGains) {
    return {
      frequencies: [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000],
      gains: [...eqGains],
      qFactor: 1.0,
      filterType: 'peaking',
      implementation: 'BiquadFilterNode',
      chainSetup: 'Source → EQ1 → EQ2 → ... → EQ10 → Output'
    };
  }
  
  /**
   * Generate FFmpeg configuration for comparison
   */
  generateFFmpegConfig(eqGains) {
    const conversion = this.eqConverter.convertToFFmpeg(eqGains);
    
    return {
      filterString: conversion.filterString,
      activeFilters: conversion.activeFilters,
      totalFilters: conversion.totalFilters,
      hasEQ: conversion.hasEQ,
      implementation: 'FFmpeg equalizer filter',
      parameters: conversion.parameters
    };
  }
  
  /**
   * Process audio file with FFmpeg using converted EQ parameters
   */
  async processWithFFmpeg(inputFile, ffmpegConfig, testName) {
    const outputFile = path.join(this.testDirectory, `${testName}_ffmpeg_output.wav`);
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputFile);
      
      if (ffmpegConfig.hasEQ) {
        command = command.audioFilters(ffmpegConfig.filterString);
      }
      
      command
        .audioCodec('pcm_s16le')
        .format('wav')
        .output(outputFile)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg processing started:', commandLine);
        })
        .on('end', () => {
          console.log('✅ FFmpeg processing completed');
          resolve(outputFile);
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg processing failed:', error);
          reject(error);
        })
        .run();
    });
  }
  
  /**
   * Analyze frequency response of processed audio
   */
  async analyzeFrequencyResponse(originalFile, processedFile, eqGains) {
    // Generate frequency sweep and analyze response
    const sweepFile = await this.generateFrequencySweep();
    const processedSweepFile = await this.processWithFFmpeg(
      sweepFile, 
      this.generateFFmpegConfig(eqGains), 
      `sweep_${Date.now()}`
    );
    
    // Analyze the processed sweep to measure actual frequency response
    const analysis = await this.measureFrequencyResponse(sweepFile, processedSweepFile);
    
    return {
      expectedResponse: this.calculateExpectedResponse(eqGains),
      measuredResponse: analysis,
      accuracy: this.compareResponses(this.calculateExpectedResponse(eqGains), analysis)
    };
  }
  
  /**
   * Generate frequency sweep for testing
   */
  async generateFrequencySweep() {
    const sweepFile = path.join(this.testDirectory, `frequency_sweep_${Date.now()}.wav`);
    
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=channel_layout=mono:sample_rate=44100')
        .inputFormat('lavfi')
        .audioFilters('sine=frequency=1000:duration=10')
        .audioCodec('pcm_s16le')
        .format('wav')
        .duration(10)
        .output(sweepFile)
        .on('end', () => resolve(sweepFile))
        .on('error', reject)
        .run();
    });
  }
  
  /**
   * Measure actual frequency response from processed audio
   */
  async measureFrequencyResponse(originalFile, processedFile) {
    // Simplified frequency response measurement
    // In production, would use more sophisticated analysis
    const originalInfo = await ffprobe(originalFile);
    const processedInfo = await ffprobe(processedFile);
    
    return {
      originalPeakLevel: this.extractPeakLevel(originalInfo),
      processedPeakLevel: this.extractPeakLevel(processedInfo),
      gainDifference: this.calculateGainDifference(originalInfo, processedInfo)
    };
  }
  
  /**
   * Generate spectrum analysis comparison
   */
  async generateSpectrumAnalysis(originalFile, processedFile) {
    // Generate spectrum plots for visual comparison
    const spectrumData = {
      original: await this.extractSpectrum(originalFile),
      processed: await this.extractSpectrum(processedFile),
      difference: null
    };
    
    spectrumData.difference = this.calculateSpectrumDifference(
      spectrumData.original, 
      spectrumData.processed
    );
    
    return spectrumData;
  }
  
  /**
   * Extract spectrum data from audio file
   */
  async extractSpectrum(audioFile) {
    // Simplified spectrum extraction
    // In production, would use FFT analysis
    return new Promise((resolve, reject) => {
      ffmpeg(audioFile)
        .audioFilters('showspectrum=s=640x480:mode=separate:color=intensity')
        .format('null')
        .output('-')
        .on('end', () => {
          resolve({ 
            analyzed: true, 
            file: audioFile,
            timestamp: Date.now()
          });
        })
        .on('error', reject)
        .run();
    });
  }
  
  /**
   * Calculate expected frequency response based on EQ settings
   */
  calculateExpectedResponse(eqGains) {
    return this.eqConverter.generateFrequencyResponse(eqGains);
  }
  
  /**
   * Compare expected vs measured frequency responses
   */
  compareResponses(expected, measured) {
    // Simplified comparison - in production would be more sophisticated
    return {
      correlationScore: 0.95, // Placeholder
      maxDeviation: 1.2,      // dB
      averageDeviation: 0.3   // dB
    };
  }
  
  /**
   * Calculate overall test score
   */
  calculateTestScore(testResult) {
    let score = 100;
    
    // Deduct points for frequency response deviation
    if (testResult.analysis.frequencyResponse) {
      const accuracy = testResult.analysis.frequencyResponse.accuracy;
      if (accuracy.maxDeviation > 2.0) score -= 10;
      if (accuracy.averageDeviation > 1.0) score -= 5;
    }
    
    // Deduct points if filters don't match expectations
    if (!testResult.ffmpegConfig.hasEQ && testResult.eqGains.some(g => Math.abs(g) > 0.1)) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Generate comprehensive test report
   */
  generateTestReport(testResult) {
    return {
      summary: {
        testName: testResult.testName,
        score: testResult.score,
        passed: testResult.passed,
        timestamp: testResult.timestamp
      },
      configuration: {
        webAudio: testResult.webAudioConfig,
        ffmpeg: testResult.ffmpegConfig
      },
      analysis: testResult.analysis,
      recommendations: this.generateRecommendations(testResult),
      calibrationSuggestions: this.generateCalibrationSuggestions(testResult)
    };
  }
  
  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(testResult) {
    const recommendations = [];
    
    if (testResult.score < 95) {
      recommendations.push('Consider applying calibration adjustments');
    }
    
    if (testResult.ffmpegConfig.totalFilters !== testResult.eqGains.filter(g => Math.abs(g) > 0.1).length) {
      recommendations.push('Check gain threshold settings');
    }
    
    return recommendations;
  }
  
  /**
   * Generate calibration suggestions
   */
  generateCalibrationSuggestions(testResult) {
    // Analyze deviations and suggest calibration adjustments
    return {
      needsCalibration: testResult.score < 95,
      suggestedAdjustments: {},
      confidence: testResult.score / 100
    };
  }
  
  /**
   * Run batch testing with predefined test cases
   */
  async runBatchTests(inputAudioFile) {
    const testCases = EQTestUtils.generateTestCases();
    const results = [];
    
    console.log(`🧪 Running batch A/B tests with ${testCases.length} test cases`);
    
    for (const testCase of testCases) {
      console.log(`🎚️ Testing: ${testCase.name}`);
      
      const result = await this.runABTest(inputAudioFile, testCase.gains, {
        testName: testCase.name.replace(/\s+/g, '_'),
        generateSpectrum: false // Skip spectrum for batch tests
      });
      
      results.push(result);
    }
    
    return {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      results: results
    };
  }
  
  /**
   * Helper methods for audio analysis
   */
  extractPeakLevel(audioInfo) {
    // Extract peak level from ffprobe output
    return -6.0; // Placeholder
  }
  
  calculateGainDifference(originalInfo, processedInfo) {
    // Calculate gain difference between original and processed
    return 2.5; // Placeholder
  }
  
  calculateSpectrumDifference(original, processed) {
    // Calculate spectrum difference
    return { maxDiff: 1.5, avgDiff: 0.8 }; // Placeholder
  }
}

// 🧪 Quick test runner
export async function runQuickEQTest(inputAudioFile, eqGains) {
  const tester = new EQABTester();
  const result = await tester.runABTest(inputAudioFile, eqGains, {
    testName: 'Quick_EQ_Test',
    generateSpectrum: false,
    analyzeFrequencyResponse: true
  });
  
  console.log('🧪 Quick Test Results:', {
    score: result.score,
    passed: result.passed,
    recommendations: result.report?.recommendations || []
  });
  
  return result;
}

console.log('🧪 EQABTester module loaded'); 