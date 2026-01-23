
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { APP_LOGO_URL } from '../utils/constants';

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isHighImpact, setIsHighImpact] = useState(true); // Default to true for persistence
    const [isFromShare, setIsFromShare] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const hasPost = params.has('postId') || params.has('videoId');
        setIsFromShare(hasPost);

        // Check if already in standalone mode (installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        const isMarkedInstalled = localStorage.getItem('publictak_pwa_installed') === 'true';

        if (isStandalone || isMarkedInstalled) {
            setIsVisible(false);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Har baar load hone par dikhayenge
            setIsVisible(true);
            // Check if user dismissed it in THIS specific session
            const sessionDismissed = sessionStorage.getItem('pwa_modal_dismissed_session');
            if (sessionDismissed) {
                setIsHighImpact(false); // Sirf chota banner dikhao agar session me ek baar mana kar diya hai
            } else {
                setIsHighImpact(true); // Bada modal dikhao
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setIsVisible(false);
            setDeferredPrompt(null);
            localStorage.setItem('publictak_pwa_installed', 'true');
            console.log('Public Tak PWA was installed');
        });

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // Agar prompt available nahi hai (browser restriction), to info dikha sakte hain
            alert("Please use the 'Add to Home Screen' option in your browser menu to install Public Tak.");
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setIsVisible(false);
            localStorage.setItem('publictak_pwa_installed', 'true');
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        // Bada modal band karega lekin persistent mini banner dikhta rahega
        setIsHighImpact(false);
        sessionStorage.setItem('pwa_modal_dismissed_session', 'true');
    };

    if (!isVisible) return null;

    return (
        <>
            {/* 1. HIGH IMPACT MODAL (Agar isHighImpact true hai) */}
            {isHighImpact && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-500 border-t-4 border-red-600">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <img 
                                    src={APP_LOGO_URL} 
                                    className="w-24 h-24 rounded-[2rem] shadow-2xl ring-4 ring-red-50 dark:ring-slate-800 object-cover" 
                                    alt="Public Tak" 
                                />
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1.5 border-4 border-white dark:border-slate-800 shadow-lg animate-bounce">
                                    <span className="material-symbols-outlined text-[18px] block font-black">download</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                {isFromShare ? 'Install App to Read Full News' : 'Fastest News Experience'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm font-medium leading-relaxed px-4">
                                Don't miss any update! Get Public Tak on your phone for **Offline Access, 2x Faster Loading, and Local Alerts.**
                            </p>

                            <div className="w-full space-y-3 mt-8">
                                <button 
                                    onClick={handleInstallClick}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 dark:shadow-none transition-all transform active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined">add_to_home_screen</span>
                                    Install Now
                                </button>
                                <button 
                                    onClick={handleDismiss}
                                    className="w-full py-3 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors"
                                >
                                    Maybe Later, Continue in Browser
                                </button>
                            </div>
                            
                            <p className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ad-Free & Lightweight (Only 2MB)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. PERSISTENT MINI BANNER (Agar isHighImpact false hai aur app installed nahi hai) */}
            {!isHighImpact && (
                <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[180] animate-in slide-in-from-right duration-500">
                    <div className="bg-white dark:bg-slate-900 border-l-4 border-red-600 shadow-2xl rounded-2xl p-4 flex items-center gap-4 group">
                        <img src={APP_LOGO_URL} className="w-12 h-12 rounded-xl shadow-md object-cover" alt="" />
                        <div className="flex-grow">
                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Public Tak App</p>
                            <p className="text-[10px] text-gray-500 font-bold">Tap to install for better experience</p>
                        </div>
                        <button 
                            onClick={handleInstallClick}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 dark:shadow-none hover:bg-red-700 transition-all active:scale-95"
                        >
                            Install
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPWA;
