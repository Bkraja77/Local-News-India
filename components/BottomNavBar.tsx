import React from 'react';
import { View, User } from '../types';

interface BottomNavBarProps {
  onNavigate: (view: View) => void;
  currentUser: User | null;
  currentView: View;
  unreadCount: number;
}

const views: View[] = [View.Main, View.Search, View.CreatePost, View.Notifications, View.User];
const icons: { [key in View]?: string } = {
    [View.Main]: "home",
    [View.Search]: "search",
    [View.CreatePost]: "add_circle",
    [View.Notifications]: "notifications",
    [View.User]: "person",
};
const labels: { [key in View]?: string } = {
    [View.Main]: "Home",
    [View.Search]: "Search",
    [View.CreatePost]: "Post",
    [View.Notifications]: "Alerts",
    [View.User]: "Profile",
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ onNavigate, currentUser, currentView, unreadCount }) => {

  const handleProtectedNav = (view: View) => {
    if (currentUser || view === View.Main || view === View.Search) {
      onNavigate(view);
    } else {
      onNavigate(View.Login);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 z-30 flex items-center justify-around md:rounded-b-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {views.map((view) => {
            const isActive = view === currentView;
            const needsAuth = view === View.CreatePost || view === View.Notifications || view === View.User;
            const hasBadge = view === View.Notifications && unreadCount > 0;
            const colorClass = isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500';
            
            return (
                <button 
                    key={view}
                    onClick={() => needsAuth ? handleProtectedNav(view) : onNavigate(view)} 
                    className="relative flex flex-col items-center justify-center flex-1 h-full text-sm font-medium transition-colors group z-10"
                >
                    {hasBadge && (
                      <span className="absolute top-1 right-1/2 transform translate-x-5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <span className={`material-symbols-outlined text-3xl transition-colors ${colorClass}`}>{icons[view]}</span>
                    <span className={`mt-0.5 text-xs transition-colors ${colorClass}`}>{labels[view]}</span>
                </button>
            )
        })}
    </div>
  );
};

export default BottomNavBar;