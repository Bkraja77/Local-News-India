import React from 'react';
import { User, View } from '../types';
import Header from './Header';

interface AdminPageProps {
  onBack: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
}

const AdminCard: React.FC<{ icon: string; title: string; description: string; color: string; onClick?: () => void;}> = ({ icon, title, description, color, onClick }) => (
    <button onClick={onClick} className="glass-card text-left w-full p-6 flex items-start space-x-4 transition-transform transform hover:-translate-y-1.5">
        <div className={`p-3 rounded-full bg-gradient-to-br ${color} shadow-lg`}>
            <span className="material-symbols-outlined text-3xl text-white">{icon}</span>
        </div>
        <div>
            <h3 className="font-bold text-lg text-gray-800">{title}</h3>
            <p className="text-gray-500 mt-1 text-sm">{description}</p>
        </div>
    </button>
);

const AdminPage: React.FC<AdminPageProps> = ({ onBack, currentUser, onLogin, onLogout, onNavigate }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title="Admin Panel" 
                showBackButton 
                onBack={onBack}
            />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AdminCard icon="article" title="Create Article" description="Write and publish a new news article." color="from-green-500 to-teal-500" onClick={() => onNavigate(View.CreatePost)} />
                        <AdminCard icon="group" title="Manage Users" description="View, edit, or remove user accounts." color="from-blue-500 to-indigo-500" onClick={() => onNavigate(View.ManageUsers)} />
                        <AdminCard icon="analytics" title="View Analytics" description="Check website traffic and engagement." color="from-purple-500 to-pink-500" onClick={() => onNavigate(View.Analytics)}/>
                        <AdminCard icon="flag" title="Moderate Content" description="Review and manage reported content." color="from-red-500 to-orange-500" onClick={() => onNavigate(View.ModerateContent)} />
                        <AdminCard icon="campaign" title="Send Notifications" description="Push alerts and updates to users." color="from-yellow-500 to-amber-500" onClick={() => onNavigate(View.Notifications)} />
                        <AdminCard icon="settings_applications" title="Site Settings" description="Configure application-wide settings." color="from-gray-500 to-gray-600" onClick={() => onNavigate(View.SiteSettings)} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
