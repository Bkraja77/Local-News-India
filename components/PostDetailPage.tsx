
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, User, View, Comment } from '../types';
import Header from './Header';
import { db, serverTimestamp, increment, storage } from '../firebaseConfig';
import ReportModal from './ReportModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import AdBanner from './AdBanner';
import { languages } from '../utils/translations';
import { GoogleGenAI, Modality } from "@google/genai";
import SEO from './SEO';
import { formatCount } from '../utils/formatters';

interface PostDetailPageProps {
    postId: string;
    currentUser: User | null;
    onBack: () => void;
    onLogin: () => void;
    onNavigate: (view: View) => void;
    onViewUser: (userId: string) => void;
    onViewPost: (postId: string) => void;
    onEditPost: (postId: string) => void;
    focusComment?: boolean;
}

interface Reply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorProfilePicUrl: string;
    createdAt: Date;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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

const ImageLightbox: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [lastTap, setLastTap] = useState(0);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPosition = useRef({ x: 0, y: 0 });
    const pinchStartDistance = useRef<number | null>(null);
    const initialScale = useRef<number>(1);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            initialPosition.current = { ...position };
        } else if (e.touches.length === 2) {
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            pinchStartDistance.current = distance;
            initialScale.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && scale > 1) {
            const dx = e.touches[0].clientX - dragStart.current.x;
            const dy = e.touches[0].clientY - dragStart.current.y;
            setPosition({
                x: initialPosition.current.x + dx,
                y: initialPosition.current.y + dy
            });
        } else if (e.touches.length === 2 && pinchStartDistance.current !== null) {
            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const ratio = currentDistance / pinchStartDistance.current;
            const newScale = Math.min(Math.max(initialScale.current * ratio, 1), 5);
            setScale(newScale);
            if (newScale === 1) setPosition({ x: 0, y: 0 });
        }
    };

    const handleTouchEnd = () => { pinchStartDistance.current = null; };

    const handleDoubleTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - lastTap < 300) {
            if (scale > 1) { setScale(1); setPosition({ x: 0, y: 0 }); } else { setScale(2.5); }
        }
        setLastTap(now);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300 overflow-hidden touch-none" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 active:scale-90 text-white rounded-full transition-all z-[120]"><span className="material-symbols-outlined text-3xl">close</span></button>
            <div className="w-full h-full flex items-center justify-center pointer-events-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <div className="will-change-transform flex items-center justify-center pointer-events-auto" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: pinchStartDistance.current ? 'none' : 'transform 0.1s ease-out' }}>
                    <img src={imageUrl} alt="Fullscreen view" className="max-w-[95vw] max-h-[90vh] object-contain shadow-2xl" onClick={handleDoubleTap} onDragStart={(e) => e.preventDefault()} />
                </div>
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/10 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl z-[110]" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setScale(prev => Math.max(prev - 0.5, 1))} className="text-white hover:text-blue-400 active:scale-75 transition-all" disabled={scale <= 1}><span className="material-symbols-outlined text-3xl">zoom_out</span></button>
                <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="text-white hover:text-blue-400 active:rotate-180 transition-all"><span className="material-symbols-outlined text-2xl">restart_alt</span></button>
                <button onClick={() => setScale(prev => Math.min(prev + 0.5, 5))} className="text-white hover:text-blue-400 active:scale-75 transition-all" disabled={scale >= 5}><span className="material-symbols-outlined text-3xl">zoom_in</span></button>
            </div>
        </div>
    );
};

const ReplyItem: React.FC<{ reply: Reply; postId: string; commentId: string; currentUser: User | null; isPostAuthor: boolean; isAdmin: boolean; onViewUser: (id: string) => void; showToast: (msg: string, type?: 'success' | 'error' | 'info') => void; }> = ({ reply, postId, commentId, currentUser, isPostAuthor, isAdmin, onViewUser, showToast }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isCurrentUserReply = currentUser && currentUser.uid === reply.authorId;
    const saveEdit = async () => {
        if (!editText.trim()) return;
        setIsSavingEdit(true);
        try { await db.collection('posts').doc(postId).collection('comments').doc(commentId).collection('replies').doc(reply.id).update({ content: editText.trim() }); setIsEditing(false); showToast("Reply updated", "success"); } catch (error) { showToast("Failed to update reply", "error"); }
        finally { setIsSavingEdit(false); }
    };
    const handleDeleteReply = async () => { if(!currentUser) return; if(window.confirm("Delete this reply?")) { try { await db.collection('posts').doc(postId).collection('comments').doc(commentId).collection('replies').doc(reply.id).delete(); showToast("Reply deleted.", "success"); } catch (error) { showToast("Could not delete", "error"); } } };

    return (
        <div className="flex gap-3 group/reply animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-200 rounded-full mb-1"></div>
                <img src={reply.authorProfilePicUrl} className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => onViewUser(reply.authorId)} alt="" />
            </div>
            <div className={`flex-grow border transition-all rounded-2xl rounded-tl-none p-3 shadow-sm relative ${isEditing ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onViewUser(reply.authorId)}>{reply.authorName}</span>
                        {isPostAuthor && <span className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-100">Author</span>}
                        <span className="text-[10px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                    </div>
                    {!isEditing && (isAdmin || isCurrentUserReply) && (
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-300 hover:text-gray-600 active:scale-90 transition-all"><span className="material-symbols-outlined text-base">more_horiz</span></button>
                            {showMenu && <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-xl border z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100"><button onClick={() => { setIsEditing(true); setEditText(reply.content); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors">Edit</button><button onClick={handleDeleteReply} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">Delete</button></div>}
                        </div>
                    )}
                </div>
                {isEditing ? (
                    <div className="mt-2"><textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" autoFocus /><div className="flex justify-end gap-2 mt-2"><button onClick={() => setIsEditing(false)} className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button><button onClick={saveEdit} className="px-2 py-1 text-xs text-white bg-blue-600 rounded-lg disabled:opacity-50 hover:bg-blue-700" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save'}</button></div></div>
                ) : <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>}
            </div>
        </div>
    );
};

const CommentItem: React.FC<{ comment: Comment; postId: string; currentUser: User | null; postAuthorId: string; isAdmin: boolean; onViewUser: (id: string) => void; onDelete: (id: string) => void; onLogin: () => void; showToast: (msg: string, type?: 'success' | 'error' | 'info') => void; }> = ({ comment, postId, currentUser, postAuthorId, isAdmin, onViewUser, onDelete, onLogin, showToast }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [serverReplies, setServerReplies] = useState<Reply[]>([]);
    const [localReplies, setLocalReplies] = useState<Reply[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const displayReplies = useMemo(() => {
        const combined = [...serverReplies, ...localReplies];
        const uniqueIds = new Set();
        return combined.filter(item => { if (!uniqueIds.has(item.id)) { uniqueIds.add(item.id); return true; } return false; }).sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    }, [serverReplies, localReplies]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!comment.id || !postId) return;
        const unsubLikes = db.collection('posts').doc(postId).collection('comments').doc(comment.id).collection('likes').onSnapshot(snapshot => { setLikeCount(snapshot.size); if (currentUser) setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid)); });
        const unsubReplies = db.collection('posts').doc(postId).collection('comments').doc(comment.id).collection('replies').onSnapshot(snapshot => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() } as Reply));
            setServerReplies(fetched);
            setLocalReplies(prev => prev.filter(l => !fetched.some(s => s.authorId === l.authorId && s.content === l.content)));
        });
        return () => { unsubLikes(); unsubReplies(); };
    }, [postId, comment.id, currentUser]);

    const handleLike = async () => {
        if (!currentUser) { onLogin(); return; }
        const prevLiked = isLiked; setIsLiked(!prevLiked); setLikeCount(p => prevLiked ? p - 1 : p + 1);
        try { const ref = db.collection('posts').doc(postId).collection('comments').doc(comment.id).collection('likes').doc(currentUser.uid); if (prevLiked) await ref.delete(); else await ref.set({ likedAt: serverTimestamp(), userId: currentUser.uid }); } catch (e) { setIsLiked(prevLiked); setLikeCount(p => prevLiked ? p + 1 : p - 1); showToast("Action failed", "error"); }
    };

    const handleReplySubmit = async () => {
        if (!replyText.trim() || !currentUser) return;
        setIsSubmittingReply(true);
        const tempId = 'local-' + Date.now();
        const newReply: Reply = { id: tempId, content: replyText.trim(), authorId: currentUser.uid, authorName: currentUser.name, authorProfilePicUrl: currentUser.profilePicUrl || '', createdAt: new Date() };
        setLocalReplies(prev => [...prev, newReply]);
        const textToSubmit = replyText.trim(); setIsReplying(false); setReplyText('');
        try {
            await db.collection('posts').doc(postId).collection('comments').doc(comment.id).collection('replies').add({ content: textToSubmit, authorId: currentUser.uid, authorName: currentUser.name, authorProfilePicUrl: currentUser.profilePicUrl, createdAt: serverTimestamp() });
            if (currentUser.uid !== comment.authorId) { await db.collection('users').doc(comment.authorId).collection('notifications').doc().set({ type: 'new_comment', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, postId, postTitle: `your comment: "${comment.content.substring(0, 20)}..."`, createdAt: serverTimestamp(), read: false }); }
        } catch (e) { setLocalReplies(p => p.filter(r => r.id !== tempId)); showToast("Failed to reply", "error"); }
        finally { setIsSubmittingReply(false); }
    };

    const saveEdit = async () => { if (!editText.trim()) return; setIsSavingEdit(true); try { await db.collection('posts').doc(postId).collection('comments').doc(comment.id).update({ content: editText.trim() }); setIsEditing(false); showToast("Comment updated", "success"); } catch (e) { showToast("Failed to update", "error"); } finally { setIsSavingEdit(false); } };

    return (
        <div className="flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col items-center h-full relative">
                <img src={comment.authorProfilePicUrl} alt="" className="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-white shadow-sm flex-shrink-0 z-10 hover:scale-105 transition-transform" onClick={() => onViewUser(comment.authorId)} />
                {displayReplies.length > 0 && <div className="absolute top-10 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-100 rounded-full"></div>}
            </div>
            <div className="flex-grow min-w-0">
                <div className={`rounded-2xl rounded-tl-none p-4 relative border transition-all ${isEditing ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-100 group-hover:bg-slate-100/80 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onViewUser(comment.authorId)}>{comment.authorName}</p>
                            {postAuthorId === comment.authorId && <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">Post Author</span>}
                            <span className="text-[10px] text-gray-400 font-medium">{timeAgo(comment.createdAt)}</span>
                        </div>
                        {!isEditing && (isAdmin || currentUser?.uid === comment.authorId) && (
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 text-gray-400 hover:text-gray-700 active:scale-90 transition-all"><span className="material-symbols-outlined text-lg">more_horiz</span></button>
                                {showMenu && <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100"><button onClick={() => { setIsEditing(true); setEditText(comment.content); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"><span className="material-symbols-outlined text-base">edit</span> Edit</button><button onClick={() => onDelete(comment.id)} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"><span className="material-symbols-outlined text-base">delete</span> Delete</button></div>}
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="mt-2"><textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-3 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" autoFocus /><div className="flex justify-end gap-2 mt-3"><button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button><button onClick={saveEdit} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl disabled:opacity-50 hover:bg-blue-700 shadow-md" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</button></div></div>
                    ) : <p className="text-gray-800 text-sm leading-relaxed break-words whitespace-pre-wrap">{comment.content}</p>}
                </div>
                <div className="flex items-center gap-6 mt-2.5 ml-1">
                    <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}><span className="material-symbols-outlined text-[18px] transition-all" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span>{likeCount > 0 ? formatCount(likeCount) : 'Like'}</button>
                    {currentUser && !isReplying && !isEditing && <button onClick={() => setIsReplying(true)} className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition-all active:scale-90"><span className="material-symbols-outlined text-[18px]">reply</span>Reply</button>}
                </div>
                {isReplying && (
                    <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <img src={currentUser?.profilePicUrl} className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white shadow-sm" alt="" />
                        <div className="flex-grow">
                            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Reply to ${comment.authorName}...`} className="w-full p-3 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white shadow-inner" rows={2} autoFocus />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => { setIsReplying(false); setReplyText(''); }} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleReplySubmit} disabled={isSubmittingReply || !replyText.trim()} className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 shadow-lg shadow-blue-200 transition-all active:scale-95">{isSubmittingReply ? 'Sending...' : 'Post Reply'}</button>
                            </div>
                        </div>
                    </div>
                )}
                {displayReplies.length > 0 && <div className="mt-4 flex flex-col gap-4">{displayReplies.map(reply => <ReplyItem key={reply.id} reply={reply} postId={postId} commentId={comment.id} currentUser={currentUser} isPostAuthor={postAuthorId === reply.authorId} isAdmin={isAdmin} onViewUser={onViewUser} showToast={showToast} />)}</div>}
            </div>
        </div>
    );
};

const PostDetailPage: React.FC<PostDetailPageProps> = ({ postId, currentUser, onBack, onLogin, onNavigate, onViewUser, onViewPost, onEditPost, focusComment }) => {
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleteCommentModalOpen, setIsDeleteCommentModalOpen] = useState(false);
    const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
    const [translatedData, setTranslatedData] = useState<{ title: string; content: string } | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslateMenu, setShowTranslateMenu] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [showImageLightbox, setShowImageLightbox] = useState(false);
    
    const commentSectionRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const lastIncrementedPostId = useRef<string | null>(null);
    const hasAutoPlayed = useRef<boolean>(false);
    const isMounted = useRef<boolean>(true);

    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => { if (postId && lastIncrementedPostId.current !== postId) { lastIncrementedPostId.current = postId; db.collection('posts').doc(postId).update({ viewCount: increment(1) }).catch(console.warn); } }, [postId]);

    const stopAudio = () => { if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch(e) {} audioSourceRef.current = null; } if (audioContextRef.current) { try { if (audioContextRef.current.state !== 'closed') audioContextRef.current.close(); } catch(e) {} audioContextRef.current = null; } setIsPlayingAudio(false); };

    // Support global media interruption
    useEffect(() => {
        const handleStopAudio = () => stopAudio();
        window.addEventListener('stop-app-audio', handleStopAudio);
        return () => window.removeEventListener('stop-app-audio', handleStopAudio);
    }, []);

    useEffect(() => {
        isMounted.current = true; setLoading(true); setError(null); hasAutoPlayed.current = false;
        const postRef = db.collection('posts').doc(postId);
        const unsubPost = postRef.onSnapshot(docSnap => { if (docSnap.exists) { const data = docSnap.data(); setPost({ id: docSnap.id, ...data, category: data.category || 'General', createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null } as Post); } else setError("Post not found."); setLoading(false); }, () => { setError("Failed to load post."); setLoading(false); });
        const unsubComments = db.collection('posts').doc(postId).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snapshot => { setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() } as Comment))); });
        const unsubLikes = db.collection('posts').doc(postId).collection('likes').onSnapshot(snapshot => { setLikeCount(snapshot.size); if (currentUser) setIsLiked(snapshot.docs.some(doc => doc.id === currentUser.uid)); });
        return () => { isMounted.current = false; unsubPost(); unsubComments(); unsubLikes(); stopAudio(); };
    }, [postId, currentUser?.uid]);

    useEffect(() => {
        if (!post) return;
        db.collection('posts').where('category', '==', post.category).limit(5).get().then(snapshot => { if (!isMounted.current) return; const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null } as Post)).filter(p => p.id !== post.id); setRelatedPosts(list.slice(0, 3)); });
        if (currentUser && post.authorId !== currentUser.uid) { db.collection('users').doc(currentUser.uid).collection('following').doc(post.authorId).onSnapshot(doc => { if (isMounted.current) setIsFollowing(doc.exists); }); }
    }, [post, currentUser]);

    useEffect(() => { if (focusComment && !loading && post) { setTimeout(() => { if (isMounted.current) { commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); commentInputRef.current?.focus({ preventScroll: true }); } }, 600); } }, [focusComment, loading, post]);

    const handleReadAloud = async (isAutoStart: boolean = false) => {
        if (!isAutoStart && isPlayingAudio) { stopAudio(); return; }
        if (!post || isGeneratingAudio) return;
        
        stopAudio(); 
        setIsGeneratingAudio(true);
        
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = ctx;
            if (ctx.state === 'suspended') await ctx.resume();

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const titleToRead = (translatedData ? translatedData.title : post.title).replace(/<[^>]+>/g, ' ');
            const contentToRead = (translatedData ? translatedData.content : post.content)
                .replace(/<[^>]+>/g, ' ')
                .replace(/[*#_\[\]]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            const textToRead = `${titleToRead}. ${contentToRead.substring(0, 1500)}`;
            
            const response = await ai.models.generateContent({ 
                model: "gemini-2.5-flash-preview-tts", 
                contents: [{ parts: [{ text: textToRead }] }], 
                config: { 
                    responseModalities: [Modality.AUDIO], 
                    speechConfig: { 
                        voiceConfig: { 
                            prebuiltVoiceConfig: { voiceName: 'Kore' } 
                        } 
                    } 
                }, 
            });

            if (!isMounted.current) return;
            const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (base64) {
                const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1); 
                const source = ctx.createBufferSource(); 
                source.buffer = buffer; 
                source.connect(ctx.destination); 
                source.onended = () => { if (isMounted.current) setIsPlayingAudio(false); }; 
                source.start(); 
                audioSourceRef.current = source; 
                setIsPlayingAudio(true);
            } else throw new Error("No audio data received");
        } catch (e) { 
            console.error("Audio failed", e); 
            if (!isAutoStart && isMounted.current) showToast("Voice playback failed.", "error"); 
        } finally { 
            if (isMounted.current) setIsGeneratingAudio(false); 
        }
    };

    useEffect(() => { 
        if (!loading && post && !hasAutoPlayed.current) { 
            hasAutoPlayed.current = true; 
            const timer = setTimeout(() => { if (isMounted.current) handleReadAloud(true); }, 300); 
            return () => clearTimeout(timer); 
        } 
    }, [loading, post]);

    const handleShare = () => {
        if (!post) return;
        const siteUrl = window.location.origin;
        const shareUrl = `${siteUrl}/?postId=${post.id}`;
        const loginUrl = `${siteUrl}/?page=login`;
        
        const plainContent = post.content ? post.content.replace(/<[^>]*>?/gm, '') : '';
        const shareText = `🚩 *${post.title}*\n\n${plainContent.substring(0, 100).trim()}...\n\n👉 *पूरी खबर यहाँ पढ़ें:* ${shareUrl}\n\n📝 *नोट:* क्या आप ब्लॉक में छोटे न्यूज़ रिपोर्टर है, आपके पास वेबसाइट नहीं है? चिंता न करें! *Public Tak* में अभी अपना Account बनाये।\n\n*"आपकी खबर, आपकी पहचान – Public Tak News App"*\n\n📲 *अभी जुड़ें:* ${loginUrl}`;

        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        db.collection('posts').doc(post.id).update({ shareCount: increment(1) }).catch(console.warn);
    };

    const handleLike = async () => {
        if (!currentUser || !post) { onLogin(); return; }
        const prevLiked = isLiked; setIsLiked(!prevLiked); setLikeCount(prev => prevLiked ? prev - 1 : prev + 1);
        const ref = db.collection('posts').doc(postId).collection('likes').doc(currentUser.uid);
        try {
            if (prevLiked) await ref.delete();
            else { const batch = db.batch(); batch.set(ref, { likedAt: serverTimestamp(), userId: currentUser.uid }); if (currentUser.uid !== post.authorId) { const notifRef = db.collection('users').doc(post.authorId).collection('notifications').doc(); batch.set(notifRef, { type: 'new_like', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, postId, postTitle: post.title, createdAt: serverTimestamp(), read: false }); } await batch.commit(); }
        } catch (e) { setIsLiked(prevLiked); setLikeCount(prev => prev + 1); showToast("Action failed", "error"); }
    };

    const handleFollowToggle = async () => {
        if (!currentUser || !post) { onLogin(); return; }
        const followRef = db.collection('users').doc(currentUser.uid).collection('following').doc(post.authorId);
        const followerRef = db.collection('users').doc(post.authorId).collection('followers').doc(currentUser.uid);
        const batch = db.batch();
        if (isFollowing) { batch.delete(followRef); batch.delete(followerRef); }
        else { batch.set(followRef, { followedAt: serverTimestamp() }); batch.set(followerRef, { followedAt: serverTimestamp() }); const notifRef = db.collection('users').doc(post.authorId).collection('notifications').doc(); batch.set(notifRef, { type: 'new_follower', fromUserId: currentUser.uid, fromUserName: currentUser.name, fromUserProfilePicUrl: currentUser.profilePicUrl, createdAt: serverTimestamp(), read: false }); }
        await batch.commit();
    };

    const handleTranslate = async (code: string, name: string) => {
        if (!post) return; setIsTranslating(true); setShowTranslateMenu(false); stopAudio();
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Translate news to ${name}. JSON format {"title", "content"}. \n\nTitle: ${post.title}\nContent: ${post.content}`, config: { responseMimeType: "application/json" } });
            if (!isMounted.current) return; const result = JSON.parse(response.text); setTranslatedData(result); setTimeout(() => { if (isMounted.current) handleReadAloud(true); }, 500);
        } catch (e) { if (isMounted.current) showToast("Translation failed", "error"); } finally { if (isMounted.current) setIsTranslating(false); }
    };

    if (loading) return <div className="h-screen bg-white animate-pulse" />;
    if (error || !post) return <div className="h-screen flex items-center justify-center text-red-500">{error || "Not found"}</div>;

    const authorName = currentUser?.uid === post.authorId ? currentUser.name : post.authorName;
    const authorPic = currentUser?.uid === post.authorId ? currentUser.profilePicUrl : post.authorProfilePicUrl;

    return (
        <div className="flex flex-col h-full bg-white">
            <SEO 
                title={translatedData ? translatedData.title : post.title} 
                description={translatedData ? translatedData.content : post.content} 
                image={post.thumbnailUrl} 
                url={`https://www.publictak.app/?postId=${post.id}`} 
                type="article"
                author={authorName}
                publishedAt={post.createdAt ? post.createdAt.toISOString() : undefined}
            />
            <Header title={t('post')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-20 md:pb-10">
                <div className="w-full max-w-7xl mx-auto md:px-4 py-0 md:py-6">
                    <div className="glass-card mb-8 overflow-hidden rounded-none md:rounded-2xl border-x-0 md:border border-gray-100 bg-white shadow-sm">
                        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <img onClick={() => onViewUser(post.authorId)} src={authorPic} className="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-gray-100" alt="" />
                            <div className="flex-grow"><p onClick={() => onViewUser(post.authorId)} className="font-bold text-gray-800 cursor-pointer">{authorName}</p><p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p></div>
                            {(!currentUser || currentUser.uid !== post.authorId) && (
                                <button 
                                    onClick={handleFollowToggle} 
                                    className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-300 shadow-sm active:scale-95 ${
                                        isFollowing 
                                        ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                                        : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-200 hover:shadow-lg'
                                    }`}
                                >
                                    {isFollowing ? (
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px] font-bold">done</span>
                                            {t('following')}
                                        </div>
                                    ) : t('follow')}
                                </button>
                            )}
                        </div>
                        {post.thumbnailUrl && (
                            <div className="relative group bg-gray-50 flex justify-center border-b border-gray-100">
                                <img 
                                    src={post.thumbnailUrl} 
                                    className="w-full h-auto max-h-[550px] object-contain cursor-zoom-in transition-all" 
                                    onClick={() => setShowImageLightbox(true)} 
                                    alt={post.title} 
                                />
                                <button onClick={() => setShowImageLightbox(true)} className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                    <span className="material-symbols-outlined">fullscreen</span>
                                </button>
                            </div>
                        )}
                        <div className="p-5 md:p-10">
                            <div className="flex items-center gap-3 mb-4 text-sm">
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold uppercase text-xs">{post.category}</span>
                                <span className="text-gray-500 flex items-center gap-1 font-medium"><span className="material-symbols-outlined text-[16px]">calendar_today</span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
                                <button onClick={() => setShowTranslateMenu(!showTranslateMenu)} className="p-1.5 text-gray-500 hover:text-blue-600" title="Translate News"><span className="material-symbols-outlined text-lg">g_translate</span></button>
                                <button onClick={() => handleReadAloud(false)} disabled={isGeneratingAudio} className={`p-1.5 transition-colors ${isPlayingAudio ? 'text-red-600' : 'text-gray-500 hover:text-blue-600'}`} title={isPlayingAudio ? "Stop Reading" : "Read News Aloud"}>{isGeneratingAudio ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">{isPlayingAudio ? 'stop_circle' : 'volume_up'}</span>}</button>
                                {showTranslateMenu && <div className="absolute left-4 top-12 w-48 bg-white shadow-2xl rounded-xl z-50 border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">{languages.slice(0, 8).map(l => <button key={l.code} onClick={() => handleTranslate(l.code, l.name)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">{l.nativeName}</button>)}</div>}
                            </div>
                            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">{translatedData ? translatedData.title : post.title}</h1>
                            <div className="prose prose-lg max-w-none text-gray-700 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: translatedData ? translatedData.content : post.content }} />
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t flex justify-between items-center text-gray-500">
                            <div className="flex gap-4 md:gap-8">
                                <div className="flex items-center gap-1.5 px-1 py-1"><span className="material-symbols-outlined text-[20px]">visibility</span> <span className="text-xs font-bold">{formatCount(post.viewCount)}</span></div>
                                <button onClick={handleLike} className={`flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-red-100 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: `'FILL' ${isLiked ? 1 : 0}` }}>favorite</span> <span className="text-xs font-bold">{formatCount(likeCount)}</span></button>
                                <button onClick={() => commentSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">chat_bubble</span> <span className="text-xs font-bold">{formatCount(comments.length)}</span></button>
                                <button onClick={handleShare} className="text-green-600 flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-green-100 transition-colors"><i className="fa-brands fa-whatsapp text-lg" /> <span className="text-xs font-bold">{formatCount(post.shareCount)}</span></button>
                            </div>
                            <div className="relative"><button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><span className="material-symbols-outlined">more_vert</span></button>{isMenuOpen && <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border overflow-hidden z-20">{(currentUser?.uid === post.authorId || currentUser?.role === 'admin') && <button onClick={() => onEditPost(post.id)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"><span className="material-symbols-outlined text-lg">edit</span> Edit</button>}<button onClick={() => showToast("Report function active", "info")} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><span className="material-symbols-outlined text-lg">flag</span> Report</button></div>}</div>
                        </div>
                    </div>
                    <AdBanner slotType="post" className="mb-8" />
                    {relatedPosts.length > 0 && <div className="mb-12 px-4 md:px-0"><h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2"><span className="w-1 h-8 bg-red-600 rounded-full"></span>Related News</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{relatedPosts.map(rp => <div key={rp.id} onClick={() => onViewPost(rp.id)} className="glass-card overflow-hidden cursor-pointer group hover:shadow-lg transition-all border border-gray-100 bg-white flex flex-col"><div className="w-full h-48 overflow-hidden relative bg-gray-50 flex items-center justify-center"><img src={rp.thumbnailUrl} alt={rp.title} className="w-full h-full object-contain transition-all" /></div><div className="p-4 flex-grow flex flex-col"><div className="flex items-center gap-2 mb-2"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded tracking-wider">{rp.category}</span><span className="text-xs text-gray-400">• {timeAgo(rp.createdAt)}</span></div><h3 className="font-bold text-lg text-gray-800 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors mb-2">{rp.title}</h3><div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500"><span>By {rp.authorName}</span><div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> {formatCount(rp.viewCount)}</div></div></div></div>)}</div></div>}
                    
                    <div ref={commentSectionRef} className="mt-8 px-4 md:px-0">
                        <div className="glass-card p-6 md:p-8 bg-white border border-gray-100 shadow-md">
                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-gray-900">
                                <span className="material-symbols-outlined text-blue-600 text-3xl">forum</span> 
                                Comments 
                                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm font-bold">{formatCount(comments.length)}</span>
                            </h2>
                            
                            {currentUser ? (
                                <form onSubmit={async (e) => { 
                                    e.preventDefault(); 
                                    if (!newComment.trim()) return; 
                                    setIsSubmittingComment(true); 
                                    try { 
                                        await db.collection('posts').doc(postId).collection('comments').add({ 
                                            content: newComment.trim(), 
                                            authorId: currentUser.uid, 
                                            authorName: currentUser.name, 
                                            authorProfilePicUrl: currentUser.profilePicUrl, 
                                            createdAt: serverTimestamp() 
                                        }); 
                                        setNewComment(''); 
                                        showToast("Comment posted!", "success");
                                    } catch (e) { 
                                        showToast("Failed to post comment", "error"); 
                                    } finally { 
                                        setIsSubmittingComment(false); 
                                    } 
                                }} className="mb-12 flex gap-4 bg-gray-50 p-4 md:p-6 rounded-3xl border border-gray-100">
                                    <img src={currentUser.profilePicUrl} className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-white shadow-sm" alt="" />
                                    <div className="flex-grow flex flex-col gap-3">
                                        <textarea 
                                            ref={commentInputRef} 
                                            value={newComment} 
                                            onChange={e => setNewComment(e.target.value)} 
                                            placeholder="Write a thoughtful comment..." 
                                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-white text-gray-800 placeholder-gray-400" 
                                            rows={3} 
                                        />
                                        <div className="flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmittingComment || !newComment.trim()} 
                                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black disabled:opacity-50 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                {isSubmittingComment ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl">send</span>}
                                                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="mb-12 p-8 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                                    <p className="text-blue-800 font-bold mb-4">Sign in to join the conversation</p>
                                    <button onClick={onLogin} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 active:scale-95 transition-all">Login / Sign Up</button>
                                </div>
                            )}

                            <div className="space-y-10">
                                {comments.length > 0 ? (
                                    comments.map(c => (
                                        <CommentItem 
                                            key={c.id} 
                                            comment={c} 
                                            postId={postId} 
                                            currentUser={currentUser} 
                                            postAuthorId={post.authorId} 
                                            isAdmin={currentUser?.role === 'admin'} 
                                            onViewUser={onViewUser} 
                                            onDelete={id => { setCommentToDeleteId(id); setIsDeleteCommentModalOpen(true); }} 
                                            onLogin={onLogin} 
                                            showToast={showToast} 
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <span className="material-symbols-outlined text-5xl text-gray-200 mb-2">comments_disabled</span>
                                        <p className="text-gray-400 font-medium italic">No comments yet. Be the first to share your thoughts!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {showImageLightbox && <ImageLightbox imageUrl={post.thumbnailUrl} onClose={() => setShowImageLightbox(false)} />}
            <ConfirmationModal isOpen={isDeleteCommentModalOpen} onClose={() => setIsDeleteCommentModalOpen(false)} onConfirm={async () => { if (commentToDeleteId) { await db.collection('posts').doc(postId).collection('comments').doc(commentToDeleteId).delete(); setCommentToDeleteId(null); setIsDeleteCommentModalOpen(false); showToast("Comment deleted", "success"); } }} title="Delete Comment" message="Are you sure you want to permanently delete this comment?" />
        </div>
    );
};

export default PostDetailPage;
