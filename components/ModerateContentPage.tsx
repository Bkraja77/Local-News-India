
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db, storage } from '../firebaseConfig';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface Report {
    id: string;
    postId: string;
    postTitle: string;
    reporterId: string;
    reporterName: string;
    reason: string;
    createdAt: {
        toDate: () => Date;
    } | null;
}

interface ModerateContentPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const SkeletonReport = () => (
    <div className="glass-card p-6 border-l-4 border-gray-300 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="w-full">
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="p-4 bg-gray-100 rounded-lg h-24"></div>
            </div>
            <div className="flex gap-2 shrink-0">
                <div className="h-10 w-20 bg-gray-200 rounded"></div>
                <div className="h-10 w-24 bg-gray-200 rounded"></div>
            </div>
        </div>
    </div>
);

const ModerateContentPage: React.FC<ModerateContentPageProps> = ({ onBack, currentUser }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for deleting a post
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ reportId: string; postId: string } | null>(null);

    // State for dismissing a report
    const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
    const [reportToDismissId, setReportToDismissId] = useState<string | null>(null);


    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setLoading(false);
            return;
        }
        const q = db.collection('reports').orderBy('createdAt', 'desc');
        const unsubscribe = q.onSnapshot((snapshot) => {
            const reportsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Report));
            setReports(reportsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Firestore error in ModerateContentPage:", err);
            setError("Failed to load reports. Ensure your Firestore security rules grant admin access.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const openDismissModal = (reportId: string) => {
        setReportToDismissId(reportId);
        setIsDismissModalOpen(true);
    };

    const handleConfirmDismiss = async () => {
        if (!reportToDismissId) return;
        try {
            await db.collection('reports').doc(reportToDismissId).delete();
        } catch (error) {
            console.error("Error dismissing report:", error);
            alert("Failed to dismiss report. Please try again.");
        } finally {
            setIsDismissModalOpen(false);
            setReportToDismissId(null);
        }
    };

    const handleDeletePost = async () => {
        if (!itemToDelete) return;
        const { reportId, postId } = itemToDelete;

        try {
            const postRef = db.collection('posts').doc(postId);
            const postSnap = await postRef.get();

            if (postSnap.exists) {
                const postData = postSnap.data();
                if (postData?.thumbnailUrl && postData.thumbnailUrl.includes('firebasestorage.googleapis.com')) {
                    try {
                        const storageRef = storage.refFromURL(postData.thumbnailUrl);
                        await storageRef.delete();
                    } catch (storageErr) {
                        console.warn("Could not delete thumbnail (likely permission or already deleted):", storageErr);
                    }
                }
            }
           
            await postRef.delete();
            await db.collection('reports').doc(reportId).delete();

        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post. Check Firestore rules.");
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const openDeleteModal = (reportId: string, postId: string) => {
        setItemToDelete({ reportId, postId });
        setIsDeleteModalOpen(true);
    };

    if (currentUser?.role !== 'admin') {
        return (
             <div className="flex flex-col h-full bg-transparent">
                <Header title="Moderate Content" showBackButton onBack={onBack} />
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
                <div className="space-y-6">
                    {[1, 2, 3].map(i => <SkeletonReport key={i} />)}
                </div>
            );
        }
        if (error) {
            return <div className="text-center text-red-700 bg-red-100 p-4 rounded-lg"><p>{error}</p></div>;
        }
        if (reports.length > 0) {
            return (
                <div className="space-y-6">
                    {reports.map(report => (
                        <div key={report.id} className="glass-card p-6 border-l-4 border-red-500">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-red-500">warning</span>
                                        <h3 className="font-bold text-lg text-gray-800">{report.postTitle}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500">Post ID: <span className="font-mono bg-gray-100 px-1 rounded">{report.postId}</span></p>
                                    
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Reason</p>
                                        <p className="text-gray-800 italic">"{report.reason}"</p>
                                        <p className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">Reported by: {report.reporterName} (ID: {report.reporterId})</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                                    <p className="text-xs text-gray-400 text-right mb-2">{report.createdAt ? report.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                                    <button onClick={() => openDismissModal(report.id)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                        Dismiss
                                    </button>
                                    <button onClick={() => openDeleteModal(report.id, report.postId)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                                        Delete Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className="text-center py-16 glass-card flex flex-col items-center">
                <span className="material-symbols-outlined text-6xl text-green-500 mb-4">verified_user</span>
                <h3 className="text-xl font-bold text-gray-800">All Clear!</h3>
                <p className="text-gray-600">There are no reported posts to review.</p>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Moderate Content" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Reported Posts</h2>
                    {renderContent()}
                </div>
            </main>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeletePost}
                title="Confirm Post Deletion"
                message="Are you sure you want to delete this post? This action is permanent and will also remove the report."
                confirmButtonText="Delete Post"
            />
             <ConfirmationModal
                isOpen={isDismissModalOpen}
                onClose={() => setIsDismissModalOpen(false)}
                onConfirm={handleConfirmDismiss}
                title="Confirm Dismissal"
                message="Are you sure you want to dismiss this report? The post will remain, but the report will be deleted."
                confirmButtonText="Dismiss"
                confirmButtonColor="bg-blue-600 hover:bg-blue-700"
            />
        </div>
    );
};

export default ModerateContentPage;
