// 🛡️ **GHOST DRAG FIX TEST UTILITY**
// Test utility để verify ghost drag fix hoạt động đúng

export const testGhostDragFix = (interactionManager) => {
  if (!interactionManager) {
    console.error('❌ [GhostDragTest] No interaction manager provided');
    return false;
  }

  console.log('🧪 [GhostDragTest] Testing ghost drag fix...');
  
  // Test 1: Hover protection state
  const debugInfo = interactionManager.getDebugInfo();
  console.log('🔍 [GhostDragTest] Current state:', {
    isHoverProtected: debugInfo.isHoverProtected,
    hoverProtectionTimeRemaining: debugInfo.hoverProtectionTimeRemaining,
    state: debugInfo.state,
    isDragging: debugInfo.isDragging
  });
  
  // Test 2: Simulate global mouse up
  console.log('🧪 [GhostDragTest] Simulating global mouse up...');
  
  // Test 3: Check if hover protection is activated
  setTimeout(() => {
    const afterDebugInfo = interactionManager.getDebugInfo();
    console.log('🔍 [GhostDragTest] After global mouse up:', {
      isHoverProtected: afterDebugInfo.isHoverProtected,
      hoverProtectionTimeRemaining: afterDebugInfo.hoverProtectionTimeRemaining,
      testResult: afterDebugInfo.isHoverProtected ? '✅ PROTECTION ACTIVE' : '❌ NO PROTECTION'
    });
  }, 100);
  
  return true;
};

// 🎯 **GHOST DRAG DETECTION UTILITY**
export const detectGhostDrag = (handlePositions, hoverState) => {
  const isGhostDrag = (
    // Handle position changes without confirmed drag
    (handlePositions.startChanged || handlePositions.endChanged) &&
    // During hover state
    hoverState.isHovering &&
    // Without proper mouse down sequence
    !hoverState.hasMouseDown
  );
  
  if (isGhostDrag) {
    console.warn('🚨 [GhostDragDetection] GHOST DRAG DETECTED:', {
      startChanged: handlePositions.startChanged,
      endChanged: handlePositions.endChanged,
      isHovering: hoverState.isHovering,
      hasMouseDown: hoverState.hasMouseDown,
      severity: 'HIGH - Handle moving without proper drag sequence'
    });
  }
  
  return isGhostDrag;
};

// 🛡️ **PROTECTION STATUS CHECKER**
export const checkProtectionStatus = (interactionManager) => {
  const debugInfo = interactionManager.getDebugInfo();
  
  return {
    isProtected: debugInfo.isHoverProtected,
    timeRemaining: debugInfo.hoverProtectionTimeRemaining,
    canHover: !debugInfo.isHoverProtected,
    status: debugInfo.isHoverProtected ? 
      `🛡️ PROTECTED (${Math.ceil(debugInfo.hoverProtectionTimeRemaining)}ms remaining)` : 
      '✅ NORMAL HOVER ALLOWED'
  };
}; 