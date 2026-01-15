
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
    <div className="md:hidden absolute bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 z-30 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {views.map((view) => {
            const isActive = view === currentView;
            // VIDEOS now requires authentication
            const needsAuth = view === View.Videos || view === View.CreatePostChoice || view === View.Notifications || view === View.User;
            const hasBadge = view === View.Notifications && unreadCount > 0;
            const colorClass = isActive ? 'text-red-600' : 'text-gray-500 group-hover:text-red-500';
            
            return (
                <button 
                    key={view}
                    onClick={() => needsAuth ? handleProtectedNav(view) : onNavigate(view)} 
                    className="relative flex flex-col items-center justify-center flex-1 h-full text-sm font-medium transition-colors group z-10"
                >
                    {hasBadge && (
                      <span className="absolute top-1 right-1/2 transform translate-x-3 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white z-20 shadow-sm animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    
                    {view === View.User && currentUser ? (
                        <img 
                            src={currentUser.profilePicUrl} 
                            alt={currentUser.name}
                            className={`w-7 h-7 rounded-full object-cover border-2 transition-all ${isActive ? 'border-red-600' : 'border-transparent'}`}
                        />
                    ) : (
                        <span className={`material-symbols-outlined text-2xl transition-colors ${colorClass}`} style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}>{icons[view]}</span>
                    )}
                    
                    <span className={`mt-1 text-[10px] transition-colors font-medium ${colorClass}`}>{labels[view]}</span>
                </button>
            )
        })}
    </div>
  );
};

export default BottomNavBar;
