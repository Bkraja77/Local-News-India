
import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import Header from './Header';
import { db } from '../firebaseConfig';

interface AdminPageProps {
  onBack: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  unreadNotificationsCount: number;
}

const AdminCard: React.FC<{ icon: string; title: string; description: string; color: string; onClick?: () => void; badge?: number }> = ({ icon, title, description, color, onClick, badge }) => (
    <button onClick={onClick} className="glass-card text-left w-full p-6 flex items-start space-x-4 transition-transform transform hover:-translate-y-1.5 h-full relative group">
        <div className={`p-3 rounded-full bg-gradient-to-br ${color} shadow-lg shrink-0`}>
            <span className="material-symbols-outlined text-3xl text-white">{icon}</span>
        </div>
        <div className="flex-grow">
            <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">{title}</h3>
            <p className="text-gray-500 mt-1 text-sm">{description}</p>
        </div>
        {badge && badge > 0 ? (
            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                {badge} New
            </div>
        ) : null}
    </button>
);

const AdminPage: React.FC<AdminPageProps> = ({ onBack, currentUser, onLogin, onLogout, onNavigate, unreadNotificationsCount }) => {
    const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
    const [reportCount, setReportCount] = useState(0);

    useEffect(() => {
        if (currentUser?.role !== 'admin') return;

        const unsubscribeFeedback = db.collection('feedback')
            .where('status', '==', 'unread')
            .onSnapshot(snapshot => {
                setUnreadFeedbackCount(snapshot.size);
            }, error => {
                console.error("Error counting unread feedback:", error);
            });

        const unsubscribeReports = db.collection('reports').onSnapshot(snapshot => {
            setReportCount(snapshot.size);
        }, error => {
            console.error("Error counting reports:", error);
        });

        return () => {
            unsubscribeFeedback();
            unsubscribeReports();
        };
    }, [currentUser]);

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header 
                title="Admin Panel" 
                showBackButton 
                onBack={onBack}
                currentUser={currentUser}
                onProfileClick={() => onNavigate(View.User)}
                onLogin={onLogin}
            />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AdminCard icon="feedback" title="User Feedback" description="View and manage messages from users." color="from-pink-500 to-rose-500" onClick={() => onNavigate(View.ViewFeedback)} badge={unreadFeedbackCount} />
                        <AdminCard icon="article" title="Create Article" description="Write and publish a new news article." color="from-green-500 to-teal-500" onClick={() => onNavigate(View.CreatePost)} />
                        <AdminCard icon="group" title="Manage Users" description="View, edit, or remove user accounts." color="from-blue-500 to-indigo-500" onClick={() => onNavigate(View.ManageUsers)} />
                        <AdminCard icon="monetization_on" title="Manage Ads" description="Configure AdSense and AdMob." color="from-emerald-500 to-lime-500" onClick={() => onNavigate(View.ManageAds)} />
                        <AdminCard icon="analytics" title="View Analytics" description="Check website traffic and engagement." color="from-purple-500 to-pink-500" onClick={() => onNavigate(View.Analytics)}/>
                        <AdminCard icon="flag" title="Moderate Content" description="Review and manage reported content." color="from-red-500 to-orange-500" onClick={() => onNavigate(View.ModerateContent)} badge={reportCount} />
                        <AdminCard icon="campaign" title="Send Notifications" description="Push alerts and updates to users." color="from-yellow-500 to-amber-500" onClick={() => onNavigate(View.Notifications)} badge={unreadNotificationsCount} />
                        <AdminCard icon="settings_applications" title="Site Settings" description="Configure application-wide settings." color="from-gray-500 to-gray-600" onClick={() => onNavigate(View.SiteSettings)} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
