import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { Post, User, View } from '../types';

interface SearchPageProps {
    onNavigate: (view: View) => void;
    onViewPost: (postId: string) => void;
    currentUser: User | null;
    onViewUser: (userId: string) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onNavigate, onViewPost, currentUser, onViewUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const handleFirestoreError = (err: any) => {
            console.error("Error fetching data:", err);
            setError("Could not load search data. Please check your connection.");
            setLoading(false);
        };
        
        const postsQuery = db.collection("posts");
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
                    createdAt: data.createdAt?.toDate() || null,
                    locationType: data.locationType || 'Overall',
                    state: data.state || '',
                    district: data.district || '',
                    block: data.block || '',
                } as Post;
            });
            setAllPosts(fetchedPosts);
            if (loading) setLoading(false);
        }, handleFirestoreError);

        const usersQuery = db.collection("users");
        const unsubscribeUsers = usersQuery.onSnapshot((snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
            } as User));
            setAllUsers(fetchedUsers);
            if (loading) setLoading(false);
        }, handleFirestoreError);

        return () => {
            unsubscribePosts();
            unsubscribeUsers();
        };
    }, []);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return { filteredPosts: [], filteredUsers: [] };
        }

        const lowercasedTerm = searchTerm.toLowerCase();

        const filteredPosts = allPosts.filter(post =>
            (post?.title?.toLowerCase() ?? '').includes(lowercasedTerm) ||
            (post?.content?.toLowerCase() ?? '').includes(lowercasedTerm)
        );

        const filteredUsers = allUsers.filter(user =>
            (user?.name?.toLowerCase() ?? '').includes(lowercasedTerm) ||
            (user?.username?.toLowerCase() ?? '').includes(lowercasedTerm)
        );

        return { filteredPosts, filteredUsers };
    }, [searchTerm, allPosts, allUsers]);


    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-8"><p>Loading search data...</p></div>;
        }
        if (error) {
            return <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg mx-4"><p>{error}</p></div>;
        }

        if (!searchTerm.trim()) {
            return (
                <div className="text-center p-10 flex flex-col items-center">
                     <span className="material-symbols-outlined text-8xl text-gray-400 mb-4">search</span>
                    <p className="text-gray-500">Search for posts by title/content or users by name/username.</p>
                </div>
            );
        }

        const { filteredPosts, filteredUsers } = searchResults;
        const hasResults = filteredPosts.length > 0 || filteredUsers.length > 0;

        if (!hasResults) {
            return (
                <div className="text-center p-10 flex flex-col items-center">
                     <span className="material-symbols-outlined text-8xl text-gray-400 mb-4">search_off</span>
                    <p className="text-gray-500">No results found for "{searchTerm}".</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {filteredPosts.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 px-4 mb-2">Posts</h2>
                        <div className="glass-card divide-y divide-black/10 overflow-hidden">
                            {filteredPosts.map(post => (
                                <div key={post.id} onClick={() => onViewPost(post.id)} className="p-4 flex items-center space-x-4 cursor-pointer hover:bg-black/5 transition-colors">
                                    {post.thumbnailUrl && <img src={post.thumbnailUrl} alt={post.title} className="w-16 h-16 object-cover rounded flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <h3 className="font-semibold text-red-600 line-clamp-2">{post.title}</h3>
                                        <p className="text-sm text-gray-500">by {post.authorName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {filteredUsers.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 px-4 mb-2">Users</h2>
                         <div className="glass-card divide-y divide-black/10 overflow-hidden">
                            {filteredUsers.map(user => (
                                <div key={user.uid} onClick={() => onViewUser(user.uid)} className="p-4 flex items-center space-x-4 cursor-pointer hover:bg-black/5 transition-colors">
                                     <img src={user.profilePicUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                                        <p className="text-sm text-blue-600">@{user.username}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* FIX: The `showBackButton` prop expects a boolean, and the click handler should be passed to `onBack`. */}
            <Header title="Search" showBackButton onBack={() => onNavigate(View.Main)} />
            <main className="flex-grow overflow-y-auto pb-20">
                <div className="p-4 sticky top-0 bg-gray-100/70 backdrop-blur-lg z-10">
                    <div className="relative">
                         <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                         <input
                            type="text"
                            placeholder="Search posts and users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 bg-white rounded-full text-gray-900 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="p-4">
                 {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
