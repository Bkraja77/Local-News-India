
import React from 'react';
import { View } from '../types';
import Header from './Header';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
}

// FIX: Modified to support Font Awesome icons for specific cases like WhatsApp.
const SettingsCard: React.FC<{ icon: string; title: string; iconColor: string; onClick: () => void; }> = ({ icon, title, iconColor, onClick }) => (
    <button onClick={onClick} className={`glass-card p-4 flex flex-col items-center justify-center text-center transition-transform transform hover:-translate-y-2 h-36`}>
        {icon === 'whatsapp' ? (
            <i className={`fa-brands fa-whatsapp text-5xl ${iconColor}`}></i>
        ) : (
            <span className={`material-symbols-outlined text-5xl ${iconColor}`}>{icon}</span>
        )}
        <span className="mt-2 font-bold text-sm text-gray-700 h-10 flex items-center">{title}</span>
    </button>
);


const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigate }) => {
    
    // FIX: Updated share text to be relevant to the news app and changed to open in a new tab for better UX.
    const handleShare = () => {
        const shareText = `Stay updated with the latest local news! Check out the Local News India app:\n\n${window.location.href}`;
        const encodedText = encodeURIComponent(shareText);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const handleRateUs = () => {
        window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.tasks', '_blank');
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Settings" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div>
                        <h2 className="text-xl font-bold p-4 mb-4 text-center gradient-text">Support & Feedback</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <SettingsCard icon="star" title="Rate Us" iconColor="text-orange-400" onClick={handleRateUs} />
                            <SettingsCard icon="feedback" title="Feedback" iconColor="text-green-500" onClick={() => onNavigate(View.Feedback)} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold p-4 mb-4 text-center gradient-text">More About Us</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <SettingsCard icon="info" title="About Us" iconColor="text-cyan-500" onClick={() => onNavigate(View.About)} />
                            {/* FIX: Changed to a WhatsApp share button with an appropriate icon, color, and title. */}
                            <SettingsCard icon="whatsapp" title="Share on WhatsApp" iconColor="text-green-500" onClick={handleShare} />
                            <SettingsCard icon="privacy_tip" title="Privacy Policy" iconColor="text-purple-500" onClick={() => onNavigate(View.Privacy)} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;