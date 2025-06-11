// 🔄 **WAVEFORM SYSTEM SWITCHER** - Easy toggle between old and new systems
import React from 'react';

// 🔄 **IMPORT BOTH SYSTEMS**
import OriginalWaveform from './index'; // Original system
import EnhancedWaveform from './EnhancedWaveform'; // Hybrid system

// 🎯 **SYSTEM FLAGS** - Easy way to enable/disable features
const WAVEFORM_FEATURES = {
  USE_HYBRID_SYSTEM: true, // 🚀 Set to false to use original system
  SHOW_PERFORMANCE_BADGE: true,
  ENABLE_CACHE: true,
  USE_WEB_WORKERS: true,
  DEBUG_MODE: false
};

// 🔄 **SMART WAVEFORM COMPONENT** - Automatically chooses best system
const SmartWaveform = (props) => {
  // 🎯 **FEATURE DETECTION**: Check if hybrid features are supported
  const isHybridSupported = () => {
    try {
      // Check for required features
      const hasWorkers = typeof Worker !== 'undefined';
      const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      const hasIndexedDB = typeof indexedDB !== 'undefined';
      
      if (WAVEFORM_FEATURES.DEBUG_MODE) {
        console.log('🔍 [SmartWaveform] Feature detection:', {
          hasWorkers,
          hasOffscreenCanvas,
          hasIndexedDB,
          hybridEnabled: WAVEFORM_FEATURES.USE_HYBRID_SYSTEM
        });
      }
      
      // Hybrid system works even without all features (graceful fallback)
      return true;
    } catch (error) {
      console.warn('⚠️ [SmartWaveform] Feature detection failed:', error);
      return false;
    }
  };

  // 🎯 **SYSTEM SELECTION**: Choose which system to use
  const useHybridSystem = WAVEFORM_FEATURES.USE_HYBRID_SYSTEM && isHybridSupported();
  
  if (WAVEFORM_FEATURES.DEBUG_MODE) {
    console.log('🎯 [SmartWaveform] System selection:', {
      useHybridSystem,
      reason: useHybridSystem ? 'Hybrid system enabled and supported' : 'Using original system'
    });
  }

  if (useHybridSystem) {
    // 🚀 **HYBRID SYSTEM**: Enhanced with performance features
    return (
      <EnhancedWaveform
        {...props}
        showPerformanceBadge={WAVEFORM_FEATURES.SHOW_PERFORMANCE_BADGE}
        onPerformanceStatsRequest={() => {
          if (WAVEFORM_FEATURES.DEBUG_MODE) {
            console.log('📊 [SmartWaveform] Performance stats requested');
          }
        }}
      />
    );
  } else {
    // 🔄 **ORIGINAL SYSTEM**: Backward compatibility
    return <OriginalWaveform {...props} />;
  }
};

// 🔧 **SYSTEM CONTROL FUNCTIONS** - For debugging and testing
export const WaveformSystemControl = {
  // 🎯 **ENABLE/DISABLE HYBRID SYSTEM**
  setHybridEnabled: (enabled) => {
    WAVEFORM_FEATURES.USE_HYBRID_SYSTEM = enabled;
    console.log('🔄 [WaveformSystemControl] Hybrid system:', enabled ? 'ENABLED' : 'DISABLED');
  },

  // 🎯 **TOGGLE PERFORMANCE BADGE**
  setPerformanceBadgeEnabled: (enabled) => {
    WAVEFORM_FEATURES.SHOW_PERFORMANCE_BADGE = enabled;
    console.log('🔄 [WaveformSystemControl] Performance badge:', enabled ? 'ENABLED' : 'DISABLED');
  },

  // 🎯 **ENABLE/DISABLE DEBUG MODE**
  setDebugMode: (enabled) => {
    WAVEFORM_FEATURES.DEBUG_MODE = enabled;
    console.log('🔄 [WaveformSystemControl] Debug mode:', enabled ? 'ENABLED' : 'DISABLED');
  },

  // 🎯 **GET CURRENT CONFIG**
  getConfig: () => ({ ...WAVEFORM_FEATURES }),

  // 🎯 **RESET TO DEFAULTS**
  resetToDefaults: () => {
    WAVEFORM_FEATURES.USE_HYBRID_SYSTEM = true;
    WAVEFORM_FEATURES.SHOW_PERFORMANCE_BADGE = true;
    WAVEFORM_FEATURES.ENABLE_CACHE = true;
    WAVEFORM_FEATURES.USE_WEB_WORKERS = true;
    WAVEFORM_FEATURES.DEBUG_MODE = false;
    console.log('🔄 [WaveformSystemControl] Reset to defaults');
  }
};

// 🎯 **DEBUG PANEL COMPONENT** - For testing during development
export const WaveformDebugPanel = () => {
  const [config, setConfig] = React.useState(WAVEFORM_FEATURES);

  const updateConfig = (key, value) => {
    WAVEFORM_FEATURES[key] = value;
    setConfig({ ...WAVEFORM_FEATURES });
  };

  if (!WAVEFORM_FEATURES.DEBUG_MODE) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
      <h3 className="font-bold text-sm mb-2">🔧 Waveform Debug Panel</h3>
      <div className="space-y-2 text-xs">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.USE_HYBRID_SYSTEM}
            onChange={(e) => updateConfig('USE_HYBRID_SYSTEM', e.target.checked)}
            className="mr-2"
          />
          Use Hybrid System
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.SHOW_PERFORMANCE_BADGE}
            onChange={(e) => updateConfig('SHOW_PERFORMANCE_BADGE', e.target.checked)}
            className="mr-2"
          />
          Show Performance Badge
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.USE_WEB_WORKERS}
            onChange={(e) => updateConfig('USE_WEB_WORKERS', e.target.checked)}
            className="mr-2"
          />
          Use Web Workers
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.ENABLE_CACHE}
            onChange={(e) => updateConfig('ENABLE_CACHE', e.target.checked)}
            className="mr-2"
          />
          Enable Cache
        </label>
      </div>
    </div>
  );
};

export default SmartWaveform;
