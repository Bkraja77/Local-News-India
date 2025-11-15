import React, { useState } from 'react';
import { Post, User } from '../types';
import { db, serverTimestamp } from '../firebaseConfig';

interface ReportModalProps {
    post: Post;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ post, user, onClose, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert("Please provide a reason for reporting.");
            return;
        }
        setIsSubmitting(true);
        try {
            await db.collection("reports").add({
                postId: post.id,
                postTitle: post.title,
                reporterId: user.uid,
                reporterName: user.name,
                reason: reason,
                createdAt: serverTimestamp(),
            });
            // Show success alert first, then call the success handler.
            // The user clicks "OK" on the alert, then the modal closes and navigation occurs.
            alert("Post reported successfully. Our team will review it shortly.");
            onSuccess();
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md m-4">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Report Post</h2>
                <p className="text-sm text-gray-600 mb-2">You are reporting the post titled:</p>
                <p className="font-semibold text-gray-800 mb-4 truncate">"{post.title}"</p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Reason for reporting:</label>
                    <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-900"
                        rows={4}
                        required
                    />
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;