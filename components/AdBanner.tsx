
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebaseConfig';
import { AdConfig } from '../types';

interface AdBannerProps {
    slotType: 'home' | 'post';
    className?: string;
}

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

const AdBanner: React.FC<AdBannerProps> = ({ slotType, className = '' }) => {
    const [config, setConfig] = useState<AdConfig | null>(null);
    const [shouldRender, setShouldRender] = useState(false);
    const adRef = useRef<HTMLModElement>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const initializedRef = useRef(false);

    useEffect(() => {
        // Real-time listener for ad config
        const unsubscribe = db.collection('site_settings').doc('ads_config').onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data() as AdConfig;
                setConfig(data);
                
                // Determine if we should render based on global toggle and specific slot presence
                const hasGlobalEnabled = data.adsEnabled;
                const hasClientId = !!data.adSenseClientId;
                const hasSlotId = slotType === 'home' ? !!data.adSenseSlotHome : !!data.adSenseSlotPost;

                setShouldRender(hasGlobalEnabled && hasClientId && hasSlotId);
            } else {
                setShouldRender(false);
            }
        }, (error) => {
            // Silent failure for public users if permissions are missing or other errors
            console.debug("Ad config fetch suppressed:", error.message);
            setShouldRender(false);
        });

        return () => unsubscribe();
    }, [slotType]);

    // Dynamic Script Injection (AdSense)
    useEffect(() => {
        if (shouldRender && config?.adSenseClientId) {
            const existingScript = document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`);
            
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adSenseClientId}`;
                script.async = true;
                script.crossOrigin = "anonymous";
                script.onload = () => setScriptLoaded(true);
                document.head.appendChild(script);
            } else {
                setScriptLoaded(true);
            }
        }
    }, [shouldRender, config]);

    // Push Ad Unit
    useEffect(() => {
        // Only push if rendering is allowed, script is loaded, ref exists, and we haven't initialized this specific instance yet
        if (shouldRender && scriptLoaded && adRef.current && !initializedRef.current) {
            try {
                if (typeof window !== 'undefined') {
                    window.adsbygoogle = window.adsbygoogle || [];
                    window.adsbygoogle.push({});
                    initializedRef.current = true;
                }
            } catch (e) {
                console.error("AdSense push error:", e);
            }
        }
    }, [shouldRender, scriptLoaded]);

    // Reset initialization if slot changes (e.g. navigation)
    useEffect(() => {
        initializedRef.current = false;
    }, [slotType]);

    if (!shouldRender || !config) return null;

    const slotId = slotType === 'home' ? config.adSenseSlotHome : config.adSenseSlotPost;
    const adFormat = slotType === 'post' ? 'fluid' : 'auto';
    const adLayout = slotType === 'post' ? 'in-article' : undefined;

    return (
        <div className={`w-full flex flex-col items-center my-6 ${className}`}>
            <div className="w-full overflow-hidden flex flex-col items-center min-h-[100px] relative">
                <span className="text-[9px] text-gray-300 uppercase tracking-widest mb-1 absolute top-0 right-0 z-10 pr-2 pt-1">ADVERTISEMENT</span>
                <ins
                    ref={adRef}
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%', textAlign: 'center' }}
                    data-ad-layout={adLayout}
                    data-ad-format={adFormat}
                    data-ad-client={config.adSenseClientId}
                    data-ad-slot={slotId}
                    data-full-width-responsive="true"
                ></ins>
            </div>
        </div>
    );
};

export default AdBanner;
