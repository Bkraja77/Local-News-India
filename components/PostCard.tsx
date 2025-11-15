import React, { useState, useEffect, useMemo } from 'react';
import { Post, User } from '../types';
import { db, serverTimestamp, increment } from '../firebaseConfig';

interface PostCardProps {
    post: Post;
    currentUser: User | null;
    onLogin: () => void;
    onReport: (post: Post) => void;
    onViewPost: (postId: string) => void;
    onViewUser: (userId: string) => void;
    isFollowing: boolean;
    handleFollowToggle: (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onLogin, onReport, onViewPost, onViewUser, isFollowing, handleFollowToggle }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

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

    // Use latest user info if the post belongs to the current user
    const isCurrentUserPost = currentUser && currentUser.uid === post.authorId;
    const authorName = isCurrentUserPost ? currentUser.name : post.authorName;
    const authorProfilePicUrl = (isCurrentUserPost ? currentUser.profilePicUrl : post.authorProfilePicUrl) 
        || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(authorName)}`;

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) {
            alert("Please log in to like posts.");
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
            alert("Could not like post. Please try again.");
        }
    };
    
    const handleFollowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleFollowToggle(post.authorId, post.authorName, post.authorProfilePicUrl);
    };
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareText = `Check out this news article on Local News India: "${post.title}"\n\n${window.location.href}`;
        const encodedText = encodeURIComponent(shareText);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;

        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');

        // Increment share count in Firestore
        const postRef = db.collection('posts').doc(post.id);
        try {
            await postRef.update({ shareCount: increment(1) });
        } catch (error) {
            console.error("Error incrementing share count:", error);
        }
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onReport(post);
    };

    const timeAgo = useMemo(() => {
        if (!post.createdAt) return 'N/A';
        const now = new Date();
        const seconds = Math.floor((now.getTime() - post.createdAt.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }, [post.createdAt]);
    
    const strippedContent = useMemo(() => {
        if (!post.content) return '';
        // A simple regex to remove HTML tags for the preview
        return post.content.replace(/<[^>]*>?/gm, '');
    }, [post.content]);

    return (
        <div onClick={() => onViewPost(post.id)} className="glass-card overflow-hidden transition-all duration-300 cursor-pointer flex flex-col group">
            <div className="p-4 flex items-center gap-3">
                <img onClick={(e) => { e.stopPropagation(); onViewUser(post.authorId); }} src={authorProfilePicUrl} alt={authorName} className="w-10 h-10 rounded-full object-cover cursor-pointer" />
                <div className="flex-grow">
                    <div className="flex items-center gap-3">
                        <p onClick={(e) => { e.stopPropagation(); onViewUser(post.authorId); }} className="font-bold text-gray-800 cursor-pointer hover:text-blue-600">{authorName}</p>
                        {currentUser && currentUser.uid !== post.authorId && (
                            <button onClick={handleFollowClick} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'gradient-button text-white'}`}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">{timeAgo}</p>
                </div>
            </div>
            {post.thumbnailUrl && <img src={post.thumbnailUrl} alt={post.title} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105" />}
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-red-600 mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-gray-600 line-clamp-3 text-sm flex-grow">{strippedContent}</p>
            </div>
             <div className="px-4 py-2 border-t border-black/10 flex justify-between items-center text-gray-500">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1" title="Views">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                        <span className="text-sm">{post.viewCount || 0}</span>
                    </div>
                    <button onClick={handleLike} className={`flex items-center gap-1 transition-colors group/like ${isLiked ? 'text-red-600' : 'hover:text-red-500'}`} title="Likes">
                        <span 
                            className="material-symbols-outlined text-xl transition-all"
                            style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}`}}
                        >
                            favorite
                        </span>
                        <span className="text-sm">{likeCount}</span>
                    </button>
                    <button onClick={() => onViewPost(post.id)} className="flex items-center gap-1 hover:text-blue-600 transition-colors" title="Comments">
                        <span className="material-symbols-outlined text-xl">chat_bubble</span>
                        <span className="text-sm">{commentCount}</span>
                    </button>
                     <button onClick={handleShare} className="flex items-center gap-1 text-green-500 hover:text-green-600 transition-colors" title="Share on WhatsApp">
                        <i className="fa-brands fa-whatsapp text-xl"></i>
                        <span className="text-sm">{post.shareCount || 0}</span>
                    </button>
                </div>
                 <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(v => !v); }} className="p-2 rounded-full hover:bg-black/5"><span className="material-symbols-outlined">more_vert</span></button>
                     {isMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-40 glass-card text-gray-700 z-20 overflow-hidden">
                            <button onClick={handleReportClick} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-black/5">
                                <span className="material-symbols-outlined text-base">flag</span>
                                Report
                            </button>
                        </div>
                     )}
                </div>
             </div>
        </div>
    );
};

export default PostCard;
