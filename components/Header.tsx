
import React, { useState, useEffect, useRef } from 'react';
import { User, View } from '../types';

interface HeaderProps {
  title: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  showSettingsButton?: boolean;
  onSettings?: () => void;
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
  currentUser,
  onProfileClick,
  onLogin,
  logoUrl
}) => {
  return (
    <header className="flex-shrink-0 bg-red-600 z-30 shadow-md md:bg-white md:shadow-none md:border-b md:border-gray-200 md:p-4">
      <div className="flex justify-between items-center p-3 md:px-0">
        <div className="w-10 h-10 flex items-center justify-start">
            {showBackButton ? (
              <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 md:hover:bg-gray-100 transition-colors text-white md:text-gray-800">
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
        
        <h1 className="text-xl font-bold truncate px-2 text-white md:text-gray-800 md:text-2xl">{title}</h1>
        
        <div className="w-10 h-10 flex items-center justify-end">
            {showSettingsButton && (
              <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 md:hover:bg-gray-100 transition-colors text-white md:text-gray-800 md:hidden">
                <span className="material-symbols-outlined">settings</span>
              </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;