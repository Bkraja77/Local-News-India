
import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { Post, User, View, VideoPost } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCount } from '../utils/formatters';

interface SearchPageProps {
    onNavigate: (view: View, params?: any) => void;
    onViewPost: (postId: string) => void;
    currentUser: User | null;
    onViewUser: (userId: string) => void;
    searchMode?: 'all' | 'video' | 'video-user';
}

const SkeletonItem = () => (
    <div className="p-4 flex items-center space-x-4 animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
        <div className="flex-grow space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
    </div>
);

const SearchPage: React.FC<SearchPageProps> = ({ onNavigate, onViewPost, currentUser, onViewUser, searchMode = 'all' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allVideos, setAllVideos] = useState<VideoPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        setLoading(true);
        setError(null);

        const handleFirestoreError = (err: any) => {
            console.error("Error fetching data:", err);
            setError(t('error'));
            setLoading(false);
        };
        
        // Conditional fetching based on mode to save bandwidth/reads
        let unsubscribePosts = () => {};
        if (searchMode === 'all') {
            const postsQuery = db.collection("posts");
            unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
                const fetchedPosts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || null,
                } as Post));
                setAllPosts(fetchedPosts);
                setLoading(false);
            }, handleFirestoreError);
        }

        let unsubscribeUsers = () => {};
        if (searchMode === 'all' || searchMode === 'video-user') {
            const usersQuery = db.collection("users");
            unsubscribeUsers = usersQuery.onSnapshot((snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data(),
                } as User));
                setAllUsers(fetchedUsers);
                setLoading(false);
            }, handleFirestoreError);
        }

        const videosQuery = db.collection("videos");
        const unsubscribeVideos = videosQuery.onSnapshot((snapshot) => {
            const fetchedVideos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || null,
            } as VideoPost));
            setAllVideos(fetchedVideos);
            setLoading(false);
        }, handleFirestoreError);

        return () => {
            unsubscribePosts();
            unsubscribeUsers();
            unsubscribeVideos();
        };
    }, [t, searchMode]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return { filteredPosts: [], filteredUsers: [], filteredVideos: [] };
        }

        const lowercasedTerm = searchTerm.toLowerCase();

        const filteredPosts = searchMode === 'all' ? allPosts.filter(post =>
            (post?.title?.toLowerCase() ?? '').includes(lowercasedTerm) ||
            (post?.content?.toLowerCase() ?? '').includes(lowercasedTerm)
        ) : [];

        const filteredUsers = (searchMode === 'all' || searchMode === 'video-user') ? allUsers.filter(user =>
            (user?.name?.toLowerCase() ?? '').includes(lowercasedTerm) ||
            (user?.username?.toLowerCase() ?? '').includes(lowercasedTerm)
        ) : [];

        const filteredVideos = allVideos.filter(video =>
            (video?.title?.toLowerCase() ?? '').includes(lowercasedTerm) ||
            (video?.description?.toLowerCase() ?? '').includes(lowercasedTerm)
        );

        return { filteredPosts, filteredUsers, filteredVideos };
    }, [searchTerm, allPosts, allUsers, allVideos, searchMode]);


    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <div className="glass-card divide-y divide-black/10 overflow-hidden">
                        {[1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}
                    </div>
                </div>
            );
        }
        if (error) {
            return <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg mx-4"><p>{error}</p></div>;
        }

        if (!searchTerm.trim()) {
            return (
                <div className="text-center p-10 flex flex-col items-center">
                     <span className="material-symbols-outlined text-8xl text-gray-400 mb-4">
                        {searchMode === 'all' ? 'search' : (searchMode === 'video' ? 'video_search' : 'person_search')}
                     </span>
                    <p className="text-gray-500">
                        {searchMode === 'all' ? t('searchPlaceholder') : (searchMode === 'video' ? 'Search news videos...' : 'Search videos and users...')}
                    </p>
                </div>
            );
        }

        const { filteredPosts, filteredUsers, filteredVideos } = searchResults;
        const hasResults = filteredPosts.length > 0 || filteredUsers.length > 0 || filteredVideos.length > 0;

        if (!hasResults) {
            return (
                <div className="text-center p-10 flex flex-col items-center">
                     <span className="material-symbols-outlined text-8xl text-gray-400 mb-4">search_off</span>
                    <p className="text-gray-500">{t('noResults')} "{searchTerm}".</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {filteredVideos.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 px-4 mb-2">Videos</h2>
                        <div className="glass-card divide-y divide-black/10 overflow-hidden">
                            {filteredVideos.map(video => (
                                <div key={video.id} onClick={() => onNavigate(View.Videos, { videoId: video.id })} className="p-4 flex items-center space-x-4 cursor-pointer hover:bg-black/5 transition-colors">
                                    <div className="relative w-20 h-28 bg-black rounded overflow-hidden flex-shrink-0">
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                        </div>
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">by {video.authorName} • {formatCount(video.viewCount)} views</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {filteredUsers.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 px-4 mb-2">{t('users')}</h2>
                         <div className="glass-card divide-y divide-black/10 overflow-hidden">
                            {filteredUsers.map(user => (
                                <div key={user.uid} onClick={() => onViewUser(user.uid)} className="p-4 flex items-center space-x-4 cursor-pointer hover:bg-black/5 transition-colors">
                                     <img src={user.profilePicUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                                        <p className="text-sm text-blue-600">@{user.username}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {filteredPosts.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 px-4 mb-2">{t('post')}</h2>
                        <div className="glass-card divide-y divide-black/10 overflow-hidden">
                            {filteredPosts.map(post => (
                                <div key={post.id} onClick={() => onViewPost(post.id)} className="p-4 flex items-center space-x-4 cursor-pointer hover:bg-black/5 transition-colors">
                                    {post.thumbnailUrl && <img src={post.thumbnailUrl} alt={post.title} className="w-16 h-16 object-cover rounded flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <h3 className="font-semibold text-red-600 line-clamp-2">{post.title}</h3>
                                        <p className="text-sm text-gray-500">by {post.authorName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title={searchMode === 'all' ? t('search') : (searchMode === 'video' ? 'Search Videos' : 'Search Videos & Users')} 
                showBackButton 
                onBack={() => onNavigate(View.Main)} 
                currentUser={currentUser}
                onProfileClick={() => onNavigate(View.User)}
                onLogin={() => onNavigate(View.Login)}
            />
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="p-4 sticky top-0 bg-gray-100/70 backdrop-blur-lg z-10">
                    <div className="relative">
                         <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                         <input
                            type="text"
                            placeholder={searchMode === 'all' ? t('searchPlaceholder') : (searchMode === 'video' ? 'Search news videos...' : 'Search videos or users...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 bg-white rounded-full text-gray-900 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="p-4">
                 {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
