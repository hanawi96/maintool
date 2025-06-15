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
    if (!isValidAudioFile(file)) {
      const error = 'Invalid audio file format. Please upload MP3, WAV, AAC, OGG, FLAC, M4A, or WMA files.';
      setUploadError(error); throw new Error(error);
    }
    setIsUploading(true); setUploadProgress(0);

    try {
      const audioUrl = createAudioURL(file);
      setAudioFile({ ...file, url: audioUrl, createdAt: Date.now(), type: file.type || 'audio/unknown' });
      setUploadProgress(25);

      const result = await audioApi.uploadFile(file);
      setUploadProgress(75);

      setAudioFile(prev => ({
        ...prev,
        filename: result.data?.file?.filename || result.data?.filename || result.filename || prev.name,
        originalName: result.data?.file?.originalName || result.data?.originalName,
        fileId: result.data?.fileId || result.fileId,
        serverData: result.data || result,
        duration: result.data?.duration || result.duration || result.data?.audio?.duration,
        size: result.data?.size || result.size || result.data?.file?.size,
        serverUrl: result.data?.url || result.url,
        uploadedAt: Date.now(),
      }));

      setUploadProgress(100);
      return result;
    } catch (error) {
      // Chỉ cleanup khi thật sự lỗi tệp
      if (audioFile?.url && !error.message.includes('Network error')) {
        URL.revokeObjectURL(audioFile.url);
        setAudioFile(null);
      }
      setUploadProgress(0);
      let userError = error.message;
      if (/Network error/.test(error.message)) userError = 'Cannot connect to server. Please make sure the backend is running and try again.';
      if (/413|too large/i.test(error.message)) userError = 'File is too large. Maximum size is 100MB.';
      if (/415|Unsupported/i.test(error.message)) userError = 'Unsupported audio format. Please upload MP3, WAV, AAC, OGG, FLAC, M4A, or WMA files.';
      if (/400/.test(error.message)) userError = 'Invalid audio file. Please check the file and try again.';
      setUploadError(userError);
      throw new Error(userError);
    } finally {
      setIsUploading(false);
    }
  }, [audioFile]);

  const clearFile = useCallback(() => {
    if (audioFile?.url?.startsWith('blob:')) URL.revokeObjectURL(audioFile.url);
    setAudioFile(null);
    setUploadProgress(0);
    setUploadError(null);
  }, [audioFile]);

  const testConnection = useCallback(async () => {
    try {
      await audioApi.healthCheck();
      return true;
    } catch {
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
    testConnection,
  };
};
