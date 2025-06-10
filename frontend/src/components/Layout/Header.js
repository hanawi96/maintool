import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, Music, Volume2, Download, FileAudio, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../shared/ThemeContext';

const Header = () => {
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: null },
    { path: '/cut-mp3', label: 'Cắt MP3', icon: Scissors },
    { path: '/convert-mp3', label: 'Chuyển đổi MP3', icon: Download },
    { path: '/extract-vocals', label: 'Tách nhạc & lời', icon: Volume2 },
    { path: '/merge-audio', label: 'Ghép nhạc', icon: Music },
    { path: '/audio-editor', label: 'Chỉnh sửa âm thanh', icon: FileAudio },
    { path: '/settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 rounded-lg flex items-center justify-center">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-500 bg-clip-text text-transparent">
              MP3 Cutter Pro
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              <div className="relative w-5 h-5">
                {/* Sun Icon */}
                <Sun 
                  className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                    isDark 
                      ? 'opacity-0 rotate-90 scale-75' 
                      : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                {/* Moon Icon */}
                <Moon 
                  className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                    isDark 
                      ? 'opacity-100 rotate-0 scale-100' 
                      : 'opacity-0 -rotate-90 scale-75'
                  }`}
                />
              </div>
              
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                isDark 
                  ? 'bg-blue-400/20 shadow-lg shadow-blue-400/25' 
                  : 'bg-yellow-400/20 shadow-lg shadow-yellow-400/25'
              } opacity-0 hover:opacity-100`} />
            </button>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 