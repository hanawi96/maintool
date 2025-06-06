import React from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ 
  onFileSelect, 
  accept = "*/*", 
  multiple = false, 
  disabled = false,
  className = "",
  children 
}) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(multiple ? files : files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFileSelect(multiple ? files : files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-white/60 backdrop-blur-sm hover:border-slate-400 hover:bg-white/80 transition-all duration-300 ${className}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className="mx-auto mb-4 w-12 h-12 text-slate-400" />
      
      {children || (
        <>
          <h3 className="text-lg font-semibold mb-2 text-slate-800">Upload File</h3>
          <p className="text-slate-600 mb-4">Drag & drop your file here or click to browse</p>
        </>
      )}
      
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        className={`inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg cursor-pointer hover:bg-slate-700 transition-all duration-200 font-medium ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Choose File
      </label>
    </div>
  );
};

export default FileUpload;