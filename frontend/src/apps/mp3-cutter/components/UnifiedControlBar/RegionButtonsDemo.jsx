import React, { useState } from 'react';
import UnifiedControlBar from './index.js';

// Demo component để test 3 button region mới
const RegionButtonsDemo = () => {
  const [regions, setRegions] = useState([
    { id: 'region-1', startTime: 10, endTime: 20, label: 'Intro', active: true }
  ]);

  // Mock handlers cho demo
  const handleAddRegion = () => {
    const newRegion = {
      id: `region-${Date.now()}`,
      startTime: Math.random() * 60,
      endTime: Math.random() * 60 + 20,
      label: `Region ${regions.length + 1}`,
      active: false
    };
    setRegions(prev => [...prev, newRegion]);
    console.log('🆕 Added new region:', newRegion);
  };

  const handleDeleteRegion = () => {
    if (regions.length >= 2) {
      const activeRegion = regions.find(r => r.active) || regions[0];
      setRegions(prev => prev.filter(r => r.id !== activeRegion.id));
      console.log('❌ Deleted region:', activeRegion);
    }
  };

  const handleClearAllRegions = () => {
    if (regions.length >= 2) {
      setRegions([]);
      console.log('🗑️ Cleared all regions');
    }
  };

  // Mock other props
  const mockProps = {
    isPlaying: false,
    volume: 1,
    playbackRate: 1,
    pitch: 0,
    onTogglePlayPause: () => console.log('Play/Pause'),
    onJumpToStart: () => console.log('Jump to start'),
    onJumpToEnd: () => console.log('Jump to end'),
    onVolumeChange: (v) => console.log('Volume:', v),
    onSpeedChange: (s) => console.log('Speed:', s),
    onPitchChange: (p) => console.log('Pitch:', p),
    startTime: 10,
    endTime: 20,
    duration: 120,
    onStartTimeChange: (t) => console.log('Start time:', t),
    onEndTimeChange: (t) => console.log('End time:', t),
    onInvertSelection: () => console.log('Invert selection'),
    isInverted: false,
    fadeIn: 0,
    fadeOut: 0,
    onFadeInToggle: () => console.log('Fade in toggle'),
    onFadeOutToggle: () => console.log('Fade out toggle'),
    onFadeInChange: (f) => console.log('Fade in:', f),
    onFadeOutChange: (f) => console.log('Fade out:', f),
    canUndo: true,
    canRedo: false,
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    historyIndex: 1,
    historyLength: 5,
    disabled: false,
    onEqualizerChange: (type, data) => console.log('EQ:', type, data),
    equalizerState: null
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">
            🎵 Region Buttons Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Testing the new Add Region, Delete Region, and Clear All Regions buttons
          </p>
          
          {/* Regions Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              Current Regions ({regions.length}):
            </h3>
            {regions.length === 0 ? (
              <p className="text-gray-500 italic">No regions</p>
            ) : (
              <div className="space-y-2">
                {regions.map(region => (
                  <div key={region.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="font-medium">{region.label}</span>
                    <span className="text-sm text-gray-500">
                      {region.startTime.toFixed(1)}s - {region.endTime.toFixed(1)}s
                    </span>
                    {region.active && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Button States Info */}
          <div className="mb-6 grid grid-cols-3 gap-4">            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <h4 className="font-semibold text-emerald-800">Add Region</h4>
              <p className="text-sm text-emerald-600">
                Always active (independent of audio file status)
              </p>
              <p className="text-xs text-emerald-500 mt-1">
                Shortcut: Ctrl+N
              </p>
            </div><div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800">Delete Region</h4>
              <p className="text-sm text-red-600">
                Active when &ge;2 regions
              </p>
              <p className="text-xs text-red-500 mt-1">
                Currently: {regions.length >= 2 ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800">Clear All</h4>
              <p className="text-sm text-orange-600">
                Active when &ge;2 regions
              </p>
              <p className="text-xs text-orange-500 mt-1">
                Currently: {regions.length >= 2 ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* UnifiedControlBar with Region Props */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            UnifiedControlBar with Region Management
          </h2>
          <UnifiedControlBar
            {...mockProps}
            regions={regions}
            onAddRegion={handleAddRegion}
            onDeleteRegion={handleDeleteRegion}
            onClearAllRegions={handleClearAllRegions}
          />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">
            🎯 How to Test
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li>• <strong>Add Region:</strong> Green button with + icon (always active)</li>
            <li>• <strong>Delete Region:</strong> Red button with - icon (active when ≥2 regions)</li>
            <li>• <strong>Clear All:</strong> Orange button with trash icon (active when ≥2 regions)</li>
            <li>• <strong>Keyboard:</strong> Press Ctrl+N to add a new region</li>
            <li>• <strong>Visual Feedback:</strong> Buttons show pulsing dots when active</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegionButtonsDemo;
