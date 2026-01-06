
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ManageAdsPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const ManageAdsPage: React.FC<ManageAdsPageProps> = ({ onBack, currentUser }) => {
    const [adsEnabled, setAdsEnabled] = useState(false);
    
    // AdSense Fields
    const [adSenseClientId, setAdSenseClientId] = useState('');
    const [adSenseSlotHome, setAdSenseSlotHome] = useState('');
    const [adSenseSlotPost, setAdSenseSlotPost] = useState('');

    // AdMob Fields
    const [adMobAppId, setAdMobAppId] = useState('');
    const [adMobBannerId, setAdMobBannerId] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (currentUser?.role !== 'admin') return;
        
        // Use onSnapshot to listen for changes (and verify read permission immediately)
        const unsubscribe = db.collection('site_settings').doc('ads_config').onSnapshot((doc) => {
            setLoading(false);
            if (doc.exists) {
                const data = doc.data();
                if (data) {
                    setAdsEnabled(data.adsEnabled ?? false);
                    setAdSenseClientId(data.adSenseClientId ?? '');
                    setAdSenseSlotHome(data.adSenseSlotHome ?? '');
                    setAdSenseSlotPost(data.adSenseSlotPost ?? '');
                    setAdMobAppId(data.adMobAppId ?? '');
                    setAdMobBannerId(data.adMobBannerId ?? '');
                }
            }
        }, (error) => {
            console.error("Error fetching ad config:", error);
            setLoading(false);
            if (error.code === 'permission-denied') {
                showToast("Access denied. Ensure Firestore rules are published.", "error");
            } else {
                showToast("Failed to load ad settings.", "error");
            }
        });

        return () => unsubscribe();
    }, [currentUser, showToast]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await db.collection('site_settings').doc('ads_config').set({
                adsEnabled,
                adSenseClientId: adSenseClientId.trim(),
                adSenseSlotHome: adSenseSlotHome.trim(),
                adSenseSlotPost: adSenseSlotPost.trim(),
                adMobAppId: adMobAppId.trim(),
                adMobBannerId: adMobBannerId.trim(),
                updatedAt: new Date()
            });
            showToast("Ad settings saved successfully!", "success");
        } catch (error: any) {
            console.error("Error saving ad config:", error);
            if (error.code === 'permission-denied') {
                showToast("Permission denied. Please check Firestore Rules.", "error");
            } else {
                showToast(`Failed to save: ${error.message}`, "error");
            }
        } finally {
            setSaving(false);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Manage Ads" showBackButton onBack={onBack} />
                <main className="flex-grow flex items-center justify-center p-5 text-center">
                    <div className="glass-card p-10">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-red-600 font-semibold">You do not have permission to access this page.</p>
                    </div>
                </main>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Manage Ads" showBackButton onBack={onBack} />
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-red-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Manage Ads" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    <form onSubmit={handleSave} className="glass-card p-6 md:p-8 space-y-8">
                        
                        {/* Global Switch */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Enable Monetization</h2>
                                <p className="text-sm text-gray-500">Toggle to show or hide ads globally across the app.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setAdsEnabled(!adsEnabled)}
                                className={`w-16 h-9 flex items-center rounded-full p-1 duration-300 ease-in-out shadow-inner ${adsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`bg-white w-7 h-7 rounded-full shadow-md transform duration-300 ease-in-out ${adsEnabled ? 'translate-x-7' : ''}`}></div>
                            </button>
                        </div>

                        {/* Google AdSense (Web) */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <span className="material-symbols-outlined text-blue-600 text-3xl">language</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Google AdSense (Web)</h3>
                                    <p className="text-xs text-gray-500">Configure ads for the website and PWA view.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Publisher ID (Client ID)</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <span className="material-symbols-outlined text-lg">badge</span>
                                        </span>
                                        <input 
                                            type="text" 
                                            value={adSenseClientId}
                                            onChange={(e) => setAdSenseClientId(e.target.value)}
                                            placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                                            className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Home Page Slot ID</label>
                                        <input 
                                            type="text" 
                                            value={adSenseSlotHome}
                                            onChange={(e) => setAdSenseSlotHome(e.target.value)}
                                            placeholder="1234567890"
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">info</span>
                                            Displayed between news categories.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Post Detail Slot ID</label>
                                        <input 
                                            type="text" 
                                            value={adSenseSlotPost}
                                            onChange={(e) => setAdSenseSlotPost(e.target.value)}
                                            placeholder="0987654321"
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">info</span>
                                            Displayed below article content.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Google AdMob (Mobile) */}
                        <div className="space-y-5 pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                <span className="material-symbols-outlined text-green-600 text-3xl">android</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Google AdMob (Mobile App)</h3>
                                    <p className="text-xs text-gray-500">Configuration for native Android/iOS app builds.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">App ID</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <span className="material-symbols-outlined text-lg">smartphone</span>
                                        </span>
                                        <input 
                                            type="text" 
                                            value={adMobAppId}
                                            onChange={(e) => setAdMobAppId(e.target.value)}
                                            placeholder="ca-app-pub-xxxxxxxx~yyyyyyyy"
                                            className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Banner Unit ID</label>
                                    <input 
                                        type="text" 
                                        value={adMobBannerId}
                                        onChange={(e) => setAdMobBannerId(e.target.value)}
                                        placeholder="ca-app-pub-xxxxxxxx/zzzzzzzz"
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="w-full md:w-auto px-10 py-3.5 gradient-button text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transform transition hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        Save Configuration
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default ManageAdsPage;
