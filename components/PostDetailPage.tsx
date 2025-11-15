import React, { useState, useEffect, useMemo } from 'react';
import { Post, User, View, Comment } from '../types';
import Header from './Header';
import { db, serverTimestamp, increment } from '../firebaseConfig';
import ReportModal from './ReportModal';

// FIX: The `onViewPost` prop was missing, causing a runtime error when clicking on related posts. It has been added to the component props to correctly handle navigation.
interface PostDetailPageProps {
    postId: string;
    currentUser: User | null;
    onBack: () => void;
    onLogin: () => void;
    onNavigate: (view: View) => void;
    onViewUser: (userId: string) => void;
    onViewPost: (postId: string) => void;
}

const PostDetailPage: React.FC<PostDetailPageProps> = ({ postId, currentUser, onBack, onLogin, onNavigate, onViewUser, onViewPost }) => {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Effect to increment view count, runs only when postId changes.
    useEffect(() => {
        if (postId) {
            const postRef = db.collection('posts').doc(postId);
            // This is a fire-and-forget operation to not slow down the UI.
            // It will fail gracefully for anonymous users if security rules are restrictive.
            postRef.update({
                viewCount: increment(1)
            }).catch(err => {
                console.warn(`Could not update view count. This is expected for anonymous users. Error: ${err.message}`);
            });
        }
    }, [postId]);

    useEffect(() => {
        let unsubPost: () => void = () => {};
        let unsubComments: () => void = () => {};
        let unsubLikes: () => void = () => {};
        let unsubIsFollowing: () => void = () => {};
        
        // Reset state on post change
        setPost(null);
        setRelatedPosts([]);
        setLoading(true);
        setError(null);


        const postRef = db.collection('posts').doc(postId);
        unsubPost = postRef.onSnapshot(docSnap => {
            if (docSnap.exists) {
                const postData = docSnap.data();
                const fetchedPost = {
                    id: docSnap.id,
                    ...postData,
                    category: postData.category || 'General',
                    createdAt: postData.createdAt?.toDate() || null,
                    locationType: postData.locationType || 'Overall',
                    state: postData.state || '',
                    district: postData.district || '',
                    block: postData.block || '',
                } as Post;
                setPost(fetchedPost);

                if (currentUser && currentUser.uid !== fetchedPost.authorId) {
                    const isFollowingRef = db.collection('users').doc(currentUser.uid).collection('following').doc(fetchedPost.authorId);
                    unsubIsFollowing = isFollowingRef.onSnapshot((doc) => {
                        setIsFollowing(doc.exists);
                    });
                }
            } else {
                setError("Post not found.");
            }
            setLoading(false);
        }, err => {
            setError("Failed to load post.");
            setLoading(false);
        });

        const commentsQuery = db.collection('posts').doc(postId).collection('comments').orderBy('createdAt', 'asc');
        unsubComments = commentsQuery.onSnapshot(snapshot => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || null,
            } as Comment));
            setComments(fetchedComments);
        });
        
        const likesRef = db.collection('posts').doc(postId).collection('likes');
        unsubLikes = likesRef.onSnapshot((snapshot) => {
            setLikeCount(snapshot.size);
            if (currentUser) {
                setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid));
            } else {
                setIsLiked(false);
            }
        });

        return () => {
            unsubPost();
            unsubComments();
            unsubLikes();
            unsubIsFollowing();
        };
    }, [postId, currentUser]);

    // Effect to fetch related posts
    useEffect(() => {
        if (!post) return;

        const fetchRelatedPosts = async () => {
            try {
                const query = db.collection('posts')
                                .where('category', '==', post.category)
                                .limit(10); // Fetch more to allow for scoring and filtering

                const snapshot = await query.get();
                const candidates = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return { 
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate() || null,
                         } as Post
                    })
                    .filter(p => p.id !== post.id);

                // Score and sort candidates
                const scoredPosts = candidates.map(candidate => {
                    let score = 0;
                    if (candidate.category === post.category) score += 3;
                    if (post.state && candidate.state === post.state) score += 2;
                    if (post.district && candidate.district === post.district) score += 1;
                    if (candidate.authorId === post.authorId) score += 1;
                    return { ...candidate, score };
                });

                scoredPosts.sort((a, b) => b.score - a.score);

                setRelatedPosts(scoredPosts.slice(0, 6));
            } catch (err) {
                console.error("Error fetching related posts:", err);
            }
        };

        fetchRelatedPosts();
    }, [post]);


    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please log in to comment.");
            onLogin();
            return;
        }
        if (!newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            const commentsRef = db.collection('posts').doc(postId).collection('comments');
            const batch = db.batch();

            const commentDocRef = commentsRef.doc();
            batch.set(commentDocRef, {
                text: newComment,
                authorId: currentUser.uid,
                authorName: currentUser.name,
                authorProfilePicUrl: currentUser.profilePicUrl,
                createdAt: serverTimestamp()
            });
            
            if (post && currentUser.uid !== post.authorId) {
                const notificationRef = db.collection('users').doc(post.authorId).collection('notifications').doc();
                batch.set(notificationRef, {
                    type: 'new_comment',
                    fromUserId: currentUser.uid,
                    fromUserName: currentUser.name,
                    fromUserProfilePicUrl: currentUser.profilePicUrl,
                    postId: postId,
                    postTitle: post.title,
                    createdAt: serverTimestamp(),
                    read: false
                });
            }

            await batch.commit();
            setNewComment('');
        } catch (error) {
            console.error("Error submitting comment:", error);
            alert("Failed to post comment.");
        } finally {
            setIsSubmittingComment(false);
        }
    };
    
    const handleLike = async () => {
        if (!currentUser || !post) {
            alert("Please log in to like posts.");
            onLogin();
            return;
        }

        const likeRef = db.collection('posts').doc(postId).collection('likes').doc(currentUser.uid);
        try {
            if (isLiked) {
                await likeRef.delete();
            } else {
                const batch = db.batch();
                batch.set(likeRef, { likedAt: serverTimestamp() });
                
                if (currentUser.uid !== post.authorId) {
                    const notificationRef = db.collection('users').doc(post.authorId).collection('notifications').doc();
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

    const handleShare = async () => {
        if (!post) return;
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

    const handleFollowToggle = async () => {
        if (!currentUser || !post) {
            onLogin();
            return;
        }

        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(post.authorId);

        const followingRef = currentUserRef.collection('following').doc(post.authorId);
        const followerRef = targetUserRef.collection('followers').doc(currentUser.uid);

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
    };

    const handleReport = () => {
        if (!currentUser) {
            alert("You must be logged in to report a post.");
            onLogin();
            return;
        }
        setIsReportModalOpen(true);
    };

    const handleReportSuccess = () => {
        setIsReportModalOpen(false);
    };

    const timeAgo = (date: Date | null) => {
        if (!date) return 'N/A';
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
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
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-transparent"><p>Loading post...</p></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen bg-transparent"><p className="text-red-500">{error}</p></div>;
    }
    
    if (!post) {
        return <div className="flex items-center justify-center h-screen bg-transparent"><p>Post not found.</p></div>;
    }

    const isCurrentUserPost = currentUser && currentUser.uid === post.authorId;
    const authorName = isCurrentUserPost ? currentUser.name : post.authorName;
    const authorProfilePicUrl = isCurrentUserPost ? currentUser.profilePicUrl : post.authorProfilePicUrl;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Post" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="max-w-2xl mx-auto">
                    <div className="glass-card my-4 overflow-hidden">
                         <div className="p-4 flex items-center gap-3">
                            <img onClick={() => onViewUser(post.authorId)} src={authorProfilePicUrl} alt={authorName} className="w-10 h-10 rounded-full object-cover cursor-pointer" />
                            <div className="flex-grow">
                                <p onClick={() => onViewUser(post.authorId)} className="font-bold text-gray-800 cursor-pointer">{authorName}</p>
                                <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
                            </div>
                             {currentUser && currentUser.uid !== post.authorId && (
                                <button onClick={handleFollowToggle} className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'gradient-button text-white'}`}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                        {post.thumbnailUrl && <img src={post.thumbnailUrl} alt={post.title} className="w-full object-cover" />}
                        <div className="p-4">
                            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-red-600">{post.title}</h1>
                            <div className="prose max-w-none prose-p:text-gray-600 prose-headings:text-gray-800" dangerouslySetInnerHTML={{ __html: post.content }} />
                        </div>
                        <div className="px-4 py-2 border-t border-black/10 flex justify-between items-center text-gray-500">
                           <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1" title="Views">
                                    <span className="material-symbols-outlined text-xl">visibility</span>
                                    <span className="text-sm">{post.viewCount || 0}</span>
                                </div>
                                <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-600' : 'hover:text-red-500'}`}>
                                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}`}}>favorite</span>
                                    <span className="text-sm">{likeCount}</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                                    <span className="text-sm">{comments.length}</span>
                                </div>
                                <button onClick={handleShare} className="flex items-center gap-1 text-green-500 hover:text-green-600 transition-colors" title="Share on WhatsApp">
                                    <i className="fa-brands fa-whatsapp text-xl"></i>
                                    <span className="text-sm">{post.shareCount || 0}</span>
                                </button>
                            </div>
                             <div className="relative">
                                <button onClick={() => setIsMenuOpen(v => !v)} className="p-2 rounded-full hover:bg-black/5">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 glass-card text-gray-700 z-20 overflow-hidden shadow-lg">
                                        <button 
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                handleReport();
                                            }} 
                                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-black/5"
                                        >
                                            <span className="material-symbols-outlined text-base">flag</span>
                                            Report Post
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {relatedPosts.length > 0 && (
                        <div className="my-4">
                            <h2 className="text-xl font-bold mb-2 text-gray-800 px-4">Related Posts</h2>
                            <div className="overflow-x-auto scrollbar-hide">
                                <div className="flex space-x-4 px-4 py-2">
                                    {relatedPosts.map(relatedPost => (
                                        <div key={relatedPost.id} onClick={() => onViewPost(relatedPost.id)} className="flex-shrink-0 w-40 glass-card overflow-hidden cursor-pointer group transition-shadow duration-300 hover:shadow-xl">
                                            <img src={relatedPost.thumbnailUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(relatedPost.title)}&backgroundColor=e5e7eb`} alt={relatedPost.title} className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-200" />
                                            <div className="p-2">
                                                <h3 className="font-semibold text-sm text-red-600 line-clamp-2 leading-tight">{relatedPost.title}</h3>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="glass-card my-4 p-4">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Comments ({comments.length})</h2>
                        <div className="space-y-4">
                            {comments.map(comment => {
                                const isCurrentUserComment = currentUser && currentUser.uid === comment.authorId;
                                const commentAuthorName = isCurrentUserComment ? currentUser.name : comment.authorName;
                                const commentAuthorProfilePicUrl = isCurrentUserComment ? currentUser.profilePicUrl : comment.authorProfilePicUrl;
                                
                                return (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <img src={commentAuthorProfilePicUrl} alt={commentAuthorName} className="w-8 h-8 rounded-full object-cover cursor-pointer" onClick={() => onViewUser(comment.authorId)} />
                                        <div className="flex-grow bg-gray-100 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                              <p className="font-bold text-sm text-gray-800 cursor-pointer" onClick={() => onViewUser(comment.authorId)}>{commentAuthorName}</p>
                                              <p className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</p>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>}
                        </div>

                        {currentUser && (
                             <form onSubmit={handleCommentSubmit} className="mt-6 flex items-start gap-3">
                                <img src={currentUser.profilePicUrl} alt="Your profile" className="w-8 h-8 rounded-full object-cover" />
                                <div className="flex-grow">
                                    <textarea
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full p-2 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 text-sm"
                                        rows={2}
                                    />
                                    <button type="submit" disabled={isSubmittingComment} className="mt-2 px-4 py-1.5 gradient-button text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                                        {isSubmittingComment ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                             </form>
                        )}
                    </div>
                </div>
            </main>
            {isReportModalOpen && currentUser && post && (
                <ReportModal
                    post={post}
                    user={currentUser}
                    onClose={() => setIsReportModalOpen(false)}
                    onSuccess={handleReportSuccess}
                />
            )}
        </div>
    );
};

export default PostDetailPage;