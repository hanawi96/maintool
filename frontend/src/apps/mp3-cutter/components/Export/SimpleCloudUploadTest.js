/**
 * Simple Cloud Upload Test
 * Tests basic cloud upload functionality without WebSocket dependencies
 */

import React, { useState } from 'react';
import { Cloud, Upload, Check, AlertCircle } from 'lucide-react';

const SimpleCloudUploadTest = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testCloudUpload = async () => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      // Test 1: Check backend health
      const healthResponse = await fetch('http://localhost:3001/api/cloud/health');
      const healthData = await healthResponse.json();
      
      if (!healthData.success) {
        throw new Error('Backend health check failed');
      }

      // Test 2: Get available services
      const servicesResponse = await fetch('http://localhost:3001/api/cloud/services');
      const servicesData = await servicesResponse.json();
      
      if (!servicesData.success) {
        throw new Error('Failed to fetch services');
      }

      // Test 3: Test mock authentication
      const authResponse = await fetch('http://localhost:3001/api/cloud/auth/google-drive');
      const authData = await authResponse.json();
      
      if (!authData.success) {
        throw new Error('Failed to get auth URL');
      }

      // Test 4: Create a mock file and upload
      const mockFile = new Blob(['mock audio data'], { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', mockFile, 'test-upload.mp3');
      formData.append('serviceId', 'google-drive');
      formData.append('fileName', 'test-upload.mp3');
      formData.append('folder', 'MP3 Cutter Pro/Tests');
      formData.append('sessionId', `mock_session_${Date.now()}`);

      const uploadResponse = await fetch('http://localhost:3001/api/cloud/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      setResult({
        health: healthData,
        services: servicesData.services,
        auth: authData,
        upload: uploadData
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Cloud className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Cloud Upload Test</h2>
      </div>

      <div className="space-y-4">
        <button
          onClick={testCloudUpload}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Test Cloud Upload
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Test Failed</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">All Tests Passed!</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Backend Status:</span>
                <span className="ml-2 text-green-600">{result.health.status}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Available Services:</span>
                <span className="ml-2 text-blue-600">{result.services.length} services</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Mock Auth:</span>
                <span className="ml-2 text-green-600">✓ Working</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">File Upload:</span>
                <span className="ml-2 text-green-600">✓ Success</span>
              </div>
              
              {result.upload.data && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="font-medium text-gray-700 mb-2">Upload Details:</p>
                  <div className="text-xs space-y-1">
                    <div><span className="font-medium">File ID:</span> {result.upload.data.id}</div>
                    <div><span className="font-medium">Name:</span> {result.upload.data.name}</div>
                    <div><span className="font-medium">Size:</span> {result.upload.data.size} bytes</div>
                    {result.upload.data.webViewLink && (
                      <div>
                        <span className="font-medium">View Link:</span> 
                        <a 
                          href={result.upload.data.webViewLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:underline"
                        >
                          Open
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleCloudUploadTest;
