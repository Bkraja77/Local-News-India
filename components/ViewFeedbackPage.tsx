
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

interface ViewFeedbackPageProps {
    onBack: () => void;
    currentUser: User | null;
}

interface FeedbackItem {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: any;
    userId: string;
    status: 'read' | 'unread';
}

const SkeletonFeedback = () => (
    <div className="glass-card p-5 flex flex-col gap-3 border-l-4 border-gray-300 animate-pulse">
        <div className="flex justify-between items-start">
            <div className="flex-grow pr-4 space-y-2">
                <div className="h-5 w-1/3 bg-gray-200 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
            </div>
            <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
        </div>
        <div className="h-16 bg-gray-100 rounded-lg"></div>
    </div>
);

const ViewFeedbackPage: React.FC<ViewFeedbackPageProps> = ({ onBack, currentUser }) => {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setLoading(false);
            return;
        }

        const unsubscribe = db.collection('feedback')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as FeedbackItem));
                setFeedbacks(items);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching feedback:", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDelete = async () => {
        if (deleteId) {
            try {
                await db.collection('feedback').doc(deleteId).delete();
                showToast('Feedback deleted.', 'success');
            } catch (error) {
                console.error("Error deleting feedback:", error);
                showToast('Failed to delete feedback.', 'error');
            }
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        }
    };

    const openDeleteModal = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleToggleRead = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'read' ? 'unread' : 'read';
        try {
            await db.collection('feedback').doc(id).update({ status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            showToast('Failed to update status.', 'error');
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="User Feedback" showBackButton onBack={onBack} />
                <main className="flex-grow flex items-center justify-center p-5 text-center">
                    <div className="glass-card p-10">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="User Feedback" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3, 4].map(i => <SkeletonFeedback key={i} />)}
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div className="text-center py-16 glass-card">
                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">inbox</span>
                            <p className="text-gray-500 text-lg">No feedback received yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {feedbacks.map(item => {
                                const isUnread = item.status === 'unread';
                                const dateString = item.createdAt?.toDate 
                                    ? item.createdAt.toDate().toLocaleString() 
                                    : 'Just now';

                                return (
                                    <div 
                                        key={item.id} 
                                        className={`glass-card p-5 flex flex-col gap-3 border-l-4 transition-all hover:shadow-md ${isUnread ? 'border-blue-500 bg-white' : 'border-gray-300 bg-gray-50/50'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-grow pr-4">
                                                <div className="flex items-center gap-2">
                                                    {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 block"></span>}
                                                    <h3 className={`font-bold text-lg ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>{item.subject}</h3>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <span className={`font-medium ${isUnread ? 'text-gray-800' : 'text-gray-600'}`}>{item.name}</span>
                                                    <span>&bull;</span>
                                                    <span className="text-blue-600">{item.email}</span>
                                                    <span>&bull;</span>
                                                    <span className="text-xs">{dateString}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Actions Toolbar */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <a 
                                                    href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                                                    title="Reply via Email"
                                                >
                                                    <span className="material-symbols-outlined text-lg">reply</span>
                                                </a>
                                                
                                                <button 
                                                    onClick={() => handleToggleRead(item.id, item.status)}
                                                    className={`p-2 rounded-full transition-colors ${isUnread ? 'text-gray-400 hover:bg-gray-100 hover:text-green-600' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                    title={isUnread ? "Mark as Read" : "Mark as Unread"}
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {isUnread ? 'mark_email_read' : 'mark_email_unread'}
                                                    </span>
                                                </button>

                                                <button 
                                                    onClick={() => openDeleteModal(item.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border ${isUnread ? 'bg-gray-50 border-gray-100 text-gray-800' : 'bg-white border-gray-100 text-gray-600'}`}>
                                            {item.message}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Feedback"
                message="Are you sure you want to delete this feedback message?"
                confirmButtonText="Delete"
            />
        </div>
    );
};

export default ViewFeedbackPage;
