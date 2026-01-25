
import React, { useState } from 'react';
import Header from './Header';
import { db, serverTimestamp } from '../firebaseConfig';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SendNotificationPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const SendNotificationPage: React.FC<SendNotificationPageProps> = ({ onBack, currentUser }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { showToast } = useToast();

    if (currentUser?.role !== 'admin') {
        return <div className="p-10 text-center font-bold">Access Denied</div>;
    }

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            showToast("Please fill all fields", "error");
            return;
        }

        setIsSending(true);
        try {
            // 1. Save to Global Broadcast Collection (Trigger for active users)
            await db.collection('global_notifications').add({
                title: title.trim(),
                message: message.trim(),
                senderName: currentUser.name,
                createdAt: serverTimestamp(),
                type: 'global_broadcast'
            });

            showToast("Broadcast sent to all users!", "success");
            setTitle('');
            setMessage('');
        } catch (error) {
            console.error(error);
            showToast("Failed to send broadcast", "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Broadcast Centre" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-2xl mx-auto w-full">
                    <div className="glass-card p-6 md:p-10 space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined text-3xl">campaign</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">Send Global Alert</h2>
                                <p className="text-sm text-gray-500">This message will appear for EVERY user in the app.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSendBroadcast} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Alert Title</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Breaking News Alert"
                                    className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Message Content</label>
                                <textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    placeholder="Enter your notification message here..."
                                    className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                    required
                                ></textarea>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                                <span className="material-symbols-outlined text-amber-600">info</span>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    <strong>Note:</strong> Sending a broadcast uses Firebase live listeners. All users currently active on the app will receive a Toast message immediately. This action cannot be undone.
                                </p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSending}
                                className="w-full py-4 gradient-button text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Broadcast to All Users
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Previous Broadcasts</h3>
                        <div className="space-y-4">
                            <p className="text-center py-10 text-gray-400 text-sm italic">Broadcast history is coming soon.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SendNotificationPage;
