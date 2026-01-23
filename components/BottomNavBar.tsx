
import React from 'react';
import { View, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavBarProps {
  onNavigate: (view: View, params?: any) => void;
  currentUser: User | null;
  currentView: View;
  unreadCount: number;
}

const views: View[] = [View.Main, View.Videos, View.CreatePostChoice, View.Notifications, View.User];
const icons: { [key in View]?: string } = {
    [View.Main]: "home",
    [View.Videos]: "play_circle",
    [View.CreatePostChoice]: "add_circle",
    [View.Notifications]: "notifications",
    [View.User]: "person",
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ onNavigate, currentUser, currentView, unreadCount }) => {
  const { t } = useLanguage();

  const labels: { [key in View]?: string } = {
      [View.Main]: t('home'),
      [View.Videos]: "Videos",
      [View.CreatePostChoice]: t('post'),
      [View.Notifications]: t('alerts'),
      [View.User]: t('profile'),
  };

  const handleProtectedNav = (view: View) => {
    // PROTECTED: Only Main (Home) is accessible to guests
    if (currentUser || view === View.Main) {
      onNavigate(view);
    } else {
      onNavigate(View.Login);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 z-[200] flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-[52px]">
            {views.map((view) => {
                const isActive = view === currentView;
                const needsAuth = view === View.Videos || view === View.CreatePostChoice || view === View.Notifications || view === View.User;
                const hasBadge = view === View.Notifications && unreadCount > 0;
                const colorClass = isActive ? 'text-red-600' : 'text-gray-400 group-active:text-red-500';
                
                return (
                    <button 
                        key={view}
                        onClick={() => needsAuth ? handleProtectedNav(view) : onNavigate(view)} 
                        className="relative flex flex-col items-center justify-center flex-1 h-full transition-all group active:scale-90"
                    >
                        {hasBadge && (
                          <span className="absolute top-1.5 right-1/2 transform translate-x-3.5 bg-red-600 text-white text-[8px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 border border-white z-20 shadow-sm animate-pulse">
                            {unreadCount > 99 ? '99' : unreadCount}
                          </span>
                        )}
                        
                        {view === View.User && currentUser ? (
                            <img 
                                src={currentUser.profilePicUrl} 
                                alt={currentUser.name}
                                className={`w-6 h-6 rounded-full object-cover border transition-all ${isActive ? 'border-red-600 ring-1 ring-red-100' : 'border-transparent opacity-80'}`}
                            />
                        ) : (
                            <span 
                                className={`material-symbols-outlined text-[21px] transition-all ${colorClass}`} 
                                style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' ${isActive ? 600 : 400}` }}
                            >
                                {icons[view]}
                            </span>
                        )}
                        
                        <span className={`mt-0.5 text-[8.5px] transition-colors font-bold uppercase tracking-tight ${colorClass}`}>
                            {labels[view]}
                        </span>
                    </button>
                )
            })}
        </div>
        {/* Adds padding for the iPhone/Android home indicator bar */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} className="bg-transparent w-full"></div>
    </div>
  );
};

export default BottomNavBar;
