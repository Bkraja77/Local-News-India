import React, { useState, useEffect } from 'react';
import { User, View, Post } from '../types';
import Header from './Header';
import { db, serverTimestamp } from '../firebaseConfig';

interface PublicProfilePageProps {
    userId: string;
    currentUser: User | null;
    onBack: () => void;
    onViewPost: (postId: string) => void;
    onLogin: () => void;
    onNavigate: (view: View) => void;
}

const StatBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="text-center">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
    </div>
);

const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ userId, currentUser, onBack, onViewPost, onLogin }) => {
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
             setLoading(false);
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
        }, (error) => {
            console.error("Error fetching user posts:", error);
            setPostError("Could not load posts. Please try again later.");
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                    {posts.map((post, index) => (
                        <div 
                            key={post.id} 
                            onClick={() => onViewPost(post.id)} 
                            className="glass-card group cursor-pointer overflow-hidden fade-in-up relative aspect-square" 
                            style={{ animationDelay: `${index * 50}ms`}}
                        >
                            {post.thumbnailUrl ? (
                                <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center p-4">
                                    <p className="text-gray-500 text-center font-semibold line-clamp-3">{post.title}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-2 sm:p-3 w-full">
                                <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight drop-shadow-md">{post.title}</h3>
                                <div className="flex items-center text-xs text-white/90 mt-1 drop-shadow-md">
                                    <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                                    <span>{post.viewCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return (
             <div className="text-center py-10 glass-card">
                <p className="text-gray-600">This user hasn't created any posts yet.</p>
            </div>
        )
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-transparent"><p>Loading profile...</p></div>;
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
            <Header title={profileUser.name} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto">
                    <div className="p-6 m-4 glass-card">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                            <img 
                                className="h-28 w-28 rounded-full object-cover ring-4 ring-blue-500/20 shadow-lg" 
                                src={profileUser.profilePicUrl} 
                                alt={`${profileUser.name}'s profile picture`} 
                            />
                            <div className="flex-grow text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-gray-800">{profileUser.name}</h1>
                                <p className="text-blue-600">@{profileUser.username}</p>
                                {profileUser.bio && <p className="mt-2 text-sm text-gray-600 max-w-prose">{profileUser.bio}</p>}
                            </div>
                        </div>

                        <div className="flex justify-around items-center mt-6 pt-4 border-t border-black/10">
                            <StatBox value={posts.length} label="Posts" />
                            <StatBox value={followersCount} label="Followers" />
                            <StatBox value={followingCount} label="Following" />
                        </div>
                        
                        {currentUser && currentUser.uid !== userId && (
                            <div className="mt-6">
                                <button onClick={handleFollowToggle} className={`w-full py-2 text-base font-semibold rounded-lg transition-colors ${isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'gradient-button text-white'}`}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 px-4 md:px-0">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">{profileUser.name}'s Posts</h2>
                        {renderPosts()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicProfilePage;