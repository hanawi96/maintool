// 🧪 Smart Click Testing Utilities
// Console testing tools for SmartClickManager behavior

import { createSmartClickManager, CLICK_ZONES, CLICK_ACTIONS } from './smartClickManager';

// 🎯 Create test smart click manager
const createTestSmartClickManager = () => {
  const manager = createSmartClickManager();
  console.log('🧪 [SmartClickTest] Created test manager:', manager.getDebugInfo());
  return manager;
};

// 🎯 Test click zone detection
const testClickZoneDetection = () => {
  console.log('🧪 [SmartClickTest] Testing click zone detection...');
  
  const manager = createTestSmartClickManager();
  
  // Test scenario: Selection from 10s to 50s in 60s duration
  const duration = 60;
  const startTime = 10;
  const endTime = 50;
  
  const testCases = [
    { clickTime: 5, expectedZone: CLICK_ZONES.BEFORE_START, handle: null },
    { clickTime: 10, expectedZone: CLICK_ZONES.INSIDE_SELECTION, handle: null },
    { clickTime: 30, expectedZone: CLICK_ZONES.INSIDE_SELECTION, handle: null },
    { clickTime: 50, expectedZone: CLICK_ZONES.INSIDE_SELECTION, handle: null },
    { clickTime: 55, expectedZone: CLICK_ZONES.AFTER_END, handle: null },
    { clickTime: 10, expectedZone: CLICK_ZONES.ON_START_HANDLE, handle: 'start' },
    { clickTime: 50, expectedZone: CLICK_ZONES.ON_END_HANDLE, handle: 'end' },
    { clickTime: -5, expectedZone: CLICK_ZONES.OUTSIDE_DURATION, handle: null },
    { clickTime: 65, expectedZone: CLICK_ZONES.OUTSIDE_DURATION, handle: null }
  ];
  
  testCases.forEach((testCase, index) => {
    const zone = manager.analyzeClickZone(
      testCase.clickTime,
      startTime,
      endTime,
      duration,
      testCase.handle
    );
    
    const status = zone === testCase.expectedZone ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: click=${testCase.clickTime}s, handle=${testCase.handle || 'none'}, expected=${testCase.expectedZone}, got=${zone}`);
  });
  
  console.log('✅ Click zone detection tests completed');
};

// 🎯 Test smart action determination
const testSmartActionDetermination = () => {
  console.log('🧪 [SmartClickTest] Testing smart action determination...');
  
  const manager = createTestSmartClickManager();
  
  // Test scenario: Selection from 15s to 45s
  const startTime = 15;
  const endTime = 45;
  
  const testCases = [
    { 
      clickTime: 8, 
      zone: CLICK_ZONES.BEFORE_START, 
      expectedAction: CLICK_ACTIONS.UPDATE_START,
      description: 'Click before start → Update start'
    },
    { 
      clickTime: 55, 
      zone: CLICK_ZONES.AFTER_END, 
      expectedAction: CLICK_ACTIONS.UPDATE_END,
      description: 'Click after end → Update end'
    },
    { 
      clickTime: 30, 
      zone: CLICK_ZONES.INSIDE_SELECTION, 
      expectedAction: CLICK_ACTIONS.JUMP_TO_TIME,
      description: 'Click inside selection → Jump to time'
    },
    { 
      clickTime: 15, 
      zone: CLICK_ZONES.ON_START_HANDLE, 
      expectedAction: CLICK_ACTIONS.START_DRAG,
      description: 'Click on start handle → Start drag'
    },
    { 
      clickTime: 45, 
      zone: CLICK_ZONES.ON_END_HANDLE, 
      expectedAction: CLICK_ACTIONS.START_DRAG,
      description: 'Click on end handle → Start drag'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const actionDetails = manager.determineAction(
      testCase.zone,
      testCase.clickTime,
      startTime,
      endTime
    );
    
    const status = actionDetails.action === testCase.expectedAction ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedAction}, Got: ${actionDetails.action}`);
    console.log(`   Reason: ${actionDetails.reason}`);
  });
  
  console.log('✅ Smart action determination tests completed');
};

// 🎯 Test minimum selection validation
const testMinimumSelectionValidation = () => {
  console.log('🧪 [SmartClickTest] Testing minimum selection validation...');
  
  const manager = createTestSmartClickManager();
  
  // Set minimum selection to 1 second
  manager.updatePreferences({ requireMinSelection: 1.0 });
  
  // Test scenario: Current selection 10s to 12s (2s duration)
  const startTime = 10;
  const endTime = 12;
  
  const testCases = [
    { 
      clickTime: 11.2, 
      zone: CLICK_ZONES.BEFORE_START,
      expectedAction: CLICK_ACTIONS.UPDATE_START,
      shouldPass: true,
      description: 'Valid update: 11.2s to 12s = 0.8s (should fail min validation)'
    },
    { 
      clickTime: 9.5, 
      zone: CLICK_ZONES.BEFORE_START,
      expectedAction: CLICK_ACTIONS.UPDATE_START,
      shouldPass: true,
      description: 'Valid update: 9.5s to 12s = 2.5s (should pass)'
    },
    { 
      clickTime: 12.5, 
      zone: CLICK_ZONES.AFTER_END,
      expectedAction: CLICK_ACTIONS.UPDATE_END,
      shouldPass: true,
      description: 'Valid update: 10s to 12.5s = 2.5s (should pass)'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const actionDetails = manager.determineAction(
      testCase.zone,
      testCase.clickTime,
      startTime,
      endTime
    );
    
    const isValidAction = actionDetails.action !== CLICK_ACTIONS.NO_ACTION;
    const newDuration = actionDetails.newEndTime - actionDetails.newStartTime;
    
    console.log(`🧪 Test ${index + 1}: ${testCase.description}`);
    console.log(`   Action: ${actionDetails.action}`);
    console.log(`   New duration: ${newDuration.toFixed(2)}s`);
    console.log(`   Valid: ${isValidAction ? 'YES' : 'NO'}`);
    console.log(`   Reason: ${actionDetails.reason}`);
  });
  
  console.log('✅ Minimum selection validation tests completed');
};

// 🎯 Test complete click processing flow
const testCompleteClickFlow = () => {
  console.log('🧪 [SmartClickTest] Testing complete click processing flow...');
  
  const manager = createTestSmartClickManager();
  
  // Test scenario: Audio duration 120s, current selection 20s to 80s
  const duration = 120;
  let startTime = 20;
  let endTime = 80;
  
  const clickSequence = [
    { time: 10, handle: null, description: 'Click before start (10s)' },
    { time: 50, handle: null, description: 'Click inside selection (50s)' },
    { time: 90, handle: null, description: 'Click after end (90s)' },
    { time: 20, handle: 'start', description: 'Click on start handle' },
    { time: 80, handle: 'end', description: 'Click on end handle' }
  ];
  
  clickSequence.forEach((click, index) => {
    console.log(`\n🖱️ Step ${index + 1}: ${click.description}`);
    
    const result = manager.processClick(
      click.time,
      startTime,
      endTime,
      duration,
      click.handle
    );
    
    console.log(`   Action: ${result.action}`);
    console.log(`   Zone: ${result.zone}`);
    console.log(`   Reason: ${result.reason}`);
    
    if (result.action === CLICK_ACTIONS.UPDATE_START) {
      console.log(`   Start: ${startTime.toFixed(2)}s → ${result.newStartTime.toFixed(2)}s`);
      startTime = result.newStartTime; // Simulate state update
    } else if (result.action === CLICK_ACTIONS.UPDATE_END) {
      console.log(`   End: ${endTime.toFixed(2)}s → ${result.newEndTime.toFixed(2)}s`);
      endTime = result.newEndTime; // Simulate state update
    } else if (result.action === CLICK_ACTIONS.JUMP_TO_TIME) {
      console.log(`   Seek to: ${result.seekTime.toFixed(2)}s`);
    }
    
    console.log(`   Current selection: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
  });
  
  console.log('\n✅ Complete click flow test completed');
};

// 🎯 Test preference configurations
const testPreferenceConfigurations = () => {
  console.log('🧪 [SmartClickTest] Testing preference configurations...');
  
  const manager = createTestSmartClickManager();
  
  console.log('\n📋 Testing preference updates...');
  
  // Test different configurations
  const configurations = [
    { 
      enableSmartUpdate: false,
      description: 'Disable smart updates (fallback to create selection)'
    },
    { 
      requireMinSelection: 2.0,
      description: 'Increase minimum selection to 2 seconds'
    },
    { 
      allowZeroDuration: true,
      description: 'Allow zero-duration selections'
    }
  ];
  
  configurations.forEach((config, index) => {
    console.log(`\n⚙️ Configuration ${index + 1}: ${config.description}`);
    
    manager.updatePreferences(config);
    const debugInfo = manager.getDebugInfo();
    
    console.log('   Updated preferences:', debugInfo.preferences);
    
    // Test with this configuration
    const testResult = manager.processClick(5, 10, 50, 60, null);
    console.log(`   Test click before start: ${testResult.action} (${testResult.reason})`);
  });
  
  console.log('\n✅ Preference configuration tests completed');
};

// 🎯 Add to window for console access
if (typeof window !== 'undefined') {
  window.smartClickTest = {
    createTestSmartClickManager,
    testClickZoneDetection,
    testSmartActionDetermination,
    testMinimumSelectionValidation,
    testCompleteClickFlow,
    testPreferenceConfigurations,
    
    // Quick tests
    runAllTests: () => {
      console.log('🧪 [SmartClickTest] Running all smart click tests...\n');
      testClickZoneDetection();
      console.log('');
      testSmartActionDetermination();
      console.log('');
      testMinimumSelectionValidation();
      console.log('');
      testCompleteClickFlow();
      console.log('');
      testPreferenceConfigurations();
      console.log('\n🎉 All smart click tests completed!');
    },
    
    // Interactive test functions
    enableSmartClick: () => {
      console.log('⚙️ [SmartClickTest] Enabling smart click behavior...');
      console.log('💡 Use: interactionManager.configureSmartClick({ enableSmartUpdate: true })');
    },
    
    disableSmartClick: () => {
      console.log('⚙️ [SmartClickTest] Disabling smart click behavior...');
      console.log('💡 Use: interactionManager.configureSmartClick({ enableSmartUpdate: false })');
    },
    
    setMinSelection: (seconds) => {
      console.log(`⚙️ [SmartClickTest] Setting minimum selection to ${seconds}s...`);
      console.log(`💡 Use: interactionManager.configureSmartClick({ requireMinSelection: ${seconds} })`);
    }
  };
  
  console.log('🧪 [SmartClickTest] Test utilities available at window.smartClickTest');
  console.log('📋 Available commands:');
  console.log('  - smartClickTest.runAllTests() - Run all tests');
  console.log('  - smartClickTest.testClickZoneDetection() - Test click zone logic');
  console.log('  - smartClickTest.testSmartActionDetermination() - Test action selection');
  console.log('  - smartClickTest.testCompleteClickFlow() - Test complete workflow');
  console.log('  - smartClickTest.enableSmartClick() - Enable smart behavior');
  console.log('  - smartClickTest.setMinSelection(1.5) - Set minimum selection duration');
}

export {
  createTestSmartClickManager,
  testClickZoneDetection,
  testSmartActionDetermination,
  testMinimumSelectionValidation,
  testCompleteClickFlow,
  testPreferenceConfigurations
}; 