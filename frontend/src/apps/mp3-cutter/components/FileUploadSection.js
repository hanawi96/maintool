import React, { useState } from 'react';
import { Upload, Music, CheckCircle, AlertCircle, Wifi, WifiOff, RotateCw, Scissors, Volume2 } from 'lucide-react';

// 🎯 **FILE UPLOAD SECTION**: Extract upload UI logic for better code organization
const FileUploadSection = React.memo(({ 
  isConnected,
  isUploading,
  uploadProgress,
  compatibilityReport,
  onFileUpload,
  onDrop
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e);
  };

  const getStatusConfig = () => {
    if (isConnected === false) {
      return {
        icon: WifiOff,
        title: 'Không thể kết nối',
        subtitle: 'Vui lòng khởi động backend server',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50/80',
        iconColor: 'text-red-500',
        buttonColor: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }
    
    if (isUploading) {
      return {
        icon: RotateCw,
        title: 'Đang tải lên...',
        subtitle: `Tiến trình: ${uploadProgress || 0}%`,
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50/80',
        iconColor: 'text-blue-500 animate-spin',
        buttonColor: 'bg-blue-500 text-white'
      };
    }

    return {
      icon: isDragOver ? CheckCircle : Music,
      title: isDragOver ? 'Thả file để tải lên' : 'Tải lên file âm thanh',
      subtitle: 'Kéo thả file hoặc bấm để chọn file MP3, WAV, M4A...',
      borderColor: isDragOver ? 'border-purple-300' : 'border-gray-200',
      bgColor: isDragOver ? 'bg-purple-50/80' : 'bg-white/80',
      iconColor: isDragOver ? 'text-purple-600' : 'text-gray-400',
      buttonColor: 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 🎨 **HEADER SECTION**: Beautiful header with icon, title and description */}
      <div className="text-center mb-8 sm:mb-12">
        {/* Main Icon */}
        
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Cắt nhạc & chỉnh sửa
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-600 max-w-lg mx-auto leading-relaxed px-4">
          Cắt, chỉnh sửa và tạo hiệu ứng fade cho file nhạc một cách chuyên nghiệp
        </p>

        {/* Feature Tags */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 px-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <Scissors className="w-3 h-3 mr-1" />
            Cắt chính xác
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <Volume2 className="w-3 h-3 mr-1" />
            Fade in/out
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <Music className="w-3 h-3 mr-1" />
            Chất lượng cao
          </span>
        </div>
      </div>

      {/* Upload Cardd */}
      <div 
        className={`relative overflow-hidden backdrop-blur-xl rounded-3xl border-2 border-dashed transition-all duration-500 ease-out transform ${
          config.borderColor
        } ${config.bgColor} ${
          isDragOver ? 'scale-105 shadow-2xl' : 'hover:scale-[1.02] shadow-xl hover:shadow-2xl'
        } ${
          isUploading ? 'animate-pulse' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,theme(colors.purple.500),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,theme(colors.blue.500),transparent_50%)]"></div>
        </div>

        <div className="relative p-8 sm:p-12 text-center">
          {/* Status Icon */}
          <div className={`relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${
            isDragOver ? 'bg-purple-100' : 'bg-gray-100'
          } flex items-center justify-center transition-all duration-300 ${
            isDragOver ? 'rotate-3 scale-110' : 'hover:rotate-1 hover:scale-105'
          }`}>
            <StatusIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${config.iconColor} transition-colors duration-300`} />
            {isDragOver && (
              <div className="absolute inset-0 rounded-2xl border-2 border-purple-300 animate-ping"></div>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {config.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed px-4">
              {config.subtitle}
            </p>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mb-6 sm:mb-8">
              <div className="relative w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress || 0}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-gray-500 mt-2">
                <span>Đang xử lý...</span>
                <span className="font-mono">{uploadProgress || 0}%</span>
              </div>
            </div>
          )}

          {/* Upload Button */}
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
            className={`inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${config.buttonColor} ${
              isUploading || isConnected === false ? 'pointer-events-none' : ''
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 sm:mr-3"></div>
                Đang tải lên...
              </>
            ) : isConnected === false ? (
              <>
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                Server offline
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                Chọn file âm thanh
              </>
            )}
          </label>

          {/* Supported Formats - Moved below button, single line */}
          {compatibilityReport && !isUploading && (
            <div className="mt-4 text-center">
              <span className="text-xs sm:text-sm text-gray-500 mr-2">Định dạng hỗ trợ:</span>
              {/* Static list of common formats */}
              {['MP3', 'WAV', 'M4A', 'AAC', 'FLAC', 'OGG', 'WMA', 'AIFF'].map((format, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-1.5 sm:px-2 py-0.5 mx-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
                >
                  {format}
                </span>
              ))}
              <span className="text-xs sm:text-sm text-gray-500 ml-1">...</span>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
            <div className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
              isConnected === false 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {isConnected === false ? (
                <>
                  <WifiOff className="w-2 h-2 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-2 h-2 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Size Limit Note */}
      <div className="text-center mt-3 sm:mt-4 px-4">
        <p className="text-xs sm:text-sm text-gray-500">
          Kích thước file tối đa: <span className="font-semibold">100MB</span> • 
          Thời lượng tối đa: <span className="font-semibold">1 giờ</span>
        </p>
      </div>
    </div>
  );
});

FileUploadSection.displayName = 'FileUploadSection';

export default FileUploadSection; 