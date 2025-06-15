import React from 'react';
import { Music, HardDrive, Clock } from 'lucide-react';
import { formatTimeUnified, formatFileSize } from '../../utils/timeFormatter';

const FileInfoDisplay = ({ audioFile, duration }) => {
  if (!audioFile) return null;

  // Get the original filename from audioFile.originalName
  const displayName = audioFile.originalName || 
                     audioFile.name || 
                     audioFile.filename || 
                     'Audio File';

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Music Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
          <Music className="w-6 h-6 text-white" />
        </div>
        
        {/* File Info */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <div className="text-base font-medium text-gray-900 truncate" title={displayName}>
            {displayName}
          </div>
          
          {/* File Size and Duration */}
          <div className="flex items-center gap-4 mt-1">
            {/* File Size */}
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {formatFileSize(audioFile.size)}
              </span>
            </div>
            
            {/* Duration */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {formatTimeUnified(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileInfoDisplay;