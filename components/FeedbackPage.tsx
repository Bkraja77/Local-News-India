
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useToast } from '../contexts/ToastContext';
import { User, View } from '../types';
import { db, serverTimestamp } from '../firebaseConfig';

interface FeedbackPageProps {
  onBack: () => void;
  currentUser: User | null;
  onNavigate: (view: View) => void;
}

const FeedbackPage: React.FC<FeedbackPageProps> = ({ onBack, currentUser, onNavigate }) => {
    const [name, setName] = useState(currentUser?.name || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [subject, setSubject] = useState('Public Tak App Feedback');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setEmail(currentUser.email || '');
        } else {
            setName('');
            setEmail('');
        }
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            showToast('Please enter a message.', 'error');
            return;
        }
        
        if (!email.trim()) {
             showToast('Please enter your email address.', 'error');
             return;
        }

        setIsSubmitting(true);

        try {
            // Store in Firestore (Live/Instant storage)
            // Using serverTimestamp() ensures consistent ordering in Admin Panel
            await db.collection('feedback').add({
                name,
                email,
                subject,
                message,
                createdAt: serverTimestamp(), 
                userId: currentUser?.uid || 'anonymous',
                status: 'unread'
            });

            showToast('Feedback sent successfully! We will review it shortly.', 'success');
            setMessage('');
            // Reset subject if modified, or keep default
            if (subject !== 'Public Tak App Feedback') setSubject('Public Tak App Feedback');
            
        } catch (error: any) {
            console.error("Feedback submission failed:", error);
            showToast(`Failed to send feedback: ${error.message || "Please check your connection."}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Feedback & Support" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
                <div className="w-full max-w-7xl mx-auto md:px-6 py-6">
                    
                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-none md:rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl mb-8">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-pink-500 opacity-20 rounded-full blur-2xl"></div>
                        
                        <div className="relative p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">We'd Love to Hear From You</h1>
                                <p className="text-blue-100 text-lg md:text-xl max-w-2xl">
                                    Whether you have a question about features, trials, pricing, need a demo, or anything else, our team is ready to answer all your questions.
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <span className="material-symbols-outlined text-9xl opacity-20">support_agent</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
                        
                        {/* Contact Info Side */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="glass-card p-6 border-l-4 border-blue-500">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600">contact_support</span>
                                    Contact Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <span className="material-symbols-outlined text-xl">mail</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Email</p>
                                            <a href="mailto:support@publictak.app" className="text-gray-800 font-medium hover:text-blue-600 transition-colors">support@publictak.app</a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                            <span className="material-symbols-outlined text-xl">location_on</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
                                            <p className="text-gray-800 font-medium">New Delhi, India</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none">
                                <h3 className="text-lg font-bold mb-2">Community</h3>
                                <p className="text-indigo-100 text-sm mb-4">Join our community on social media for latest updates and news.</p>
                                <div className="flex gap-4">
                                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
                                        <i className="fa-brands fa-facebook text-xl"></i>
                                    </button>
                                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
                                        <i className="fa-brands fa-twitter text-xl"></i>
                                    </button>
                                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm">
                                        <i className="fa-brands fa-instagram text-xl"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Feedback Form Side */}
                        <div className="lg:col-span-2">
                            {currentUser ? (
                                <div className="glass-card p-6 md:p-10">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h2>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="feedback-name" className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        id="feedback-name" 
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="w-full pl-10 p-3 border border-gray-300 bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                        placeholder="John Doe"
                                                    />
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">person</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="feedback-email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <input 
                                                        type="email" 
                                                        id="feedback-email" 
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="w-full pl-10 p-3 border border-gray-300 bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                        placeholder="john@example.com"
                                                        required
                                                    />
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">email</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="feedback-subject" className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    id="feedback-subject" 
                                                    value={subject}
                                                    onChange={(e) => setSubject(e.target.value)}
                                                    className="w-full pl-10 p-3 border border-gray-300 bg-gray-50 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                    placeholder="What is this regarding?"
                                                />
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">chat_bubble_outline</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="feedback-message" className="block text-sm font-semibold text-gray-700 mb-2">Message <span className="text-red-500">*</span></label>
                                            <textarea 
                                                id="feedback-message" 
                                                placeholder="Tell us more about your inquiry..." 
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                className="w-full p-4 border border-gray-300 bg-gray-50 rounded-xl text-gray-900 h-40 resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                required
                                            ></textarea>
                                        </div>

                                        <div className="flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className="px-8 py-3 gradient-button text-white border-none rounded-xl text-lg font-bold cursor-pointer shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined">send</span>
                                                        Send Message
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div className="glass-card p-10 h-full flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-gray-400">lock</span>
                                    </div>
                                    <div className="max-w-md">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Login Required</h2>
                                        <p className="text-gray-600 mb-8 leading-relaxed">
                                            Please log in to send feedback and support requests. This helps us track your inquiries and respond to you faster.
                                        </p>
                                        <button 
                                            onClick={() => onNavigate(View.Login)}
                                            className="px-10 py-3 gradient-button text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 flex items-center gap-2 mx-auto"
                                        >
                                            <span className="material-symbols-outlined">login</span>
                                            Login / Sign Up
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FeedbackPage;
