import React, { useState, useCallback } from 'react';
import { 
  Settings, X, Folder, Save, RotateCcw, 
  Check, AlertCircle, FileText, Zap, Bell,
  Calendar, Archive, ChevronRight
} from 'lucide-react';

const CloudSettingsModal = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  services 
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle setting changes
  const handleChange = useCallback((key, value) => {
    setLocalSettings(prev => {
      const updated = { ...prev, [key]: value };
      setHasChanges(true);
      return updated;
    });
  }, []);

  // Handle nested setting changes (like defaultFolders)
  const handleNestedChange = useCallback((parentKey, childKey, value) => {
    setLocalSettings(prev => {
      const updated = {
        ...prev,
        [parentKey]: {
          ...prev[parentKey],
          [childKey]: value
        }
      };
      setHasChanges(true);
      return updated;
    });
  }, []);

  // Save settings
  const handleSave = useCallback(() => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    onClose();
  }, [localSettings, onUpdateSettings, onClose]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaults = {
      autoUpload: false,
      createMonthlyFolders: true,
      compressLargeFiles: true,
      showNotifications: true,
      defaultFolders: {
        google_drive: '/Music/MP3Cutter',
        dropbox: '/Apps/MP3Cutter',
        onedrive: '/Documents/Audio'
      },
      fileNamingPattern: '[timestamp]_[original]_cut.[format]'
    };
    setLocalSettings(defaults);
    setHasChanges(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Cloud Upload Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-8">
            {/* Default Folders */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Default Folders</h3>
              </div>
              <p className="text-sm text-gray-600">
                Set default upload locations for each cloud service
              </p>
              
              <div className="space-y-3">
                {Object.values(services).map(service => (
                  <div key={service.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32">
                      <span className="text-lg">{service.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{service.name}</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localSettings.defaultFolders[service.id] || ''}
                        onChange={(e) => handleNestedChange('defaultFolders', service.id, e.target.value)}
                        placeholder={`/Music/MP3Cutter`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* File Naming */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">File Naming</h3>
              </div>
              <p className="text-sm text-gray-600">
                Customize how uploaded files are named
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naming Pattern
                  </label>
                  <input
                    type="text"
                    value={localSettings.fileNamingPattern}
                    onChange={(e) => handleChange('fileNamingPattern', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Available variables: [timestamp], [original], [format]
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Preview:</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {generatePreviewName(localSettings.fileNamingPattern)}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Upload Options</h3>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localSettings.autoUpload}
                    onChange={(e) => handleChange('autoUpload', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Auto-upload after cutting</div>
                    <div className="text-xs text-gray-500">Automatically upload files to your default service</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localSettings.createMonthlyFolders}
                    onChange={(e) => handleChange('createMonthlyFolders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Create monthly folders
                    </div>
                    <div className="text-xs text-gray-500">Organize uploads by month (e.g., /Music/2024-01/)</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localSettings.compressLargeFiles}
                    onChange={(e) => handleChange('compressLargeFiles', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Archive className="w-4 h-4" />
                      Compress files over 10MB
                    </div>
                    <div className="text-xs text-gray-500">Reduce file size for faster uploads</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={localSettings.showNotifications}
                    onChange={(e) => handleChange('showNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Bell className="w-4 h-4" />
                      Show upload notifications
                    </div>
                    <div className="text-xs text-gray-500">Get notified when uploads complete</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Storage Information */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Storage Limits</h4>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Google Drive: 15GB free, up to 750MB per file</li>
                    <li>• Dropbox: 2GB free, up to 150MB per file</li>
                    <li>• OneDrive: 5GB free, up to 250MB per file</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Generate preview file name
function generatePreviewName(pattern) {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  
  return pattern
    .replace('[timestamp]', timestamp)
    .replace('[original]', 'my_song')
    .replace('[format]', 'mp3');
}

export default CloudSettingsModal;
