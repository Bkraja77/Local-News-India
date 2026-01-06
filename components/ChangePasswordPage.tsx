
import React, { useState } from 'react';
import Header from './Header';
import { auth, firebase } from '../firebaseConfig';
import { useToast } from '../contexts/ToastContext';

interface ChangePasswordPageProps {
  onBack: () => void;
}

const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ onBack }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match.", "error");
            return;
        }
        if (newPassword.length < 8) {
            showToast("Password must be at least 8 characters long.", "error");
            return;
        }

        setIsLoading(true);
        const user = auth.currentUser;

        if (user && user.email) {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            
            try {
                // 1. Re-authenticate
                await user.reauthenticateWithCredential(credential);
                
                // 2. Update Password
                await user.updatePassword(newPassword);
                
                showToast("Password updated successfully!", "success");
                onBack();
            } catch (error: any) {
                console.error("Error changing password:", error);
                if (error.code === 'auth/wrong-password') {
                    showToast("Incorrect current password.", "error");
                } else if (error.code === 'auth/requires-recent-login') {
                    showToast("For security, please log out and log back in before changing your password.", "error");
                } else {
                    showToast(error.message || "Failed to update password.", "error");
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            showToast("User not found. Please log in again.", "error");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Change Password" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full glass-card p-6 md:p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Create New Password</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input 
                                type="password" 
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                required
                                placeholder="Enter current password"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                required
                                placeholder="Enter new password"
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                required
                                placeholder="Re-enter new password"
                                minLength={8}
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full p-3 gradient-button text-white rounded-lg font-bold shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ChangePasswordPage;
