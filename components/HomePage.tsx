import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, User, Post } from '../types';
import Header from './Header';
import PostCard from './PostCard';
import Categories, { CategoryItem } from './Categories';
import LocationFilter from './LocationFilter';
import { db, serverTimestamp, increment, firebase } from '../firebaseConfig';
import ReportModal from './ReportModal';
import { useLanguage } from '../contexts/LanguageContext';
import { indianLocations } from '../data/locations';
import AdBanner from './AdBanner';
import { useToast } from '../contexts/ToastContext';
import SEO from './SEO';
import { APP_LOGO_URL, APP_NAME } from '../utils/constants';

interface HomePageProps {
  onNavigate: (view: View, params?: any) => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onViewPost: (postId: string) => void;
  onViewUser: (userId: string) => void;
  onEditPost: (postId: string) => void;
}

const SkeletonPostCard = () => (
  <div className="glass-card overflow-hidden h-full flex flex-col border border-gray-100 md:rounded-2xl">
    <div className="p-3 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
      <div className="flex-1 h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="w-full aspect-video bg-gray-200"></div>
    <div className="p-4 flex-grow space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onNavigate, currentUser, onLogin, onLogout, onViewPost, onViewUser, onEditPost }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [followingList, setFollowingList] = useState<string[]>([]);
    const [dynamicCategories, setDynamicCategories] = useState<string[]>(['Recent News', 'General']);
    
    // Dynamic Site Config
    const [siteConfig, setSiteConfig] = useState({ 
        siteName: APP_NAME, 
        homeTagline: 'पब्लिक तक - आपके क्षेत्र की हर छोटी-बड़ी खबर।',
        announcement: '' 
    });

    const { t } = useLanguage();
    const { showToast } = useToast();
    
    const [selectedCategory, setSelectedCategory] = useState('Recent News');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [initialLocationSet, setInitialLocationSet] = useState(false);
    
    const [isFlatView, setIsFlatView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const states = Object.keys(indianLocations);
    const districts = selectedState ? Object.keys(indianLocations[selectedState] || {}) : [];
    const blocks = selectedState && selectedDistrict ? (indianLocations[selectedState] || {})[selectedDistrict] || [] : [];

    const NEAR_ME = 'Near Me';

    const userLocationLabel = useMemo(() => {
        if (!currentUser) return '';
        return currentUser.preferredBlock || currentUser.preferredDistrict || currentUser.preferredState || '';
    }, [currentUser]);

    // Fetch Dynamic Config & Categories
    useEffect(() => {
        const unsubCat = db.collection('site_settings').doc('categories').onSnapshot(doc => {
            if (doc.exists) {
                const list = doc.data()?.list || [];
                if (!list.includes('Recent News')) setDynamicCategories(['Recent News', ...list]);
                else setDynamicCategories(list);
            }
        });

        const unsubConfig = db.collection('site_settings').doc('general').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setSiteConfig({
                    siteName: data?.siteName || APP_NAME,
                    homeTagline: data?.homeTagline || 'पब्लिक तक - आपके क्षेत्र की हर छोटी-बड़ी खबर।',
                    announcement: data?.announcement || ''
                });
            }
        });

        return () => { unsubCat(); unsubConfig(); };
    }, []);

    const displayCategories: CategoryItem[] = useMemo(() => {
        const items: CategoryItem[] = [];
        items.push({ id: NEAR_ME, label: t('nearMe') || 'Near Me', icon: 'my_location' });
        
        dynamicCategories.forEach(cat => {
            const lowerKey = cat.toLowerCase();
            const translated = t(lowerKey);
            // "Same to Same" logic: If translated string is same as lookup key, 
            // use the original category name from Admin Panel (cat)
            const finalLabel = translated === lowerKey ? cat : translated;

            items.push({
                id: cat,
                label: finalLabel,
                icon: cat === 'Recent News' ? 'local_fire_department' : undefined
            });
        });
        return items;
    }, [t, dynamicCategories]);

    useEffect(() => {
        if (posts.length === 0) setLoading(true);
        const postsQuery = db.collection("posts").orderBy("createdAt", "desc");
        const unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
                } as Post;
            });
            setPosts(fetchedPosts);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching posts:", err.message);
            setError(t('error'));
            setLoading(false);
        });
        return () => unsubscribePosts();
    }, [t]);

    useEffect(() => {
        if (currentUser) {
            const followingRef = db.collection('users').doc(currentUser.uid).collection('following');
            const unsubscribeFollowing = followingRef.onSnapshot((snapshot) => {
                setFollowingList(snapshot.docs.map(doc => doc.id));
            });
            return () => unsubscribeFollowing();
        } else setFollowingList([]);
    }, [currentUser]);

    const handleLocationReset = () => {
        setSelectedState(''); setSelectedDistrict(''); setSelectedBlock('');
    };

    useEffect(() => {
        if (currentUser && !initialLocationSet && currentUser.preferredState) {
            setSelectedState(currentUser.preferredState);
            if (currentUser.preferredDistrict) setSelectedDistrict(currentUser.preferredDistrict);
            if (currentUser.preferredBlock) setSelectedBlock(currentUser.preferredBlock);
            setInitialLocationSet(true);
        } else if (!currentUser && initialLocationSet) {
            setInitialLocationSet(false);
            handleLocationReset();
            setSelectedCategory('Recent News');
            setIsFlatView(false);
        }
    }, [currentUser, initialLocationSet]);

    useEffect(() => {
        if (searchQuery.trim()) setIsFlatView(true);
        else if (selectedCategory === 'Recent News' || selectedCategory === NEAR_ME) setIsFlatView(false);
    }, [searchQuery, selectedCategory]);

    const groupedSections = useMemo(() => {
        if (isFlatView || searchQuery.trim()) return [];
        let base = posts;
        if (selectedState) {
            base = base.filter(p => {
                if (p.state !== selectedState) return false;
                if (selectedDistrict && p.district !== selectedDistrict) return false;
                if (selectedBlock && p.block !== selectedBlock) return false;
                return true;
            });
        }
        const sections = [];
        if (base.length > 0) sections.push({ title: 'Recent News', categoryKey: 'Recent News', posts: base.slice(0, 8) });
        dynamicCategories.filter(c => c !== 'Recent News').forEach(cat => {
            const catPosts = base.filter(p => p.category === cat);
            if (catPosts.length > 0) sections.push({ title: cat, categoryKey: cat, posts: catPosts.slice(0, 8) });
        });
        return sections;
    }, [posts, isFlatView, selectedState, selectedDistrict, selectedBlock, searchQuery, dynamicCategories]);

    const filteredPosts = useMemo(() => {
        let result = posts;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(post => post.title.toLowerCase().includes(query) || post.authorName.toLowerCase().includes(query));
        }
        if (selectedCategory !== 'Recent News' && selectedCategory !== NEAR_ME) result = result.filter(post => post.category === selectedCategory);
        if (selectedState) {
            result = result.filter(post => post.state === selectedState && (!selectedDistrict || post.district === selectedDistrict) && (!selectedBlock || post.block === selectedBlock));
        }
        return result;
    }, [posts, selectedCategory, selectedState, selectedDistrict, selectedBlock, searchQuery]);

    const handleFollowToggle = useCallback(async (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => {
        if (!currentUser) { onLogin(); return; }
        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(targetUserId);
        const isFollowing = followingList.includes(targetUserId);
        try {
            const batch = db.batch();
            if (isFollowing) { batch.delete(currentUserRef.collection('following').doc(targetUserId)); batch.delete(targetUserRef.collection('followers').doc(currentUser.uid)); }
            else { batch.set(currentUserRef.collection('following').doc(targetUserId), { followedAt: serverTimestamp() }); batch.set(targetUserRef.collection('followers').doc(currentUser.uid), { followedAt: serverTimestamp() }); batch.set(targetUserRef.collection('notifications').doc(), { type: 'new_follower', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, createdAt: serverTimestamp(), read: false }); }
            await batch.commit();
        } catch (error) { console.error(error); }
    }, [currentUser, followingList, onLogin]);
    
    const handleCategorySelect = (category: string) => {
        if (category === NEAR_ME) {
            if (!currentUser) { onLogin(); return; }
            if (!currentUser.preferredState) { showToast(t('pleaseSetLocation'), "info"); onNavigate(View.EditProfile); return; }
            setSelectedState(currentUser.preferredState || ''); setSelectedDistrict(currentUser.preferredDistrict || ''); setSelectedBlock(currentUser.preferredBlock || '');
            setSelectedCategory(category); setSearchQuery(''); setIsFlatView(false); window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (category !== 'Recent News' && !currentUser) { onLogin(); return; }
        setSelectedCategory(category); setSearchQuery(''); setIsFlatView(category !== 'Recent News'); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewAll = (categoryKey: string) => {
        if (categoryKey !== 'Recent News' && !currentUser) { onLogin(); return; }
        setSelectedCategory(categoryKey); setIsFlatView(true); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex flex-col h-full bg-transparent relative">
            <SEO 
                title="Home" 
                description="पब्लिक तक (Public Tak) - आपके क्षेत्र की हर छोटी-बड़ी खबर अब आपकी जेब में। ताज़ा स्थानीय समाचार, ब्रेकिंग न्यूज़ वीडियो और आर्टिकल्स सीधे अपने ब्लॉक और जिले से प्राप्त करें। अभी डाउनलोड करें और भारत के सबसे तेज़ लोकल न्यूज़ नेटवर्क का हिस्सा बनें!" 
            />
            
            {/* Top Announcement Bar from Admin */}
            {siteConfig.announcement && (
                <div className="bg-yellow-100 border-b border-yellow-200 py-2 px-4 text-center">
                    <p className="text-xs font-bold text-yellow-800 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm animate-pulse">campaign</span>
                        {siteConfig.announcement}
                    </p>
                </div>
            )}

            <div className="hidden md:block bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/60 shadow-sm">
                <div className="w-full max-w-7xl mx-auto px-4">
                    <div className="flex flex-col gap-2 pt-4 pb-2">
                        <div className="flex items-center gap-4 w-full">
                            <h1 className="text-2xl font-black text-red-600 whitespace-nowrap">{siteConfig.siteName}</h1>
                             <div className="flex-grow relative">
                                <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2 bg-gray-100/80 hover:bg-white focus:bg-white border border-transparent focus:border-red-200 rounded-xl text-gray-800 outline-none transition-all" />
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
                            </div>
                            <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100 shadow-sm flex-shrink-0">
                                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer border-r border-gray-200">
                                    <option value="">State</option>
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedState} className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer">
                                    <option value="">District</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                {(selectedState || selectedDistrict) && <button onClick={handleLocationReset} className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1"><span className="material-symbols-outlined text-lg">close</span></button>}
                            </div>
                        </div>
                        <div className="w-full overflow-x-auto scrollbar-hide pt-1">
                             <div className="flex items-center gap-1 pb-1">
                                 {displayCategories.map(cat => (
                                    <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedCategory === cat.id ? 'bg-red-600 text-white border-red-600 shadow-md' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                                        {cat.icon && <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>}
                                        {cat.label}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:hidden">
                 <Header title={siteConfig.siteName} logoUrl={APP_LOGO_URL} showSettingsButton onSettings={() => onNavigate(View.Settings)} onSearch={() => onNavigate(View.Search)} currentUser={currentUser} onProfileClick={() => onNavigate(View.User)} onLogin={onLogin} />
            </div>

            <div className="flex-1 flex flex-col h-full overflow-y-auto md:overflow-visible pb-20 md:pb-0">
                <div className="sticky top-0 z-20 md:hidden shadow-sm">
                  <Categories categories={displayCategories} selectedCategory={selectedCategory} onSelectCategory={handleCategorySelect} />
                  <LocationFilter selectedState={selectedState} setSelectedState={setSelectedState} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} />
                </div>
                
                <main className="flex-grow w-full max-w-7xl mx-auto md:px-4 md:py-6">
                    {loading && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonPostCard key={i} />)}</div>}
                    {!loading && !isFlatView && !searchQuery.trim() && groupedSections.length > 0 && (
                        <div className="space-y-10">
                            {groupedSections.map((section, idx) => (
                                <section key={section.title}>
                                    {idx === 1 && <AdBanner slotType="home" />}
                                    <div className="flex items-center justify-between mb-4 px-4 md:px-0">
                                        <h2 className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">{section.title}</h2>
                                        <button onClick={() => handleViewAll(section.categoryKey)} className="text-red-600 font-black uppercase text-[10px] tracking-widest bg-red-50 px-4 py-2 rounded-full active:scale-95 transition-all">View All</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 md:gap-8">
                                        {section.posts.map((post) => (
                                            <PostCard key={post.id} post={post} currentUser={currentUser} onLogin={onLogin} onReport={p => setReportingPost(p)} onViewPost={onViewPost} onViewUser={onViewUser} isFollowing={followingList.includes(post.authorId)} handleFollowToggle={handleFollowToggle} onNavigate={onNavigate} onEditPost={onEditPost} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                    {!loading && (isFlatView || searchQuery.trim()) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 md:gap-8">
                            {filteredPosts.map((post) => (
                                <PostCard key={post.id} post={post} currentUser={currentUser} onLogin={onLogin} onReport={p => setReportingPost(p)} onViewPost={onViewPost} onViewUser={onViewUser} isFollowing={followingList.includes(post.authorId)} handleFollowToggle={handleFollowToggle} onNavigate={onNavigate} onEditPost={onEditPost} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
            {reportingPost && currentUser && <ReportModal post={reportingPost} user={currentUser} onClose={() => setReportingPost(null)} onSuccess={() => setReportingPost(null)} />}
        </div>
    );
};

export default HomePage;