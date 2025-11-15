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

/**
 * Placeholder function to represent deleting a user from Firebase Authentication.
 * IMPORTANT: This action MUST be performed from a secure backend environment
 * (like a Google Cloud Function) using the Firebase Admin SDK. The client-side SDKs
 * do not have the permission to delete other users' accounts for security reasons.
 * @param uid The user ID to delete.
 */
const triggerDeleteAuthUser = (uid: string) => {
    console.warn(`[Action Required] A backend function needs to be triggered to delete the Firebase Auth account for user: ${uid}.`);
    // Example of how you would call a Cloud Function:
    // const deleteUserFunction = firebase.functions().httpsCallable('deleteUser');
    // deleteUserFunction({ uid: uid })
    //   .then(() => console.log(`Successfully triggered deletion for auth user ${uid}`))
    //   .catch((error) => console.error(`Error triggering auth deletion for user ${uid}:`, error));
    alert("User data has been removed from the database. A secure backend function is required to remove the user's authentication account.");
};


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
            // Step 1: Query for all posts by the user.
            const postsQuery = db.collection('posts').where('authorId', '==', userToDeleteId);
            const postsSnapshot = await postsQuery.get();

            // Step 2: Prepare a batch write for Firestore deletions.
            const batch = db.batch();

            // Step 3: Handle thumbnail deletions from Storage.
            const thumbnailDeletePromises: Promise<void>[] = [];
            postsSnapshot.forEach(doc => {
                const postData = doc.data();
                if (postData.thumbnailUrl && postData.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                    const storageRef = storage.refFromURL(postData.thumbnailUrl);
                    // Add the delete promise to the list.
                    thumbnailDeletePromises.push(storageRef.delete());
                }
                // Add post deletion to the batch.
                batch.delete(doc.ref);
            });

            // Step 4: Add the user's document deletion to the batch.
            const userDocRef = db.collection('users').doc(userToDeleteId);
            batch.delete(userDocRef);
            
            // Step 5: Execute all deletions.
            // First, delete storage files. Catch errors individually if a file doesn't exist.
            await Promise.all(thumbnailDeletePromises.map(p => p.catch(e => console.warn("Could not delete a thumbnail, it might have already been removed.", e))));

            // Then, commit the Firestore batch.
            await batch.commit();

            // Step 6: Trigger the backend function to delete the user from Firebase Auth.
            triggerDeleteAuthUser(userToDeleteId);
            
        } catch (err) {
            console.error("Error deleting user and their posts:", err);
            alert("Failed to delete user's data. Please check the console and try again.");
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
            return <p className="text-center text-gray-500">Loading users...</p>;
        }
        if (error) {
            return <div className="text-center text-red-700 bg-red-100 p-4 rounded-lg"><p>{error}</p></div>;
        }
        return (
             <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={user.profilePicUrl} alt={user.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => onEditUser(user.uid)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                        <button onClick={() => openRoleChangeModal(user.uid, user.role)} className="text-blue-600 hover:text-blue-900 mr-4">Change Role</button>
                                        <button onClick={() => openDeleteModal(user.uid)} className="text-red-600 hover:text-red-900">Delete</button>
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
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-6">
                         <input
                            type="text"
                            placeholder="Search by name, email, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
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