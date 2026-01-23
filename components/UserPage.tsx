
import React, { useState, useEffect } from 'react';
import { User, View, Post, Draft, VideoPost } from '../types';
import Header from './Header';
import { auth, db, storage } from '../firebaseConfig';
import ConfirmationModal from './ConfirmationModal';
import UserListModal from './UserListModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { formatCount } from '../utils/formatters';

interface UserPageProps {
  onBack: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onNavigate: (view: View, params?: any) => void;
  onEditPost: (postId: string) => void;
  onViewPost: (postId: string) => void;
  onViewUser: (userId: string) => void;
  initialTab?: 'posts' | 'videos' | 'drafts';
}

const StatBox: React.FC<{ value: number; label: string; onClick?: () => void }> = ({ value, label, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex flex-col items-center justify-center flex-1 py-3 px-1 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-black/5 active:scale-95' : ''}`}
    >
        <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">{formatCount(value)}</p>
        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const UserPage: React.FC<UserPageProps> = ({ onBack, currentUser, onLogout, onNavigate, onEditPost, onViewPost, onViewUser, initialTab }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [videos, setVideos] = useState<VideoPost[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'post' | 'video' | 'draft'; thumbnailUrl?: string; videoUrl?: string } | null>(null);
    
    const [activeList, setActiveList] = useState<'followers' | 'following' | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'drafts'>('posts');

    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
    
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const unsubPosts = db.collection("posts").where("authorId", "==", currentUser.uid).onSnapshot(snap => {
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || null } as Post)));
        });

        const unsubVideos = db.collection("videos").where("authorId", "==", currentUser.uid).onSnapshot(snap => {
            setVideos(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || null } as VideoPost)));
        });

        const unsubDrafts = db.collection("users").doc(currentUser.uid).collection("drafts").onSnapshot(snap => {
            setDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Draft)));
        });

        const unsubFollowers = db.collection("users").doc(currentUser.uid).collection("followers").onSnapshot(snap => setFollowersCount(snap.size));
        const unsubFollowing = db.collection("users").doc(currentUser.uid).collection("following").onSnapshot(snap => setFollowingCount(snap.size));

        setLoading(false);
        return () => { unsubPosts(); unsubVideos(); unsubDrafts(); unsubFollowers(); unsubFollowing(); };
    }, [currentUser]);
    
    const handleDelete = async () => {
        if (!itemToDelete || !currentUser) return;
        try {
            if (itemToDelete.type === 'draft') {
                await db.collection("users").doc(currentUser.uid).collection("drafts").doc(itemToDelete.id).delete();
            } else if (itemToDelete.type === 'video') {
                await db.collection("videos").doc(itemToDelete.id).delete();
                // Cleanup Storage
                if (itemToDelete.thumbnailUrl?.includes('firebasestorage')) {
                    storage.refFromURL(itemToDelete.thumbnailUrl).delete().catch(() => {});
                }
                if (itemToDelete.videoUrl?.includes('firebasestorage')) {
                    storage.refFromURL(itemToDelete.videoUrl).delete().catch(() => {});
                }
            } else {
                await db.collection("posts").doc(itemToDelete.id).delete();
            }
            showToast("Content deleted.", "success");
        } catch (e) { showToast("Failed to delete.", "error"); }
        finally { setIsDeleteModalOpen(false); setItemToDelete(null); }
    };

    const handleDraftClick = (draft: Draft) => {
        if (draft.type === 'video') {
            onNavigate(View.CreateVideo, { draftId: draft.id });
        } else {
            onNavigate(View.CreatePost, { draftId: draft.id });
        }
    };

    const handleShareProfile = async () => {
        if (!currentUser) return;
        const shareUrl = `${window.location.origin}/?userId=${currentUser.uid}`;
        const shareText = `🚩 Check out the official profile of ${currentUser.name} on Public Tak News App! \n\nStay updated with my local news and reports here:\n\n${shareUrl}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${currentUser.name} - Public Tak`,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) { console.debug("Profile share cancelled"); }
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
    };

    if (!currentUser) return <div className="p-10 text-center">Please login</div>;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Red Header Bar */}
            <Header 
                title="myProfile" 
                showBackButton 
                onBack={onBack} 
                showSettingsButton
                onSettings={() => onNavigate(View.Settings)}
            />
            
            <main className="flex-grow overflow-y-auto pb-24 md:pb-0 scrollbar-hide">
                <div className="max-w-4xl mx-auto w-full">
                    
                    {/* Cover Photo Section */}
                    <div className="relative mb-24">
                        <div className="h-44 md:h-64 bg-gradient-to-br from-blue-500 to-indigo-900 shadow-inner"></div>
                        
                        {/* Overlapping Profile Photo */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 flex flex-col items-center">
                            <div className="relative">
                                <img 
                                    className="h-32 w-32 md:h-44 md:w-44 rounded-full object-cover border-[6px] border-white shadow-xl bg-white" 
                                    src={currentUser.profilePicUrl} 
                                    alt={currentUser.name}
                                />
                                <button 
                                    onClick={() => onNavigate(View.EditProfile)}
                                    className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-90 transition-all flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-[22px] text-gray-700">edit</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Name & Handle */}
                    <div className="text-center px-6 mt-4">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight mb-0.5">
                            {currentUser.name}
                        </h1>
                        <p className="text-blue-600 font-bold text-sm">@{currentUser.username}</p>
                        {currentUser.bio && (
                            <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto line-clamp-2 leading-relaxed">
                                {currentUser.bio}
                            </p>
                        )}
                    </div>

                    {/* Unified Horizontal Stats Card */}
                    <div className="px-6 mt-10">
                        <div className="flex bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden divide-x divide-gray-100">
                            <StatBox value={posts.length} label="POST" />
                            <StatBox value={videos.length} label="VIDEO" />
                            <StatBox value={followersCount} label="FOLLOW" onClick={() => setActiveList('followers')} />
                            <StatBox value={followingCount} label="FOLLOWING" onClick={() => setActiveList('following')} />
                        </div>
                    </div>

                    {/* Action Buttons Group */}
                    <div className="px-6 mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={handleShareProfile}
                            className="flex items-center justify-center gap-2 py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm transition-all active:scale-[0.97]"
                        >
                            <i className="fa-brands fa-whatsapp text-xl"></i>
                            <span className="font-bold text-lg">Share</span>
                        </button>

                        <button 
                            onClick={() => onNavigate(View.EditProfile)}
                            className="flex items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl border border-gray-200/50 shadow-sm transition-all active:scale-[0.97]"
                        >
                            <span className="font-bold text-lg">Edit Profile</span>
                        </button>

                        {currentUser.role === 'admin' && (
                            <button 
                                onClick={() => onNavigate(View.Admin)}
                                className="flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl shadow-lg transition-all active:scale-[0.97]"
                            >
                                <span className="font-bold text-lg">Admin Panel</span>
                            </button>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="mt-14 px-4">
                        <div className="flex p-1 bg-gray-100 rounded-2xl mb-8 w-fit mx-auto md:mx-0">
                            {['posts', 'videos', 'drafts'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setActiveTab(tab as any)} 
                                    className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-red-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Grid */}
                        <div className={`${activeTab === 'videos' ? 'grid grid-cols-3 gap-1 md:gap-4' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'}`}>
                            {activeTab === 'posts' && posts.map(post => (
                                <div key={post.id} className="glass-card overflow-hidden h-full flex flex-col group border border-gray-100/50 hover:shadow-xl transition-all">
                                    <div className="relative h-48 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => onViewPost(post.id)}>
                                        <img src={post.thumbnailUrl} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="p-4 flex-grow"><h3 className="font-bold text-sm text-gray-800 line-clamp-2 leading-relaxed">{post.title}</h3></div>
                                    <div className="px-2 pb-2 flex justify-end gap-1">
                                        <button onClick={() => onEditPost(post.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                        <button onClick={() => { setItemToDelete({ id: post.id, type: 'post' }); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'videos' && videos.map(video => (
                                <div key={video.id} className="relative aspect-[9/16] bg-black group overflow-hidden cursor-pointer rounded-lg md:rounded-xl shadow-sm" onClick={() => onNavigate(View.Videos, { videoId: video.id })}>
                                    <img src={video.thumbnailUrl} className="h-full w-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt={video.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    
                                    {/* View Count Overlay */}
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-black drop-shadow-md">
                                        <span className="material-symbols-outlined text-sm font-black">play_arrow</span>
                                        {formatCount(video.viewCount)}
                                    </div>

                                    {/* Action Group */}
                                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onNavigate(View.CreateVideo, { videoId: video.id });
                                            }} 
                                            className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full text-blue-600 flex items-center justify-center shadow-lg active:scale-90 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setItemToDelete({ 
                                                    id: video.id, 
                                                    type: 'video',
                                                    thumbnailUrl: video.thumbnailUrl,
                                                    videoUrl: video.videoUrl
                                                }); 
                                                setIsDeleteModalOpen(true); 
                                            }} 
                                            className="w-8 h-8 bg-red-600 text-white flex items-center justify-center rounded-full shadow-lg active:scale-90 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'drafts' && drafts.map(draft => (
                                <div key={draft.id} className="glass-card overflow-hidden h-full flex flex-col group border-dashed border-2 border-gray-200 bg-gray-50/30 hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all">
                                    <div className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden" onClick={() => handleDraftClick(draft)}>
                                        {draft.thumbnailUrl ? (
                                            <img src={draft.thumbnailUrl} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-200">
                                                <span className="material-symbols-outlined text-5xl">{draft.type === 'video' ? 'movie' : 'article'}</span>
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest backdrop-blur-md">
                                            {draft.type || 'Article'}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-grow"><h3 className="font-bold text-sm text-gray-600 italic line-clamp-2">{draft.title || 'Untitled Draft'}</h3></div>
                                    <div className="px-2 pb-2 flex justify-end gap-1">
                                        <button onClick={() => handleDraftClick(draft)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"><span className="material-symbols-outlined text-[20px]">edit_note</span></button>
                                        <button onClick={() => { setItemToDelete({ id: draft.id, type: 'draft' }); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                    </div>
                                </div>
                            ))}

                            {/* Empty States */}
                            {((activeTab === 'posts' && posts.length === 0) || 
                              (activeTab === 'videos' && videos.length === 0) || 
                              (activeTab === 'drafts' && drafts.length === 0)) && (
                                <div className="col-span-full py-20 text-center">
                                    <span className="material-symbols-outlined text-gray-200 text-6xl mb-4">inventory_2</span>
                                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleDelete} 
                title="Delete Content" 
                message="Are you sure you want to permanently delete this? This action cannot be undone." 
            />
            
            {activeList && currentUser && (
                <UserListModal 
                    userId={currentUser.uid} 
                    type={activeList} 
                    onClose={() => setActiveList(null)} 
                    onViewUser={onViewUser} 
                />
            )}
        </div>
    );
};

export default UserPage;
