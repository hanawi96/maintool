import React, { useState } from 'react';
import OriginalWaveform from './index'; // Original system

// All config flags here
const DEFAULT_FEATURES = {
  USE_HYBRID_SYSTEM: false,
  SHOW_PERFORMANCE_BADGE: true,
  ENABLE_CACHE: true,
  USE_WEB_WORKERS: true,
  DEBUG_MODE: false
};
let WAVEFORM_FEATURES = { ...DEFAULT_FEATURES };

const SmartWaveform = (props) => {
  // Detect feature support (if needed for hybrid in tương lai)
  const isHybridSupported = React.useMemo(() => {
    try {
      // Always true for fallback (giống logic cũ)
      return true;
    } catch {
      return false;
    }
  }, []);

  // Always force original system
  return <OriginalWaveform {...props} />;
};

// Control API for outside use
export const WaveformSystemControl = {
  setHybridEnabled: (enabled) => { WAVEFORM_FEATURES.USE_HYBRID_SYSTEM = enabled; },
  setPerformanceBadgeEnabled: (enabled) => { WAVEFORM_FEATURES.SHOW_PERFORMANCE_BADGE = enabled; },
  setDebugMode: (enabled) => { WAVEFORM_FEATURES.DEBUG_MODE = enabled; },
  getConfig: () => ({ ...WAVEFORM_FEATURES }),
  resetToDefaults: () => { WAVEFORM_FEATURES = { ...DEFAULT_FEATURES }; }
};

// Debug panel (only appears if DEBUG_MODE true)
export const WaveformDebugPanel = () => {
  const [config, setConfig] = useState({ ...WAVEFORM_FEATURES });

  // Sync config with global flags
  const updateConfig = (key, value) => {
    WAVEFORM_FEATURES[key] = value;
    setConfig({ ...WAVEFORM_FEATURES });
  };

  React.useEffect(() => {
    setConfig({ ...WAVEFORM_FEATURES });
  }, [WAVEFORM_FEATURES.DEBUG_MODE]); // Refresh when debug mode flag flips

  if (!config.DEBUG_MODE) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
      <h3 className="font-bold text-sm mb-2">🔧 Waveform Debug Panel</h3>
      <div className="space-y-2 text-xs">
        {Object.entries(DEFAULT_FEATURES).map(([key, defaultValue]) => (
          <label className="flex items-center" key={key}>
            <input
              type="checkbox"
              checked={!!config[key]}
              onChange={e => updateConfig(key, e.target.checked)}
              className="mr-2"
              disabled={key === 'DEBUG_MODE'} // Don't toggle debug here to avoid locking yourself out
            />
            {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </label>
        ))}
        <button
          onClick={() => {
            WaveformSystemControl.resetToDefaults();
            setConfig({ ...WAVEFORM_FEATURES });
          }}
          className="mt-2 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default SmartWaveform;
