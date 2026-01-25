
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SiteSettingsPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const SiteSettingsPage: React.FC<SiteSettingsPageProps> = ({ onBack, currentUser }) => {
    const [siteName, setSiteName] = useState('Public Tak');
    const [contactEmail, setContactEmail] = useState('');
    const [homeTagline, setHomeTagline] = useState('Your local news companion.');
    const [announcement, setAnnouncement] = useState('');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (currentUser?.role !== 'admin') return;

        const unsubscribe = db.collection('site_settings').doc('general').onSnapshot((doc) => {
            setLoading(false);
            if (doc.exists) {
                const data = doc.data();
                setSiteName(data?.siteName || 'Public Tak');
                setContactEmail(data?.contactEmail || '');
                setHomeTagline(data?.homeTagline || '');
                setAnnouncement(data?.announcement || '');
                setIsMaintenanceMode(data?.isMaintenanceMode || false);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await db.collection('site_settings').doc('general').set({
                siteName,
                contactEmail,
                homeTagline,
                announcement,
                isMaintenanceMode,
                updatedAt: new Date()
            });
            showToast("Global settings updated!", "success");
        } catch (error) {
            showToast("Failed to save settings", "error");
        } finally {
            setSaving(false);
        }
    };

    if (currentUser?.role !== 'admin') {
        return <div className="p-10 text-center font-bold">Access Denied</div>;
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Site Settings" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-2xl mx-auto w-full">
                    {loading ? (
                        <div className="p-10 text-center text-gray-400">Loading configuration...</div>
                    ) : (
                        <form onSubmit={handleSave} className="glass-card p-6 md:p-10 space-y-8">
                            
                            {/* Branding Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Branding & Home Page</h3>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">App Name (Header Title)</label>
                                    <input 
                                        type="text" 
                                        value={siteName}
                                        onChange={(e) => setSiteName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Public Tak"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Home Page Tagline</label>
                                    <input 
                                        type="text" 
                                        value={homeTagline}
                                        onChange={(e) => setHomeTagline(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Fast, Local, Reliable News"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Top Announcement Bar (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={announcement}
                                        onChange={(e) => setAnnouncement(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Show a breaking message at the top"
                                    />
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Support</h3>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Contact Support Email</label>
                                    <input 
                                        type="email" 
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="support@publictak.app"
                                    />
                                </div>
                            </div>

                            {/* Critical Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-red-400 uppercase tracking-widest border-b pb-2">Critical Actions</h3>
                                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                                    <div>
                                        <p className="font-bold text-red-800 text-sm">Maintenance Mode</p>
                                        <p className="text-[10px] text-red-600">Disables posting for regular users.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                                        className={`w-14 h-7 rounded-full p-1 transition-colors ${isMaintenanceMode ? 'bg-red-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isMaintenanceMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="w-full py-4 gradient-button text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-50"
                                >
                                    {saving ? 'UPDATING...' : 'SAVE ALL SETTINGS'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SiteSettingsPage;
