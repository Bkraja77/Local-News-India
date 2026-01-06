
import React from 'react';
import Header from './Header';

interface TermsPageProps {
  onBack: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Terms of Service" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="glass-card p-8 md:p-12 w-full prose max-w-none prose-lg prose-slate prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-headings:text-gray-800 prose-p:text-gray-600">
                    
                    <div className="text-center mb-10 border-b border-gray-200 pb-8">
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
                        <p className="text-base text-gray-500 font-medium">Effective Date: 26/11/2025</p>
                        <p className="text-sm text-gray-500 mt-2">Applicable for Public Tak Mobile Application and <a href="https://www.publictak.app" target="_blank" rel="noopener noreferrer">www.publictak.app</a></p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div>
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">1. ACCEPTANCE OF TERMS</h2>
                                <p className="mb-3">
                                    Welcome to <strong>Public Tak</strong>. By accessing or using our mobile application and website (collectively, the "Platform"), you agree to be bound by these Terms of Service ("Terms") and our <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 underline">Privacy Policy</a>.
                                </p>
                                <p>
                                    If you do not agree to these Terms, please do not use the Platform. These Terms constitute a legally binding agreement between you ("User") and Public Tak ("We", "Us", "Our").
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">2. USER ACCOUNTS</h2>
                                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                                    <li><strong>Eligibility:</strong> You must be at least 13 years old to use this Platform.</li>
                                    <li><strong>Registration:</strong> To access certain features (like posting content), you must create an account. You agree to provide accurate and complete information.</li>
                                    <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.</li>
                                </ul>
                            </section>

                            <section className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
                                <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center gap-2"><span className="material-symbols-outlined">gavel</span> 3. USER-GENERATED CONTENT (UGC)</h2>
                                <p className="mb-4 text-red-700 font-medium italic">As a news and information platform, we rely on users to post responsible content.</p>
                                
                                <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800">3.1 User Responsibility</h3>
                                <p className="mb-3">
                                    You are <strong>solely responsible</strong> for all text, images, news articles, and other materials ("Content") that you upload, post, or display on Public Tak. 
                                    <strong> We do not endorse any user opinions or vouch for the accuracy of user-posted news.</strong>
                                </p>

                                <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800">3.2 License Grant</h3>
                                <p className="mb-3">
                                    By posting Content, you grant Public Tak a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your Content on our Platform. You retain ownership of your Content.
                                </p>

                                <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800">3.3 Prohibited Content</h3>
                                <p className="mb-2">You agree <strong>NOT</strong> to post content that:</p>
                                <ul className="list-disc pl-5 space-y-1 text-gray-700 marker:text-red-500">
                                    <li>Is fake, misleading, or spreads misinformation.</li>
                                    <li>Promotes hate speech, violence, discrimination, or harassment based on race, religion, gender, or caste.</li>
                                    <li>Is defamatory, obscene, pornographic, or sexually explicit.</li>
                                    <li>Infringes on any third party's copyright, trademark, or other intellectual property rights.</li>
                                    <li>Violates any local, state, or central laws of India.</li>
                                </ul>
                            </section>
                        </div>

                        <div>
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">4. CONTENT MODERATION & TERMINATION</h2>
                                <p className="mb-2"><strong>We reserve the right to:</strong></p>
                                <ul className="list-disc pl-5 space-y-2 mb-4">
                                    <li>Remove or edit any Content that violates these Terms or is deemed inappropriate, without prior notice.</li>
                                    <li>Suspend or terminate your account and access to the Platform if you repeatedly violate these Terms.</li>
                                    <li>Cooperate with law enforcement authorities regarding illegal content.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">5. THIRD-PARTY SERVICES & ADS</h2>
                                <p className="mb-2">Our Platform displays advertisements provided by third parties (e.g., Google AdMob, AdSense).</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>We are not responsible for the content, products, or services advertised by third parties.</li>
                                    <li>Interactions with advertisers are solely between you and the advertiser.</li>
                                    <li>We use Google Analytics to understand app usage. Please review their policies.</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">6. INTELLECTUAL PROPERTY</h2>
                                <p>
                                    The Public Tak app design, logo, code, and graphics (excluding User-Generated Content) are the property of Public Tak and are protected by copyright and other intellectual property laws. You may not copy, modify, or distribute our proprietary material without written permission.
                                </p>
                            </section>

                            <section className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">7. DISCLAIMER & LIABILITY</h2>
                                <p className="mb-3 text-sm uppercase font-bold text-gray-500 tracking-wider">Disclaimer of Warranties</p>
                                <p className="mb-4 text-sm">
                                    THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. PUBLIC TAK MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY CONTENT ON THE PLATFORM.
                                </p>
                                <p className="mb-3 text-sm uppercase font-bold text-gray-500 tracking-wider">Limitation of Liability</p>
                                <p className="text-sm">
                                    TO THE FULLEST EXTENT PERMITTED BY LAW, PUBLIC TAK SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE PLATFORM OR INABILITY TO USE THE PLATFORM, INCLUDING DAMAGES FOR LOSS OF DATA OR PROFITS.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">10. CONTACT & GRIEVANCE</h2>
                                <p className="mb-4">
                                    If you have any questions about these Terms or wish to report a violation/grievance, please contact us:
                                </p>
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 inline-block w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-blue-600">mail</span>
                                        <p className="font-bold text-gray-800 text-lg">Grievance Officer</p>
                                    </div>
                                    <p className="text-gray-600">Email: <a href="mailto:support@publictak.app" className="text-blue-600 hover:underline font-medium">support@publictak.app</a></p>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="text-center mt-12 pt-8 border-t border-gray-200 text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} Public Tak. All rights reserved.</p>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default TermsPage;
