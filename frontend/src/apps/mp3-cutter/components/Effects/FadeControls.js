import React from 'react';
import { Settings, TrendingUp, TrendingDown, Zap, ZapOff } from 'lucide-react';
import { FADE_CONFIG } from '../../utils/constants';

const FadeControls = ({ 
  fadeIn, 
  fadeOut, 
  onFadeInChange, 
  onFadeOutChange, 
  isWebAudioSupported = false,
  realTimeFadeActive = false,
  connectionState = 'disconnected' // 🆕 **CONNECTION STATE**: Web Audio connection status
}) => {
  // 🎯 DEBUG: Log fade changes với enhanced logging cho range 15s
  const handleFadeInChange = (e) => {
    const newValue = parseFloat(e.target.value);
    console.log(`📈 [FadeControls] Fade In changed: ${newValue}s (max: ${FADE_CONFIG.MAX_DURATION}s)`);
    onFadeInChange(newValue);
  };

  const handleFadeOutChange = (e) => {
    const newValue = parseFloat(e.target.value);
    console.log(`📉 [FadeControls] Fade Out changed: ${newValue}s (max: ${FADE_CONFIG.MAX_DURATION}s)`);
    onFadeOutChange(newValue);
  };

  // 🆕 **DYNAMIC PERCENTAGE**: Tính progress dựa trên MAX_DURATION từ config thay vì hardcode 5
  const fadeInPercent = (fadeIn / FADE_CONFIG.MAX_DURATION) * 100;
  const fadeOutPercent = (fadeOut / FADE_CONFIG.MAX_DURATION) * 100;

  // 🆕 **PRESET HANDLER**: Function để apply preset values
  const applyPreset = (presetName) => {
    const preset = FADE_CONFIG.DEFAULT_PRESETS[presetName];
    if (preset) {
      console.log(`🎨 [FadeControls] Applying preset '${presetName}':`, preset);
      onFadeInChange(preset.fadeIn);
      onFadeOutChange(preset.fadeOut);
    }
  };

  // 🆕 **CONNECTION STATUS**: Get status info dựa trên connection state
  const getConnectionStatus = () => {
    if (!isWebAudioSupported) {
      return {
        status: 'unsupported',
        icon: ZapOff,
        text: 'Web Audio Unsupported',
        color: 'slate',
        bgColor: 'slate-100',
        borderColor: 'slate-300'
      };
    }

    switch (connectionState) {
      case 'connected':
        return {
          status: 'connected',
          icon: Zap,
          text: realTimeFadeActive ? 'Real-time Active' : 'Real-time Ready',
          color: realTimeFadeActive ? 'green' : 'blue',
          bgColor: realTimeFadeActive ? 'green-100' : 'blue-100',
          borderColor: realTimeFadeActive ? 'green-300' : 'blue-300'
        };
      case 'connecting':
        return {
          status: 'connecting',
          icon: Zap,
          text: 'Connecting...',
          color: 'amber',
          bgColor: 'amber-100',
          borderColor: 'amber-300'
        };
      case 'error':
        return {
          status: 'error',
          icon: ZapOff,
          text: 'Connection Error',
          color: 'red',
          bgColor: 'red-100',
          borderColor: 'red-300'
        };
      default: // 'disconnected'
        return {
          status: 'disconnected',
          icon: ZapOff,
          text: 'Visual Only',
          color: 'slate',
          bgColor: 'slate-100',
          borderColor: 'slate-300'
        };
    }
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 text-slate-800 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Fade Effects
        
        {/* 🆕 **ENHANCED STATUS INDICATOR**: Show detailed connection status */}
        <div className={`flex items-center gap-1 ml-2 px-2 py-1 rounded-full text-xs transition-all duration-200 ${
          connectionStatus.status === 'connected' && realTimeFadeActive
            ? 'bg-green-100 text-green-800 border border-green-300'
            : connectionStatus.status === 'connected'
            ? 'bg-blue-100 text-blue-800 border border-blue-300'
            : connectionStatus.status === 'connecting'
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : connectionStatus.status === 'error'
            ? 'bg-red-100 text-red-800 border border-red-300'
            : 'bg-slate-100 text-slate-800 border border-slate-300'
        }`}>
          <StatusIcon className="w-3 h-3" />
          <span>{connectionStatus.text}</span>
        </div>
        
        <span className="text-xs text-slate-500 ml-auto">0-{FADE_CONFIG.MAX_DURATION}s</span>
      </h3>
      
      <div className="space-y-4">
        {/* 🎯 Fade In Control - UPDATED với MAX_DURATION */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-600" />
            Fade In
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min={FADE_CONFIG.MIN_DURATION}
                max={FADE_CONFIG.MAX_DURATION}
                step={FADE_CONFIG.STEP}
                value={fadeIn}
                onChange={handleFadeInChange}
                className="fade-in-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                title={`Fade In: ${fadeIn}s (Max: ${FADE_CONFIG.MAX_DURATION}s)`}
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${fadeInPercent}%, #e2e8f0 ${fadeInPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-12 text-right">
              {fadeIn.toFixed(1)}s
            </span>
            {fadeIn > 0 && (
              <button
                onClick={() => onFadeInChange(0)}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                title="Reset Fade In"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* 🎯 Fade Out Control - UPDATED với MAX_DURATION */}
        <div>
          <label className="block text-xs text-slate-600 mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-600" />
            Fade Out
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="range"
                min={FADE_CONFIG.MIN_DURATION}
                max={FADE_CONFIG.MAX_DURATION}
                step={FADE_CONFIG.STEP}
                value={fadeOut}
                onChange={handleFadeOutChange}
                className="fade-out-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                title={`Fade Out: ${fadeOut}s (Max: ${FADE_CONFIG.MAX_DURATION}s)`}
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${fadeOutPercent}%, #e2e8f0 ${fadeOutPercent}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-700 w-12 text-right">
              {fadeOut.toFixed(1)}s
            </span>
            {fadeOut > 0 && (
              <button
                onClick={() => onFadeOutChange(0)}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                title="Reset Fade Out"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 🆕 **ENHANCED QUICK PRESETS**: Presets mới cho range 15s */}
        {(fadeIn === 0 && fadeOut === 0) && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2">Quick Presets:</div>
            <div className="grid grid-cols-2 gap-2">
              {/* 🎯 **ROW 1**: Basic presets */}
              <button
                onClick={() => applyPreset('GENTLE')}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                title="1s fade in/out"
              >
                Gentle (1s)
              </button>
              <button
                onClick={() => applyPreset('STANDARD')}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                title="3s fade in/out"
              >
                Standard (3s)
              </button>
              
              {/* 🎯 **ROW 2**: Advanced presets */}
              <button
                onClick={() => applyPreset('DRAMATIC')}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                title="5s fade in/out"
              >
                Dramatic (5s)
              </button>
              <button
                onClick={() => applyPreset('EXTENDED')}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                title="8s fade in/out - Extended range"
              >
                Extended (8s)
              </button>
              
              {/* 🆕 **ROW 3**: Maximum preset */}
              <button
                onClick={() => applyPreset('MAXIMUM')}
                className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors col-span-2"
                title="15s fade in/out - Maximum duration"
              >
                Maximum (15s)
              </button>
            </div>
          </div>
        )}

        {(fadeIn > 0 || fadeOut > 0) && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Current Settings:</div>
            <div className="flex gap-4 text-xs">
              {fadeIn > 0 && (
                <span className="text-green-700">
                  In: {fadeIn.toFixed(1)}s ({((fadeIn / FADE_CONFIG.MAX_DURATION) * 100).toFixed(0)}%)
                </span>
              )}
              {fadeOut > 0 && (
                <span className="text-red-700">
                  Out: {fadeOut.toFixed(1)}s ({((fadeOut / FADE_CONFIG.MAX_DURATION) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
            {(fadeIn > 0 && fadeOut > 0) && (
              <div className="text-xs text-slate-600 mt-1">
                Total fade time: {(fadeIn + fadeOut).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {/* 🆕 **ENHANCED STATUS INFO**: Show detailed status information */}
        <div className="pt-2 border-t border-slate-200">
          {connectionStatus.status === 'connected' && realTimeFadeActive && (
            <div className="text-xs text-green-700 flex items-center gap-1 mb-2">
              <Zap className="w-3 h-3" />
              <span>Real-time audio fade active - effects apply during playback</span>
            </div>
          )}
          
          {connectionStatus.status === 'connected' && !realTimeFadeActive && (fadeIn > 0 || fadeOut > 0) && (
            <div className="text-xs text-blue-700 flex items-center gap-1 mb-2">
              <Zap className="w-3 h-3" />
              <span>Real-time ready - effects will apply when you play audio</span>
            </div>
          )}
          
          {connectionStatus.status === 'connecting' && (
            <div className="text-xs text-amber-700 flex items-center gap-1 mb-2">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>Connecting to Web Audio API...</span>
            </div>
          )}
          
          {connectionStatus.status === 'error' && (
            <div className="text-xs text-red-700 flex items-center gap-1 mb-2">
              <ZapOff className="w-3 h-3" />
              <span>Web Audio connection failed - fade effects will only be applied during export</span>
            </div>
          )}
          
          {connectionStatus.status === 'unsupported' && (fadeIn > 0 || fadeOut > 0) && (
            <div className="text-xs text-slate-700 flex items-center gap-1 mb-2">
              <ZapOff className="w-3 h-3" />
              <span>Web Audio API not supported - fade effects will only be applied during export</span>
            </div>
          )}
          
          {connectionStatus.status === 'disconnected' && (fadeIn > 0 || fadeOut > 0) && (
            <div className="text-xs text-slate-700 flex items-center gap-1 mb-2">
              <ZapOff className="w-3 h-3" />
              <span>Real-time effects not connected - fade effects will only be applied during export</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FadeControls;