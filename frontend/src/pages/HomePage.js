import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Music, Volume2, Download, FileAudio, Settings, Play, ArrowRight } from 'lucide-react';
import { preloadCriticalPages } from '../utils/preloader';

const HomePage = () => {
  // 🚀 Preload critical pages after homepage loads
  useEffect(() => {
    preloadCriticalPages();
  }, []);

  const categories = [
    {
      id: 'cut-mp3',
      title: 'Cắt MP3',
      description: 'Cắt và trim file MP3 chính xác đến từng giây',
      icon: Scissors,
      path: '/cut-mp3',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'convert-mp3',
      title: 'Chuyển đổi MP3',
      description: 'Chuyển đổi các định dạng âm thanh khác nhau',
      icon: Download,
      path: '/convert-mp3',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'extract-vocals',
      title: 'Tách nhạc & lời',
      description: 'Tách vocals hoặc instrumental từ file nhạc',
      icon: Volume2,
      path: '/extract-vocals',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'merge-audio',
      title: 'Ghép nhạc',
      description: 'Ghép nhiều file âm thanh thành một file',
      icon: Music,
      path: '/merge-audio',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      id: 'audio-editor',
      title: 'Chỉnh sửa âm thanh',
      description: 'Điều chỉnh âm lượng, tốc độ và hiệu ứng',
      icon: FileAudio,
      path: '/audio-editor',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      id: 'settings',
      title: 'Cài đặt nâng cao',
      description: 'Tùy chỉnh chất lượng và các thiết lập khác',
      icon: Settings,
      path: '/settings',
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-800/50',
      iconColor: 'text-gray-600 dark:text-gray-400'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 dark:from-purple-700 dark:via-purple-800 dark:to-purple-900"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              <span className="block">Công cụ chỉnh sửa</span>
              <span className="block bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent">
                MP3 miễn phí
              </span>
            </h1>
            <p className="text-xl text-purple-100 dark:text-purple-200 mb-8 max-w-3xl mx-auto">
              Cắt, chuyển đổi và chỉnh sửa file MP3 trực tuyến một cách dễ dàng. 
              Không cần cài đặt phần mềm, hoàn toàn miễn phí và bảo mật.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/cut-mp3"
                className="inline-flex items-center px-8 py-4 bg-white dark:bg-gray-100 text-purple-700 dark:text-purple-800 font-semibold rounded-xl hover:bg-purple-50 dark:hover:bg-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Play className="w-5 h-5 mr-2" />
                Bắt đầu ngay
              </Link>
              <button className="inline-flex items-center px-8 py-4 border-2 border-white dark:border-gray-200 text-white dark:text-gray-200 font-semibold rounded-xl hover:bg-white dark:hover:bg-gray-200 hover:text-purple-700 dark:hover:text-purple-800 transition-all duration-200">
                Tìm hiểu thêm
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Các công cụ âm thanh
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Chọn công cụ phù hợp cho nhu cầu chỉnh sửa âm thanh của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.id}
                  to={category.path}
                  className="group bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-xl dark:shadow-gray-900/30 dark:hover:shadow-gray-900/50 transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-600"
                >
                  <div className={`w-16 h-16 ${category.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${category.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:text-purple-700 dark:group-hover:text-purple-300">
                    <span>Sử dụng ngay</span>
                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tại sao chọn MP3 Cutter Pro?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Nhanh chóng</h3>
              <p className="text-gray-600 dark:text-gray-400">Xử lý file âm thanh với tốc độ siêu nhanh, tiết kiệm thời gian của bạn.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Bảo mật</h3>
              <p className="text-gray-600 dark:text-gray-400">File của bạn được xử lý cục bộ, đảm bảo quyền riêng tư tuyệt đối.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Miễn phí</h3>
              <p className="text-gray-600 dark:text-gray-400">Sử dụng tất cả tính năng hoàn toàn miễn phí, không giới hạn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;