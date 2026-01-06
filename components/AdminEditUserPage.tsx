
import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import Header from './Header';
import { db, storage } from '../firebaseConfig';
import ConfirmationModal from './ConfirmationModal';
import { formatCount } from '../utils/formatters';

interface AdminEditUserPageProps {
  userId: string;
  onBack: () => void;
  onEditPost: (postId: string) => void;
  onViewPost: (postId: string) => void;
}

const SkeletonEditUser = () => (
    <div className="w-full glass-card p-6 space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><div className="h-4 w-20 bg-gray-200 rounded mb-1"></div><div className="h-10 w-full bg-gray-200 rounded"></div></div>
            <div><div className="h-4 w-20 bg-gray-200 rounded mb-1"></div><div className="h-10 w-full bg-gray-200 rounded"></div></div>
        </div>
        <div><div className="h-4 w-20 bg-gray-200 rounded mb-1"></div><div className="h-20 w-full bg-gray-200 rounded"></div></div>
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
    </div>
);

const AdminEditUserPage: React.FC<AdminEditUserPageProps> = ({ userId, onBack, onEditPost, onViewPost }) => {
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: string; thumbnailUrl: string } | null>(null);

    useEffect(() => {
        setLoading(true);
        const userDocRef = db.collection('users').doc(userId);
        const unsubscribeUser = userDocRef.onSnapshot((doc) => {
            if (doc.exists) {
                const userData = { uid: doc.id, ...doc.data() } as User;
                setProfileUser(userData);
                setName(userData.name);
                setUsername(userData.username);
                setBio(userData.bio);
            } else {
                setError("User not found.");
            }
            setLoading(false);
        }, (err) => {
            setError("Failed to load user data.");
            setLoading(false);
        });

        const postsQuery = db.collection('posts').where('authorId', '==', userId).orderBy('createdAt', 'desc');
        const unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
            const userPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || null,
            } as Post));
            setPosts(userPosts);
        }, (err) => {
            console.error("Failed to load posts:", err);
        });

        return () => {
            unsubscribeUser();
            unsubscribePosts();
        };
    }, [userId]);

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileUser) return;
        setIsSaving(true);
        try {
            const userDocRef = db.collection('users').doc(profileUser.uid);
            await userDocRef.update({ name, username, bio });
            alert("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const openDeleteModal = (postId: string, thumbnailUrl: string) => {
        setPostToDelete({ id: postId, thumbnailUrl });
        setIsDeleteModalOpen(true);
    };
    
    const handleDeletePost = async () => {
        if (!postToDelete) return;
        try {
            // 1. Delete Firestore Document (Priority)
            await db.collection("posts").doc(postToDelete.id).delete();
            
            // 2. Best effort storage delete
            if (postToDelete.thumbnailUrl && postToDelete.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRef = storage.refFromURL(postToDelete.thumbnailUrl);
                    await storageRef.delete();
                } catch (storageErr) {
                    console.warn("Post deleted, but thumbnail cleanup failed:", storageErr);
                }
            }
        } catch (error: any) {
            console.error("Error deleting post:", error);
            alert(`Failed to delete post: ${error.message || "Unknown error"}`);
        } finally {
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Edit User" showBackButton onBack={onBack} />
                <main className="flex-grow p-5 md:p-10">
                    <SkeletonEditUser />
                </main>
            </div>
        );
    }

    if (error) {
        return <div className="flex flex-col h-full"><Header title="Error" showBackButton onBack={onBack} /><main className="flex-grow flex items-center justify-center"><p className="text-red-500">{error}</p></main></div>;
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title={`Edit: ${profileUser?.name}`} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10 pb-20">
                <div className="w-full space-y-8">
                    <form onSubmit={handleProfileSave} className="glass-card p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">User Profile</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 resize-y focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <button type="submit" disabled={isSaving} className="px-5 py-2 gradient-button text-white font-semibold rounded-lg shadow-md disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>

                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">User Posts ({posts.length})</h2>
                        <div className="space-y-4">
                            {posts.length > 0 ? posts.map(post => (
                                <div key={post.id} className="glass-card p-4 flex items-start gap-4">
                                    <div onClick={() => onViewPost(post.id)} className="flex-grow flex items-start gap-4 cursor-pointer">
                                        {post.thumbnailUrl && <img src={post.thumbnailUrl} alt={post.title} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />}
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-red-600 line-clamp-2">{post.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Published: {post.createdAt ? post.createdAt.toLocaleDateString() : 'N/A'}
                                            </p>
                                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                                <span className="material-symbols-outlined text-base">visibility</span>
                                                <span>{formatCount(post.viewCount || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => onEditPost(post.id)} className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button onClick={() => openDeleteModal(post.id, post.thumbnailUrl)} className="p-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 glass-card">
                                    <p className="text-gray-600">This user has not created any posts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeletePost}
                title="Confirm Post Deletion"
                message="Are you sure you want to permanently delete this post? This action cannot be undone."
                confirmButtonText="Delete Post"
            />
        </div>
    );
};

export default AdminEditUserPage;
