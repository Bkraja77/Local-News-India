
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './Header';
import { db, serverTimestamp, increment, firebase, storage } from '../firebaseConfig';
// Added Reply to the imported types to fix name lookup errors
import { VideoPost, User, View, Comment, Reply } from '../types';
import { formatCount } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Categories, { CategoryItem } from './Categories';
import LocationFilter from './LocationFilter';
import { indianLocations } from '../data/locations';
import SEO from './SEO';
import { APP_LOGO_URL } from '../utils/constants';
import ConfirmationModal from './ConfirmationModal';

const timeAgo = (date: Date | null | undefined) => {
    if (!date) return 'Just now';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
};

interface VideosPageProps {
    onNavigate: (view: View, params?: any) => void;
    currentUser: User | null;
    onLogin: () => void;
    videoId?: string | null;
    isCurrentView?: boolean;
}

const newsCategories = ['Recent News', 'Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];

const VideoReplyItem: React.FC<{ 
    // Reply type is now imported from ../types
    reply: Reply; 
    videoId: string; 
    commentId: string; 
    currentUser: User | null; 
    isVideoAuthor: boolean; 
    isAdmin: boolean; 
    onViewUser: (id: string) => void; 
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void; 
}> = ({ reply, videoId, commentId, currentUser, isVideoAuthor, isAdmin, onViewUser, showToast }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isCurrentUserReply = currentUser && currentUser.uid === reply.authorId;

    const handleDeleteReply = async () => {
        if (!currentUser) return;
        if (window.confirm("Delete this reply?")) {
            try {
                await db.collection('videos').doc(videoId).collection('comments').doc(commentId).collection('replies').doc(reply.id).delete();
                showToast("Reply deleted", "success");
            } catch (error) {
                showToast("Could not delete", "error");
            }
        }
    };

    const saveEdit = async () => {
        if (!editText.trim()) return;
        setIsSavingEdit(true);
        try {
            await db.collection('videos').doc(videoId).collection('comments').doc(commentId).collection('replies').doc(reply.id).update({ content: editText.trim() });
            setIsEditing(false);
            showToast("Reply updated", "success");
        } catch (error) {
            showToast("Failed to update", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="flex gap-2 group/reply animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-100 rounded-full mb-1"></div>
                <img src={reply.authorProfilePicUrl} className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-100" onClick={() => onViewUser(reply.authorId)} alt="" />
            </div>
            <div className={`flex-grow border transition-all rounded-xl rounded-tl-none p-2.5 relative ${isEditing ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11px] text-gray-800" onClick={() => onViewUser(reply.authorId)}>{reply.authorName}</span>
                        {isVideoAuthor && <span className="text-red-600 text-[8px] font-black uppercase">Author</span>}
                        <span className="text-[9px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                    </div>
                    {(isAdmin || isCurrentUserReply) && !isEditing && (
                        <button onClick={() => setShowMenu(!showMenu)} className="text-gray-300 hover:text-gray-600"><span className="material-symbols-outlined text-sm">more_horiz</span></button>
                    )}
                </div>
                {isEditing ? (
                    <div>
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" autoFocus />
                        <div className="flex justify-end gap-2 mt-1">
                            <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-[10px] text-gray-500">Cancel</button>
                            <button onClick={saveEdit} className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded-lg">Save</button>
                        </div>
                    </div>
                ) : <p className="text-xs text-gray-700 leading-relaxed break-words">{reply.content}</p>}
                {showMenu && (
                    <div className="absolute right-0 top-6 bg-white shadow-xl border rounded-lg z-20 overflow-hidden text-[10px] font-bold">
                        <button onClick={() => { setIsEditing(true); setEditText(reply.content); setShowMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Edit</button>
                        <button onClick={handleDeleteReply} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoCommentItem: React.FC<{ 
    comment: Comment; 
    videoId: string; 
    currentUser: User | null; 
    videoAuthorId: string; 
    isAdmin: boolean; 
    onViewUser: (id: string) => void; 
    onDelete: (id: string) => void; 
    onLogin: () => void; 
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void; 
}> = ({ comment, videoId, currentUser, videoAuthorId, isAdmin, onViewUser, onDelete, onLogin, showToast }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    // Reply type is now imported from ../types
    const [replies, setReplies] = useState<Reply[]>([]);

    useEffect(() => {
        const unsubLikes = db.collection('videos').doc(videoId).collection('comments').doc(comment.id).collection('likes').onSnapshot(snap => {
            setLikeCount(snap.size);
            if (currentUser) setIsLiked(snap.docs.some(doc => doc.id === currentUser.uid));
        });
        const unsubReplies = db.collection('videos').doc(videoId).collection('comments').doc(comment.id).collection('replies').orderBy('createdAt', 'asc').onSnapshot(snap => {
            // Mapping to imported Reply type
            setReplies(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() } as Reply)));
        });
        return () => { unsubLikes(); unsubReplies(); };
    }, [videoId, comment.id, currentUser]);

    const handleLike = async () => {
        if (!currentUser) { onLogin(); return; }
        const ref = db.collection('videos').doc(videoId).collection('comments').doc(comment.id).collection('likes').doc(currentUser.uid);
        if (isLiked) await ref.delete();
        else await ref.set({ createdAt: serverTimestamp(), userId: currentUser.uid });
    };

    const handleReplySubmit = async () => {
        if (!replyText.trim() || !currentUser) return;
        setIsSubmittingReply(true);
        try {
            await db.collection('videos').doc(videoId).collection('comments').doc(comment.id).collection('replies').add({
                content: replyText.trim(),
                authorId: currentUser.uid,
                authorName: currentUser.name,
                authorProfilePicUrl: currentUser.profilePicUrl,
                createdAt: serverTimestamp()
            });
            setReplyText('');
            setIsReplying(false);
        } catch (e) { showToast("Failed to reply", "error"); }
        finally { setIsSubmittingReply(false); }
    };

    const saveEdit = async () => {
        if (!editText.trim()) return;
        try {
            await db.collection('videos').doc(videoId).collection('comments').doc(comment.id).update({ content: editText.trim() });
            setIsEditing(false);
            showToast("Comment updated", "success");
        } catch (e) { showToast("Failed to update", "error"); }
    };

    return (
        <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center">
                <img src={comment.authorProfilePicUrl} className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" onClick={() => onViewUser(comment.authorId)} alt="" />
                {replies.length > 0 && <div className="w-0.5 flex-grow bg-gray-100 rounded-full my-1"></div>}
            </div>
            <div className="flex-grow min-w-0">
                <div className={`rounded-2xl rounded-tl-none p-3 relative border transition-all ${isEditing ? 'bg-white border-blue-200 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900">@{comment.authorName}</span>
                            {videoAuthorId === comment.authorId && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">Author</span>}
                            <span className="text-[9px] text-gray-400 font-medium">{timeAgo(comment.createdAt)}</span>
                        </div>
                        {(isAdmin || currentUser?.uid === comment.authorId) && !isEditing && (
                            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400"><span className="material-symbols-outlined text-lg">more_horiz</span></button>
                        )}
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white shadow-xl border rounded-xl z-20 overflow-hidden text-xs font-bold">
                                <button onClick={() => { setIsEditing(true); setEditText(comment.content); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2"><span className="material-symbols-outlined text-sm">edit</span> Edit</button>
                                <button onClick={() => { onDelete(comment.id); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 flex items-center gap-2"><span className="material-symbols-outlined text-sm">delete</span> Delete</button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="mt-1">
                            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 text-sm border rounded-xl outline-none" autoFocus />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 font-bold">Cancel</button>
                                <button onClick={saveEdit} className="text-xs text-blue-600 font-bold">Save</button>
                            </div>
                        </div>
                    ) : <p className="text-sm text-gray-800 leading-relaxed break-words">{comment.content}</p>}
                </div>
                <div className="flex items-center gap-5 mt-1.5 ml-1">
                    <button onClick={handleLike} className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span>
                        {likeCount > 0 ? formatCount(likeCount) : 'Like'}
                    </button>
                    <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
                        <span className="material-symbols-outlined text-lg">reply</span>
                        Reply
                    </button>
                </div>
                {isReplying && (
                    <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1">
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={`Reply to ${comment.authorName}...`} className="flex-1 bg-gray-100 p-2 rounded-full text-xs outline-none" autoFocus />
                        <button onClick={handleReplySubmit} disabled={isSubmittingReply || !replyText.trim()} className="text-blue-600 font-black text-[11px] uppercase pr-2">Post</button>
                    </div>
                )}
                {replies.length > 0 && <div className="mt-3 flex flex-col gap-3">{replies.map(r => <VideoReplyItem key={r.id} reply={r} videoId={videoId} commentId={comment.id} currentUser={currentUser} isVideoAuthor={videoAuthorId === r.authorId} isAdmin={isAdmin} onViewUser={onViewUser} showToast={showToast} />)}</div>}
            </div>
        </div>
    );
};

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
        const handleGlobalMute = () => setIsMuted(true);
        window.addEventListener('mute-all-video-previews', handleGlobalMute);
        return () => window.removeEventListener('mute-all-video-previews', handleGlobalMute);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.6 });
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (videoPreviewRef.current) {
            if (isVisible) videoPreviewRef.current.play().catch(() => {});
            else { videoPreviewRef.current.pause(); videoPreviewRef.current.currentTime = 0; setIsMuted(true); }
        }
    }, [isVisible]);

    useEffect(() => {
        const likesRef = db.collection('videos').doc(video.id).collection('likes');
        const unsubLikes = likesRef.onSnapshot((snapshot) => {
            setLikeCount(snapshot.size);
            if (currentUser) setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid));
            else setIsLiked(false);
        });
        const commentsRef = db.collection('videos').doc(video.id).collection('comments');
        const unsubComments = commentsRef.onSnapshot((snapshot) => setCommentCount(snapshot.size));
        return () => { unsubLikes(); unsubComments(); };
    }, [video.id, currentUser]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) { onLogin(); return; }
        const likeRef = db.collection('videos').doc(video.id).collection('likes').doc(currentUser.uid);
        const batch = db.batch();
        try {
            if (isLiked) await likeRef.delete();
            else {
                batch.set(likeRef, { createdAt: serverTimestamp() });
                if (currentUser.uid !== video.authorId) {
                    batch.set(db.collection('users').doc(video.authorId).collection('notifications').doc(), {
                        type: 'new_like', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, videoId: video.id, postTitle: video.title, createdAt: serverTimestamp(), read: false
                    });
                }
                await batch.commit();
            }
        } catch (error) { showToast("Action failed", "error"); }
    };

    return (
        <div ref={cardRef} onClick={() => { setIsMuted(true); window.dispatchEvent(new CustomEvent('mute-all-video-previews')); onViewVideo(video.id); }} className="bg-white md:glass-card overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full group md:hover:shadow-xl border-y md:border border-gray-100 relative rounded-none md:rounded-2xl">
            <div className="p-3 flex items-center gap-3">
                <img onClick={(e) => { e.stopPropagation(); onViewUser(video.authorId); }} src={video.authorProfilePicUrl} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-50" alt="" />
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">@{video.authorName}</p>
                        {(!currentUser || (currentUser.uid !== video.authorId && !isFollowing)) && (
                            <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(video.authorId, video.authorName, video.authorProfilePicUrl); }} className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all bg-red-600 text-white shadow-sm active:scale-95">Follow</button>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{timeAgo(video.createdAt)}</p>
                </div>
            </div>

            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                <img src={video.thumbnailUrl} className={`w-full h-full object-cover transition-opacity duration-500 ${isVisible ? 'opacity-0' : 'opacity-90'} md:group-hover:scale-105`} alt="" />
                <video ref={videoPreviewRef} src={video.videoUrl} muted={isMuted} loop playsInline className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-4 border border-white/30 transform md:group-hover:scale-110 transition-transform shadow-xl"><span className="material-symbols-outlined text-white text-3xl">play_arrow</span></div>
                </div>
                {isVisible && (
                    <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="absolute bottom-3 right-3 z-20 w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90 shadow-xl"><span className="material-symbols-outlined text-xl">{isMuted ? 'volume_off' : 'volume_up'}</span></button>
                )}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Video</div>
            </div>

            <div className="p-4 flex flex-col flex-grow"><h3 className="text-lg font-extrabold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">{video.title}</h3></div>

            <div className="px-4 py-2 border-t border-gray-50 flex justify-between items-center text-gray-400 bg-white mt-auto">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Views"><span className="material-symbols-outlined text-[22px]">visibility</span><span className="text-xs font-bold">{formatCount(video.viewCount || 0)}</span></div>
                    <button onClick={handleLike} className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : ''}`}><span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span><span className="text-xs font-bold">{formatCount(likeCount)}</span></button>
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[22px]">chat_bubble</span><span className="text-xs font-bold">{formatCount(commentCount)}</span></div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent('🚩 Watch this news: ' + window.location.origin + '/?videoId=' + video.id)}`, '_blank'); }} className="text-green-600 p-1.5 active:scale-90 transition-all"><i className="fa-brands fa-whatsapp text-xl"></i></button>
            </div>
        </div>
    );
};

interface ReelItemProps {
    video: VideoPost;
    isActive: boolean;
    currentUser: User | null;
    onLogin: () => void;
    onNavigate: (view: View, params?: any) => void;
    isFollowing: boolean;
    handleFollowToggle: (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => void;
    onDeleteVideo: (video: VideoPost) => void;
}

const VideosPage: React.FC<VideosPageProps> = ({ onNavigate, currentUser, onLogin, videoId, isCurrentView }) => {
    const [videos, setVideos] = useState<VideoPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
    const [followingList, setFollowingList] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<VideoPost | null>(null);
    
    const { t } = useLanguage();
    const { showToast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitialPlayed = useRef(false);

    const [selectedCategory, setSelectedCategory] = useState('Recent News');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFlatView, setIsFlatView] = useState(false);

    const NEAR_ME = 'Near Me';

    const displayCategories: CategoryItem[] = useMemo(() => {
        const items: CategoryItem[] = [];
        items.push({ id: NEAR_ME, label: t('nearMe') || 'Near Me', icon: 'my_location' });
        newsCategories.forEach(cat => {
            items.push({ id: cat, label: t(cat.toLowerCase()), icon: cat === 'Recent News' ? 'local_fire_department' : undefined });
        });
        return items;
    }, [t]);

    const handleFollowToggle = useCallback(async (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => {
        if (!currentUser) { onLogin(); return; }
        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(targetUserId);
        const isFollowing = followingList.includes(targetUserId);
        try {
            const batch = db.batch();
            if (isFollowing) {
                batch.delete(currentUserRef.collection('following').doc(targetUserId));
                batch.delete(targetUserRef.collection('followers').doc(currentUser.uid));
            } else {
                batch.set(currentUserRef.collection('following').doc(targetUserId), { followedAt: serverTimestamp() });
                batch.set(targetUserRef.collection('followers').doc(currentUser.uid), { followedAt: serverTimestamp() });
                batch.set(targetUserRef.collection('notifications').doc(), {
                    type: 'new_follower', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, createdAt: serverTimestamp(), read: false
                });
            }
            await batch.commit();
        } catch (error) { showToast("Action failed", "error"); }
    }, [currentUser, followingList, onLogin, showToast]);

    useEffect(() => {
        const unsub = db.collection("videos").orderBy("createdAt", "desc").onSnapshot(snap => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || null } as VideoPost));
            setVideos(fetched);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateUrlWithVideoId = useCallback((id: string | null) => {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set('videoId', id); else url.searchParams.delete('videoId');
        window.history.replaceState({ ...window.history.state, videoId: id }, '', url.toString());
    }, []);

    useEffect(() => {
        if (activeReelIndex !== null && containerRef.current) {
            const h = containerRef.current.clientHeight;
            if (h > 0) containerRef.current.scrollTo({ top: activeReelIndex * h, behavior: 'instant' });
        }
    }, [activeReelIndex]);

    useEffect(() => {
        if (isCurrentView && videoId && !hasInitialPlayed.current && videos.length > 0) {
            const idx = videos.findIndex(v => v.id === videoId);
            if (idx !== -1) setActiveReelIndex(idx);
            hasInitialPlayed.current = true;
        }
    }, [isCurrentView, videos.length, videoId]);

    useEffect(() => {
        if (currentUser) {
            const unsub = db.collection('users').doc(currentUser.uid).collection('following').onSnapshot(snap => setFollowingList(snap.docs.map(doc => doc.id)));
            return () => unsub();
        } else setFollowingList([]);
    }, [currentUser]);

    const handleCategorySelect = (category: string) => {
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
        if (category !== 'Recent News' && !currentUser) { onLogin(); return; }
        setSelectedCategory(category);
        setIsFlatView(category !== 'Recent News');
    };

    const groupedSections = useMemo(() => {
        if (isFlatView || searchQuery.trim()) return [];
        let base = videos;
        if (selectedState) base = base.filter(v => v.state === selectedState && (!selectedDistrict || v.district === selectedDistrict));
        const sections = [];
        if (base.length > 0) sections.push({ title: 'Recent News', key: 'Recent News', posts: base.slice(0, 8) });
        newsCategories.filter(c => c !== 'Recent News').forEach(cat => {
            const catPosts = base.filter(v => v.category === cat);
            if (catPosts.length > 0) sections.push({ title: cat, key: cat, posts: catPosts.slice(0, 8) });
        });
        return sections;
    }, [videos, isFlatView, selectedState, selectedDistrict, searchQuery]);

    const filteredVideos = useMemo(() => {
        let res = videos;
        if (searchQuery.trim()) res = res.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()));
        if (selectedCategory !== 'Recent News' && selectedCategory !== NEAR_ME) res = res.filter(v => v.category === selectedCategory);
        if (selectedState) res = res.filter(v => v.state === selectedState);
        return res;
    }, [videos, selectedCategory, selectedState, searchQuery]);

    const handleConfirmDeleteVideo = async () => {
        if (!videoToDelete) return;
        try {
            await db.collection("videos").doc(videoToDelete.id).delete();
            if (videoToDelete.thumbnailUrl?.includes('firebasestorage')) {
                storage.refFromURL(videoToDelete.thumbnailUrl).delete().catch(() => {});
            }
            if (videoToDelete.videoUrl?.includes('firebasestorage')) {
                storage.refFromURL(videoToDelete.videoUrl).delete().catch(() => {});
            }
            showToast("Video deleted successfully.", "success");
            setActiveReelIndex(null);
        } catch (e) { showToast("Failed to delete.", "error"); }
        finally { setIsDeleteModalOpen(false); setVideoToDelete(null); }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <SEO title="Videos" description="Watch hyper-local news updates." />
            
            <div className="hidden md:block bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 p-4">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button onClick={() => onNavigate(View.Main)} className="p-2 rounded-full hover:bg-gray-100"><span className="material-symbols-outlined">arrow_back</span></button>
                    <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-grow bg-gray-100 px-4 py-2 rounded-xl outline-none" />
                </div>
            </div>

            <div className="md:hidden">
                <Header title="Videos" showBackButton onBack={() => onNavigate(View.Main)} onSearch={() => onNavigate(View.Search, { searchMode: 'video-user' })} showSettingsButton onSettings={() => onNavigate(View.Settings)} />
                <Categories categories={displayCategories} selectedCategory={selectedCategory} onSelectCategory={handleCategorySelect} />
                <LocationFilter selectedState={selectedState} setSelectedState={setSelectedState} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} />
            </div>

            <main className="flex-grow overflow-y-auto pb-20 md:pb-10 bg-gray-50/30">
                <div className="max-w-7xl mx-auto md:px-4 py-0 md:py-6">
                    {loading ? <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">{[1,2,3,4].map(i => <div key={i} className="aspect-video bg-gray-200 animate-pulse rounded-xl" />)}</div> : (
                        <>
                            {!isFlatView && !searchQuery.trim() ? groupedSections.map(s => (
                                <section key={s.title} className="mb-8">
                                    <h2 className="px-4 py-2 font-black text-xl">{s.title}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {s.posts.map(v => <VideoCard key={v.id} video={v} currentUser={currentUser} onLogin={onLogin} onViewVideo={id => { setActiveReelIndex(videos.findIndex(v => v.id === id)); updateUrlWithVideoId(id); }} onViewUser={id => onNavigate(View.PublicProfile, { userId: id })} isFollowing={followingList.includes(v.authorId)} handleFollowToggle={handleFollowToggle} index={0} />)}
                                    </div>
                                </section>
                            )) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {filteredVideos.map(v => <VideoCard key={v.id} video={v} currentUser={currentUser} onLogin={onLogin} onViewVideo={id => { setActiveReelIndex(videos.findIndex(v => v.id === id)); updateUrlWithVideoId(id); }} onViewUser={id => onNavigate(View.PublicProfile, { userId: id })} isFollowing={followingList.includes(v.authorId)} handleFollowToggle={handleFollowToggle} index={0} />)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {activeReelIndex !== null && (
                <div className="fixed inset-0 z-[150] bg-black h-full w-full overflow-hidden animate-in fade-in duration-300">
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-[180] pt-[calc(1rem+env(safe-area-inset-top))]">
                        <button onClick={() => { setActiveReelIndex(null); updateUrlWithVideoId(null); }} className="p-2 text-white bg-black/20 backdrop-blur-md rounded-full active:scale-90 transition-all"><span className="material-symbols-outlined text-2xl">arrow_back</span></button>
                        <div className="flex items-center gap-3">
                            <button onClick={() => onNavigate(View.Search, { searchMode: 'video-user' })} className="p-2 text-white bg-black/20 backdrop-blur-md rounded-full active:scale-90 transition-all"><span className="material-symbols-outlined text-2xl">video_search</span></button>
                            <button onClick={() => onNavigate(View.Settings)} className="p-2 text-white bg-black/20 backdrop-blur-md rounded-full active:scale-90 transition-all"><span className="material-symbols-outlined text-2xl">settings</span></button>
                        </div>
                    </div>

                    <div ref={containerRef} onScroll={() => {
                        if (!containerRef.current) return;
                        const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
                        if (idx !== activeReelIndex && idx >= 0 && idx < videos.length) { setActiveReelIndex(idx); updateUrlWithVideoId(videos[idx].id); }
                    }} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black">
                        {videos.map((v, i) => <ReelItem key={v.id} video={v} isActive={activeReelIndex === i} currentUser={currentUser} onLogin={onLogin} onNavigate={onNavigate} isFollowing={followingList.includes(v.authorId)} handleFollowToggle={handleFollowToggle} onDeleteVideo={(vid) => { setVideoToDelete(vid); setIsDeleteModalOpen(true); }} />)}
                    </div>
                </div>
            )}

            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDeleteVideo} title="Delete Video" message="Are you sure you want to delete this video news? This cannot be undone." />
        </div>
    );
};

const ReelItem: React.FC<ReelItemProps> = ({ video, isActive, currentUser, onLogin, onNavigate, isFollowing, handleFollowToggle, onDeleteVideo }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const isAuthor = currentUser?.uid === video.authorId;

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) { 
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); 
                db.collection('videos').doc(video.id).update({ viewCount: increment(1) }); 
            }
            else { 
                videoRef.current.pause(); 
                videoRef.current.currentTime = 0; 
                setIsPlaying(false); 
                setShowComments(false); 
                setShowActionSheet(false);
            }
        }
    }, [isActive, video.id]);

    useEffect(() => {
        const unsubLikes = db.collection('videos').doc(video.id).collection('likes').onSnapshot(snap => {
            setLikeCount(snap.size);
            if (currentUser) setIsLiked(snap.docs.some(doc => doc.id === currentUser.uid));
        });
        const unsubComments = db.collection('videos').doc(video.id).collection('comments').onSnapshot(snap => setCommentCount(snap.size));
        return () => { unsubLikes(); unsubComments(); };
    }, [video.id, currentUser]);

    const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
        if (!videoRef.current || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const pos = (clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        videoRef.current.currentTime = clampedPos * videoRef.current.duration;
        setProgress(clampedPos * 100);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) { onLogin(); return; }
        const ref = db.collection('videos').doc(video.id).collection('likes').doc(currentUser.uid);
        if (isLiked) await ref.delete();
        else {
            const batch = db.batch();
            batch.set(ref, { createdAt: serverTimestamp() });
            if (currentUser.uid !== video.authorId) {
                batch.set(db.collection('users').doc(video.authorId).collection('notifications').doc(), {
                    type: 'new_like', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, videoId: video.id, postTitle: video.title, createdAt: serverTimestamp(), read: false
                });
            }
            await batch.commit();
        }
    };

    return (
        <div className="h-full w-full snap-start snap-always relative flex flex-col items-center bg-black transition-all duration-500 overflow-hidden">
            <div 
                className={`relative w-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${showComments ? 'h-[35vh] md:h-[45vh]' : 'h-full'}`}
                onClick={() => { if (isPlaying) videoRef.current?.pause(); else videoRef.current?.play(); setIsPlaying(!isPlaying); }}
            >
                <video 
                    ref={videoRef} 
                    src={video.videoUrl} 
                    className="h-full w-full object-contain bg-black" 
                    loop 
                    playsInline 
                    onTimeUpdate={() => { if (!isSeeking && videoRef.current) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100); }} 
                />
                
                {!showComments && (
                    <div className="absolute right-3 bottom-[calc(52px+6rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-5 z-20 animate-in fade-in slide-in-from-right-4">
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={handleLike} className={`w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 ${isLiked ? 'text-red-500' : 'text-white'}`}><span className="material-symbols-outlined text-[32px] drop-shadow-lg" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span></button>
                            <span className="text-white text-[10px] font-black drop-shadow-md">{formatCount(likeCount)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white"><span className="material-symbols-outlined text-[32px] drop-shadow-lg">chat_bubble</span></button>
                            <span className="text-white text-[10px] font-black drop-shadow-md">{formatCount(commentCount)}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent('🚩 Watch this news: ' + window.location.origin + '/?videoId=' + video.id)}`, '_blank'); }} className="w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white"><span className="material-symbols-outlined text-[30px] drop-shadow-lg">share</span></button>
                        
                        {isAuthor && (
                            <button onClick={(e) => { e.stopPropagation(); setShowActionSheet(true); }} className="w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white"><span className="material-symbols-outlined text-[30px] drop-shadow-lg">more_horiz</span></button>
                        )}
                    </div>
                )}

                {!showComments && (
                    <div className={`absolute bottom-0 left-0 w-full px-5 pt-20 pb-[calc(52px+2rem+env(safe-area-inset-bottom))] z-10 ${isExpanded ? 'bg-black/60' : 'bg-gradient-to-t from-black/90 to-transparent'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <img onClick={(e) => { e.stopPropagation(); onNavigate(View.PublicProfile, { userId: video.authorId }); }} src={video.authorProfilePicUrl} className="w-10 h-10 rounded-full border-2 border-white shadow-lg cursor-pointer" alt="" />
                            <div className="flex items-center gap-2">
                                <p className="text-white font-black text-sm drop-shadow-md">@{video.authorName}</p>
                                {!isFollowing && currentUser?.uid !== video.authorId && <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(video.authorId, video.authorName, video.authorProfilePicUrl); }} className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded shadow-lg">Follow</button>}
                            </div>
                        </div>
                        <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                            <h3 className={`text-white font-bold text-sm leading-tight drop-shadow-md transition-all ${isExpanded ? '' : 'line-clamp-1'}`}>{video.title}</h3>
                            {isExpanded && video.description && <p className="text-white/80 text-xs mt-2 leading-relaxed animate-in fade-in duration-300">{video.description}</p>}
                        </div>
                    </div>
                )}
                
                <div 
                    ref={progressRef}
                    className="absolute left-0 w-full h-8 z-[170] flex items-center cursor-pointer group"
                    style={{ bottom: showComments ? '0' : 'calc(52px + env(safe-area-inset-bottom))' }}
                    onMouseDown={(e) => { setIsSeeking(true); handleSeek(e); }}
                    onMouseMove={(e) => { if (isSeeking) handleSeek(e); }}
                    onMouseUp={() => setIsSeeking(false)}
                    onTouchStart={(e) => { setIsSeeking(true); handleSeek(e); }}
                    onTouchMove={(e) => { if (isSeeking) handleSeek(e); }}
                    onTouchEnd={() => setIsSeeking(false)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-full h-1 bg-white/20 relative overflow-visible rounded-full mx-0">
                        <div className="h-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,1)] transition-all duration-100 ease-out" style={{ width: `${progress}%` }}>
                            <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full border border-white shadow-xl transition-transform ${isSeeking ? 'scale-125' : 'scale-0 group-hover:scale-100'}`}></div>
                        </div>
                    </div>
                </div>
            </div>

            {showComments && (
                <div className="flex-1 w-full bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[160] relative">
                    <CommentArea videoId={video.id} currentUser={currentUser} videoAuthorId={video.authorId} onClose={() => setShowComments(false)} onLogin={onLogin} />
                </div>
            )}

            {/* Author Action Sheet */}
            {showActionSheet && (
                <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setShowActionSheet(false)}>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom duration-400" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <h4 className="text-center font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2">Video Settings</h4>
                            <button 
                                onClick={() => onNavigate(View.CreateVideo, { videoId: video.id })}
                                className="w-full py-4 flex items-center justify-center gap-3 bg-blue-50 text-blue-700 rounded-2xl font-bold transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Edit Video Details
                            </button>
                            <button 
                                onClick={() => { setShowActionSheet(false); onDeleteVideo(video); }}
                                className="w-full py-4 flex items-center justify-center gap-3 bg-red-50 text-red-600 rounded-2xl font-bold transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">delete</span>
                                Delete Permanently
                            </button>
                            <button 
                                onClick={() => setShowActionSheet(false)}
                                className="w-full py-4 text-gray-500 font-bold transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CommentArea: React.FC<{ videoId: string; currentUser: User | null; videoAuthorId: string; onClose: () => void; onLogin: () => void }> = ({ videoId, currentUser, videoAuthorId, onClose, onLogin }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const unsub = db.collection('videos').doc(videoId).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snap => {
            setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() } as Comment)));
        });
        return () => unsub();
    }, [videoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) { onLogin(); return; }
        if (!newComment.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await db.collection('videos').doc(videoId).collection('comments').add({
                content: newComment.trim(),
                authorId: currentUser.uid,
                authorName: currentUser.name,
                authorProfilePicUrl: currentUser.profilePicUrl,
                createdAt: serverTimestamp()
            });
            setNewComment('');
            showToast("Comment posted", "success");
        } catch (e) { showToast("Error", "error"); } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            await db.collection('videos').doc(videoId).collection('comments').doc(id).delete();
            showToast("Comment deleted", "success");
        } catch (e) { showToast("Failed to delete", "error"); }
    };

    return (
        <>
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-black text-lg text-gray-900">Comments <span className="text-gray-400 font-bold ml-1">{formatCount(comments.length)}</span></h3>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:rotate-90 transition-transform"><span className="material-symbols-outlined text-gray-600">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-32">
                {comments.length === 0 ? <div className="text-center py-20 text-gray-400 font-bold italic">No comments yet. Be the first!</div> : (
                    comments.map(c => <VideoCommentItem key={c.id} comment={c} videoId={videoId} currentUser={currentUser} videoAuthorId={videoAuthorId} isAdmin={currentUser?.role === 'admin'} onViewUser={id => {}} onDelete={handleDelete} onLogin={onLogin} showToast={showToast} />)
                )}
            </div>
            <div className="p-4 border-t bg-white absolute bottom-0 left-0 w-full shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[calc(52px+1rem+env(safe-area-inset-bottom))]">
                {currentUser ? (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-gray-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium" />
                        <button type="submit" disabled={!newComment.trim() || isSubmitting} className="bg-red-600 text-white px-8 py-2 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-red-100">Send</button>
                    </form>
                ) : <button onClick={onLogin} className="w-full py-4 text-red-600 font-black text-xs uppercase tracking-widest bg-red-50 rounded-2xl">Login to comment</button>}
            </div>
        </>
    );
};

export default VideosPage;
