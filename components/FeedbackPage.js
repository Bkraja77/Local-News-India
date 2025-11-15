import React from 'react';
import Header from './Header';

interface FeedbackPageProps {
  onBack: () => void;
}

const FeedbackPage: React.FC<FeedbackPageProps> = ({ onBack }) => {
    const handleSubmit = () => {
        const subjectEl = document.getElementById('feedback-subject') as HTMLInputElement;
        const messageEl = document.getElementById('feedback-message') as HTMLTextAreaElement;

        if (!subjectEl || !messageEl) return;

        const subject = subjectEl.value;
        const message = messageEl.value;

        if (!message.trim()) {
            alert('Please enter a message.');
            return;
        }
        window.location.href = `mailto:bikash512singh@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Feedback" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <form className="max-w-2xl mx-auto glass-card p-6" onSubmit={(e) => e.preventDefault()}>
                    <div className="mb-5">
                        <label htmlFor="feedback-subject" className="block font-medium mb-2 text-gray-700">Subject</label>
                        <input type="text" id="feedback-subject" defaultValue="Local News India App Feedback" className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-base font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div className="mb-5">
                        <label htmlFor="feedback-message" className="block font-medium mb-2 text-gray-700">Message</label>
                        <textarea id="feedback-message" placeholder="Please tell us what you think..." className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-base font-medium h-36 resize-y text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>
                    <button type="button" onClick={handleSubmit} className="w-full p-4 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer mt-2">
                        Submit via Email
                    </button>
                </form>
            </main>
        </div>
    );
};

export default FeedbackPage;
