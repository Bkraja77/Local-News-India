import React, { useState, useEffect, useCallback } from 'react';
import { User, View, Post } from '../types';
import Header from './Header';
import { auth, db, storage } from '../firebaseConfig';
import ConfirmationModal from './ConfirmationModal';

interface UserPageProps {
  onBack: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  onEditPost: (postId: string) => void;
  onViewPost: (postId: string) => void;
}

const StatBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="text-center">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
    </div>
);

const UserPage: React.FC<UserPageProps> = ({ onBack, currentUser, onLogout, onNavigate, onEditPost, onViewPost }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: string; thumbnailUrl: string } | null>(null);
    
    useEffect(() => {
        if (!currentUser) return;

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
        }, (error) => {
            console.error("Error fetching user posts:", error);
            alert("Could not load your posts. Please check your connection or permissions.");
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
            unsubscribeFollowers();
            unsubscribeFollowing();
        };
    }, [currentUser]);
    
    const handleDeletePost = async () => {
        if (!postToDelete) return;

        try {
            // Delete post document from Firestore
            await db.collection("posts").doc(postToDelete.id).delete();

            // Delete thumbnail from Storage if it's a Firebase URL
            if (postToDelete.thumbnailUrl && postToDelete.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                const storageRef = storage.refFromURL(postToDelete.thumbnailUrl);
                await storageRef.delete();
            }

        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post. Please try again.");
        } finally {
            setIsDeleteModalOpen(false);
            setPostToDelete(null);
        }
    };
    
    const openDeleteModal = (postId: string, thumbnailUrl: string) => {
        setPostToDelete({ id: postId, thumbnailUrl });
        setIsDeleteModalOpen(true);
    };


    if (!currentUser) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Profile" showBackButton onBack={onBack} />
                <main className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500">Please log in to view your profile.</p>
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="My Profile" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto">
                    <div className="p-6 m-4 glass-card">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                            <img 
                                className="h-28 w-28 rounded-full object-cover ring-4 ring-blue-500/20 shadow-lg"
                                src={currentUser.profilePicUrl} 
                                alt={`${currentUser.name}'s profile picture`} 
                            />
                            <div className="flex-grow text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-gray-800">{currentUser.name}</h1>
                                <p className="text-blue-600">@{currentUser.username}</p>
                                {currentUser.bio && <p className="mt-2 text-sm text-gray-600 max-w-prose">{currentUser.bio}</p>}
                                {currentUser.preferredState && (
                                    <div className="mt-4 flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 bg-gray-100 p-2 rounded-lg">
                                        <span className="material-symbols-outlined text-base">location_on</span>
                                        <span>
                                            {currentUser.preferredDistrict && `${currentUser.preferredDistrict}, `}
                                            {currentUser.preferredState}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-around items-center mt-6 pt-4 border-t border-black/10">
                            <StatBox value={posts.length} label="Posts" />
                            <StatBox value={followersCount} label="Followers" />
                            <StatBox value={followingCount} label="Following" />
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                             <button 
                                onClick={() => onNavigate(View.EditProfile)}
                                className="flex-1 px-4 py-2 gradient-button text-white font-semibold rounded-lg shadow-md"
                            >
                                Edit Profile
                            </button>
                            {currentUser.role === 'admin' && (
                                <button
                                    onClick={() => onNavigate(View.Admin)}
                                    className="flex-1 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
                                >
                                    Admin Panel
                                </button>
                             )}
                             <button 
                                onClick={onLogout}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-6 px-4 md:px-0">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-bold text-gray-800">My Posts</h2>
                             <button
                                onClick={() => onNavigate(View.CreatePost)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                             >
                                <span className="material-symbols-outlined">add_circle</span>
                                New Post
                             </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {posts.length > 0 ? (
                                posts.map((post, index) => (
                                    <div key={post.id} className="glass-card flex flex-col fade-in-up overflow-hidden" style={{ animationDelay: `${index * 100}ms`}}>
                                        <div onClick={() => onViewPost(post.id)} className="cursor-pointer flex-grow">
                                            {post.thumbnailUrl ? (
                                            <img src={post.thumbnailUrl} alt={post.title} className="w-full h-32 object-cover" />
                                            ) : (
                                            <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-gray-400 text-4xl">image</span>
                                            </div>
                                            )}
                                            <div className="p-3">
                                                <h3 className="font-bold text-base text-red-600 line-clamp-2 leading-tight h-10">{post.title}</h3>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Published on: {post.createdAt ? post.createdAt.toLocaleDateString() : 'N/A'}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    <span>{post.viewCount} Views</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex mt-auto justify-end space-x-1 p-2 border-t border-gray-200/50">
                                            <button onClick={() => onEditPost(post.id)} className="p-2 text-blue-500 hover:bg-black/5 rounded-full transition-colors">
                                                <span className="material-symbols-outlined text-xl">edit</span>
                                            </button>
                                            <button onClick={() => openDeleteModal(post.id, post.thumbnailUrl)} className="p-2 text-red-500 hover:bg-black/5 rounded-full transition-colors">
                                                <span className="material-symbols-outlined text-xl">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 md:col-span-3 text-center py-10 glass-card">
                                    <p className="text-gray-600">You haven't created any posts yet.</p>
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
                title="Confirm Deletion"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmButtonText="Delete"
            />
        </div>
    );
};

export default UserPage;
