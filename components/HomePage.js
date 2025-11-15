import React, { useState, useEffect, useMemo } from 'react';
import { View, User, Post } from '../types';
import Header from './Header';
import PostCard from './PostCard';
import Categories from './Categories';
import LocationFilter from './LocationFilter';
import { db, serverTimestamp, increment, firebase } from '../firebaseConfig';
import ReportModal from './ReportModal';

interface HomePageProps {
  onNavigate: (view: View) => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onViewPost: (postId: string) => void;
  onViewUser: (userId: string) => void;
}

const newsCategories = ['Latest', 'Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];

const HomePage: React.FC<HomePageProps> = ({ onNavigate, currentUser, onLogin, onLogout, onViewPost, onViewUser }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [followingList, setFollowingList] = useState<string[]>([]);
    
    // Filter states
    const [selectedCategory, setSelectedCategory] = useState('Latest');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedBlock, setSelectedBlock] = useState('');
    const [initialLocationSet, setInitialLocationSet] = useState(false);


    useEffect(() => {
        setLoading(true);
        setError(null);

        const postsQuery = db.collection("posts").orderBy("createdAt", "desc");
        const unsubscribePosts = postsQuery.onSnapshot((snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => {
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
            setPosts(fetchedPosts);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching posts:", err.message);
            setError("Could not load news feed. Please try again later.");
            setLoading(false);
        });

        return () => unsubscribePosts();
    }, []);

    useEffect(() => {
        if (currentUser) {
            const followingRef = db.collection('users').doc(currentUser.uid).collection('following');
            const unsubscribeFollowing = followingRef.onSnapshot((snapshot) => {
                setFollowingList(snapshot.docs.map(doc => doc.id));
            });
            return () => unsubscribeFollowing();
        } else {
            setFollowingList([]);
        }
    }, [currentUser]);

    const handleLocationReset = () => {
        setSelectedState('');
        setSelectedDistrict('');
        setSelectedBlock('');
    };

    useEffect(() => {
        // If a logged-in user has a preferred location and we haven't set the initial filter yet
        if (currentUser && !initialLocationSet && currentUser.preferredState) {
            setSelectedState(currentUser.preferredState);
            // Only set district/block if they exist in the user's profile
            if (currentUser.preferredDistrict) {
                setSelectedDistrict(currentUser.preferredDistrict);
            }
            setInitialLocationSet(true); // Mark as set
        } else if (!currentUser && initialLocationSet) {
            // When user logs out, reset the flag so it can be set for the next user
            setInitialLocationSet(false);
            // Also reset filters to default
            handleLocationReset();
            setSelectedCategory('Latest');
        }
    }, [currentUser, initialLocationSet]);

    const filteredPosts = useMemo(() => {
        // 1. Filter by category
        const categoryFiltered = (selectedCategory === 'Latest')
            ? posts
            : posts.filter(post => post.category === selectedCategory);

        // 2. If no state is selected, return all posts from that category
        if (!selectedState) {
            return categoryFiltered;
        }

        // 3. If a state IS selected, apply location filters hierarchically
        return categoryFiltered.filter(post => {
            if (post.state !== selectedState) return false;
            if (selectedDistrict && post.district !== selectedDistrict) return false;
            if (selectedBlock && post.block !== selectedBlock) return false;
            return true;
        });
    }, [posts, selectedCategory, selectedState, selectedDistrict, selectedBlock]);

    const handleFollowToggle = async (targetUserId: string, targetUserName: string, targetUserProfilePicUrl: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }

        const currentUserRef = db.collection('users').doc(currentUser.uid);
        const targetUserRef = db.collection('users').doc(targetUserId);

        const followingRef = currentUserRef.collection('following').doc(targetUserId);
        const followerRef = targetUserRef.collection('followers').doc(currentUser.uid);

        const isFollowing = followingList.includes(targetUserId);

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
    
    const handleReport = (post: Post) => {
        if (!currentUser) {
            alert("You must be logged in to report a post.");
            onLogin();
            return;
        }
        setReportingPost(post);
    };

    const handleReportSuccess = () => {
        setReportingPost(null);
        onNavigate(View.Main);
    };
    
    const handleCategorySelect = (category: string) => {
        if (!currentUser && category !== 'Latest') {
            onLogin();
            return;
        }
        setSelectedCategory(category);
    };

    const handleStateSelect = (state: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedState(state);
        setSelectedDistrict('');
        setSelectedBlock('');
    };

    const handleDistrictSelect = (district: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedDistrict(district);
        setSelectedBlock('');
    };
    
    const handleBlockSelect = (block: string) => {
        if (!currentUser) {
            onLogin();
            return;
        }
        setSelectedBlock(block);
    };


    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title="Local News India"
                showSettingsButton
                onSettings={() => onNavigate(View.Settings)}
            />
            <div className="sticky top-0 z-20">
              <Categories 
                  categories={newsCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategorySelect}
              />
              <LocationFilter 
                selectedState={selectedState}
                setSelectedState={handleStateSelect}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={handleDistrictSelect}
                selectedBlock={selectedBlock}
                setSelectedBlock={handleBlockSelect}
              />
            </div>
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="p-4 md:p-6 space-y-6">
                    {loading && <p className="text-center text-gray-500">Loading news...</p>}
                    {error && <p className="text-center text-red-500">{error}</p>}
                    {!loading && filteredPosts.map((post, index) => (
                        <div key={post.id} className="fade-in-up" style={{ animationDelay: `${index * 100}ms`}}>
                            <PostCard 
                                post={post} 
                                currentUser={currentUser}
                                onLogin={onLogin}
                                onReport={handleReport}
                                onViewPost={onViewPost}
                                onViewUser={onViewUser}
                                isFollowing={followingList.includes(post.authorId)}
                                handleFollowToggle={handleFollowToggle}
                            />
                        </div>
                    ))}
                     {!loading && filteredPosts.length === 0 && !error && (
                        <div className="text-center py-10 glass-card">
                            <p className="text-gray-700">No posts found for the selected filters.</p>
                            <p className="text-sm text-gray-500 mt-2">Try adjusting your category or location filters!</p>
                        </div>
                    )}
                </div>
            </main>
            {reportingPost && currentUser && (
                <ReportModal 
                    post={reportingPost} 
                    user={currentUser} 
                    onClose={() => setReportingPost(null)}
                    onSuccess={handleReportSuccess}
                />
            )}
        </div>
    );
};

export default HomePage;
