import React, { useState } from 'react';
import UnifiedControlBar from './index';

const TestAddRegion = () => {
  const [regions, setRegions] = useState([]);
  const [message, setMessage] = useState('');

  const handleAddRegion = () => {
    const newRegion = {
      id: Date.now(),
      start: Math.random() * 100,
      end: Math.random() * 100 + 100,
      name: `Region ${regions.length + 1}`
    };
    setRegions(prev => [...prev, newRegion]);
    setMessage(`✅ Added ${newRegion.name}! Total: ${regions.length + 1}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteRegion = () => {
    if (regions.length >= 2) {
      const removed = regions[regions.length - 1];
      setRegions(prev => prev.slice(0, -1));
      setMessage(`🗑️ Deleted ${removed.name}! Remaining: ${regions.length - 1}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleClearAll = () => {
    const count = regions.length;
    setRegions([]);
    setMessage(`🧹 Cleared all ${count} regions!`);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-slate-800">
          🧪 Test Add Region Button - Always Active!
        </h1>
        
        {/* Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="font-semibold mb-2">Current Status:</h2>
          <p className="text-sm text-slate-600">Regions: {regions.length}</p>
          {message && (
            <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded text-sm">
              {message}
            </div>
          )}
        </div>

        {/* Regions List */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="font-semibold mb-2">Regions List:</h2>
          {regions.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No regions yet - Add Region button should always work!</p>
          ) : (
            <div className="space-y-1">
              {regions.map((region, index) => (
                <div key={region.id} className="text-sm p-2 bg-slate-50 rounded">
                  {index + 1}. {region.name} ({region.start.toFixed(1)}s - {region.end.toFixed(1)}s)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UnifiedControlBar - Focus on Region Buttons */}
        <div className="bg-white rounded-lg shadow-lg border p-4">
          <h2 className="font-semibold mb-4">UnifiedControlBar with Region Management:</h2>
          <div className="bg-slate-100 p-4 rounded-lg">
            <UnifiedControlBar
              // Basic props - these shouldn't affect Add Region
              disabled={false}
              loading={false}
              duration={180} // 3 minutes
              currentTime={45}
              volume={1}
              playbackRate={1}
              
              // Region management props
              regions={regions}
              onAddRegion={handleAddRegion}
              onDeleteRegion={handleDeleteRegion}
              onClearAllRegions={handleClearAll}
              
              // Mock other handlers
              onPlay={() => {}}
              onPause={() => {}}
              onSeek={() => {}}
              onVolumeChange={() => {}}
              toggleLoop={() => {}}
              toggleShuffle={() => {}}
              toggleMute={() => {}}
              togglePopup={() => {}}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🧪 Test Instructions:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. ✅ <strong>Add Region button</strong> (green with Plus icon) should ALWAYS be clickable</li>
            <li>2. ⚫ <strong>Delete Region button</strong> (red with Minus icon) only works when ≥2 regions</li>
            <li>3. 🧹 <strong>Clear All button</strong> (orange with Trash icon) only works when ≥2 regions</li>
            <li>4. 🔥 <strong>Extra indicator</strong>: Clear All shows pulsing dot when ≥5 regions</li>
            <li>5. ⌨️ <strong>Keyboard shortcut</strong>: Try Ctrl+N to add region</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestAddRegion;
