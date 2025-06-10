import React from 'react';
import { Link } from 'react-router-dom';
import { FileAudio, Upload } from 'lucide-react';

const AudioEditorPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileAudio className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Chỉnh sửa âm thanh</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Điều chỉnh âm lượng, tốc độ và thêm hiệu ứng cho file âm thanh
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tính năng đang phát triển
            </h3>
            <p className="text-gray-600 mb-6">
              Công cụ chỉnh sửa âm thanh nâng cao sẽ sớm được ra mắt
            </p>
            <Link
              to="/"
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors inline-block"
            >
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioEditorPage; 