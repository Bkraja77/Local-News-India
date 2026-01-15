
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
import { APP_LOGO_URL } from '../utils/constants';

interface HomePageProps {
  onNavigate: (view: View, params?: any) => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onViewPost: (postId: string) => void;
  onViewUser: (userId: string) => void;
  onEditPost: (postId: string) => void;
}

const newsCategories = ['Recent News', 'Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];

// Skeleton Loader for PostCard
const SkeletonPostCard = () => (
  <div className="glass-card overflow-hidden h-full flex flex-col border border-gray-100">
    <div className="p-3 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
      <div className="flex-1 h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="w-full h-48 bg-gray-200"></div>
    <div className="p-4 flex-grow space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
    <div className="px-4 py-3 border-t border-gray-5 flex justify-between bg-white/50">
       <div className="w-20 h-4 bg-gray-200 rounded"></div>
       <div className="w-10 h-4 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onNavigate, currentUser, onLogin, onLogout, onViewPost, onViewUser, onEditPost }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [followingList, setFollowingList] = useState<string[]>([]);
    
    const { t } = useLanguage();
    const { showToast } = useToast();
    
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState('Recent News');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [initialLocationSet, setInitialLocationSet] = useState(false);
    
    // View Mode State: 'grouped' (sections) or 'flat' (grid)
    const [isFlatView, setIsFlatView] = useState(false);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Derived lists for desktop dropdowns
    const states = Object.keys(indianLocations);
    const districts = selectedState ? Object.keys(indianLocations[selectedState] || {}) : [];
    const blocks = selectedState && selectedDistrict ? (indianLocations[selectedState] || {})[selectedDistrict] || [] : [];

    const NEAR_ME = 'Near Me';

    // Determine User's Locality Label for Display
    const userLocationLabel = useMemo(() => {
        if (!currentUser) return '';
        return currentUser.preferredBlock || currentUser.preferredDistrict || currentUser.preferredState || '';
    }, [currentUser]);

    // Construct Display Categories
    const displayCategories: CategoryItem[] = useMemo(() => {
        const items: CategoryItem[] = [];
        
        // 1. Static Near Me Category
        items.push({
            id: NEAR_ME,
            label: t('nearMe') || 'Near Me',
            icon: 'my_location'
        });

        // 2. Standard Categories
        newsCategories.forEach(cat => {
            items.push({
                id: cat,
                label: t(cat.toLowerCase()),
                icon: cat === 'Recent News' ? 'local_fire_department' : undefined
            });
        });

        return items;
    }, [t]);

    useEffect(() => {
        if (posts.length === 0) setLoading(true);
        setError(null);

        const postsQuery = db.collection("posts").orderBy("createdAt", "desc");
        const unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    thumbnailUrl: data.thumbnailUrl,
                    authorId: data.authorId,
                    authorName: data.authorName,
                    authorProfilePicUrl: data.authorProfilePicUrl,
                    viewCount: data.viewCount || 0,
                    shareCount: data.shareCount || 0,
                    category: data.category || 'General',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
                    locationType: data.locationType || 'Overall',
                    state: data.state || '',
                    district: data.district || '',
                    block: data.block || '',
                } as Post;
            });
            setPosts(fetchedPosts);
            setLoading(false);
            setError(null);
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
        } else {
            setFollowingList([]);
        }
    }, [currentUser]);

    const handleLocationReset = () => {
        setSelectedState('');
        setSelectedDistrict('');
        setSelectedBlock('');
    };

    useEffect(() => {
        if (currentUser && !initialLocationSet && currentUser.preferredState) {
            setSelectedState(currentUser.preferredState);
            if (currentUser.preferredDistrict) {
                setSelectedDistrict(currentUser.preferredDistrict);
            }
            if (currentUser.preferredBlock) {
                setSelectedBlock(currentUser.preferredBlock);
            }
            setInitialLocationSet(true);
        } else if (!currentUser && initialLocationSet) {
            setInitialLocationSet(false);
            handleLocationReset();
            setSelectedCategory('Recent News');
            setIsFlatView(false);
        }
    }, [currentUser, initialLocationSet]);

    // Switch to flat view if searching
    useEffect(() => {
        if (searchQuery.trim()) {
            setIsFlatView(true);
        } else if (selectedCategory === 'Recent News' || selectedCategory === NEAR_ME) {
            setIsFlatView(false);
        }
    }, [searchQuery, selectedCategory]);

    // --- Derived Data: Grouped Sections (for Dashboard View) ---
    const groupedSections = useMemo(() => {
        if (isFlatView || searchQuery.trim()) return [];

        // Base filtering by location only (Category is handled by sections)
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

        // 1. Recent News Section (First 8 of all sorted posts)
        if (base.length > 0) {
            sections.push({
                title: 'Recent News',
                categoryKey: 'Recent News',
                posts: base.slice(0, 8),
                hasMore: base.length > 8
            });
        }

        // 2. Category Sections
        const cats = newsCategories.filter(c => c !== 'Recent News');
        cats.forEach(cat => {
            const catPosts = base.filter(p => p.category === cat);
            if (catPosts.length > 0) {
                sections.push({
                    title: cat,
                    categoryKey: cat,
                    posts: catPosts.slice(0, 8),
                    hasMore: catPosts.length > 8
                });
            }
        });

        return sections;
    }, [posts, isFlatView, selectedState, selectedDistrict, selectedBlock, searchQuery]);

    // --- Derived Data: Flat List (for Category Pages or Search) ---
    const filteredPosts = useMemo(() => {
        let result = posts;

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(post => 
                post.title.toLowerCase().includes(query) || 
                post.content.toLowerCase().includes(query) ||
                post.authorName.toLowerCase().includes(query)
            );
        }

        // Category
        if (selectedCategory !== 'Recent News' && selectedCategory !== NEAR_ME) {
            result = result.filter(post => post.category === selectedCategory);
        }

        // Location
        if (selectedState) {
            result = result.filter(post => {
                if (post.state !== selectedState) return false;
                if (selectedDistrict && post.district !== selectedDistrict) return false;
                if (selectedBlock && post.block !== selectedBlock) return false;
                return true;
            });
        }
        
        return result;
    }, [posts, selectedCategory, selectedState, selectedDistrict, selectedBlock, searchQuery]);


    // --- Handlers ---

    const handleFollowToggle = useCallback(async (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(targetUserId);
        const followingRef = currentUserRef.collection('following').doc(targetUserId);
        const followerRef = targetUserRef.collection('followers').doc(currentUser.uid);
        const isFollowing = followingList.includes(targetUserId);

        try {
            const batch = db.batch();
            if (isFollowing) {
                batch.delete(followingRef);
                batch.delete(followerRef);
            } else {
                batch.set(followingRef, { followedAt: serverTimestamp() });
                batch.set(followerRef, { followedAt: serverTimestamp() });
                const notificationRef = targetUserRef.collection('notifications').doc();
                batch.set(notificationRef, {
                    type: 'new_follower',
                    fromUserId: currentUser.uid,
                    fromUserName: currentUser.name,
                    fromUserProfilePicUrl: currentUser.profilePicUrl,
                    createdAt: serverTimestamp(),
                    read: false
                });
            }
            await batch.commit();
        } catch (error) {
            console.error("Error following/unfollowing user:", error);
            alert("Action failed. Please try again.");
        }
    }, [currentUser, followingList, onLogin]);
    
    const handleReport = useCallback((post: Post) => {
        if (!currentUser) {
            alert("You must be logged in to report a post.");
            onLogin();
            return;
        }
        setReportingPost(post);
    }, [currentUser, onLogin]);

    const handleReportSuccess = () => {
        setReportingPost(null);
        onNavigate(View.Main);
    };
    
    const handleCategorySelect = (category: string) => {
        // Special logic for "Near Me"
        if (category === NEAR_ME) {
            if (!currentUser) {
                onLogin();
                return;
            }
            // Check if user has set location
            if (!currentUser.preferredState && !currentUser.preferredDistrict) {
                 showToast(t('pleaseSetLocation'), "info");
                 onNavigate(View.EditProfile);
                 return;
            }

            // Reset to user's preferences
            setSelectedState(currentUser.preferredState || '');
            setSelectedDistrict(currentUser.preferredDistrict || '');
            setSelectedBlock(currentUser.preferredBlock || '');
            
            setSelectedCategory(category);
            setSearchQuery('');
            setIsFlatView(false); // Keep Dashboard view but strictly filtered
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Restrict access for non-logged-in users for categories other than 'Recent News'
        if (category !== 'Recent News' && !currentUser) {
            onLogin();
            return;
        }

        setSelectedCategory(category);
        setSearchQuery('');
        
        if (category === 'Recent News') {
            setIsFlatView(false);
        } else {
            setIsFlatView(true);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewAll = (categoryKey: string) => {
        // Restrict view all except for Recent News
        if (categoryKey !== 'Recent News' && !currentUser) {
            onLogin();
            return;
        }
        setSelectedCategory(categoryKey);
        setIsFlatView(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStateSelect = (state: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedState(state);
        setSelectedDistrict('');
        setSelectedBlock('');
    };

    const handleDistrictSelect = (district: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedDistrict(district);
        setSelectedBlock('');
    };
    
    const handleBlockSelect = (block: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedBlock(block);
    };


    return (
        <div className="flex flex-col h-full bg-transparent relative">
            <SEO 
                title="Home"
                description="Public Tak is your trusted source for hyper-local news, breaking updates, politics, sports, and entertainment from across India."
            />
            
            {/* ================= Desktop Header ================= */}
            <div className="hidden md:block bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/60 shadow-sm">
                <div className="w-full max-w-7xl mx-auto px-4">
                    <div className="flex flex-col gap-2 pt-4 pb-2">
                        {/* Top Row: Search & Location */}
                        <div className="flex items-center gap-4 w-full">
                             {/* Search Bar - Full Width */}
                             <div className="flex-grow relative">
                                <input 
                                    type="text" 
                                    placeholder={t('searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-100/80 hover:bg-white focus:bg-white border border-transparent focus:border-red-200 rounded-xl text-gray-800 placeholder-gray-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-300 outline-none shadow-sm"
                                />
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
                            </div>

                            {/* Location Filters - Compact Row */}
                            <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100 shadow-sm flex-shrink-0">
                                <select value={selectedState} onChange={(e) => handleStateSelect(e.target.value)} className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer hover:text-red-600 transition-colors border-r border-gray-200 max-w-[120px] truncate">
                                    <option value="">State</option>
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={selectedDistrict} onChange={(e) => handleDistrictSelect(e.target.value)} disabled={!selectedState} className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer hover:text-red-600 transition-colors disabled:text-gray-400 max-w-[120px] truncate">
                                    <option value="">District</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                 {selectedDistrict && (
                                    <select value={selectedBlock} onChange={(e) => handleBlockSelect(e.target.value)} disabled={!selectedDistrict} className="bg-transparent text-sm font-medium text-gray-700 py-1.5 px-2 outline-none cursor-pointer hover:text-red-600 transition-colors disabled:text-gray-400 border-l border-gray-200 max-w-[120px] truncate hidden lg:block">
                                        <option value="">Block</option>
                                        {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                 )}
                                {(selectedState || selectedDistrict) && (
                                    <button onClick={handleLocationReset} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1" title="Reset">
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Categories */}
                        <div className="w-full overflow-x-auto scrollbar-hide pt-1">
                             <div className="flex items-center gap-1 pb-1">
                                 {displayCategories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => handleCategorySelect(cat.id)}
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border border-transparent ${
                                            selectedCategory === cat.id
                                            ? 'bg-red-600 text-white shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        {cat.icon && <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>}
                                        {cat.label}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= Mobile Header ================= */}
            <div className="md:hidden">
                 <Header 
                    title="Public Tak"
                    logoUrl={APP_LOGO_URL}
                    showSettingsButton
                    onSettings={() => onNavigate(View.Settings)}
                    onSearch={() => onNavigate(View.Search)}
                    currentUser={currentUser}
                    onProfileClick={() => onNavigate(View.User)}
                    onLogin={onLogin}
                />
            </div>
            
            {/* Main Feed Section */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto md:overflow-visible pb-20 md:pb-0">
                {/* Mobile Filters (Sticky Top) */}
                <div className="sticky top-0 z-20 md:hidden shadow-sm">
                  <Categories 
                      categories={displayCategories}
                      selectedCategory={selectedCategory}
                      onSelectCategory={handleCategorySelect}
                  />
                  <LocationFilter 
                    selectedState={selectedState}
                    setSelectedState={handleStateSelect}
                    selectedDistrict={selectedDistrict}
                    setSelectedDistrict={handleDistrictSelect}
                    selectedBlock={selectedBlock}
                    setSelectedBlock={handleBlockSelect}
                  />
                </div>

                <div className="flex flex-col w-full">
                    <main className="flex-grow w-full max-w-7xl mx-auto md:px-4 md:py-6">
                        <div className="p-4 md:p-0 w-full">
                            
                            {loading && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                    {[...Array(8)].map((_, i) => <SkeletonPostCard key={i} />)}
                                </div>
                            )}

                            {error && <p className="text-center text-red-500">{error}</p>}
                            
                            {/* VIEW MODE: GROUPED SECTIONS (Dashboard style) */}
                            {!loading && !isFlatView && !searchQuery.trim() && groupedSections.length > 0 && (
                                <div className="space-y-12">
                                    {/* Dashboard Welcome Context - Only show for Near Me to give context about location */}
                                    {(selectedCategory === NEAR_ME || selectedState) && (
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                                {selectedCategory === NEAR_ME && (
                                                    <>
                                                        <span className="material-symbols-outlined text-red-500">location_on</span>
                                                        <span>News from <span className="text-red-600">{userLocationLabel || t('nearMe')}</span></span>
                                                    </>
                                                )}
                                            </h2>
                                            {selectedState && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                                                    {selectedBlock || selectedDistrict || selectedState}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {groupedSections.map((section, idx) => (
                                        <section key={section.title} className="mb-12">
                                            {/* Insert Ad Banner after first section */}
                                            {idx === 1 && <AdBanner slotType="home" />}

                                            <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
                                                <div className="flex items-center gap-4">
                                                     <div className="hidden md:block w-1.5 h-8 bg-gradient-to-b from-red-500 to-red-700 rounded-full shadow-sm"></div>
                                                     <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
                                                        {t(section.title.toLowerCase()) || section.title}
                                                     </h2>
                                                </div>
                                                <button 
                                                    onClick={() => handleViewAll(section.categoryKey)}
                                                    className="group flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                                                >
                                                    <span>View All</span>
                                                    <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                                                </button>
                                                
                                                {/* Decorative gradient line at bottom left */}
                                                <div className="absolute bottom-0 left-0 w-1/3 h-[2px] bg-gradient-to-r from-red-500/50 to-transparent rounded-full"></div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                                {section.posts.map((post) => (
                                                    <div key={post.id} className="h-full">
                                                        <PostCard 
                                                            post={post} 
                                                            currentUser={currentUser}
                                                            onLogin={onLogin}
                                                            onReport={handleReport}
                                                            onViewPost={onViewPost}
                                                            onViewUser={onViewUser}
                                                            isFollowing={followingList.includes(post.authorId)}
                                                            handleFollowToggle={handleFollowToggle}
                                                            onNavigate={onNavigate}
                                                            onEditPost={onEditPost}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                    
                                    {groupedSections.length === 0 && !loading && (
                                         <div className="text-center py-20 glass-card">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">feed</span>
                                            <p className="text-gray-700 text-lg font-medium">{t('noPostsFound')}</p>
                                         </div>
                                    )}
                                </div>
                            )}

                            {/* VIEW MODE: FLAT GRID (Specific Category or Search) */}
                            {!loading && (isFlatView || searchQuery.trim()) && (
                                <div>
                                     <div className="mb-6 px-1 flex justify-between items-center border-b border-gray-200 pb-4">
                                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
                                            {searchQuery ? `Search Results: "${searchQuery}"` : t(selectedCategory.toLowerCase()) || selectedCategory}
                                        </h2>
                                        {!searchQuery && selectedCategory !== 'Recent News' && selectedCategory !== NEAR_ME && (
                                            <button 
                                                onClick={() => handleCategorySelect('Recent News')}
                                                className="text-sm font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                                Back to Home
                                            </button>
                                        )}
                                    </div>
                                    
                                    {filteredPosts.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                            {filteredPosts.map((post, index) => (
                                                <div key={post.id} className="h-full">
                                                    <PostCard 
                                                        post={post} 
                                                        currentUser={currentUser}
                                                        onLogin={onLogin}
                                                        onReport={handleReport}
                                                        onViewPost={onViewPost}
                                                        onViewUser={onViewUser}
                                                        isFollowing={followingList.includes(post.authorId)}
                                                        handleFollowToggle={handleFollowToggle}
                                                        onNavigate={onNavigate}
                                                        onEditPost={onEditPost}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                         <div className="text-center py-20 glass-card">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">feed</span>
                                            <p className="text-gray-700 text-lg font-medium">{t('noPostsFound')}</p>
                                            {searchQuery && (
                                                <button 
                                                    onClick={() => setSearchQuery('')}
                                                    className="mt-4 text-blue-600 hover:underline text-sm"
                                                >
                                                    Clear Search
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Footer */}
                            <footer className="mt-16 pt-10 pb-10 border-t border-gray-200 text-center text-gray-500 bg-white/50 backdrop-blur-sm">
                                <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-6 text-sm font-medium text-gray-600">
                                    <a href="?page=about" onClick={(e) => { e.preventDefault(); onNavigate(View.About); }} className="hover:text-red-600 transition-colors">About Us</a>
                                    <a href="?page=privacy" onClick={(e) => { e.preventDefault(); onNavigate(View.Privacy); }} className="hover:text-red-600 transition-colors">Privacy Policy</a>
                                    <a href="?page=terms" onClick={(e) => { e.preventDefault(); onNavigate(View.Terms); }} className="hover:text-red-600 transition-colors">Terms of Service</a>
                                    <a href="?page=contact" onClick={(e) => { e.preventDefault(); onNavigate(View.Feedback); }} className="hover:text-red-600 transition-colors">Contact Support</a>
                                    <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-red-600 transition-colors">Download App</a>
                                </div>
                                <p className="text-xs mb-4">&copy; {new Date().getFullYear()} Public Tak. All rights reserved.</p>
                                <div className="flex justify-center gap-6">
                                    <i className="fa-brands fa-facebook text-xl hover:text-blue-600 cursor-pointer transition-transform hover:scale-110"></i>
                                    <i className="fa-brands fa-twitter text-xl hover:text-blue-400 cursor-pointer transition-transform hover:scale-110"></i>
                                    <i className="fa-brands fa-instagram text-xl hover:text-pink-600 cursor-pointer transition-transform hover:scale-110"></i>
                                    <i className="fa-brands fa-linkedin text-xl hover:text-blue-700 cursor-pointer transition-transform hover:scale-110"></i>
                                </div>
                            </footer>
                        </div>
                    </main>
                </div>
            </div>

            {reportingPost && currentUser && (
                <ReportModal 
                    post={reportingPost} 
                    user={currentUser} 
                    onClose={() => setReportingPost(null)}
                    onSuccess={handleReportSuccess}
                />
            )}
        </div>
    );
};

export default HomePage;
