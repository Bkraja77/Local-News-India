
import React from 'react';
import { User, View } from '../types';

interface HeaderProps {
  title: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  showSettingsButton?: boolean;
  onSettings?: () => void;
  onSearch?: () => void;
  currentUser?: User | null;
  onProfileClick?: () => void;
  onLogin?: () => void;
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton, 
  onBack, 
  showSettingsButton, 
  onSettings,
  onSearch,
  currentUser,
  onProfileClick,
  onLogin,
  logoUrl
}) => {
  return (
    <header className="flex-shrink-0 bg-red-600 z-30 shadow-md md:bg-white md:shadow-none md:border-b md:border-gray-200 md:p-4">
      <div className="flex justify-between items-center p-3 md:px-0 max-w-7xl mx-auto">
        <div className="w-10 h-10 flex items-center justify-start">
            {showBackButton ? (
              <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 md:hover:bg-gray-100 transition-colors text-white md:text-gray-800 flex items-center justify-center">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="App Logo" 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30 bg-white"
              />
            ) : null}
        </div>
        
        <h1 className="text-xl font-bold truncate px-2 text-white md:text-gray-800 md:text-2xl flex-grow text-center">{title}</h1>
        
        <div className="flex items-center gap-1">
            {onSearch && (
                <button onClick={onSearch} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 md:hover:bg-gray-100 transition-colors text-white md:text-gray-800">
                    <span className="material-symbols-outlined">search</span>
                </button>
            )}
            {showSettingsButton && (
              <button onClick={onSettings} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 md:hover:bg-gray-100 transition-colors text-white md:text-gray-800">
                <span className="material-symbols-outlined">settings</span>
              </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
