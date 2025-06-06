// 🧪 Audio Sync Testing Utilities
// Console testing tools for AudioSyncManager

import { createAudioSyncManager } from './audioSyncManager';

// 🎯 Create test sync manager
const createTestSyncManager = () => {
  const manager = createAudioSyncManager();
  console.log('🧪 [AudioSyncTest] Created test sync manager:', manager.getDebugInfo());
  return manager;
};

// 🎯 Test sync decision logic
const testSyncDecision = () => {
  console.log('🧪 [AudioSyncTest] Testing sync decision logic...');
  
  const manager = createTestSyncManager();
  
  const scenarios = [
    { handle: 'start', isPlaying: true, newTime: 10, expected: true },
    { handle: 'start', isPlaying: false, newTime: 10, expected: true }, // Should sync even when pausedf
    { handle: 'end', isPlaying: true, newTime: 20, expected: false }, // End handle sync disabled by defaulthh
    { handle: 'start', isPlaying: true, newTime: -1, expected: false }, // Invalid time
    { handle: 'start', isPlaying: true, newTime: NaN, expected: false }, // Invalid time
  ];
  
  scenarios.forEach((scenario, index) => {
    const result = manager.shouldSync(
      scenario.handle,
      scenario.isPlaying,
      scenario.newTime
    );
    
    const status = result === scenario.expected ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: handle=${scenario.handle}, playing=${scenario.isPlaying}, time=${scenario.newTime}, expected=${scenario.expected}, got=${result}`);
  });
  
  console.log('✅ Sync decision tests completed');
};

// 🎯 Test sync preferences
const testSyncPreferences = () => {
  console.log('🧪 [AudioSyncTest] Testing sync preferences...');
  
  const manager = createTestSyncManager();
  
  // Test default preferences
  console.log('📋 Default preferences:', manager.getDebugInfo().preferences);
  
  // Test preference updates
  console.log('\n📝 Testing preference updates...');
  
  manager.updatePreferences({
    syncEndHandle: true,
    syncOnlyWhenPlaying: true
  });
  
  const updatedPrefs = manager.getDebugInfo().preferences;
  console.log('📋 Updated preferences:', updatedPrefs);
  
  // Test with new preferences
  const shouldSyncEnd = manager.shouldSync('end', true, 15);
  const shouldSyncWhenPaused = manager.shouldSync('start', false, 10);
  
  console.log(`🎯 End handle sync (should be true): ${shouldSyncEnd}`);
  console.log(`🎯 Sync when paused (should be false): ${shouldSyncWhenPaused}`);
  
  console.log('✅ Preference tests completed');
};

// 🎯 Test throttling mechanism
const testThrottling = () => {
  console.log('🧪 [AudioSyncTest] Testing throttling mechanism...');
  
  const manager = createTestSyncManager();
  
  // Create mock audio context
  let mockCurrentTime = 0;
  const mockAudioContext = {
    audioRef: {
      current: {
        currentTime: mockCurrentTime,
        get currentTime() { return mockCurrentTime; },
        set currentTime(value) { 
          mockCurrentTime = value;
          console.log(`🎵 [Mock] Audio currentTime set to ${value.toFixed(2)}s`);
        }
      }
    },
    setCurrentTime: (time) => {
      console.log(`⚛️ [Mock] React currentTime set to ${time.toFixed(2)}s`);
    },
    isPlaying: true
  };
  
  console.log('🎯 Testing rapid sync calls (should be throttled)...');
  
  // Rapid sync calls
  for (let i = 0; i < 5; i++) {
    const time = 5 + i * 0.1;
    console.log(`\n🔄 Attempt ${i + 1}: Syncing to ${time.toFixed(1)}s`);
    
    const shouldSync = manager.shouldSync('start', true, time);
    console.log(`   Should sync: ${shouldSync}`);
    
    if (shouldSync) {
      manager.syncAudioCursor(
        time,
        mockAudioContext.audioRef,
        mockAudioContext.setCurrentTime,
        mockAudioContext.isPlaying,
        'start'
      );
    }
    
    // Small delay between calls
    // Note: In real usage, these would be from mouse move events
  }
  
  console.log('✅ Throttling tests completed');
};

// 🎯 Test complete interaction flow with audio sync
const testCompleteFlow = () => {
  console.log('🧪 [AudioSyncTest] Testing complete interaction flow...');
  
  const manager = createTestSyncManager();
  
  // Create mock audio context
  let mockCurrentTime = 0;
  const mockAudioContext = {
    audioRef: {
      current: {
        currentTime: mockCurrentTime,
        get currentTime() { return mockCurrentTime; },
        set currentTime(value) { 
          mockCurrentTime = value;
          console.log(`🎵 [Mock] Audio seeked to ${value.toFixed(2)}s`);
        },
        paused: false
      }
    },
    setCurrentTime: (time) => {
      console.log(`⚛️ [Mock] React state updated to ${time.toFixed(2)}s`);
    },
    isPlaying: true
  };
  
  console.log('🎬 Scenario: User drags start handle from 5s to 12s while playing');
  
  // Simulate drag sequence
  const dragSequence = [
    { time: 5.0, description: 'Drag start' },
    { time: 6.5, description: 'Drag to 6.5s' },
    { time: 8.2, description: 'Drag to 8.2s' },
    { time: 10.0, description: 'Drag to 10.0s' },
    { time: 12.0, description: 'Drag end at 12s' }
  ];
  
  dragSequence.forEach((step, index) => {
    console.log(`\n📍 Step ${index + 1}: ${step.description}`);
    
    const shouldSync = manager.shouldSync('start', true, step.time);
    if (shouldSync) {
      manager.syncAudioCursor(
        step.time,
        mockAudioContext.audioRef,
        mockAudioContext.setCurrentTime,
        mockAudioContext.isPlaying,
        'start'
      );
    }
    
    // Add delay to simulate real interaction timing
    setTimeout(() => {}, 50);
  });
  
  // Final completion sync
  console.log('\n🏁 Completing drag...');
  manager.completeDragSync(
    'start',
    12.0,
    mockAudioContext.audioRef,
    mockAudioContext.setCurrentTime,
    mockAudioContext.isPlaying
  );
  
  console.log('✅ Complete flow test completed');
};

// 🎯 Test end handle sync with offset
const testEndHandleOffset = () => {
  console.log('🧪 [AudioSyncTest] Testing end handle sync with 3s offset...');
  
  const manager = createTestSyncManager();
  
  // Enable end handle sync
  manager.updatePreferences({ 
    syncEndHandle: true,
    endHandleOffset: 3.0
  });
  
  console.log('⚙️ Updated preferences:', manager.getDebugInfo().preferences);
  
  // Create mock audio context
  let mockCurrentTime = 0;
  const mockAudioContext = {
    audioRef: {
      current: {
        get currentTime() { return mockCurrentTime; },
        set currentTime(value) { 
          mockCurrentTime = value;
          console.log(`🎵 [Mock] Audio seeked to ${value.toFixed(2)}s`);
        },
        paused: false
      }
    },
    setCurrentTime: (time) => {
      console.log(`⚛️ [Mock] React state updated to ${time.toFixed(2)}s`);
    },
    isPlaying: true
  };
  
  // Test scenarios
  const testCases = [
    { endTime: 10.0, expectedTarget: 7.0, description: '10s end → 7s target (3s offset)' },
    { endTime: 5.0, expectedTarget: 2.0, description: '5s end → 2s target (3s offset)' },
    { endTime: 2.0, expectedTarget: 0.0, description: '2s end → 0s target (minimum bound)' },
    { endTime: 30.0, expectedTarget: 27.0, description: '30s end → 27s target (3s offset)' }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📍 Test ${index + 1}: ${testCase.description}`);
    
    // Test shouldSync
    const shouldSync = manager.shouldSync('end', true, testCase.endTime);
    console.log(`   Should sync: ${shouldSync ? 'YES' : 'NO'}`);
    
    if (shouldSync) {
      // Test syncAudioCursor with offset calculation
      manager.syncAudioCursor(
        testCase.endTime,
        mockAudioContext.audioRef,
        mockAudioContext.setCurrentTime,
        mockAudioContext.isPlaying,
        'end'
      );
      
      const actualTarget = mockCurrentTime;
      const matches = Math.abs(actualTarget - testCase.expectedTarget) < 0.01;
      console.log(`   Expected target: ${testCase.expectedTarget.toFixed(2)}s`);
      console.log(`   Actual target: ${actualTarget.toFixed(2)}s`);
      console.log(`   Result: ${matches ? '✅ PASS' : '❌ FAIL'}`);
    }
  });
  
  console.log('\n✅ End handle offset tests completed');
};

// 🎯 Add to window for console access
if (typeof window !== 'undefined') {
  window.audioSyncTest = {
    createTestSyncManager,
    testSyncDecision,
    testSyncPreferences,
    testThrottling,
    testCompleteFlow,
    testEndHandleOffset,
    
    // Quick tests
    runAllTests: () => {
      console.log('🧪 [AudioSyncTest] Running all audio sync tests...\n');
      testSyncDecision();
      console.log('');
      testSyncPreferences();
      console.log('');
      testThrottling();
      console.log('');
      testCompleteFlow();
      console.log('');
      testEndHandleOffset();
      console.log('\n🎉 All audio sync tests completed!');
    },
    
    // Interactive test functions
    enableEndHandleSync: () => {
      console.log('⚙️ [AudioSyncTest] Enabling end handle sync...');
      // This would need to be connected to the actual manager instance
      console.log('💡 Use: interactionManager.configureAudioSync({ syncEndHandle: true })');
    },
    
    disableAudioSync: () => {
      console.log('⚙️ [AudioSyncTest] Disabling audio sync...');
      console.log('💡 Use: interactionManager.setAudioSyncEnabled(false)');
    }
  };
  
  console.log('🧪 [AudioSyncTest] Test utilities available at window.audioSyncTest');
  console.log('📋 Available commands:');
  console.log('  - audioSyncTest.runAllTests() - Run all tests');
  console.log('  - audioSyncTest.testSyncDecision() - Test sync decision logic');
  console.log('  - audioSyncTest.testSyncPreferences() - Test preference system');
  console.log('  - audioSyncTest.testThrottling() - Test throttling mechanism');
  console.log('  - audioSyncTest.testCompleteFlow() - Test complete interaction');
  console.log('  - audioSyncTest.testEndHandleOffset() - Test end handle sync with 3s offset');
}

export {
  createTestSyncManager,
  testSyncDecision,
  testSyncPreferences,
  testThrottling,
  testCompleteFlow,
  testEndHandleOffset
}; 