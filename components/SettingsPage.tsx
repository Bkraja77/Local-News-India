
import React, { useState, useEffect } from 'react';
import { View, User } from '../types';
import Header from './Header';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const SettingsItem: React.FC<{ 
    icon: string; 
    title: string; 
    subtitle?: string;
    onClick?: () => void; 
    color?: string;
    rightElement?: React.ReactNode;
    danger?: boolean;
}> = ({ icon, title, subtitle, onClick, color = 'text-gray-600', rightElement, danger = false }) => (
    <div 
        onClick={onClick} 
        className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-none transition-all active:scale-[0.98] ${onClick ? 'cursor-pointer hover:bg-black/5' : ''}`}
    >
        <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-xl ${danger ? 'bg-red-50' : 'bg-gray-100 dark:bg-white/5'}`}>
                <span className={`material-symbols-outlined ${danger ? 'text-red-500' : color} text-xl`}>{icon}</span>
            </div>
            <div>
                <p className={`font-semibold text-base ${danger ? 'text-red-600' : 'text-gray-800'}`}>{title}</p>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {rightElement || (onClick && <span className="material-symbols-outlined text-gray-400">chevron_right</span>)}
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none ${checked ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-lg transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigate, currentUser, onLogout }) => {
    const { t, languageName, language, setLanguage } = useLanguage();
    const { showToast } = useToast();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    useEffect(() => {
        const isDark = document.body.classList.contains('dark-mode');
        setDarkMode(isDark);
        
        const savedNotif = localStorage.getItem('notificationsEnabled');
        if (savedNotif !== null) {
            setNotificationsEnabled(JSON.parse(savedNotif));
        }
    }, []);

    const handleNotificationToggle = (enabled: boolean) => {
        setNotificationsEnabled(enabled);
        localStorage.setItem('notificationsEnabled', JSON.stringify(enabled));
        showToast(enabled ? "Notifications turned ON" : "Notifications turned OFF", "info");
    };

    const handleDarkModeToggle = (enabled: boolean) => {
        setDarkMode(enabled);
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    };
    
    const handleShare = async () => {
        const shareText = `🚩 Public Tak: Fast, Local, and Reliable News!\n\nJoin thousands of users getting their local updates first. Download now:\n\n${window.location.origin}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Public Tak',
                    text: shareText,
                    url: window.location.origin,
                });
            } catch (err) {
                console.debug("Share cancelled");
            }
        } else {
             const encodedText = encodeURIComponent(shareText);
             const whatsappUrl = `https://wa.me/?text=${encodedText}`;
             window.open(whatsappUrl, '_blank');
        }
    };
    
    const handleRateUs = () => {
        showToast("Redirecting to Play Store...", "info");
        setTimeout(() => {
            window.open('https://play.google.com/store/apps/details?id=com.publictak.news', '_blank');
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title={t('settings')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-24">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Account Section */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('account')}</h2>
                        <div className="glass-card overflow-hidden">
                            {currentUser ? (
                                <SettingsItem 
                                    icon="manage_accounts" 
                                    title="Manage Account"
                                    subtitle="Personal details, security settings"
                                    onClick={() => onNavigate(View.ManageAccount)} 
                                    color="text-blue-500"
                                />
                            ) : (
                                 <SettingsItem 
                                    icon="login" 
                                    title={t('loginSignUp')}
                                    subtitle="Join us for the full experience" 
                                    onClick={() => onNavigate(View.Login)} 
                                    color="text-red-500"
                                />
                            )}
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Preferences</h2>
                        <div className="glass-card overflow-hidden">
                            <SettingsItem 
                                icon="notifications_active" 
                                title={t('notifications')}
                                subtitle="Stay updated with breaking news"
                                color="text-amber-500"
                                rightElement={<ToggleSwitch checked={notificationsEnabled} onChange={handleNotificationToggle} />}
                            />
                             <SettingsItem 
                                icon="brightness_4" 
                                title={t('nightMode')}
                                subtitle="Easier on your eyes at night"
                                color="text-indigo-500"
                                rightElement={<ToggleSwitch checked={darkMode} onChange={handleDarkModeToggle} />}
                            />
                             <SettingsItem 
                                icon="translate" 
                                title={t('language')}
                                subtitle={languageName}
                                onClick={() => setShowLanguageModal(true)} 
                                color="text-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Support & Legal Section */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-2">{t('support')} & Legal</h2>
                        <div className="glass-card overflow-hidden">
                             <SettingsItem 
                                icon="ios_share" 
                                title={t('shareApp')}
                                subtitle="Spread the word to friends"
                                onClick={handleShare} 
                                color="text-sky-500"
                            />
                             <SettingsItem 
                                icon="star" 
                                title={t('rateApp')}
                                subtitle="Tell us how we're doing"
                                onClick={handleRateUs} 
                                color="text-orange-400"
                            />
                             <SettingsItem 
                                icon="chat_bubble_outline" 
                                title={t('feedback')}
                                subtitle="Help us improve Public Tak"
                                onClick={() => onNavigate(View.Feedback)} 
                                color="text-cyan-500"
                            />
                             <SettingsItem 
                                icon="verified_user" 
                                title={t('privacyPolicy')}
                                subtitle="How we protect your data"
                                onClick={() => onNavigate(View.Privacy)} 
                                color="text-green-500"
                            />
                             <SettingsItem 
                                icon="alternate_email" 
                                title={t('aboutUs')}
                                subtitle="Learn about our mission"
                                onClick={() => onNavigate(View.About)} 
                                color="text-gray-500"
                            />
                        </div>
                    </div>
                    
                    {currentUser && (
                        <div className="pt-4">
                            <div className="glass-card overflow-hidden border-red-500/10">
                                <SettingsItem 
                                    icon="logout" 
                                    title={t('logout')}
                                    onClick={onLogout} 
                                    danger
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center justify-center space-y-1 py-8 opacity-40">
                        <p className="text-[10px] font-bold tracking-widest uppercase">Public Tak News App</p>
                        <p className="text-[10px]">Version 1.2.4 (Build 4022)</p>
                    </div>
                </div>
            </main>

            {/* Language Selection Modal */}
            {showLanguageModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowLanguageModal(false)}>
                    <div 
                        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white">Choose Language</h3>
                                <p className="text-xs text-gray-500">Pick your preferred news language</p>
                            </div>
                            <button onClick={() => setShowLanguageModal(false)} className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
                                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setShowLanguageModal(false);
                                        showToast(`Language set to ${lang.name}`, "success");
                                    }}
                                    className={`text-left px-4 py-3.5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.97] ${
                                        language === lang.code 
                                        ? 'bg-red-50 dark:bg-red-500/10 border-2 border-red-600' 
                                        : 'bg-gray-50 dark:bg-white/5 border-2 border-transparent hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-base ${language === lang.code ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {lang.nativeName}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{lang.name}</span>
                                    </div>
                                    {language === lang.code && (
                                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                                            <span className="material-symbols-outlined text-white text-sm font-bold">check</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
