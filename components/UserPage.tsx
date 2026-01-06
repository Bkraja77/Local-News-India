
import React, { useState, useEffect } from 'react';
import { User, View, Post, Draft } from '../types';
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
  initialTab?: 'posts' | 'drafts';
}

const StatBox: React.FC<{ value: number; label: string; onClick?: () => void }> = ({ value, label, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl min-w-[80px] border border-gray-100 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-100 hover:scale-105 active:scale-95' : ''}`}
    >
        <p className={`text-2xl font-bold ${onClick ? 'text-blue-900' : 'text-gray-900'}`}>{formatCount(value)}</p>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
);

const SkeletonPost = () => (
    <div className="glass-card flex flex-col overflow-hidden h-full animate-pulse border border-gray-100">
        <div className="h-40 w-full bg-gray-200"></div>
        <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
    </div>
);

const UserPage: React.FC<UserPageProps> = ({ onBack, currentUser, onLogout, onNavigate, onEditPost, onViewPost, onViewUser, initialTab }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: string; thumbnailUrl: string } | null>(null);
    
    const [isDeleteDraftModalOpen, setIsDeleteDraftModalOpen] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState<{ id: string; thumbnailUrl: string } | null>(null);

    // State for User List Modal
    const [activeList, setActiveList] = useState<'followers' | 'following' | null>(null);
    
    // Tab State: 'posts' or 'drafts'
    const [activeTab, setActiveTab] = useState<'posts' | 'drafts'>('posts');

    const { t } = useLanguage();
    const { showToast } = useToast();

    // Handle initial tab from props
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);
    
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        // Real-time posts
        const postsQuery = db.collection("posts").where("authorId", "==", currentUser.uid);

        const unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
            const userPosts = snapshot.docs.map(doc => {
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
                } as Post
            });
            
            userPosts.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            });

            setPosts(userPosts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user posts:", error);
            showToast("Could not load your posts.", "error");
            setLoading(false);
        });

        // Real-time drafts
        const draftsQuery = db.collection("users").doc(currentUser.uid).collection("drafts");
        const unsubscribeDrafts = draftsQuery.onSnapshot((snapshot) => {
            const userDrafts = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    category: data.category,
                    thumbnailUrl: data.thumbnailUrl,
                    state: data.state,
                    district: data.district,
                    block: data.block,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
                } as Draft
            });
            // Sort drafts by updated or created date, newest first
            userDrafts.sort((a, b) => {
                const dateA = a.updatedAt ? a.updatedAt.getTime() : (a.createdAt ? a.createdAt.getTime() : 0);
                const dateB = b.updatedAt ? b.updatedAt.getTime() : (b.createdAt ? b.createdAt.getTime() : 0);
                return dateB - dateA;
            });
            setDrafts(userDrafts);
        }, (error) => {
            console.error("Error fetching drafts:", error);
            if (error.code === 'permission-denied') {
                console.warn("Permission denied for drafts. Check Firestore rules.");
            }
        });

        // Real-time followers count
        const followersQuery = db.collection("users").doc(currentUser.uid).collection("followers");
        const unsubscribeFollowers = followersQuery.onSnapshot((snapshot) => {
            setFollowersCount(snapshot.size);
        }, (error) => {
            console.error("Error fetching followers count:", error);
        });

        // Real-time following count
        const followingQuery = db.collection("users").doc(currentUser.uid).collection("following");
        const unsubscribeFollowing = followingQuery.onSnapshot((snapshot) => {
            setFollowingCount(snapshot.size);
        }, (error) => {
            console.error("Error fetching following count:", error);
        });

        return () => {
            unsubscribePosts();
            unsubscribeDrafts();
            unsubscribeFollowers();
            unsubscribeFollowing();
        };
    }, [currentUser]);
    
    // --- Post Deletion ---
    const handleDeletePost = async () => {
        if (!postToDelete) return;

        try {
            // 1. Delete Firestore Document (Priority)
            await db.collection("posts").doc(postToDelete.id).delete();
            
            // 2. Try to delete Storage Image (Best Effort)
            if (postToDelete.thumbnailUrl && postToDelete.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRef = storage.refFromURL(postToDelete.thumbnailUrl);
                    await storageRef.delete();
                } catch (storageErr) {
                    console.warn("Post deleted but thumbnail cleanup failed (likely permission):", storageErr);
                }
            }
            showToast("Post deleted successfully.", "success");

        } catch (error: any) {
            console.error("Error deleting post:", error);
            showToast(`Failed to delete post: ${error.message || "Unknown error"}`, "error");
        } finally {
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
        }
    };
    
    const openDeleteModal = (postId: string, thumbnailUrl: string) => {
        setPostToDelete({ id: postId, thumbnailUrl });
        setIsDeleteModalOpen(true);
    };

    // --- Draft Deletion ---
    const handleDeleteDraft = async () => {
        if (!draftToDelete || !currentUser) return;
        try {
            await db.collection("users").doc(currentUser.uid).collection("drafts").doc(draftToDelete.id).delete();
            // Try to delete thumbnail, but don't block if it fails or doesn't exist
            if (draftToDelete.thumbnailUrl && draftToDelete.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                 const storageRef = storage.refFromURL(draftToDelete.thumbnailUrl);
                 await storageRef.delete().catch(err => console.warn("Failed to delete draft image", err));
            }
            showToast("Draft discarded.", "success");
        } catch (error: any) {
            console.error("Error deleting draft:", error);
            showToast(`Failed to delete draft: ${error.message}`, "error");
        } finally {
            setIsDeleteDraftModalOpen(false);
            setDraftToDelete(null);
        }
    };

    const openDeleteDraftModal = (draftId: string, thumbnailUrl: string) => {
        setDraftToDelete({ id: draftId, thumbnailUrl });
        setIsDeleteDraftModalOpen(true);
    };

    const handleShareProfile = () => {
        if (!currentUser) return;
        const shareUrl = `${window.location.origin}?userId=${currentUser.uid}`;
        const text = `Check out ${currentUser.name}'s profile on Public Tak.\nFollow ${currentUser.name} to get their latest updates and news.\n\n${shareUrl}`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };


    if (!currentUser) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title={t('profile')} showBackButton onBack={onBack} />
                <main className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500">Please log in to view your profile.</p>
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title={t('myProfile')} 
                showBackButton 
                onBack={onBack} 
                showSettingsButton 
                onSettings={() => onNavigate(View.Settings)}
            />
            <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
                <div className="max-w-7xl mx-auto w-full md:px-4 md:py-6">
                    
                    {/* Full Width Profile Header */}
                    <div className="glass-card overflow-hidden mb-8 mx-0 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border">
                        <div className="relative h-32 md:h-48 bg-gradient-to-r from-blue-600 to-indigo-600">
                             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/30 to-transparent"></div>
                        </div>
                        
                        <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
                            <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-8">
                                {/* Avatar */}
                                <div className="relative group">
                                    <img 
                                        className="h-24 w-24 md:h-40 md:w-40 rounded-full object-cover ring-4 ring-white shadow-lg bg-white"
                                        src={currentUser.profilePicUrl} 
                                        alt={`${currentUser.name}'s profile picture`} 
                                    />
                                    <button 
                                        onClick={() => onNavigate(View.EditProfile)}
                                        className="absolute bottom-1 right-1 bg-white text-gray-700 p-1.5 rounded-full shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
                                        title="Edit Photo"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                </div>
                                
                                {/* Info */}
                                <div className="flex-grow text-center md:text-left mb-2 md:mb-4">
                                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900">{currentUser.name}</h1>
                                    <p className="text-blue-600 font-medium">@{currentUser.username}</p>
                                    {currentUser.bio && <p className="mt-2 text-sm text-gray-600 max-w-prose">{currentUser.bio}</p>}
                                    
                                    {currentUser.preferredState && (
                                        <div className="mt-3 flex items-center justify-center md:justify-start gap-1 text-sm text-gray-500">
                                            <span className="material-symbols-outlined text-base">location_on</span>
                                            <span>
                                                {currentUser.preferredDistrict && `${currentUser.preferredDistrict}, `}
                                                {currentUser.preferredState}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats & Actions (Desktop) */}
                                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                                    <div className="flex justify-center w-full md:w-auto gap-4 md:gap-8 bg-white md:bg-transparent p-2 md:p-0 rounded-xl shadow-sm md:shadow-none border md:border-none border-gray-100">
                                        <StatBox value={posts.length} label={t('post')} />
                                        <StatBox 
                                            value={followersCount} 
                                            label={t('follow')} 
                                            onClick={() => setActiveList('followers')}
                                        />
                                        <StatBox 
                                            value={followingCount} 
                                            label={t('following')} 
                                            onClick={() => setActiveList('following')}
                                        />
                                    </div>
                                    
                                    <div className="hidden md:flex gap-3 w-full">
                                        <button 
                                            onClick={handleShareProfile}
                                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-semibold rounded-lg transition-all shadow-sm"
                                        >
                                            <i className="fa-brands fa-whatsapp text-xl"></i>
                                            Share Profile
                                        </button>

                                        <button 
                                            onClick={() => onNavigate(View.EditProfile)}
                                            className="flex-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-all"
                                        >
                                            {t('editProfile')}
                                        </button>
                                        {currentUser.role === 'admin' && (
                                            <button
                                                onClick={() => onNavigate(View.Admin)}
                                                className="flex-1 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-all shadow-md"
                                            >
                                                {t('adminPanel')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                             
                             {/* Mobile Actions */}
                            <div className="mt-6 flex flex-wrap md:hidden gap-3">
                                 <button 
                                    onClick={handleShareProfile}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-semibold rounded-lg shadow-sm transition-colors"
                                >
                                    <i className="fa-brands fa-whatsapp text-lg"></i>
                                    Share
                                </button>

                                 <button 
                                    onClick={() => onNavigate(View.EditProfile)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm"
                                >
                                    {t('editProfile')}
                                </button>
                                {currentUser.role === 'admin' && (
                                    <button
                                        onClick={() => onNavigate(View.Admin)}
                                        className="flex-1 px-4 py-2.5 bg-gray-800 text-white font-semibold rounded-lg shadow-sm"
                                    >
                                        {t('adminPanel')}
                                    </button>
                                 )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="px-4 md:px-0">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                             {/* Tabs */}
                             <div className="flex p-1 bg-gray-200 rounded-lg w-full sm:w-auto">
                                <button 
                                    onClick={() => setActiveTab('posts')}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                        activeTab === 'posts' 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {t('myPosts')} ({formatCount(posts.length)})
                                </button>
                                <button 
                                    onClick={() => setActiveTab('drafts')}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
                                        activeTab === 'drafts' 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Drafts ({formatCount(drafts.length)})
                                </button>
                             </div>

                             <button
                                onClick={() => onNavigate(View.CreatePost)}
                                className="hidden md:flex items-center gap-2 px-5 py-2.5 gradient-button text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                             >
                                <span className="material-symbols-outlined">add_circle</span>
                                {t('newPost')}
                             </button>
                        </div>

                        {/* POSTS TAB */}
                        {activeTab === 'posts' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {loading ? (
                                    [...Array(4)].map((_, i) => <SkeletonPost key={i} />)
                                ) : posts.length > 0 ? (
                                    posts.map((post, index) => (
                                        <div key={post.id} className="glass-card flex flex-col overflow-hidden h-full group">
                                            <div onClick={() => onViewPost(post.id)} className="cursor-pointer flex-grow relative">
                                                <div className="overflow-hidden h-40 w-full bg-gray-200 relative">
                                                    {post.thumbnailUrl ? (
                                                        <img 
                                                            src={post.thumbnailUrl} 
                                                            alt={post.title} 
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <span className="material-symbols-outlined text-4xl">image</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-medium">
                                                        {post.category}
                                                    </div>
                                                </div>
                                                
                                                <div className="p-4">
                                                    <h3 className="font-bold text-base text-gray-800 line-clamp-2 mb-2 group-hover:text-red-600 transition-colors">{post.title}</h3>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                         <span>{post.createdAt ? post.createdAt.toLocaleDateString() : 'N/A'}</span>
                                                         <div className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                                            <span>{formatCount(post.viewCount)}</span>
                                                         </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                                                <button 
                                                    onClick={() => onEditPost(post.id)} 
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                    title="Edit Post"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => openDeleteModal(post.id, post.thumbnailUrl)} 
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                                    title="Delete Post"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-16 glass-card">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                             <span className="material-symbols-outlined text-4xl text-gray-400">post_add</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">No posts yet</h3>
                                        <p className="text-gray-500 mb-6">Share your first news with the community!</p>
                                        <button
                                            onClick={() => onNavigate(View.CreatePost)}
                                            className="px-6 py-2 gradient-button text-white font-semibold rounded-full shadow-md"
                                        >
                                            Create Post
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DRAFTS TAB */}
                        {activeTab === 'drafts' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {drafts.length > 0 ? (
                                    drafts.map((draft) => (
                                        <div key={draft.id} className="glass-card flex flex-col overflow-hidden h-full group border border-dashed border-gray-300 bg-gray-50/50 hover:border-blue-300 hover:shadow-md transition-all">
                                            <div 
                                                onClick={() => onNavigate(View.CreatePost, { draftId: draft.id })} 
                                                className="cursor-pointer flex-grow relative"
                                            >
                                                <div className="overflow-hidden h-40 w-full bg-gray-200 relative group-hover:opacity-100 transition-all">
                                                    {draft.thumbnailUrl ? (
                                                        <img 
                                                            src={draft.thumbnailUrl} 
                                                            alt={draft.title} 
                                                            className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                                            <span className="material-symbols-outlined text-4xl opacity-50">draft</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 left-2 bg-yellow-100/90 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200 shadow-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">edit_note</span>
                                                        Draft
                                                    </div>
                                                </div>
                                                
                                                <div className="p-4">
                                                    <h3 className="font-bold text-base text-gray-700 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                                                        {draft.title || <span className="italic text-gray-400">Untitled Draft</span>}
                                                    </h3>
                                                    <div className="flex items-center text-xs text-gray-500 gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">update</span>
                                                        <span>
                                                            {draft.updatedAt 
                                                                ? `Updated: ${new Date(draft.updatedAt).toLocaleDateString()}` 
                                                                : (draft.createdAt ? `Created: ${new Date(draft.createdAt).toLocaleDateString()}` : 'Just now')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 border-t border-gray-200 flex justify-between items-center bg-white/50">
                                                <button 
                                                    onClick={() => onNavigate(View.CreatePost, { draftId: draft.id })} 
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-base">edit</span>
                                                    Resume
                                                </button>
                                                <button 
                                                    onClick={() => openDeleteDraftModal(draft.id, draft.thumbnailUrl)} 
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                                    title="Discard Draft"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-16 glass-card border border-dashed border-gray-300">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                             <span className="material-symbols-outlined text-4xl text-gray-400">drafts</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">No drafts saved</h3>
                                        <p className="text-gray-500 mb-6">Start writing a new post and save it for later.</p>
                                        <button
                                            onClick={() => onNavigate(View.CreatePost)}
                                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-50 transition-all"
                                        >
                                            Start Writing
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>
            
            {/* Post Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeletePost}
                title="Confirm Deletion"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmButtonText="Delete"
            />

            {/* Draft Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteDraftModalOpen}
                onClose={() => setIsDeleteDraftModalOpen(false)}
                onConfirm={handleDeleteDraft}
                title="Discard Draft"
                message="Are you sure you want to discard this draft? This action cannot be undone."
                confirmButtonText="Discard"
                confirmButtonColor="bg-red-600 hover:bg-red-700"
            />
            
            {/* User List Modal */}
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
