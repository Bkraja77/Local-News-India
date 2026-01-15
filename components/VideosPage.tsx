
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './Header';
import { db, serverTimestamp, increment, firebase } from '../firebaseConfig';
import { VideoPost, User, View, Comment } from '../types';
import { formatCount } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Categories, { CategoryItem } from './Categories';
import LocationFilter from './LocationFilter';
import { indianLocations } from '../data/locations';
import SEO from './SEO';
import { APP_LOGO_URL } from '../utils/constants';

interface VideosPageProps {
    onNavigate: (view: View, params?: any) => void;
    currentUser: User | null;
    onLogin: () => void;
    videoId?: string | null;
    isCurrentView?: boolean;
}

const newsCategories = ['Recent News', 'Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];

// --- Sub-component: VideoCard (Main Feed Grid with Auto-play & Sound Toggle) ---
const VideoCard: React.FC<{
    video: VideoPost;
    currentUser: User | null;
    onLogin: () => void;
    onViewVideo: (videoId: string) => void;
    onViewUser: (userId: string) => void;
    isFollowing: boolean;
    handleFollowToggle: (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => void;
    index: number;
}> = ({ video, currentUser, onLogin, onViewVideo, onViewUser, isFollowing, handleFollowToggle, index }) => {
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isMuted, setIsMuted] = useState(true); 
    
    const cardRef = useRef<HTMLDivElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    
    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => {
        const handleGlobalMute = () => {
            setIsMuted(true);
        };
        window.addEventListener('mute-all-video-previews', handleGlobalMute);
        return () => window.removeEventListener('mute-all-video-previews', handleGlobalMute);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.6 } 
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (videoPreviewRef.current) {
            if (isVisible) {
                videoPreviewRef.current.play().catch(() => {
                    console.debug("Autoplay blocked");
                });
            } else {
                videoPreviewRef.current.pause();
                videoPreviewRef.current.currentTime = 0;
                setIsMuted(true); 
            }
        }
    }, [isVisible]);

    useEffect(() => {
        const likesRef = db.collection('videos').doc(video.id).collection('likes');
        const unsubLikes = likesRef.onSnapshot((snapshot) => {
            setLikeCount(snapshot.size);
            if (currentUser) {
                setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid));
            } else {
                setIsLiked(false);
            }
        });

        const commentsRef = db.collection('videos').doc(video.id).collection('comments');
        const unsubComments = commentsRef.onSnapshot((snapshot) => {
            setCommentCount(snapshot.size);
        });

        return () => { unsubLikes(); unsubComments(); };
    }, [video.id, currentUser]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) { onLogin(); return; }
        const likeRef = db.collection('videos').doc(video.id).collection('likes').doc(currentUser.uid);
        const batch = db.batch();
        
        try {
            if (isLiked) {
                await likeRef.delete();
            } else {
                batch.set(likeRef, { createdAt: serverTimestamp() });
                
                // Notification for author
                if (currentUser.uid !== video.authorId) {
                    const notifRef = db.collection('users').doc(video.authorId).collection('notifications').doc();
                    batch.set(notifRef, {
                        type: 'new_like',
                        fromUserId: currentUser.uid,
                        fromUserName: currentUser.name,
                        fromUserProfilePicUrl: currentUser.profilePicUrl,
                        videoId: video.id,
                        postTitle: video.title,
                        createdAt: serverTimestamp(),
                        read: false
                    });
                }
                await batch.commit();
            }
        } catch (error) { showToast("Action failed", "error"); }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextMuteState = !isMuted;
        if (!nextMuteState) {
            window.dispatchEvent(new CustomEvent('mute-all-video-previews'));
        }
        setIsMuted(nextMuteState);
    };

    const handleCardClick = () => {
        setIsMuted(true);
        window.dispatchEvent(new CustomEvent('mute-all-video-previews'));
        onViewVideo(video.id);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?videoId=${video.id}`;
        const shareText = `🚩 *न्यूज़ अपडेट:* *${video.title}*\n\n👉 *पूरी वीडियो यहाँ देखें:* ${shareUrl}\n\n*"आपकी खबर, आपकी पहचान – Public Tak News App"*`;
        
        db.collection('videos').doc(video.id).update({ shareCount: increment(1) }).catch(() => {});
        
        // Notification for author on share
        if (currentUser && currentUser.uid !== video.authorId) {
            db.collection('users').doc(video.authorId).collection('notifications').add({
                type: 'new_share',
                fromUserId: currentUser.uid,
                fromUserName: currentUser.name,
                fromUserProfilePicUrl: currentUser.profilePicUrl,
                videoId: video.id,
                postTitle: video.title,
                createdAt: serverTimestamp(),
                read: false
            }).catch(console.error);
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const timeAgo = useMemo(() => {
        if (!video.createdAt) return 'N/A';
        const now = new Date();
        const seconds = Math.floor((now.getTime() - video.createdAt.getTime()) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
        if (seconds < 3600 * 24) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / (3600 * 24)) + "d ago";
    }, [video.createdAt]);

    return (
        <div ref={cardRef} onClick={handleCardClick} className="glass-card overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full group hover:shadow-xl border border-gray-100 relative bg-white">
            <div className="p-3 flex items-center gap-2">
                <img onClick={(e) => { e.stopPropagation(); onViewUser(video.authorId); }} src={video.authorProfilePicUrl} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-100" alt="" />
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-sm truncate">@{video.authorName}</p>
                        {(!currentUser || (currentUser.uid !== video.authorId && !isFollowing)) && (
                            <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(video.authorId, video.authorName, video.authorProfilePicUrl); }} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-95">Follow</button>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400">{timeAgo}</p>
                </div>
            </div>

            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                <img src={video.thumbnailUrl} className={`w-full h-full object-cover transition-opacity duration-500 ${isVisible ? 'opacity-0' : 'opacity-90'} group-hover:scale-105`} alt="" />
                <video ref={videoPreviewRef} src={video.videoUrl} muted={isMuted} loop playsInline className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30 transform group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-white text-3xl">play_arrow</span></div>
                </div>
                {isVisible && (
                    <button onClick={toggleMute} className="absolute bottom-3 right-3 z-20 w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90 shadow-xl"><span className="material-symbols-outlined text-xl">{isMuted ? 'volume_off' : 'volume_up'}</span></button>
                )}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Video</div>
            </div>

            <div className="p-4 flex flex-col flex-grow"><h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">{video.title}</h3></div>

            <div className="px-4 py-2 border-t border-gray-50 flex justify-between items-center text-gray-400 bg-white mt-auto">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-2" title="Views"><span className="material-symbols-outlined text-lg">visibility</span><span className="text-xs font-semibold">{formatCount(video.viewCount || 0)}</span></div>
                    <button onClick={handleLike} className={`flex items-center gap-1 p-2 rounded-full hover:bg-red-50 transition-colors ${isLiked ? 'text-red-500' : ''}`}><span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span><span className="text-xs font-semibold">{formatCount(likeCount)}</span></button>
                    <div className="flex items-center gap-1 p-2"><span className="material-symbols-outlined text-lg">chat_bubble</span><span className="text-xs font-semibold">{formatCount(commentCount)}</span></div>
                    <button onClick={handleShare} className="flex items-center gap-1 text-green-600 p-2 rounded-full hover:bg-green-50"><i className="fa-brands fa-whatsapp text-lg"></i><span className="text-xs font-semibold">{formatCount(video.shareCount || 0)}</span></button>
                </div>
            </div>
        </div>
    );
};

// --- Main VideosPage Component ---
const VideosPage: React.FC<VideosPageProps> = ({ onNavigate, currentUser, onLogin, videoId, isCurrentView }) => {
    const [videos, setVideos] = useState<VideoPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
    const [followingList, setFollowingList] = useState<string[]>([]);
    const { t } = useLanguage();
    const { showToast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);
    const hasInitialPlayed = useRef(false);

    const [selectedCategory, setSelectedCategory] = useState('Recent News');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFlatView, setIsFlatView] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const NEAR_ME = 'Near Me';

    useEffect(() => {
        const unsub = db.collection("videos").orderBy("createdAt", "desc").onSnapshot(snap => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || null } as VideoPost));
            setVideos(prev => {
                if (activeReelIndex !== null) return prev;
                if (videoId) {
                    const exists = fetched.find(v => v.id === videoId);
                    if (!exists && prev.length > 0) {
                        const specific = prev.find(v => v.id === videoId);
                        if (specific) return [specific, ...fetched.filter(v => v.id !== videoId)];
                    }
                }
                return fetched;
            });
            setLoading(false);
        });
        return () => unsub();
    }, [activeReelIndex, videoId]);

    const updateUrlWithVideoId = useCallback((id: string | null) => {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set('videoId', id);
        else url.searchParams.delete('videoId');
        window.history.replaceState({ ...window.history.state, videoId: id }, '', url.toString());
    }, []);

    const openVideoReel = useCallback((id: string) => {
        const idx = videos.findIndex(v => v.id === id);
        if (idx !== -1) {
            window.dispatchEvent(new CustomEvent('mute-all-video-previews'));
            setActiveReelIndex(idx);
            updateUrlWithVideoId(id);
        }
    }, [videos, updateUrlWithVideoId]);

    useEffect(() => {
        if (activeReelIndex !== null && containerRef.current) {
            const container = containerRef.current;
            const performScroll = () => {
                const height = container.clientHeight;
                if (height > 0) container.scrollTo({ top: activeReelIndex * height, behavior: 'instant' });
                else requestAnimationFrame(performScroll);
            };
            setTimeout(() => requestAnimationFrame(performScroll), 50);
        }
    }, [activeReelIndex]);

    useEffect(() => {
        const checkAndOpenDirectVideo = async () => {
            if (isCurrentView && videoId && !hasInitialPlayed.current) {
                let idx = videos.findIndex(v => v.id === videoId);
                if (idx === -1) {
                    try {
                        const doc = await db.collection('videos').doc(videoId).get();
                        if (doc.exists) {
                            const videoData = { id: doc.id, ...doc.data(), createdAt: doc.data()?.createdAt?.toDate() || null } as VideoPost;
                            setVideos(prev => [videoData, ...prev]);
                            idx = 0;
                        }
                    } catch (e) { console.error("Failed shared video:", e); }
                }
                if (idx !== -1) {
                    window.dispatchEvent(new CustomEvent('mute-all-video-previews'));
                    setActiveReelIndex(idx);
                }
                hasInitialPlayed.current = true;
            }
            if (isCurrentView && !videoId) hasInitialPlayed.current = true;
        };
        checkAndOpenDirectVideo();
        if (!isCurrentView) hasInitialPlayed.current = false;
    }, [isCurrentView, videos.length, videoId]);

    useEffect(() => {
        if (currentUser) {
            const followingRef = db.collection('users').doc(currentUser.uid).collection('following');
            const unsubscribeFollowing = followingRef.onSnapshot((snapshot) => setFollowingList(snapshot.docs.map(doc => doc.id)));
            return () => unsubscribeFollowing();
        } else setFollowingList([]);
    }, [currentUser]);

    const displayCategories: CategoryItem[] = useMemo(() => {
        const items: CategoryItem[] = [{ id: NEAR_ME, label: t('nearMe') || 'Near Me', icon: 'my_location' }];
        newsCategories.forEach(cat => items.push({ id: cat, label: t(cat.toLowerCase()), icon: cat === 'Recent News' ? 'local_fire_department' : undefined }));
        return items;
    }, [t]);

    const handleCategorySelect = (category: string) => {
        if (category !== 'Recent News' && !currentUser && category !== NEAR_ME) { onLogin(); return; }
        if (category === NEAR_ME) {
            if (!currentUser) { onLogin(); return; }
            if (!currentUser.preferredState) { showToast(t('pleaseSetLocation'), "info"); onNavigate(View.EditProfile); return; }
            setSelectedState(currentUser.preferredState || '');
            setSelectedDistrict(currentUser.preferredDistrict || '');
            setSelectedBlock(currentUser.preferredBlock || '');
            setSelectedCategory(category);
            setIsFlatView(false);
            return;
        }
        setSelectedCategory(category);
        setIsFlatView(category !== 'Recent News');
    };

    const groupedSections = useMemo(() => {
        if (isFlatView || searchQuery.trim()) return [];
        let base = videos;
        if (selectedState) base = base.filter(v => v.state === selectedState && (!selectedDistrict || v.district === selectedDistrict) && (!selectedBlock || v.block === selectedBlock));
        const sections = [];
        if (base.length > 0) sections.push({ title: 'Recent News', key: 'Recent News', posts: base.slice(0, 8) });
        newsCategories.filter(c => c !== 'Recent News').forEach(cat => {
            const catPosts = base.filter(v => v.category === cat);
            if (catPosts.length > 0) sections.push({ title: cat, key: cat, posts: catPosts.slice(0, 8) });
        });
        return sections;
    }, [videos, isFlatView, selectedState, selectedDistrict, selectedBlock, searchQuery]);

    const filteredVideos = useMemo(() => {
        let result = videos;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(v => (v.title || '').toLowerCase().includes(q) || (v.authorName || '').toLowerCase().includes(q));
        }
        if (selectedCategory !== 'Recent News' && selectedCategory !== NEAR_ME) result = result.filter(v => v.category === selectedCategory);
        if (selectedState) result = result.filter(v => v.state === selectedState && (!selectedDistrict || v.district === selectedDistrict) && (!selectedBlock || v.block === selectedBlock));
        return result;
    }, [videos, selectedCategory, selectedState, selectedDistrict, selectedBlock, searchQuery]);

    const handleFollowToggle = useCallback(async (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => {
        if (!currentUser) { onLogin(); return; }
        const followRef = db.collection('users').doc(currentUser.uid).collection('following').doc(targetUserId);
        const followerRef = db.collection('users').doc(targetUserId).collection('followers').doc(currentUser.uid);
        const isFollowing = followingList.includes(targetUserId);
        const batch = db.batch();
        if (isFollowing) { batch.delete(followRef); batch.delete(followerRef); }
        else {
            batch.set(followRef, { followedAt: serverTimestamp() });
            batch.set(followerRef, { followedAt: serverTimestamp() });
            batch.set(db.collection('users').doc(targetUserId).collection('notifications').doc(), {
                type: 'new_follower', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, createdAt: serverTimestamp(), read: false
            });
        }
        await batch.commit();
    }, [currentUser, followingList, onLogin]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const scrollPos = container.scrollTop;
        const height = container.clientHeight;
        if (height <= 0) return;
        const index = Math.round(scrollPos / height);
        if (index !== activeReelIndex && index >= 0 && index < videos.length) {
            setActiveReelIndex(index);
            const currentVideo = videos[index];
            if (currentVideo) updateUrlWithVideoId(currentVideo.id);
        }
    }, [activeReelIndex, videos, updateUrlWithVideoId]);

    const handleCloseReel = () => {
        setActiveReelIndex(null);
        updateUrlWithVideoId(null);
    };

    const handleReelSearchRequest = () => {
        handleCloseReel();
        setShowMobileSearch(true);
        setTimeout(() => mobileSearchInputRef.current?.focus(), 300);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <SEO title="Videos" description="Watch hyper-local news and trending video updates." />

            {/* Desktop Header & Filters */}
            <div className="hidden md:block bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate(View.Main)} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-800 flex items-center justify-center">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="flex-grow relative">
                            <input 
                                type="text" 
                                placeholder="Search videos only..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                className="w-full pl-11 pr-10 py-2.5 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-100 border border-transparent focus:border-red-200 transition-all" 
                            />
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            )}
                        </div>
                        <button onClick={() => onNavigate(View.Settings)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center" title="Settings">
                            <span className="material-symbols-outlined text-gray-700">settings</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide flex gap-1">
                        {displayCategories.map(cat => (
                            <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{cat.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Header & Local Search */}
            <div className="md:hidden">
                {!showMobileSearch ? (
                    <Header 
                        title="Videos" 
                        showBackButton 
                        onBack={() => onNavigate(View.Main)} 
                        logoUrl={APP_LOGO_URL} 
                        onSearch={() => setShowMobileSearch(true)} 
                        showSettingsButton={true} 
                        onSettings={() => onNavigate(View.Settings)}
                    />
                ) : (
                    <div className="h-14 flex items-center px-3 gap-3 bg-white border-b border-gray-100 animate-in slide-in-from-top-1 duration-200">
                        <button onClick={() => { setShowMobileSearch(false); setSearchQuery(''); }} className="text-gray-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="flex-grow relative">
                            <input 
                                ref={mobileSearchInputRef}
                                type="text" 
                                placeholder="Search videos..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 py-2 pl-10 pr-10 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-100"
                                autoFocus
                            />
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="sticky top-0 z-20">
                    <Categories categories={displayCategories} selectedCategory={selectedCategory} onSelectCategory={handleCategorySelect} />
                    <LocationFilter selectedState={selectedState} setSelectedState={setSelectedState} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} />
                </div>
            </div>

            <main className="flex-grow overflow-y-auto pb-20 md:pb-10 bg-gray-50/30">
                <div className="max-w-7xl mx-auto md:px-4 py-6 px-4">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => <div key={i} className="glass-card aspect-video animate-pulse bg-gray-200 rounded-xl" />)}
                        </div>
                    ) : (
                        <>
                            {!isFlatView && !searchQuery.trim() ? (
                                <div className="space-y-12">
                                    {groupedSections.map(section => (
                                        <section key={section.title}>
                                            <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
                                                <h2 className="text-2xl font-black text-gray-800">{t(section.key.toLowerCase()) || section.title}</h2>
                                                <button onClick={() => { setSelectedCategory(section.key); setIsFlatView(true); }} className="text-red-600 font-bold text-sm flex items-center gap-1">View All <span className="material-symbols-outlined text-lg">arrow_forward</span></button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {section.posts.map((video) => (
                                                    <VideoCard key={video.id} video={video} currentUser={currentUser} onLogin={onLogin} onViewVideo={openVideoReel} onViewUser={(id) => onNavigate(View.PublicProfile, { userId: id })} isFollowing={followingList.includes(video.authorId)} handleFollowToggle={handleFollowToggle} index={0} />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
                                        <h2 className="text-2xl font-black text-gray-800">
                                            {searchQuery ? `Video results: "${searchQuery}"` : t(selectedCategory.toLowerCase()) || selectedCategory}
                                        </h2>
                                        {searchQuery && (
                                            <button 
                                                onClick={() => { setSearchQuery(''); setShowMobileSearch(false); }}
                                                className="text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                Clear search
                                            </button>
                                        )}
                                    </div>
                                    {filteredVideos.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {filteredVideos.map((video) => (
                                                <VideoCard key={video.id} video={video} currentUser={currentUser} onLogin={onLogin} onViewVideo={openVideoReel} onViewUser={(id) => onNavigate(View.PublicProfile, { userId: id })} isFollowing={followingList.includes(video.authorId)} handleFollowToggle={handleFollowToggle} index={0} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                            <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">video_library_off</span>
                                            <p className="text-gray-500 font-medium">No videos match your search.</p>
                                            <button onClick={() => { setSearchQuery(''); setShowMobileSearch(false); }} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg shadow-red-200 active:scale-95 transition-all">Show all videos</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {activeReelIndex !== null && isCurrentView && (
                <div className="fixed inset-0 z-[60] bg-black animate-in fade-in zoom-in-95 duration-300 h-screen w-screen overflow-hidden">
                    <div ref={containerRef} onScroll={handleScroll} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black touch-pan-y">
                        {videos.map((v, i) => (
                            <ReelItem key={v.id} video={v} isActive={activeReelIndex === i} currentUser={currentUser} onLogin={onLogin} onClose={handleCloseReel} onNavigate={onNavigate} onSearchTrigger={handleReelSearchRequest} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-component: ReelItem ---
const ReelItem: React.FC<{
    video: VideoPost;
    isActive: boolean;
    currentUser: User | null;
    onLogin: () => void;
    onClose: () => void;
    onNavigate: (view: View, params?: any) => void;
    onSearchTrigger: () => void;
}> = ({ video, isActive, currentUser, onLogin, onClose, onNavigate, onSearchTrigger }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const { showToast } = useToast();
    const { t } = useLanguage();

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isActive) {
            window.dispatchEvent(new CustomEvent('stop-app-audio'));
            window.dispatchEvent(new CustomEvent('mute-all-video-previews'));
            v.play().catch(() => {});
            db.collection('videos').doc(video.id).update({ viewCount: increment(1) }).catch(() => {});
        } else {
            v.pause();
            v.currentTime = 0;
        }
    }, [isActive, video.id]);

    useEffect(() => {
        const unsubLikes = db.collection('videos').doc(video.id).collection('likes').onSnapshot(snap => {
            setLikeCount(snap.size);
            if (currentUser) setIsLiked(snap.docs.some(doc => doc.id === currentUser.uid));
        });
        const unsubComments = db.collection('videos').doc(video.id).collection('comments').onSnapshot(snap => setCommentCount(snap.size));
        let unsubFollow = () => {};
        if (currentUser) unsubFollow = db.collection('users').doc(currentUser.uid).collection('following').doc(video.authorId).onSnapshot(doc => setIsFollowing(doc.exists));
        return () => { unsubLikes(); unsubComments(); unsubFollow(); };
    }, [video.id, currentUser, video.authorId]);

    const handleLike = async (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        if (!currentUser) { onLogin(); return; }
        const likeRef = db.collection('videos').doc(video.id).collection('likes').doc(currentUser.uid);
        const batch = db.batch();
        try { 
            if (isLiked) {
                // Only allow unfollowing via the side button, double tap only ADDS like if not already liked
                // standard reels behavior: double tap always likes, doesn't toggle
                if (e.type === 'click') await likeRef.delete(); 
            } else {
                batch.set(likeRef, { createdAt: serverTimestamp() });
                // Notify author
                if (currentUser.uid !== video.authorId) {
                    batch.set(db.collection('users').doc(video.authorId).collection('notifications').doc(), {
                        type: 'new_like',
                        fromUserId: currentUser.uid,
                        fromUserName: currentUser.name,
                        fromUserProfilePicUrl: currentUser.profilePicUrl,
                        videoId: video.id,
                        postTitle: video.title,
                        createdAt: serverTimestamp(),
                        read: false
                    });
                }
                await batch.commit();
            }
        } catch (e) { showToast("Action failed", "error"); }
    };

    const handleVideoTap = (e: React.MouseEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap < DOUBLE_TAP_DELAY) {
            // DOUBLE TAP DETECTED
            if (!isLiked) {
                handleLike(e);
            }
            setShowHeartAnim(true);
            setTimeout(() => setShowHeartAnim(false), 800);
        } else {
            // SINGLE TAP
            const v = videoRef.current;
            if (v) {
                if (v.paused) v.play();
                else v.pause();
            }
        }
        setLastTap(now);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?videoId=${video.id}`;
        const shareText = `🚩 *न्यूज़ अपडेट:* *${video.title}*\n\n👉 *पूरी वीडियो यहाँ देखें:* ${shareUrl}\n\n*"आपकी खबर, आपकी पहचान – Public Tak News App"*`;
        
        db.collection('videos').doc(video.id).update({ shareCount: increment(1) }).catch(() => {});
        
        // Notify author
        if (currentUser && currentUser.uid !== video.authorId) {
            db.collection('users').doc(video.authorId).collection('notifications').add({
                type: 'new_share',
                fromUserId: currentUser.uid,
                fromUserName: currentUser.name,
                fromUserProfilePicUrl: currentUser.profilePicUrl,
                videoId: video.id,
                postTitle: video.title,
                createdAt: serverTimestamp(),
                read: false
            }).catch(console.error);
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) { onLogin(); return; }
        const followRef = db.collection('users').doc(currentUser.uid).collection('following').doc(video.authorId);
        const followerRef = db.collection('users').doc(video.authorId).collection('followers').doc(currentUser.uid);
        const batch = db.batch();
        
        if (isFollowing) {
            batch.delete(followRef);
            batch.delete(followerRef);
        } else {
            batch.set(followRef, { followedAt: serverTimestamp() });
            batch.set(followerRef, { followedAt: serverTimestamp() });
            batch.set(db.collection('users').doc(video.authorId).collection('notifications').doc(), {
                type: 'new_follower',
                fromUserId: currentUser.uid,
                fromUserName: currentUser.name,
                fromUserProfilePicUrl: currentUser.profilePicUrl,
                createdAt: serverTimestamp(),
                read: false
            });
        }
        try { await batch.commit(); } catch (error) { showToast("Action failed", "error"); }
    };

    return (
        <div className="h-full w-full relative flex items-center justify-center bg-black snap-start snap-always overflow-hidden shrink-0">
            <video ref={videoRef} src={video.videoUrl} poster={video.thumbnailUrl} className="h-full w-full object-contain" loop playsInline preload="auto" onClick={handleVideoTap} />
            
            {/* Double Tap Heart Animation Overlay */}
            {showHeartAnim && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in zoom-in-50 fade-in duration-300">
                    <span className="material-symbols-outlined text-white text-[120px] drop-shadow-2xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
            )}

            <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-40 bg-gradient-to-b from-black/70 to-transparent">
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"><span className="material-symbols-outlined text-3xl">arrow_back</span></button>
                <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg"><span className="text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] drop-shadow-md">PUBLIC TAK NEWS APP</span></div>
                
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onSearchTrigger(); }} className="p-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] active:scale-90 transition-transform">
                        <span className="material-symbols-outlined text-3xl">search</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onNavigate(View.Settings); }} className="p-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] active:scale-90 transition-transform">
                        <span className="material-symbols-outlined text-3xl">settings</span>
                    </button>
                </div>
            </div>

            <div className="absolute right-3 bottom-20 flex flex-col items-center gap-7 z-30">
                <div className="flex flex-col items-center">
                    <button onClick={(e) => handleLike(e as any)} className="flex items-center justify-center active:scale-125 transition-all transform duration-200">
                        <span className={`material-symbols-outlined text-4xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${isLiked ? 'text-red-500' : 'text-white'}`} style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}, 'wght' 600` }}>favorite</span>
                    </button>
                    <span className="text-[11px] font-black text-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">{formatCount(likeCount)}</span>
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex items-center justify-center active:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-4xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" style={{ fontVariationSettings: "'wght' 600" }}>chat_bubble</span>
                    </button>
                    <span className="text-[11px] font-black text-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">{formatCount(commentCount)}</span>
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={handleShare} className="flex items-center justify-center active:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-4xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" style={{ fontVariationSettings: "'wght' 600" }}>share</span>
                    </button>
                    <span className="text-[11px] font-black text-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">{formatCount(video.shareCount || 0)}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="flex items-center justify-center opacity-80 active:scale-90 transition-all">
                    <span className="material-symbols-outlined text-3xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">more_horiz</span>
                </button>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 pb-14 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 flex flex-col pointer-events-none">
                <div className="flex items-center gap-3 mb-3 pointer-events-auto">
                    <div onClick={() => onNavigate(View.PublicProfile, { userId: video.authorId })} className="flex items-center gap-2 cursor-pointer group">
                        <img src={video.authorProfilePicUrl} className="w-10 h-10 rounded-full border-2 border-white/60 shadow-2xl group-hover:scale-105 transition-transform" alt="" />
                        <p className="font-black text-white text-base drop-shadow-lg tracking-tight">@{video.authorName}</p>
                    </div>
                    {(!currentUser || (currentUser.uid !== video.authorId && !isFollowing)) && (
                        <button onClick={handleFollowToggle} className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-white text-black shadow-xl active:scale-95 ml-2">Follow</button>
                    )}
                </div>
                <div className="max-w-[80%] pointer-events-auto">
                    <h2 className="font-bold text-white text-lg leading-tight drop-shadow-xl line-clamp-2 mb-2">{video.title}</h2>
                    <div className="flex items-center gap-3 opacity-90">
                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">{video.category}</span>
                        <span className="text-white text-[10px] font-bold drop-shadow-md flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{video.state || 'Overall'}</span>
                    </div>
                </div>
            </div>

            {showComments && <CommentBottomSheet videoId={video.id} videoAuthorId={video.authorId} videoTitle={video.title} onClose={() => setShowComments(false)} currentUser={currentUser} onLogin={onLogin} />}
            {showSettings && <VideoSettingsBottomSheet video={video} onClose={() => setShowSettings(false)} showToast={showToast} />}
        </div>
    );
};

const VideoSettingsBottomSheet: React.FC<{ video: VideoPost; onClose: () => void; showToast: (m: string, t: any) => void; }> = ({ video, onClose, showToast }) => {
    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full rounded-t-[32px] overflow-hidden p-8 animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?videoId=${video.id}`); showToast("Copied!", "success"); onClose(); }} className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-3xl">link</span></div>
                        <span className="font-bold text-sm text-gray-800">Copy Link</span>
                    </button>
                    <button onClick={() => { showToast("Reported!", "info"); onClose(); }} className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-3xl">flag</span></div>
                        <span className="font-bold text-sm text-gray-800">Report</span>
                    </button>
                </div>
                <button onClick={onClose} className="w-full py-4 bg-gray-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all">Close Menu</button>
            </div>
        </div>
    );
};

const CommentBottomSheet: React.FC<{ videoId: string; videoAuthorId: string; videoTitle: string; onClose: () => void; currentUser: User | null; onLogin: () => void; }> = ({ videoId, videoAuthorId, videoTitle, onClose, currentUser, onLogin }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        const unsub = db.collection('videos').doc(videoId).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snap => {
            setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() } as Comment)));
        });
        return () => unsub();
    }, [videoId]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        if (!currentUser) { onLogin(); return; }
        setIsSubmitting(true);
        try { 
            const batch = db.batch();
            const commentRef = db.collection('videos').doc(videoId).collection('comments').doc();
            batch.set(commentRef, { 
                content: newComment.trim(), 
                authorId: currentUser.uid, 
                authorName: currentUser.name, 
                authorProfilePicUrl: currentUser.profilePicUrl, 
                createdAt: serverTimestamp() 
            });
            
            // Notify author
            if (currentUser.uid !== videoAuthorId) {
                const notifRef = db.collection('users').doc(videoAuthorId).collection('notifications').doc();
                batch.set(notifRef, {
                    type: 'new_comment',
                    fromUserId: currentUser.uid,
                    fromUserName: currentUser.name,
                    fromUserProfilePicUrl: currentUser.profilePicUrl,
                    videoId: videoId,
                    postTitle: videoTitle,
                    createdAt: serverTimestamp(),
                    read: false
                });
            }
            await batch.commit();
            setNewComment(''); 
        } catch (e) {} finally { setIsSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full rounded-t-[32px] max-h-[75vh] flex flex-col p-5 shadow-[0_-20px_60px_rgba(0,0,0,0.3)] overflow-hidden animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                <div className="px-2 mb-6 flex justify-between items-center border-b border-gray-50 pb-4">
                    <h3 className="font-black text-xl text-gray-900 tracking-tight">Comments <span className="text-gray-300 ml-1">({comments.length})</span></h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"><span className="material-symbols-outlined text-xl">close</span></button>
                </div>
                <div className="flex-grow overflow-y-auto mb-6 space-y-6 px-1 scrollbar-hide">
                    {comments.length > 0 ? comments.map(c => (
                        <div key={c.id} className="flex gap-4 group">
                            <img src={c.authorProfilePicUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100" alt="" />
                            <div className="flex-grow">
                                <div className="bg-gray-50 p-4 rounded-[22px] rounded-tl-none border border-gray-100/50">
                                    <p className="text-[11px] font-black text-gray-900 mb-1">@{c.authorName}</p>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{c.content}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-2 ml-2">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                                    <button className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-red-600">Reply</button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-24 opacity-40">
                            <span className="material-symbols-outlined text-7xl text-gray-200">forum</span>
                            <p className="font-black text-gray-400 mt-4 uppercase tracking-[0.2em] text-xs">No comments yet</p>
                        </div>
                    )}
                </div>
                <div className="pb-safe">
                    <form onSubmit={handleSubmit} className="flex gap-3 bg-gray-100 p-2.5 rounded-[24px] border border-gray-200 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 transition-all mb-4">
                        <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your thoughts..." className="flex-grow bg-transparent px-4 text-sm font-medium outline-none text-gray-800" />
                        <button type="submit" disabled={isSubmitting || !newComment.trim()} className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"><span className="material-symbols-outlined text-xl">send</span></button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default VideosPage;
