
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db, storage } from '../firebaseConfig';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface ManageUsersPageProps {
    onBack: () => void;
    currentUser: User | null;
    onEditUser: (userId: string) => void;
}

const triggerDeleteAuthUser = (uid: string) => {
    console.warn(`[Action Required] A backend function needs to be triggered to delete the Firebase Auth account for user: ${uid}.`);
    alert("User data has been removed from the database. A secure backend function is required to remove the user's authentication account.");
};

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-gray-200"></div>
        <div className="ml-4 space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-3">
        <div className="h-4 w-8 bg-gray-200 rounded"></div>
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-4 w-12 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

const ManageUsersPage: React.FC<ManageUsersPageProps> = ({ onBack, currentUser, onEditUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
    const [isRoleChangeModalOpen, setIsRoleChangeModalOpen] = useState(false);
    const [userToChangeRole, setUserToChangeRole] = useState<{ uid: string; newRole: 'user' | 'admin' } | null>(null);


    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setLoading(false);
            return;
        }
        const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as User));
            setUsers(usersData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Firestore error in ManageUsersPage:", err);
            setError("Failed to load users. Ensure your Firestore security rules grant admin access.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const openRoleChangeModal = (uid: string, currentRole: 'user' | 'admin') => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        setUserToChangeRole({ uid, newRole });
        setIsRoleChangeModalOpen(true);
    };

    const handleConfirmRoleChange = async () => {
        if (!userToChangeRole) return;
        try {
            const userDocRef = db.collection('users').doc(userToChangeRole.uid);
            await userDocRef.update({ role: userToChangeRole.newRole });
        } catch (err) {
            console.error("Error changing user role:", err);
            alert("Failed to change user role. Please try again.");
        } finally {
            setIsRoleChangeModalOpen(false);
            setUserToChangeRole(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDeleteId) return;
        try {
            const postsQuery = db.collection('posts').where('authorId', '==', userToDeleteId);
            const postsSnapshot = await postsQuery.get();
            const batch = db.batch();
            const thumbnailDeletePromises: Promise<void>[] = [];
            postsSnapshot.forEach(doc => {
                const postData = doc.data();
                if (postData.thumbnailUrl && postData.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                    const storageRef = storage.refFromURL(postData.thumbnailUrl);
                    thumbnailDeletePromises.push(storageRef.delete());
                }
                batch.delete(doc.ref);
            });
            const userDocRef = db.collection('users').doc(userToDeleteId);
            batch.delete(userDocRef);
            await Promise.all(thumbnailDeletePromises.map(p => p.catch(e => console.warn("Could not delete a thumbnail (cleanup):", e))));
            await batch.commit();
            triggerDeleteAuthUser(userToDeleteId);
        } catch (err: any) {
            console.error("Error deleting user and their posts:", err);
            alert(`Failed to delete user data: ${err.message || "Unknown error"}`);
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDeleteId(null);
        }
    };

    const openDeleteModal = (uid: string) => {
        setUserToDeleteId(uid);
        setIsDeleteModalOpen(true);
    };

    const filteredUsers = users.filter(user => 
        (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Manage Users" showBackButton onBack={onBack} />
                <main className="flex-grow flex items-center justify-center p-5 text-center">
                    <div className="glass-card p-10">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-red-600 font-semibold">You do not have permission to access this page.</p>
                    </div>
                </main>
            </div>
        );
    }

    const renderContent = () => {
        if (loading) {
            return (
                <div className="glass-card overflow-hidden w-full">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        if (error) {
            return <div className="text-center text-red-700 bg-red-100 p-4 rounded-lg"><p>{error}</p></div>;
        }
        return (
             <div className="glass-card overflow-hidden w-full">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200" src={user.profilePicUrl} alt={user.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex gap-3">
                                            <button onClick={() => onEditUser(user.uid)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            <button onClick={() => openRoleChangeModal(user.uid, user.role)} className="text-blue-600 hover:text-blue-900">Change Role</button>
                                            <button onClick={() => openDeleteModal(user.uid)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Manage Users" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    <div className="mb-6">
                         <input
                            type="text"
                            placeholder="Search by name, email, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 border border-gray-300 bg-white rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                    </div>
                    {renderContent()}
                </div>
            </main>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                title="Confirm User Deletion"
                message="Are you sure you want to permanently delete this user? This will also delete ALL of their posts. This action cannot be undone."
                confirmButtonText="Delete User & Posts"
            />
            <ConfirmationModal
                isOpen={isRoleChangeModalOpen}
                onClose={() => setIsRoleChangeModalOpen(false)}
                onConfirm={handleConfirmRoleChange}
                title="Confirm Role Change"
                message={`Are you sure you want to change this user's role to ${userToChangeRole?.newRole}?`}
                confirmButtonText="Change Role"
                confirmButtonColor="bg-blue-600 hover:bg-blue-700"
            />
        </div>
    );
};

export default ManageUsersPage;
