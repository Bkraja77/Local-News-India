
import React from 'react';
import Header from './Header';
import { View, User } from '../types';

interface ManageAccountPageProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
  currentUser: User | null;
}

const ManageAccountItem: React.FC<{ 
    icon: string; 
    title: string; 
    subtitle: string;
    onClick: () => void; 
    color?: string;
}> = ({ icon, title, subtitle, onClick, color = 'text-gray-600' }) => (
    <div 
        onClick={onClick} 
        className="flex items-center justify-between p-4 border-b border-gray-100 last:border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
        <div className="flex items-center space-x-4">
            <div className="p-2.5 rounded-xl bg-gray-100">
                <span className={`material-symbols-outlined ${color} text-xl`}>{icon}</span>
            </div>
            <div>
                <p className="font-medium text-base text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>
        </div>
        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
    </div>
);

const ManageAccountPage: React.FC<ManageAccountPageProps> = ({ onBack, onNavigate, currentUser }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Manage Account" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <div className="w-full space-y-6">
                    <div className="glass-card overflow-hidden hover:shadow-md transition-shadow">
                        <ManageAccountItem 
                            icon="person"
                            title="Personal Details"
                            subtitle="Update your name, bio, and location"
                            onClick={() => onNavigate(View.EditProfile)}
                            color="text-blue-600"
                        />
                        <ManageAccountItem 
                            icon="lock"
                            title="Change Password"
                            subtitle="Update your account password"
                            onClick={() => onNavigate(View.ChangePassword)}
                            color="text-green-600"
                        />
                    </div>
                    
                    <p className="text-center text-xs text-gray-400 px-4">
                        Keeping your account information up-to-date helps us secure your account and provide a better experience.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default ManageAccountPage;
