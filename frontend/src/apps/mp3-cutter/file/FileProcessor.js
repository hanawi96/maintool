import { useCallback } from 'react';
import { 
  validateAudioFile, createSafeAudioURL
} from '../utils/audioUtils';

// File upload handler
export const useFileUploadHandler = ({
  uploadFile,
  generateWaveform,
  audioRef,
  duration,
  saveState,
  setIsInverted,
  isConnected,
  testConnection,
  setIsConnected,
  setConnectionError,
  dispatch
}) => {
  // 🚀 Optimized file upload - MOVED UP to fix initialization order
  const handleFileUpload = useCallback(async (file) => {
    console.log('🎯 handleFileUpload called with file:', file?.name);
    window.lastFileUploadTime = Date.now();
    dispatch({ type: 'RESET_FILE' });
    setIsInverted(false);
    window.preventInvertStateRestore = true;
    setTimeout(() => { window.preventInvertStateRestore = false; }, 10000);
    window.currentAudioFile = file;
    
    try {
      const validation = validateAudioFile(file);
      dispatch({ type: 'SET_AUDIO_STATE', payload: { fileValidation: validation } });
      
      if (!validation.valid) {
        dispatch({ 
          type: 'SET_AUDIO_STATE', 
          payload: { 
            audioError: { 
              type: 'validation', 
              title: 'File Validation Failed', 
              message: validation.errors.join('; '), 
              suggestions: ['Convert to MP3 or WAV format', 'Check if file is corrupted', 'Try a smaller file size'], 
              supportedFormats: ['MP3', 'WAV', 'M4A', 'MP4'] 
            } 
          } 
        });
        return;
      }
      
      if (isConnected === false) {
        const connected = await testConnection();
        if (!connected) throw new Error('Backend server is not available.');
        setIsConnected(true);
        setConnectionError(null);
      }
      
      await uploadFile(file);
      const immediateAudioUrl = createSafeAudioURL(file);
      if (!immediateAudioUrl) throw new Error('Failed to create audio URL');
      
      if (audioRef.current) {
        audioRef.current.src = immediateAudioUrl;
        audioRef.current.load();
        dispatch({ type: 'SET_AUDIO_STATE', payload: { audioError: null } });
      }
      
      const waveformResult = await generateWaveform(file);
      const audioDuration = waveformResult.duration || audioRef.current?.duration || duration || 0;
        if (audioDuration > 0) {
        // 🆕 Include regions in initial state (empty for new upload)
        saveState({ 
          startTime: 0, 
          endTime: audioDuration, 
          fadeIn: 0, 
          fadeOut: 0, 
          isInverted: false,
          regions: [],
          activeRegionId: null
        });
      }
    } catch (error) {
      console.error('🔥 handleFileUpload error:', error);
      dispatch({ 
        type: 'SET_AUDIO_STATE', 
        payload: { 
          audioError: { 
            type: 'upload', 
            title: 'Upload Failed', 
            message: error.message, 
            suggestions: ['Check your internet connection', 'Try a different file', 'Restart the backend server'] 
          } 
        } 
      });
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection, setIsInverted, setIsConnected, setConnectionError, dispatch]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    console.log('🎯 handleDrop called with files:', files.length);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  return {
    handleFileUpload,
    handleDrop
  };
}; 