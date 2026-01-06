
import React, { useState, useEffect } from 'react';
import { User, View, Post } from '../types';
import Header from './Header';
import { db, serverTimestamp } from '../firebaseConfig';
import { formatCount } from '../utils/formatters';

interface PublicProfilePageProps {
    userId: string;
    currentUser: User | null;
    onBack: () => void;
    onViewPost: (postId: string) => void;
    onLogin: () => void;
    onNavigate: (view: View) => void;
    onAdminEditUser: (userId: string) => void;
}

const StatBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl min-w-[80px] border border-gray-100 transition-transform hover:scale-105">
        <p className="text-2xl font-bold text-gray-900">{formatCount(value)}</p>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
);

const SkeletonPublicProfile = () => (
    <div className="flex flex-col h-full bg-transparent animate-pulse">
        <div className="h-14 bg-white/80 border-b border-gray-200"></div>
        <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
             <div className="max-w-7xl mx-auto w-full md:px-4 md:py-6">
                <div className="glass-card overflow-hidden mb-8 mx-0 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border bg-white border-gray-100">
                    <div className="h-32 md:h-48 bg-gray-200"></div>
                    <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
                         <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-8">
                            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-gray-300 ring-4 ring-white shadow-lg"></div>
                            <div className="flex-grow text-center md:text-left mb-2 md:mb-4 w-full flex flex-col items-center md:items-start space-y-3 mt-12 md:mt-0">
                                <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
                                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                <div className="h-16 w-full max-w-xl bg-gray-100 rounded-lg hidden md:block"></div>
                            </div>
                            <div className="flex flex-col items-end gap-4 w-full md:w-auto mt-4 md:mt-0">
                                <div className="flex justify-center w-full md:w-auto gap-4 md:gap-8 bg-white md:bg-transparent p-2 md:p-0 rounded-xl border md:border-none border-gray-100">
                                    <div className="h-14 w-16 bg-gray-200 rounded-lg"></div>
                                    <div className="h-14 w-16 bg-gray-200 rounded-lg"></div>
                                    <div className="h-14 w-16 bg-gray-200 rounded-lg"></div>
                                </div>
                                <div className="h-10 w-full md:w-32 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-4 md:px-0">
                    <div className="h-8 w-32 bg-gray-200 rounded mb-6"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass-card overflow-hidden h-72 flex flex-col">
                                <div className="h-40 bg-gray-200 w-full"></div>
                                <div className="p-4 flex-grow space-y-3">
                                    <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </main>
    </div>
);

const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ userId, currentUser, onBack, onViewPost, onLogin, onNavigate, onAdminEditUser }) => {
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [postError, setPostError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);

        const userDocRef = db.collection('users').doc(userId);
        const unsubscribeUser = userDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                setProfileUser({ uid: docSnap.id, ...docSnap.data() } as User);
            } else {
                console.error("User not found");
            }
             // We keep loading true until posts also attempt to load to prevent layout shift
        });

        const followersQuery = db.collection("users").doc(userId).collection("followers");
        const unsubscribeFollowers = followersQuery.onSnapshot((snapshot) => setFollowersCount(snapshot.size));
        
        const followingQuery = db.collection("users").doc(userId).collection("following");
        const unsubscribeFollowing = followingQuery.onSnapshot((snapshot) => setFollowingCount(snapshot.size));

        let unsubscribeIsFollowing = () => {};
        if(currentUser) {
            const isFollowingRef = db.collection('users').doc(currentUser.uid).collection('following').doc(userId);
            unsubscribeIsFollowing = isFollowingRef.onSnapshot((doc) => {
                setIsFollowing(doc.exists);
            });
        }

        return () => {
            unsubscribeUser();
            unsubscribeFollowers();
            unsubscribeFollowing();
            unsubscribeIsFollowing();
        };
    }, [userId, currentUser]);

     useEffect(() => {
        setPostError(null);
        const postsQuery = db.collection("posts").where("authorId", "==", userId);
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
                } as Post;
            });
            // Sort posts by creation date, newest first.
            userPosts.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            });
            setPosts(userPosts);
            setLoading(false); // Posts loaded (or empty) -> done loading
        }, (error) => {
            console.error("Error fetching user posts:", error);
            setPostError("Could not load posts. Please try again later.");
            setLoading(false);
        });
        
        return () => unsubscribePosts();
    }, [userId]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser) {
            onLogin();
            return;
        }

        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(profileUser.uid);

        const followingRef = currentUserRef.collection('following').doc(profileUser.uid);
        const followerRef = targetUserRef.collection('followers').doc(currentUser.uid);

        try {
            const batch = db.batch();
            if (isFollowing) {
                batch.delete(followingRef);
                batch.delete(followerRef);
            } else {
                batch.set(followingRef, { followedAt: serverTimestamp() });
                batch.set(followerRef, { followedAt: serverTimestamp() });

                // Add notification
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
    
    const renderPosts = () => {
        if (postError) {
             return <div className="text-center py-10 glass-card"><p className="text-red-500">{postError}</p></div>;
        }
        if (posts.length > 0) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {posts.map((post, index) => (
                        <div 
                            key={post.id} 
                            onClick={() => onViewPost(post.id)} 
                            className="glass-card group cursor-pointer overflow-hidden flex flex-col h-full" 
                        >
                             <div className="relative aspect-video overflow-hidden bg-gray-100">
                                {post.thumbnailUrl ? (
                                    <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <span className="material-symbols-outlined text-4xl">image</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-medium">
                                    {post.category}
                                </div>
                            </div>
                            
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-bold text-base text-gray-800 line-clamp-2 mb-2 group-hover:text-red-600 transition-colors">{post.title}</h3>
                                <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                                     <span>{post.createdAt ? post.createdAt.toLocaleDateString() : 'N/A'}</span>
                                     <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        <span>{formatCount(post.viewCount)}</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return (
             <div className="text-center py-20 glass-card">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">post_add</span>
                <p className="text-gray-600 text-lg">This user hasn't posted anything yet.</p>
            </div>
        )
    };

    if (loading) {
        return <SkeletonPublicProfile />;
    }

    if (!profileUser) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Not Found" showBackButton onBack={onBack} />
                <div className="flex items-center justify-center h-full"><p>User not found.</p></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title={profileUser.name} 
                showBackButton 
                onBack={onBack} 
                currentUser={currentUser}
                onProfileClick={() => onNavigate(View.User)}
                onLogin={onLogin}
            />
            <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
                 <div className="max-w-7xl mx-auto w-full md:px-4 md:py-6">
                     {/* Full Width Profile Header */}
                    <div className="glass-card overflow-hidden mb-8 mx-0 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border">
                        <div className="relative h-32 md:h-48 bg-gradient-to-r from-gray-800 to-gray-600">
                             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/30 to-transparent"></div>
                        </div>
                        
                        <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
                             <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-8">
                                {/* Avatar */}
                                <div className="relative">
                                    <img 
                                        className="h-24 w-24 md:h-40 md:w-40 rounded-full object-cover ring-4 ring-white shadow-lg bg-white"
                                        src={profileUser.profilePicUrl} 
                                        alt={`${profileUser.name}'s profile picture`} 
                                    />
                                </div>
                                
                                {/* Info */}
                                <div className="flex-grow text-center md:text-left mb-2 md:mb-4">
                                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900">{profileUser.name}</h1>
                                    <p className="text-blue-600 font-medium">@{profileUser.username}</p>
                                    {profileUser.bio && <p className="mt-2 text-sm text-gray-600 max-w-prose">{profileUser.bio}</p>}
                                    
                                     {profileUser.preferredState && (
                                        <div className="mt-3 flex items-center justify-center md:justify-start gap-1 text-sm text-gray-500">
                                            <span className="material-symbols-outlined text-base">location_on</span>
                                            <span>
                                                {profileUser.preferredDistrict && `${profileUser.preferredDistrict}, `}
                                                {profileUser.preferredState}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats & Actions */}
                                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                                    <div className="flex justify-center w-full md:w-auto gap-4 md:gap-8 bg-white md:bg-transparent p-2 md:p-0 rounded-xl shadow-sm md:shadow-none border md:border-none border-gray-100">
                                        <StatBox value={posts.length} label="Posts" />
                                        <StatBox value={followersCount} label="Followers" />
                                        <StatBox value={followingCount} label="Following" />
                                    </div>
                                    
                                    <div className="flex flex-col w-full gap-2">
                                        {(!currentUser || currentUser.uid !== userId) && (
                                             <button 
                                                onClick={handleFollowToggle} 
                                                className={`
                                                    w-full md:w-auto px-10 py-2.5 text-base font-bold rounded-full transition-all duration-300 shadow-sm active:scale-95 flex items-center justify-center gap-2
                                                    ${isFollowing 
                                                        ? 'bg-gray-100 text-gray-600 border border-gray-200' 
                                                        : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 hover:shadow-md'}
                                                `}
                                            >
                                                {isFollowing ? (
                                                    <>
                                                        <span className="material-symbols-outlined text-lg">done</span>
                                                        Following
                                                    </>
                                                ) : 'Follow'}
                                            </button>
                                        )}
                                        
                                        {currentUser?.role === 'admin' && (
                                            <button 
                                                onClick={() => onAdminEditUser(userId)}
                                                className="w-full md:w-auto px-8 py-2.5 text-base font-semibold rounded-full transition-all shadow-sm hover:shadow-md bg-gray-800 text-white hover:bg-gray-900 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                                                Manage User
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 md:px-0">
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Posts</h2>
                             <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm font-bold">{posts.length}</span>
                        </div>
                        {renderPosts()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicProfilePage;
