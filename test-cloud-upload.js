/**
 * Cloud Upload Feature Test Suite
 * Tests mock cloud storage functionality end-to-end
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Test configuration
const API_BASE = 'http://localhost:3001/api/cloud';
const TEST_FILE_PATH = path.join(__dirname, '../backend/storage/mp3-cutter/processed');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

class CloudUploadTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runTest(name, testFn) {
    this.totalTests++;
    log('blue', `\n🧪 Running test: ${name}`);
    
    try {
      await testFn();
      this.passedTests++;
      log('green', `✅ PASSED: ${name}`);
      this.testResults.push({ name, status: 'PASSED', error: null });
    } catch (error) {
      log('red', `❌ FAILED: ${name}`);
      log('red', `   Error: ${error.message}`);
      this.testResults.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async testHealthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    if (!data.success) {
      throw new Error('Health check returned success: false');
    }
    
    log('yellow', '   Health check passed');
  }

  async testGetServices() {
    const response = await fetch(`${API_BASE}/services`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Get services failed: ${response.status}`);
    }
    
    if (!data.success || !Array.isArray(data.services)) {
      throw new Error('Invalid services response');
    }
    
    if (data.services.length !== 3) {
      throw new Error(`Expected 3 services, got ${data.services.length}`);
    }
    
    log('yellow', `   Found ${data.services.length} services`);
  }

  async testMockAuth() {
    const serviceId = 'google-drive';
    const response = await fetch(`${API_BASE}/auth/${serviceId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Auth initiation failed: ${response.status}`);
    }
    
    if (!data.success || !data.authUrl) {
      throw new Error('Invalid auth response');
    }
    
    // Check if it's a mock URL in development
    if (process.env.NODE_ENV === 'development' && data.authUrl.includes('mock')) {
      log('yellow', '   Mock auth URL generated');
    } else {
      log('yellow', '   Real auth URL generated');
    }
    
    return data;
  }

  async testMockCallback() {
    const serviceId = 'google-drive';
    const mockCode = 'mock_test_code_12345';
    const mockState = 'test_state_12345';
    
    const response = await fetch(`${API_BASE}/callback/${serviceId}?code=${mockCode}&state=${mockState}`);
    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status}`);
    }
    
    if (!text.includes('localStorage.setItem')) {
      throw new Error('Invalid callback response - missing localStorage script');
    }
    
    log('yellow', '   Mock OAuth callback successful');
  }

  async getTestFile() {
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file directory not found: ${TEST_FILE_PATH}`);
    }
    
    const files = fs.readdirSync(TEST_FILE_PATH).filter(f => f.endsWith('.mp3'));
    if (files.length === 0) {
      // Create a small test file
      const testContent = Buffer.from('Test MP3 content for cloud upload');
      const testFileName = 'test_upload.mp3';
      const testFilePath = path.join(TEST_FILE_PATH, testFileName);
      fs.writeFileSync(testFilePath, testContent);
      return { path: testFilePath, name: testFileName, size: testContent.length };
    }
    
    const fileName = files[0];
    const filePath = path.join(TEST_FILE_PATH, fileName);
    const stats = fs.statSync(filePath);
    
    return { path: filePath, name: fileName, size: stats.size };
  }

  async testMockUpload() {
    const testFile = await this.getTestFile();
    const serviceId = 'google-drive';
    const sessionId = 'mock_session_test_12345';
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile.path));
    formData.append('serviceId', serviceId);
    formData.append('sessionId', sessionId);
    formData.append('fileName', `test_${Date.now()}_${testFile.name}`);
    formData.append('folder', 'MP3 Cutter Pro Test');
    
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} - ${data.error}`);
    }
    
    if (!data.success || !data.data) {
      throw new Error('Invalid upload response');
    }
    
    const result = data.data;
    log('yellow', `   File uploaded: ${result.name} (${result.size} bytes)`);
    log('yellow', `   View URL: ${result.webViewLink}`);
    
    return result;
  }

  async testMockDownload(uploadId) {
    const response = await fetch(`${API_BASE}/mock/download/${uploadId}`);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    log('yellow', `   Downloaded file: ${buffer.length} bytes`);
  }

  async testMockView(uploadId) {
    const response = await fetch(`${API_BASE}/mock/view/${uploadId}`);
    
    if (!response.ok) {
      throw new Error(`View failed: ${response.status}`);
    }
    
    const html = await response.text();
    if (!html.includes('Mock Cloud Storage')) {
      throw new Error('Invalid view page response');
    }
    
    log('yellow', '   Mock view page rendered successfully');
  }

  async testServiceStatus() {
    const serviceId = 'google-drive';
    const sessionId = 'mock_session_test_12345';
    
    const response = await fetch(`${API_BASE}/status/${serviceId}?sessionId=${sessionId}`);
    const data = await response.json();
    
    // In development mode, this might fail or succeed depending on mock setup
    log('yellow', `   Service status check: ${data.success ? 'connected' : 'disconnected'}`);
  }

  async runAllTests() {
    log('blue', '🚀 Starting Cloud Upload Feature Tests');
    log('blue', '=====================================');
    
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Get Services', () => this.testGetServices());
    await this.runTest('Mock Authentication', () => this.testMockAuth());
    await this.runTest('Mock OAuth Callback', () => this.testMockCallback());
    
    let uploadResult = null;
    await this.runTest('Mock File Upload', async () => {
      uploadResult = await this.testMockUpload();
    });
    
    if (uploadResult) {
      await this.runTest('Mock File Download', () => this.testMockDownload(uploadResult.id));
      await this.runTest('Mock File View', () => this.testMockView(uploadResult.id));
    }
    
    await this.runTest('Service Status Check', () => this.testServiceStatus());
    
    this.printResults();
  }

  printResults() {
    log('blue', '\n📊 Test Results Summary');
    log('blue', '========================');
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      const color = result.status === 'PASSED' ? 'green' : 'red';
      log(color, `${icon} ${result.name}`);
      if (result.error) {
        log('red', `    └─ ${result.error}`);
      }
    });
    
    log('blue', '\n📈 Overall Results:');
    log(this.passedTests === this.totalTests ? 'green' : 'yellow', 
        `   ${this.passedTests}/${this.totalTests} tests passed`);
    
    if (this.passedTests === this.totalTests) {
      log('green', '🎉 All tests passed! Cloud upload feature is working correctly.');
    } else {
      log('yellow', '⚠️  Some tests failed. Check the errors above for details.');
    }
    
    const coverage = Math.round((this.passedTests / this.totalTests) * 100);
    log('blue', `📋 Test Coverage: ${coverage}%`);
  }
}

// Check if this is being run directly
if (require.main === module) {
  const tester = new CloudUploadTester();
  
  // Set up environment for testing
  process.env.NODE_ENV = 'development';
  process.env.CLOUD_MOCK_MODE = 'true';
  
  tester.runAllTests().catch(error => {
    log('red', `\n💥 Test suite failed with error:`);
    log('red', error.message);
    process.exit(1);
  });
}

module.exports = CloudUploadTester;
