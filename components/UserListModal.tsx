
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { User } from '../types';

interface UserListModalProps {
    userId: string;
    type: 'followers' | 'following';
    onClose: () => void;
    onViewUser: (userId: string) => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ userId, type, onClose, onViewUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // 1. Get the list of IDs from the subcollection
                const collectionRef = db.collection('users').doc(userId).collection(type);
                const snapshot = await collectionRef.get();
                
                if (snapshot.empty) {
                    setUsers([]);
                    setLoading(false);
                    return;
                }

                const userIds = snapshot.docs.map(doc => doc.id);

                // 2. Fetch user details for each ID
                // Firestore 'in' query supports up to 10 items. For robustness with larger lists,
                // we fetch individually or use batches. Here we use Promise.all for simplicity 
                // assuming reasonable list size for viewing, or we could paginate.
                // For a better UX in large apps, we'd paginate this.
                
                const userPromises = userIds.map(uid => db.collection('users').doc(uid).get());
                const userSnapshots = await Promise.all(userPromises);
                
                const fetchedUsers = userSnapshots
                    .filter(doc => doc.exists)
                    .map(doc => ({
                        uid: doc.id,
                        ...doc.data()
                    } as User));

                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching user list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [userId, type]);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-800 capitalize">{type}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-2">
                    {loading ? (
                        // Loading Skeletons
                        <div className="space-y-3 p-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : users.length > 0 ? (
                        <div className="space-y-1">
                            {users.map(user => (
                                <div 
                                    key={user.uid}
                                    onClick={() => {
                                        onViewUser(user.uid);
                                        onClose();
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all group"
                                >
                                    <img 
                                        src={user.profilePicUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user.username}`} 
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-blue-100 transition-all"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{user.name}</h4>
                                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                    </div>
                                    {/* Optional: Add an arrow or action button here */}
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">chevron_right</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-3xl text-gray-300">group_off</span>
                            </div>
                            <p className="text-gray-500 font-medium">No users found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
