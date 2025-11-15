import React, { useState, useEffect, useRef } from 'react';
import { User, View } from '../types';

interface HeaderProps {
  title: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  showSettingsButton?: boolean;
  onSettings?: () => void;
  // The following props are no longer used as the profile button is removed.
  // showProfileButton?: boolean;
  // currentUser?: User | null;
  // onLogin?: () => void;
  // onLogout?: () => void;
  // onNavigate?: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton, 
  onBack, 
  showSettingsButton, 
  onSettings
}) => {
  return (
    <header className="flex-shrink-0 bg-red-600 z-30 shadow-md">
      <div className="flex justify-between items-center p-3 md:px-4">
        <div className="w-10 h-10 flex items-center justify-start">
            {showBackButton && (
              <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            {showSettingsButton && (
              <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
                <span className="material-symbols-outlined">settings</span>
              </button>
            )}
        </div>
        
        <h1 className="text-xl font-bold truncate px-2 text-white">{title}</h1>
        
        {/* Profile button has been removed as per user request */}
        <div className="w-10 h-10"></div>
      </div>
    </header>
  );
};

export default Header;