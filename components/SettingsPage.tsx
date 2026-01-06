
import React, { useState, useEffect } from 'react';
import { View, User } from '../types';
import Header from './Header';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../utils/translations';

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
        className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-none ${onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} transition-colors`}
    >
        <div className="flex items-center space-x-4">
            <div className={`p-2.5 rounded-xl ${danger ? 'bg-red-50' : 'bg-gray-100'}`}>
                <span className={`material-symbols-outlined ${danger ? 'text-red-500' : color} text-xl`}>{icon}</span>
            </div>
            <div>
                <p className={`font-medium text-base ${danger ? 'text-red-600' : 'text-gray-800'}`}>{title}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {rightElement || (onClick && <span className="material-symbols-outlined text-gray-400">chevron_right</span>)}
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigate, currentUser, onLogout }) => {
    const { t, languageName, language, setLanguage } = useLanguage();
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
    
    const handleShare = () => {
        const shareText = `Stay updated with the latest local news! Check out the Public Tak app:\n\n${window.location.href}`;
        if (navigator.share) {
            navigator.share({
                title: 'Public Tak',
                text: shareText,
                url: window.location.href,
            }).catch(console.error);
        } else {
             const encodedText = encodeURIComponent(shareText);
             const whatsappUrl = `https://wa.me/?text=${encodedText}`;
             window.open(whatsappUrl, '_blank');
        }
    };
    
    const handleRateUs = () => {
        window.open('https://play.google.com/store/apps/details?id=com.publictak', '_blank');
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title={t('settings')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <div className="w-full">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Account Section */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">{t('account')}</h2>
                            <div className="glass-card overflow-hidden hover:shadow-md transition-shadow">
                                {currentUser ? (
                                    <SettingsItem 
                                        icon="manage_accounts" 
                                        title="Manage Account"
                                        subtitle="Personal details, Password"
                                        onClick={() => onNavigate(View.ManageAccount)} 
                                        color="text-blue-600"
                                    />
                                ) : (
                                     <SettingsItem 
                                        icon="login" 
                                        title={t('loginSignUp')}
                                        subtitle="To access profile features" 
                                        onClick={() => onNavigate(View.Login)} 
                                        color="text-blue-600"
                                    />
                                )}
                            </div>
                        </div>

                        {/* App Settings Section */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">{t('appSettings')}</h2>
                            <div className="glass-card overflow-hidden hover:shadow-md transition-shadow">
                                <SettingsItem 
                                    icon="notifications" 
                                    title={t('notifications')}
                                    color="text-yellow-500"
                                    rightElement={<ToggleSwitch checked={notificationsEnabled} onChange={handleNotificationToggle} />}
                                />
                                 <SettingsItem 
                                    icon="dark_mode" 
                                    title={t('nightMode')}
                                    color="text-indigo-500"
                                    rightElement={<ToggleSwitch checked={darkMode} onChange={handleDarkModeToggle} />}
                                />
                                 <SettingsItem 
                                    icon="language" 
                                    title={t('language')}
                                    subtitle={languageName}
                                    onClick={() => setShowLanguageModal(true)} 
                                    color="text-purple-500"
                                />
                            </div>
                        </div>

                        {/* Support Section */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">{t('support')}</h2>
                            <div className="glass-card overflow-hidden hover:shadow-md transition-shadow">
                                 <SettingsItem 
                                    icon="share" 
                                    title={t('shareApp')}
                                    onClick={handleShare} 
                                    color="text-blue-500"
                                />
                                 <SettingsItem 
                                    icon="star" 
                                    title={t('rateApp')}
                                    onClick={handleRateUs} 
                                    color="text-orange-500"
                                />
                                 <SettingsItem 
                                    icon="feedback" 
                                    title={t('feedback')}
                                    onClick={() => onNavigate(View.Feedback)} 
                                    color="text-cyan-600"
                                />
                                 <SettingsItem 
                                    icon="privacy_tip" 
                                    title={t('privacyPolicy')}
                                    onClick={() => onNavigate(View.Privacy)} 
                                    color="text-green-600"
                                />
                                 <SettingsItem 
                                    icon="info" 
                                    title={t('aboutUs')}
                                    onClick={() => onNavigate(View.About)} 
                                    color="text-gray-600"
                                />
                            </div>
                        </div>
                        
                        {/* Logout Section - Spans full on mobile, fits grid on desktop */}
                        {currentUser && (
                            <div className="md:col-span-2 lg:col-span-3">
                                <div className="glass-card overflow-hidden hover:shadow-md transition-shadow border border-red-100 bg-red-50/30">
                                    <SettingsItem 
                                        icon="logout" 
                                        title={t('logout')}
                                        onClick={onLogout} 
                                        danger
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-8 text-xs text-gray-400">
                        Public Tak v1.0.0 • Made with ❤️ in India
                    </div>
                </div>
            </main>

            {/* Language Selection Modal */}
            {showLanguageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowLanguageModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Select Language</h3>
                            <button onClick={() => setShowLanguageModal(false)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <span className="material-symbols-outlined text-gray-500">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setShowLanguageModal(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center justify-between transition-colors ${language === lang.code ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${language === lang.code ? 'text-blue-700' : 'text-gray-800'}`}>{lang.nativeName}</span>
                                        <span className="text-xs text-gray-500">{lang.name}</span>
                                    </div>
                                    {language === lang.code && (
                                        <span className="material-symbols-outlined text-blue-600">check_circle</span>
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
