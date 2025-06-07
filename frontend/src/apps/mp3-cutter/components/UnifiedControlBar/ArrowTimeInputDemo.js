import React, { useState } from 'react';

// 🎯 **ARROW TIME INPUT DEMO** - Standalone demo for testing
const ArrowTimeInputDemo = () => {
  const [startTime, setStartTime] = useState(15.3); // Test value: 00:15.3
  const [endTime, setEndTime] = useState(65.7);     // Test value: 01:05.7
  const duration = 120.0; // 2 minutes test duration

  return (
    <div className="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">ArrowTimeInput Demo</h2>
      
      <div className="space-y-4">
        {/* Format Display */}
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-1">New Format: MM:SS.d</div>
          <div>• Minutes:Seconds.Tenths</div>
          <div>• Arrow buttons for ±0.1s adjustments</div>
          <div>• Compact design for single-row layout</div>
        </div>

        {/* Demo Values */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time:</label>
              <div className="text-lg font-mono">
                {Math.floor(startTime / 60).toString().padStart(2, '0')}:
                {Math.floor(startTime % 60).toString().padStart(2, '0')}.
                {Math.floor((startTime % 1) * 10)}
              </div>
              <div className="text-xs text-gray-500">{startTime.toFixed(1)}s</div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Time:</label>
              <div className="text-lg font-mono">
                {Math.floor(endTime / 60).toString().padStart(2, '0')}:
                {Math.floor(endTime % 60).toString().padStart(2, '0')}.
                {Math.floor((endTime % 1) * 10)}
              </div>
              <div className="text-xs text-gray-500">{endTime.toFixed(1)}s</div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <div className="text-sm font-medium text-purple-700">
              Selection: {(endTime - startTime).toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Test Controls:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStartTime(Math.min(endTime - 0.1, startTime + 0.1))}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Start +0.1s
            </button>
            <button
              onClick={() => setStartTime(Math.max(0, startTime - 0.1))}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Start -0.1s
            </button>
            <button
              onClick={() => setEndTime(Math.min(duration, endTime + 0.1))}
              className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
            >
              End +0.1s
            </button>
            <button
              onClick={() => setEndTime(Math.max(startTime + 0.1, endTime - 0.1))}
              className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
            >
              End -0.1s
            </button>
          </div>
        </div>

        {/* Arrow Design Preview */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Arrow Design Preview:</div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-l bg-white font-mono">
              01:23.4
            </div>
            <div className="flex flex-col border-t border-r border-b border-slate-300 rounded-r">
              <button className="px-1 py-0.5 text-xs bg-white hover:bg-indigo-50 transition-colors border-b border-slate-200 rounded-tr">
                <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-gray-600 mx-auto"></div>
              </button>
              <button className="px-1 py-0.5 text-xs bg-white hover:bg-indigo-50 transition-colors rounded-br">
                <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-gray-600 mx-auto"></div>
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            ▲ = +0.1s, ▼ = -0.1s
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">How to Test in Main App:</div>
          <ol className="text-xs text-gray-600 space-y-1">
            <li>1. Upload an audio file</li>
            <li>2. Look at UnifiedControlBar time inputs</li>
            <li>3. Use arrow buttons (▲▼) to adjust times</li>
            <li>4. Click time display to edit manually</li>
            <li>5. Use console functions: testArrowTimeInput()</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ArrowTimeInputDemo; 