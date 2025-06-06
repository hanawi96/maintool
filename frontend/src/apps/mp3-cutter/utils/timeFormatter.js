export const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Format time with milliseconds for inputs
  export const formatTimeWithMs = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };
  
  // Parse time from string format MM:SS.mmm
  export const parseTimeFromString = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    
    const minutes = parseInt(parts[0]);
    if (isNaN(minutes) || minutes < 0) return null;
    
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0]);
    if (isNaN(seconds) || seconds < 0 || seconds >= 60) return null;
    
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) : 0;
    if (isNaN(milliseconds) || milliseconds < 0 || milliseconds >= 1000) return null;
    
    return minutes * 60 + seconds + milliseconds / 1000;
  };
  
  // Format file size
  export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };