import { useState, useCallback } from 'react';
import { audioApi } from '../services/audioApi';
import { isValidAudioFile, createAudioURL } from '../utils/audioUtils';

export const useFileUpload = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = useCallback(async (file) => {
    setUploadError(null);
    
    // 🎯 Validate file before upload
    if (!isValidAudioFile(file)) {
      const error = 'Invalid audio file format. Please upload MP3, WAV, AAC, OGG, FLAC, M4A, or WMA files.';
      setUploadError(error);
      throw new Error(error);
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 🔥 **ENHANCED FILE SETUP**: Create URL with better tracking
      const audioUrl = createAudioURL(file);
      
      // 🔥 **IMMEDIATE FILE STATE**: Set file with URL immediately for UI
      const immediateAudioFile = { 
        ...file, 
        url: audioUrl,
        createdAt: Date.now(),
        type: file.type || 'audio/unknown'
      };
      
      setAudioFile(immediateAudioFile);
      setUploadProgress(25); // Local file loaded
      // 🎯 Upload to backend with enhanced error handling
      const result = await audioApi.uploadFile(file);
      setUploadProgress(75); // Upload completed
      // Backend URL can be used for other purposes if needed
      setAudioFile(prev => ({
        ...prev,
        filename: result.data?.file?.filename || result.data?.filename || result.filename || prev.name,
        fileId: result.data?.fileId || result.fileId,
        serverData: result.data || result,
        duration: result.data?.duration || result.duration || result.data?.audio?.duration,
        size: result.data?.size || result.size || result.data?.file?.size,
        serverUrl: result.data?.url || result.url, // Keep server URL separate
        uploadedAt: Date.now()
      }));

      setUploadProgress(100); // Complete
      return result;
      
    } catch (error) {
      console.error('❌ [useFileUpload] Upload failed:', error);
      
      // 🔥 **SMART CLEANUP**: Only cleanup on real errors, not network issues
      const shouldCleanup = !error.message.includes('Network error') && 
                           !error.message.includes('Backend server is not available');
      
      if (shouldCleanup && audioFile?.url) {
        URL.revokeObjectURL(audioFile.url);
        setAudioFile(null);
      }
      
      setUploadProgress(0);
      setUploadError(error.message);
      
      // 🎯 Provide user-friendly error messages
      let userError = error.message;
      if (error.message.includes('Network error')) {
        userError = 'Cannot connect to server. Please make sure the backend is running and try again.';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        userError = 'File is too large. Maximum size is 100MB.';
      } else if (error.message.includes('415') || error.message.includes('Unsupported')) {
        userError = 'Unsupported audio format. Please upload MP3, WAV, AAC, OGG, FLAC, M4A, or WMA files.';
      } else if (error.message.includes('400')) {
        userError = 'Invalid audio file. Please check the file and try again.';
      }
      
      throw new Error(userError);
    } finally {
      setIsUploading(false);
    }
  }, [audioFile]);

  const clearFile = useCallback(() => {
    if (audioFile?.url && audioFile.url.startsWith('blob:')) {
      URL.revokeObjectURL(audioFile.url);
    }
    
    setAudioFile(null);
    setUploadProgress(0);
    setUploadError(null);
  }, [audioFile]);

  // 🎯 NEW: Test backend connectivity
  const testConnection = useCallback(async () => {
    try {
      await audioApi.healthCheck();
      return true;
    } catch (error) {
      console.error('❌ [useFileUpload] Backend connection failed:', error);
      setUploadError('Backend server is not available. Please check if the server is running.');
      return false;
    }
  }, []);

  return {
    audioFile,
    uploadProgress,
    isUploading,
    uploadError,
    uploadFile,
    clearFile,
    testConnection
  };
};