import React from 'react';
import { Heart, Github, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo và mô tả */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">MP3 Cutter Pro</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Công cụ chỉnh sửa âm thanh trực tuyến miễn phí, giúp bạn cắt, chuyển đổi và xử lý file MP3 dễ dàng.
            </p>
          </div>

          {/* Liên kết nhanh */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li><a href="/cut-mp3" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Cắt MP3</a></li>
              <li><a href="/convert-mp3" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Chuyển đổi MP3</a></li>
              <li><a href="/extract-vocals" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Tách nhạc & lời</a></li>
              <li><a href="/merge-audio" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">Ghép nhạc</a></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Liên hệ</h3>
            <div className="flex space-x-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="mailto:contact@mp3cutterpro.com" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 MP3 Cutter Pro. Tất cả quyền được bảo lưu.
            </p>
            <p className="text-sm text-gray-500 flex items-center mt-2 sm:mt-0">
              Được tạo với <Heart className="w-4 h-4 text-red-500 mx-1" /> bởi MP3 Cutter Pro Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 