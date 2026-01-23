
import React, { useState, useEffect, useMemo } from 'react';
import { User, View, Post, VideoPost } from '../types';
import Header from './Header';
import { db, serverTimestamp } from '../firebaseConfig';
import { formatCount } from '../utils/formatters';

interface PublicProfilePageProps {
    userId: string;
    currentUser: User | null;
    onBack: () => void;
    onViewPost: (postId: string) => void;
    onLogin: () => void;
    onNavigate: (view: View, params?: any) => void;
    onAdminEditUser: (userId: string) => void;
}

const StatBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-gray-50 rounded-xl min-w-[65px] md:min-w-[80px] border border-gray-100 transition-transform hover:scale-105">
        <p className="text-lg md:text-2xl font-black text-gray-900 leading-none">{formatCount(value)}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const SkeletonPublicProfile = () => (
    <div className="flex flex-col h-full bg-white animate-pulse">
        <div className="h-14 bg-white/80 border-b border-gray-200"></div>
        <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
             <div className="max-w-7xl mx-auto w-full md:px-4 md:py-6">
                <div className="glass-card overflow-hidden mb-8 mx-0 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border bg-white border-gray-100">
                    <div className="h-32 md:h-48 bg-gray-200"></div>
                    <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
                         <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-8">
                            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-gray-300 ring-4 ring-white shadow-lg"></div>
                            <div className="flex-grow text-center md:text-left w-full flex flex-col items-center md:items-start space-y-3 mt-12 md:mt-0">
                                <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
                                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                            </div>
                         </div>
                    </div>
                </div>
                <div className="px-0 md:px-4">
                    <div className="h-10 w-full bg-gray-100 rounded-lg mb-6 mx-4 md:mx-0"></div>
                    <div className="grid grid-cols-3 gap-1 md:gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[9/16] bg-gray-100 md:rounded-xl"></div>)}
                    </div>
                </div>
             </div>
        </main>
    </div>
);

const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ userId, currentUser, onBack, onViewPost, onLogin, onNavigate, onAdminEditUser }) => {
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [rawPosts, setRawPosts] = useState<Post[]>([]);
    const [rawVideos, setRawVideos] = useState<VideoPost[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'posts' | 'videos'>('posts');

    const posts = useMemo(() => {
        return [...rawPosts].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [rawPosts]);

    const videos = useMemo(() => {
        return [...rawVideos].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [rawVideos]);

    useEffect(() => {
        setLoading(true);
        const userDocRef = db.collection('users').doc(userId);
        const unsubscribeUser = userDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                setProfileUser({ uid: docSnap.id, ...docSnap.data() } as User);
            }
        });

        let unsubscribeIsFollowing = () => {};
        if (currentUser) {
            unsubscribeIsFollowing = db.collection('users').doc(currentUser.uid).collection('following').doc(userId).onSnapshot(doc => setIsFollowing(doc.exists));
        }

        const unsubscribeFollowers = db.collection("users").doc(userId).collection("followers").onSnapshot(s => setFollowersCount(s.size));
        const unsubscribeFollowingCount = db.collection("users").doc(userId).collection("following").onSnapshot(s => setFollowingCount(s.size));

        const unsubscribePosts = db.collection("posts").where("authorId", "==", userId).onSnapshot(snap => {
            setRawPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || null } as Post)));
            setLoading(false);
        });

        const unsubscribeVideos = db.collection("videos").where("authorId", "==", userId).onSnapshot(snap => {
            setRawVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || null } as VideoPost)));
        });

        return () => {
            unsubscribeUser();
            unsubscribeIsFollowing();
            unsubscribeFollowers();
            unsubscribeFollowingCount();
            unsubscribePosts();
            unsubscribeVideos();
        };
    }, [userId, currentUser]);

    const handleFollowToggle = async () => {
        if (!currentUser) { onLogin(); return; }
        const followRef = db.collection('users').doc(currentUser.uid).collection('following').doc(userId);
        const followerRef = db.collection('users').doc(userId).collection('followers').doc(currentUser.uid);
        const batch = db.batch();
        if (isFollowing) {
            batch.delete(followRef);
            batch.delete(followerRef);
        } else {
            batch.set(followRef, { followedAt: serverTimestamp() });
            batch.set(followerRef, { followedAt: serverTimestamp() });
            db.collection('users').doc(userId).collection('notifications').add({
                type: 'new_follower',
                fromUserId: currentUser.uid,
                fromUserName: currentUser.name,
                fromUserProfilePicUrl: currentUser.profilePicUrl,
                createdAt: serverTimestamp(),
                read: false
            });
        }
        await batch.commit();
    };

    if (loading) return <SkeletonPublicProfile />;
    if (!profileUser) return <div className="h-full flex items-center justify-center font-bold text-red-500">User Not Found</div>;

    return (
        <div className="flex flex-col h-full bg-white">
            <Header title={profileUser.name} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-24 md:pb-6 scrollbar-hide">
                <div className="max-w-7xl mx-auto w-full md:px-4 md:py-6">
                    <div className="glass-card overflow-hidden mb-8 border-x-0 md:border rounded-none md:rounded-3xl shadow-sm bg-white border-gray-100">
                        <div className="h-32 md:h-52 bg-gradient-to-br from-red-600 to-blue-900 relative">
                             <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/40 to-transparent"></div>
                        </div>
                        <div className="px-6 pb-8 relative">
                            <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-8">
                                <img className="h-28 w-28 md:h-44 md:w-44 rounded-full object-cover border-[6px] border-white shadow-2xl bg-white" src={profileUser.profilePicUrl} alt="" />
                                <div className="flex-grow text-center md:text-left">
                                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">{profileUser.name}</h1>
                                    <p className="text-blue-600 font-bold">@{profileUser.username}</p>
                                    {profileUser.bio && <p className="mt-3 text-sm text-gray-600 max-w-xl leading-relaxed mx-auto md:mx-0">{profileUser.bio}</p>}
                                </div>
                                <div className="flex flex-col items-center md:items-end gap-5 w-full md:w-auto">
                                    <div className="flex gap-2 md:gap-3 flex-wrap justify-center">
                                        <StatBox value={posts.length} label="POST" />
                                        <StatBox value={videos.length} label="VIDEO" />
                                        <StatBox value={followersCount} label="FOLLOWERS" />
                                        <StatBox value={followingCount} label="FOLLOWING" />
                                    </div>
                                    {(!currentUser || currentUser.uid !== userId) && (
                                        <button 
                                            onClick={handleFollowToggle}
                                            className={`w-full md:w-56 py-3.5 rounded-full font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 text-xs ${isFollowing ? 'bg-gray-100 text-gray-500 border border-gray-200 shadow-none' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100'}`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-0 md:px-4">
                        <div className="flex border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide sticky top-0 bg-white/95 backdrop-blur-sm z-20 px-4 md:px-0">
                            <button onClick={() => setActiveTab('posts')} className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === 'posts' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>Articles{activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-red-600 rounded-t-full"></div>}</button>
                            <button onClick={() => setActiveTab('videos')} className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === 'videos' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>Videos{activeTab === 'videos' && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-red-600 rounded-t-full"></div>}</button>
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'posts' ? (
                                posts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6">
                                        {posts.map(post => (
                                            <div key={post.id} onClick={() => onViewPost(post.id)} className="group overflow-hidden cursor-pointer flex flex-col h-full border-y md:border border-gray-100 bg-white md:glass-card hover:shadow-2xl transition-all duration-300 md:rounded-2xl">
                                                <div className="aspect-video relative overflow-hidden bg-gray-50"><img src={post.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /><div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-1 rounded font-black uppercase tracking-widest">{post.category}</div></div>
                                                <div className="p-5 flex flex-col flex-grow"><h3 className="font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors text-lg">{post.title}</h3><div className="mt-auto pt-5 flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] border-t border-gray-50"><span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">visibility</span>{formatCount(post.viewCount)}</div></div></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="py-32 text-center flex flex-col items-center"><span className="material-symbols-outlined text-7xl text-gray-100 mb-4">article</span><p className="text-gray-300 font-black uppercase tracking-[0.3em] text-sm">No articles published</p></div>
                            ) : (
                                videos.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1 md:gap-4 lg:grid-cols-5">
                                        {videos.map(video => (
                                            <div key={video.id} onClick={() => currentUser ? onNavigate(View.Videos, { videoId: video.id }) : onLogin()} className="group relative aspect-[9/16] bg-black overflow-hidden cursor-pointer shadow-sm active:scale-95 transition-all rounded-lg md:rounded-2xl border border-gray-100">
                                                <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt={video.title} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                                
                                                {/* Mini Overlay Info */}
                                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-black drop-shadow-md">
                                                    <span className="material-symbols-outlined text-sm font-black">play_arrow</span>
                                                    {formatCount(video.viewCount)}
                                                </div>
                                                
                                                {/* Tooltip on long title */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                     <div className="bg-black/40 backdrop-blur-sm p-2 rounded-full border border-white/20">
                                                        <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                                     </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="py-32 text-center flex flex-col items-center"><span className="material-symbols-outlined text-7xl text-gray-100 mb-4">video_library</span><p className="text-gray-300 font-black uppercase tracking-[0.3em] text-sm">No videos posted</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicProfilePage;
