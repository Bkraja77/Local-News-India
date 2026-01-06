
import React from 'react';
import { View, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { APP_LOGO_URL } from '../utils/constants';

interface SidebarProps {
  onNavigate: (view: View) => void;
  currentUser: User | null;
  currentView: View;
  unreadCount: number;
  onLogout: () => void;
  onLogin: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentUser, currentView, unreadCount, onLogout, onLogin }) => {
  const { t } = useLanguage();

  const navItems = [
    { view: View.Main, icon: 'home', label: t('home') },
    { view: View.Search, icon: 'search', label: t('search') },
    { view: View.Notifications, icon: 'notifications', label: t('alerts'), badge: unreadCount },
    { view: View.User, icon: 'person', label: t('profile'), protected: true },
    { view: View.Settings, icon: 'settings', label: t('settings') },
  ];

  if (currentUser?.role === 'admin') {
      navItems.push({ view: View.Admin, icon: 'admin_panel_settings', label: t('adminPanel'), protected: true });
  }

  const handleNavClick = (item: any) => {
    if (item.protected && !currentUser) {
        onNavigate(View.Login);
    } else {
        onNavigate(item.view);
    }
  };

  return (
    <div className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-gray-200 bg-white z-40">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate(View.Main)}>
        <img 
            src={APP_LOGO_URL}
            alt="Public Tak Logo"
            className="w-12 h-12 object-contain transition-transform group-hover:scale-110 duration-300"
        />
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight group-hover:text-red-600 transition-colors">Public Tak</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
           const isActive = currentView === item.view;
           return (
            <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                    ? 'bg-red-50 text-red-600 font-semibold shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <div className="relative">
                    <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-800'}`}>
                        {item.icon}
                    </span>
                </div>
                <span className="text-lg flex-grow text-left">{item.label}</span>
                
                {/* Notification Badge - Persists until clicked (viewed) */}
                {item.badge && item.badge > 0 ? (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300">
                        {item.badge > 99 ? '99+' : item.badge}
                    </span>
                ) : null}
            </button>
           )
        })}
        
        <button
            onClick={() => currentUser ? onNavigate(View.CreatePost) : onNavigate(View.Login)}
            className="w-full mt-6 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg shadow-red-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
        >
            <span className="material-symbols-outlined">edit_square</span>
            {t('newPost')}
        </button>
      </nav>

      {/* User Profile / Login Section */}
      <div className="p-4 border-t border-gray-100">
        {currentUser ? (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => onNavigate(View.User)}>
                <img 
                    src={currentUser.profilePicUrl} 
                    alt={currentUser.name} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-red-100"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">@{currentUser.username}</p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onLogout(); }}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    title="Logout"
                >
                    <span className="material-symbols-outlined text-xl">logout</span>
                </button>
            </div>
        ) : (
            <button 
                onClick={onLogin}
                className="w-full p-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined">login</span>
                {t('login')}
            </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;