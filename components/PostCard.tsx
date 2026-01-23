
import React, { useState, useEffect, useMemo } from 'react';
import { Post, User, View } from '../types';
import { db, serverTimestamp, increment, storage } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import { formatCount } from '../utils/formatters';

interface PostCardProps {
    post: Post;
    currentUser: User | null;
    onLogin: () => void;
    onReport: (post: Post) => void;
    onViewPost: (postId: string) => void;
    onViewUser: (userId: string) => void;
    isFollowing: boolean;
    handleFollowToggle: (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => void;
    onNavigate: (view: View, params?: any) => void;
    onEditPost?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = React.memo(({ post, currentUser, onLogin, onReport, onViewPost, onViewUser, isFollowing, handleFollowToggle, onNavigate, onEditPost }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const { t } = useLanguage();
    const { showToast } = useToast();
    
    useEffect(() => {
        const likesRef = db.collection('posts').doc(post.id).collection('likes');
        const unsubLikes = likesRef.onSnapshot((snapshot) => {
            setLikeCount(snapshot.size);
            if (currentUser) {
                setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid));
            } else {
                setIsLiked(false);
            }
        });

        const commentsRef = db.collection('posts').doc(post.id).collection('comments');
        const unsubComments = commentsRef.onSnapshot((snapshot) => {
            setCommentCount(snapshot.size);
        });

        return () => {
            unsubLikes();
            unsubComments();
        };
    }, [post.id, currentUser]);

    const isCurrentUserPost = currentUser && currentUser.uid === post.authorId;
    const isAdmin = currentUser?.role === 'admin';
    const authorName = isCurrentUserPost ? currentUser.name : post.authorName;
    const authorProfilePicUrl = (isCurrentUserPost ? currentUser.profilePicUrl : post.authorProfilePicUrl) 
        || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(authorName)}`;

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            showToast("Please log in to like posts.", "info");
            onLogin();
            return;
        }
        
        const likeRef = db.collection('posts').doc(post.id).collection('likes').doc(currentUser.uid);
        const postAuthorId = post.authorId;
        
        try {
            if (isLiked) {
                await likeRef.delete();
            } else {
                const batch = db.batch();
                batch.set(likeRef, { likedAt: serverTimestamp() });
                
                if (currentUser.uid !== postAuthorId) {
                    const notificationRef = db.collection('users').doc(postAuthorId).collection('notifications').doc();
                    batch.set(notificationRef, {
                        type: 'new_like',
                        fromUserId: currentUser.uid,
                        fromUserName: currentUser.name,
                        fromUserProfilePicUrl: currentUser.profilePicUrl,
                        postId: post.id,
                        postTitle: post.title,
                        createdAt: serverTimestamp(),
                        read: false
                    });
                }
                
                await batch.commit();
            }
        } catch (error) {
            console.error("Error liking post:", error);
            showToast("Could not like post.", "error");
        }
    };
    
    const handleFollowClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleFollowToggle(post.authorId, post.authorName, post.authorProfilePicUrl);
    };
    
    const displayContent = useMemo(() => {
        if (!post.content) return '';
        return post.content.replace(/<[^>]*>?/gm, '');
    }, [post.content]);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const siteUrl = window.location.origin;
        const shareUrl = `${siteUrl}/?postId=${post.id}`;
        const loginUrl = `${siteUrl}/?page=login`;
        
        const shareText = `🚩 *${post.title}*\n\n${displayContent.substring(0, 100).trim()}...\n\n👉 *पूरी खबर यहाँ पढ़ें:* ${shareUrl}\n\n📝 *नोट:* क्या आप ब्लॉक में छोटे न्यूज़ रिपोर्टर है, आपके पास वेबसाइट नहीं है? चिंता न करें! *Public Tak* में अभी अपना Account बनाये।\n\n*"आपकी खबर, आपकी पहचान – Public Tak News App"*\n\n📲 *अभी जुड़ें:* ${loginUrl}`;

        db.collection('posts').doc(post.id).update({ shareCount: increment(1) }).catch(console.error);

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onReport(post);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        if (onEditPost) {
            onEditPost(post.id);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await db.collection("posts").doc(post.id).delete();
            if (post.thumbnailUrl && post.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRef = storage.refFromURL(post.thumbnailUrl);
                    await storageRef.delete();
                } catch (storageErr) {
                    console.warn("Post deleted, but thumbnail image cleanup failed:", storageErr);
                }
            }
            showToast("Post deleted successfully.", "success");
        } catch (error: any) {
            console.error("Error deleting post:", error);
            showToast(`Failed to delete post: ${error.message || "Unknown error"}`, "error");
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const timeAgo = useMemo(() => {
        if (!post.createdAt) return 'N/A';
        const now = new Date();
        const seconds = Math.floor((now.getTime() - post.createdAt.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }, [post.createdAt]);
    
    return (
        <>
            <div onClick={() => onViewPost(post.id)} className="bg-white md:glass-card overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full group md:hover:shadow-xl border-y md:border border-gray-100 relative rounded-none md:rounded-2xl">
                <div className="p-3 flex items-center gap-3">
                    <img onClick={(e) => { e.stopPropagation(); onViewUser(post.authorId); }} src={authorProfilePicUrl} alt={authorName} className="w-9 h-9 rounded-full object-cover cursor-pointer ring-2 ring-gray-50 relative z-20" />
                    <div className="flex-grow min-w-0 relative z-20">
                        <div className="flex items-center gap-2">
                            <p onClick={(e) => { e.stopPropagation(); onViewUser(post.authorId); }} className="font-bold text-gray-900 cursor-pointer hover:text-blue-600 text-sm truncate">{authorName}</p>
                            {(!currentUser || currentUser.uid !== post.authorId) && (
                                <button 
                                    onClick={handleFollowClick} 
                                    className={`
                                        px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all duration-300
                                        ${isFollowing 
                                            ? 'bg-gray-100 text-gray-400 border border-gray-200' 
                                            : 'bg-red-600 text-white shadow-sm active:scale-95'}
                                    `}
                                >
                                    {isFollowing ? t('following') : t('follow')}
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{timeAgo} • {post.category}</p>
                    </div>
                </div>
                
                <div className="w-full aspect-video bg-gray-100 overflow-hidden relative flex items-center justify-center">
                     {post.thumbnailUrl ? (
                        <img 
                            src={post.thumbnailUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-all duration-700 md:group-hover:scale-105" 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300">
                            <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Article</div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">{post.title}</h3>
                    <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed mb-4">{displayContent}</p>
                    
                    <div className="mt-auto flex justify-between items-center text-gray-400 border-t border-gray-50 pt-3 relative z-20">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleLike} 
                                className={`flex items-center gap-1.5 group/like relative z-30 ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`} 
                            >
                                <span 
                                    className="material-symbols-outlined text-[22px] transition-all"
                                    style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}`}}
                                >
                                    favorite
                                </span>
                                <span className="text-xs font-bold">{formatCount(likeCount)}</span>
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    onNavigate(View.PostDetail, { postId: post.id, focusComment: true }); 
                                }}
                                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors relative z-30" 
                            >
                                <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
                                <span className="text-xs font-bold">{formatCount(commentCount)}</span>
                            </button>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                <span className="text-xs font-bold">{formatCount(post.viewCount || 0)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-30">
                            <button 
                                onClick={handleShare} 
                                className="text-green-600 p-1.5 rounded-full hover:bg-green-50 active:scale-90 transition-all" 
                            >
                                <i className="fa-brands fa-whatsapp text-xl"></i>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(v => !v); }} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><span className="material-symbols-outlined text-xl">more_vert</span></button>
                             {isMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-36 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-40 animate-in fade-in zoom-in-95">
                                    {(isCurrentUserPost || isAdmin) && (
                                        <>
                                            <button onClick={handleEditClick} className="flex items-center gap-2 w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                {t('edit')}
                                            </button>
                                            <button onClick={handleDeleteClick} className="flex items-center gap-2 w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                {t('delete')}
                                            </button>
                                            <div className="border-b border-gray-100"></div>
                                        </>
                                    )}
                                    <button onClick={handleReportClick} className="flex items-center gap-2 w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                        <span className="material-symbols-outlined text-sm">flag</span>
                                        {t('report')}
                                    </button>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Post"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonColor="bg-red-600 hover:bg-red-700"
            />
        </>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.title === nextProps.post.title &&
        prevProps.post.thumbnailUrl === nextProps.post.thumbnailUrl &&
        prevProps.post.viewCount === nextProps.post.viewCount &&
        prevProps.post.shareCount === nextProps.post.shareCount &&
        prevProps.post.content === nextProps.post.content &&
        prevProps.isFollowing === nextProps.isFollowing &&
        prevProps.currentUser?.uid === nextProps.currentUser?.uid
    );
});

export default PostCard;
