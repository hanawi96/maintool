import React from 'react';
import { Upload } from 'lucide-react';

// 🎯 **FILE UPLOAD SECTION**: Extract upload UI logic for better code organization
const FileUploadSection = React.memo(({ 
  isConnected,
  isUploading,
  uploadProgress,
  compatibilityReport,
  onFileUpload,
  onDrop
}) => {
  return (
    <div 
      className={`upload-section border-2 border-dashed rounded-2xl p-16 text-center backdrop-blur-sm transition-all duration-300 ${
        isConnected === false 
          ? 'border-red-300 bg-red-50/60 hover:border-red-400' 
          : 'border-indigo-300 bg-white/60 hover:border-indigo-400 hover:bg-white/80'
      }`}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className={`mx-auto mb-4 w-16 h-16 ${
        isConnected === false ? 'text-red-400' : 'text-indigo-400'
      }`} />
      <h3 className="text-xl font-semibold mb-2 text-slate-800">
        {isConnected === false ? 'Backend Offline' : 'Upload Audio File'}
      </h3>
      <p className="text-slate-600 mb-6">
        {isConnected === false 
          ? 'Please start the backend server to upload files' 
          : 'Drag & drop your audio file here or click to browse'
        }
      </p>
      
      {/* 🆕 COMPATIBILITY INFO */}
      {compatibilityReport && (
        <div className="mb-6">
          <div className="text-sm text-slate-600 mb-2">Supported Formats:</div>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.values(compatibilityReport.universal)
              .filter(format => format.support.level === 'high')
              .map((format, index) => (
                <span 
                  key={index}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                >
                  {format.displayName}
                </span>
              ))}
          </div>
        </div>
      )}
      
      {/* 🎯 Upload Progress Display */}
      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress || 0}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">Uploading... {uploadProgress || 0}%</p>
        </div>
      )}
      
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => onFileUpload(e.target.files[0])}
        className="hidden"
        id="file-upload"
        disabled={isUploading || isConnected === false}
      />
      <label
        htmlFor="file-upload"
        className={`inline-flex items-center px-6 py-3 rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl font-medium ${
          isUploading || isConnected === false
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
        }`}
      >
        {isUploading ? 'Uploading...' : isConnected === false ? 'Backend Offline' : 'Choose File'}
      </label>
    </div>
  );
});

FileUploadSection.displayName = 'FileUploadSection';

export default FileUploadSection; 