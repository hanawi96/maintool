import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // 🌙 Get initial theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('mp3-cutter-theme');
      return savedTheme === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  });

  // 🎯 Apply theme to document and save to localStorage
  useEffect(() => {
    try {
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      localStorage.setItem('mp3-cutter-theme', theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, [theme]);

  // 🔄 Toggle between dark and light mode
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 