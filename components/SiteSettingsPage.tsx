import React from 'react';
import Header from './Header';

interface SiteSettingsPageProps {
    onBack: () => void;
}

const SiteSettingsPage: React.FC<SiteSettingsPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Site Settings" showBackButton onBack={onBack} />
            <main className="flex-grow flex items-center justify-center p-5">
                <div className="text-center glass-card p-10">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">settings_applications</span>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Feature Coming Soon!</h2>
                    <p className="text-gray-500">A dedicated section for managing site-wide settings is under construction.</p>
                </div>
            </main>
        </div>
    );
};

export default SiteSettingsPage;