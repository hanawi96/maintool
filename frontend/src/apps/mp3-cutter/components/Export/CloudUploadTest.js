import React, { useState } from 'react';
import CloudUploadPanel from './CloudUploadPanel';

// Test component để kiểm tra CloudUploadPanel
const CloudUploadTest = () => {
  const [hasProcessedFile, setHasProcessedFile] = useState(false);
  
  // Mock processed file data
  const mockProcessedFile = {
    filename: 'test_audio_cut_2025.mp3',
    fileSize: 5242880, // 5MB
    outputFormat: 'mp3',
    duration: 180.5,
    processedAt: new Date().toISOString()
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">🌤️ Cloud Upload Panel Test</h1>
        
        {/* Test Controls */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setHasProcessedFile(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              !hasProcessedFile 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🚫 No Processed File
          </button>
          <button
            onClick={() => setHasProcessedFile(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              hasProcessedFile 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✅ Has Processed File
          </button>
        </div>

        {/* State Info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Current State:</h3>
          <div className="text-sm text-slate-600">
            <div>• Processed File: {hasProcessedFile ? '✅ Available' : '❌ Not Available'}</div>
            {hasProcessedFile && (
              <>
                <div>• Filename: {mockProcessedFile.filename}</div>
                <div>• Size: {(mockProcessedFile.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                <div>• Format: {mockProcessedFile.outputFormat.toUpperCase()}</div>
                <div>• Duration: {mockProcessedFile.duration}s</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Upload Panel */}
      <CloudUploadPanel
        processedFile={hasProcessedFile ? mockProcessedFile : null}
        isEnabled={hasProcessedFile}
        onUploadComplete={(serviceId, result) => {
          console.log(`✅ Upload completed to ${serviceId}:`, result);
          alert(`Upload completed to ${serviceId}!`);
        }}
        className="mx-auto"
      />

      {/* Design Notes */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-slate-800 mb-3">🎨 Design Improvements</h3>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Conditional Rendering:</strong> Panel only shows when audio has been cut</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Modern Icons:</strong> Replaced emoji with Lucide React icons</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Card Design:</strong> Service buttons now use modern card layout</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Status Indicators:</strong> Clear visual status for connection state</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Progress Bars:</strong> Enhanced progress visualization with gradients</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span><strong>Consistent Colors:</strong> Unified color scheme throughout the component</span>
          </div>
        </div>
      </div>

      {/* Service Icons Legend */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-slate-800 mb-4">🎯 Service Icons</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200">
              <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 002 2H6a2 2 0 002-2v0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-800">Google Drive</div>
              <div className="text-xs text-slate-500">FolderOpen icon</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200">
              <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="m3 5 9 9 9-9"></path>
                <path d="M3 12l9 9 9-9"></path>
                <path d="m3 5v14a9 3 0 0 0 9 3 9 3 0 0 0 9-3V5"></path>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-800">Dropbox</div>
              <div className="text-xs text-slate-500">Database icon</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200">
              <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m12 2-8 4 8 4 8-4-8-4z"></path>
                <path d="m4 10 8 4 8-4"></path>
                <path d="m4 14 8 4 8-4"></path>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-800">OneDrive</div>
              <div className="text-xs text-slate-500">HardDrive icon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudUploadTest;
