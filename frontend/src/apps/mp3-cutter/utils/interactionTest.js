// 🧪 Interaction Testing Utilities
// Console testing tools for InteractionManager

import { 
  detectHandle, 
  positionToTime, 
  createInteractionManager,
  INTERACTION_STATES,
  HANDLE_TYPES 
} from './interactionUtils';

// 🎯 Create test manager instance
const createTestManager = () => {
  const manager = createInteractionManager();
  console.log('🧪 [Test] Created test interaction manager:', manager.getDebugInfo());
  return manager;
};

// 🎯 Test handle detection
const testHandleDetection = () => {
  console.log('🧪 [Test] Testing handle detection...');
  
  const scenarios = [
    { x: 100, canvas: 800, duration: 60, start: 10, end: 50, expected: 'start' },
    { x: 200, canvas: 800, duration: 60, start: 10, end: 50, expected: null },
    { x: 666, canvas: 800, duration: 60, start: 10, end: 50, expected: 'end' },
    { x: 0, canvas: 800, duration: 60, start: 0, end: 30, expected: 'start' },
    { x: 400, canvas: 800, duration: 60, start: 0, end: 30, expected: 'end' }
  ];
  
  scenarios.forEach((scenario, index) => {
    const result = detectHandle(
      scenario.x, 
      scenario.canvas, 
      scenario.duration, 
      scenario.start, 
      scenario.end
    );
    
    const status = result === scenario.expected ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: x=${scenario.x}, expected=${scenario.expected}, got=${result}`);
  });
};

// 🎯 Test position to time conversion
const testPositionToTime = () => {
  console.log('🧪 [Test] Testing position to time conversion...');
  
  const scenarios = [
    { x: 0, canvas: 800, duration: 60, expected: 0 },
    { x: 400, canvas: 800, duration: 60, expected: 30 },
    { x: 800, canvas: 800, duration: 60, expected: 60 },
    { x: 200, canvas: 800, duration: 120, expected: 30 },
    { x: -10, canvas: 800, duration: 60, expected: 0 }, // Clamp test
    { x: 900, canvas: 800, duration: 60, expected: 60 } // Clamp test
  ];
  
  scenarios.forEach((scenario, index) => {
    const result = positionToTime(scenario.x, scenario.canvas, scenario.duration);
    const rounded = Math.round(result * 100) / 100;
    const status = Math.abs(rounded - scenario.expected) < 0.01 ? '✅' : '❌';
    
    console.log(`${status} Test ${index + 1}: x=${scenario.x}, expected=${scenario.expected}s, got=${rounded}s`);
  });
};

// 🎯 Test full interaction flow
const testInteractionFlow = () => {
  console.log('🧪 [Test] Testing interaction flow...');
  
  const manager = createTestManager();
  const mockCanvas = { width: 800 };
  const duration = 60;
  let startTime = 10;
  let endTime = 50;
  
  console.log('📊 Initial state:', manager.getDebugInfo());
  
  // Test 1: Click on start handle
  console.log('\n🖱️ Test 1: Click on start handle');
  const result1 = manager.handleMouseDown(133, mockCanvas.width, duration, startTime, endTime);
  console.log('Result:', result1);
  console.log('State:', manager.getDebugInfo());
  
  // Test 2: Move mouse (dragging)
  console.log('\n🖱️ Test 2: Move mouse while dragging');
  const result2 = manager.handleMouseMove(200, mockCanvas.width, duration, startTime, endTime);
  console.log('Result:', result2);
  
  // Test 3: Mouse up
  console.log('\n🖱️ Test 3: Mouse up');
  const result3 = manager.handleMouseUp(15, endTime); // Assume startTime changed to 15
  console.log('Result:', result3);
  console.log('Final state:', manager.getDebugInfo());
  
  // Test 4: Hover (should not change region)
  console.log('\n🖱️ Test 4: Hover over end handle');
  manager.handleMouseMove(666, mockCanvas.width, duration, 15, endTime);
  console.log('Hover state:', manager.getDebugInfo());
  
  console.log('✅ Interaction flow test completed');
};

// 🎯 Performance test
const testPerformance = () => {
  console.log('🧪 [Test] Testing performance...');
  
  const manager = createTestManager();
  const iterations = 1000;
  
  // Test handle detection performance
  console.time('Handle Detection Performance');
  for (let i = 0; i < iterations; i++) {
    detectHandle(Math.random() * 800, 800, 60, 10, 50);
  }
  console.timeEnd('Handle Detection Performance');
  
  // Test position conversion performance
  console.time('Position Conversion Performance');
  for (let i = 0; i < iterations; i++) {
    positionToTime(Math.random() * 800, 800, 60);
  }
  console.timeEnd('Position Conversion Performance');
  
  console.log(`✅ Performance test completed (${iterations} iterations each)`);
};

// 🎯 Add to window for console access
if (typeof window !== 'undefined') {
  window.interactionTest = {
    createTestManager,
    testHandleDetection,
    testPositionToTime,
    testInteractionFlow,
    testPerformance,
    
    // Direct access to utilities
    detectHandle,
    positionToTime,
    INTERACTION_STATES,
    HANDLE_TYPES,
    
    // Quick tests
    runAllTests: () => {
      console.log('🧪 [InteractionTest] Running all tests...\n');
      testHandleDetection();
      console.log('');
      testPositionToTime();
      console.log('');
      testInteractionFlow();
      console.log('');
      testPerformance();
      console.log('\n🎉 All tests completed!');
    }
  };
  
  console.log('🧪 [InteractionTest] Test utilities available at window.interactionTest');
  console.log('📋 Available commands:');
  console.log('  - interactionTest.runAllTests() - Run all tests');
  console.log('  - interactionTest.testHandleDetection() - Test handle detection');
  console.log('  - interactionTest.testPositionToTime() - Test position conversion');
  console.log('  - interactionTest.testInteractionFlow() - Test interaction flow');
  console.log('  - interactionTest.testPerformance() - Performance benchmarks');
}

export {
  createTestManager,
  testHandleDetection,
  testPositionToTime,
  testInteractionFlow,
  testPerformance
}; 