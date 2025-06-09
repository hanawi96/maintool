// 🛠️ **DEBUG CONSOLE FOR GHOST DRAG FIX**
// Development utility để test và debug ghost drag fix

import { testGhostDragFix, checkProtectionStatus } from './ghostDragFix';

class DebugConsole {
  constructor() {
    this.interactionManager = null;
    this.isEnabled = process.env.NODE_ENV === 'development';
    
    if (this.isEnabled) {
      this.setupGlobalDebugCommands();
      console.log('🛠️ [DebugConsole] Ghost drag debug console enabled');
      console.log('🛠️ [DebugConsole] Available commands:');
      console.log('  - window.debugGhostDrag() - Test ghost drag fix');
      console.log('  - window.checkProtection() - Check protection status');
      console.log('  - window.forceProtection() - Force enable protection');
      console.log('  - window.clearProtection() - Clear protection');
    }
  }
  
  setInteractionManager(manager) {
    this.interactionManager = manager;
    if (this.isEnabled) {
      console.log('🛠️ [DebugConsole] Interaction manager connected');
    }
  }
  
  setupGlobalDebugCommands() {
    // Test ghost drag fix
    window.debugGhostDrag = () => {
      if (!this.interactionManager) {
        console.error('❌ [DebugConsole] No interaction manager available');
        return;
      }
      return testGhostDragFix(this.interactionManager);
    };
    
    // Check protection status
    window.checkProtection = () => {
      if (!this.interactionManager) {
        console.error('❌ [DebugConsole] No interaction manager available');
        return;
      }
      const status = checkProtectionStatus(this.interactionManager);
      console.log('🛡️ [ProtectionStatus]', status);
      return status;
    };
    
    // Force enable protection (for testing)
    window.forceProtection = (duration = 1000) => {
      if (!this.interactionManager) {
        console.error('❌ [DebugConsole] No interaction manager available');
        return;
      }
      
      this.interactionManager.isHoverProtected = true;
      this.interactionManager.hoverProtectionUntil = performance.now() + duration;
      
      console.log(`🛡️ [DebugConsole] Protection FORCED for ${duration}ms`);
      
      setTimeout(() => {
        this.interactionManager.isHoverProtected = false;
        this.interactionManager.hoverProtectionUntil = null;
        console.log('✅ [DebugConsole] Protection auto-cleared');
      }, duration);
    };
    
    // Clear protection
    window.clearProtection = () => {
      if (!this.interactionManager) {
        console.error('❌ [DebugConsole] No interaction manager available');
        return;
      }
      
      this.interactionManager.isHoverProtected = false;
      this.interactionManager.hoverProtectionUntil = null;
      console.log('✅ [DebugConsole] Protection manually cleared');
    };
    
    // Get debug info
    window.getDebugInfo = () => {
      if (!this.interactionManager) {
        console.error('❌ [DebugConsole] No interaction manager available');
        return;
      }
      
      const info = this.interactionManager.getDebugInfo();
      console.log('🔍 [DebugInfo]', info);
      return info;
    };
    
    // Simulate ghost drag scenario
    window.simulateGhostDrag = () => {
      console.log('🧪 [DebugConsole] Simulating ghost drag scenario...');
      console.log('1. Drag handle outside canvas');
      console.log('2. Release mouse outside');
      console.log('3. Hover back into canvas');
      console.log('4. Check if handles move (should NOT move if fix works)');
      
      if (this.interactionManager) {
        // Force a drag state
        this.interactionManager.state = 'dragging';
        this.interactionManager.activeHandle = 'end';
        this.interactionManager.isDraggingConfirmed = true;
        
        console.log('🧪 [DebugConsole] Drag state simulated');
        
        // Simulate global mouse up after 2 seconds
        setTimeout(() => {
          console.log('🧪 [DebugConsole] Simulating global mouse up...');
          // Trigger global mouse up handler
          const event = new MouseEvent('mouseup', { bubbles: true });
          document.dispatchEvent(event);
        }, 2000);
      }
    };
  }
  
  log(message, data = null) {
    if (this.isEnabled) {
      if (data) {
        console.log(`🛠️ [DebugConsole] ${message}`, data);
      } else {
        console.log(`🛠️ [DebugConsole] ${message}`);
      }
    }
  }
  
  warn(message, data = null) {
    if (this.isEnabled) {
      if (data) {
        console.warn(`🛠️ [DebugConsole] ${message}`, data);
      } else {
        console.warn(`🛠️ [DebugConsole] ${message}`);
      }
    }
  }
  
  error(message, data = null) {
    if (this.isEnabled) {
      if (data) {
        console.error(`🛠️ [DebugConsole] ${message}`, data);
      } else {
        console.error(`🛠️ [DebugConsole] ${message}`);
      }
    }
  }
}

// Export singleton instance
export const debugConsole = new DebugConsole(); 