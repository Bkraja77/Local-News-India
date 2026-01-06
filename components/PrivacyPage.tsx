
import React from 'react';
import Header from './Header';

interface PrivacyPageProps {
  onBack: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Privacy Policy" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="glass-card p-8 md:p-12 w-full prose max-w-none prose-slate prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-headings:text-gray-800 prose-p:text-gray-600 prose-lg">
                    
                    <div className="text-center mb-10 border-b border-gray-200 pb-8">
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
                        <p className="text-base text-gray-500 font-medium">Effective Date: 26/11/2025</p>
                        <p className="text-sm text-gray-500 mt-2">Applicable for Public Tak Mobile Application and <a href="https://www.publictak.app" target="_blank" rel="noopener noreferrer">www.publictak.app</a></p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div>
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">1. GENERAL</h2>
                                <p className="mb-3"><strong>1.1</strong> Public Tak (“We”, “Us”, “Our”) is committed to protecting the personal information (“Personal Information”) provided by users (“You”, “Your”). By using the Public Tak mobile application and website <a href="https://www.publictak.app" target="_blank" rel="noopener noreferrer">www.publictak.app</a> (“App/Website”), you agree to the collection, storage, use, and management of your information in accordance with this Privacy Policy.</p>
                                <p className="mb-3"><strong>1.2</strong> We prioritize the privacy of our users. Your continued use of the App/Website will be considered acceptance of this policy.</p>
                                <p><strong>1.3</strong> The use of the App/Website is governed by this Privacy Policy and our Terms & Conditions, which together form a legally binding agreement.</p>
                            </section>

                            <section className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
                                <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center gap-2"><span className="material-symbols-outlined">warning</span> 2. USER-GENERATED CONTENT RESPONSIBILITY</h2>
                                <p className="mb-2 text-red-700 font-medium italic">(This section is specially included as per your requirement)</p>
                                <p className="mb-2"><strong>2.1</strong> Public Tak is a user-generated content platform where users can register/login and upload news articles, photos, videos, posts, and other content.</p>
                                <p className="mb-2"><strong>2.2</strong> <span className="font-bold underline decoration-red-500">Users are 100% responsible for any content they upload.</span> Public Tak shall not be responsible for any legal, social, ethical, copyright-related, defamatory, misleading, or harmful issues arising from User Content.</p>
                                <p className="mb-2"><strong>2.3</strong> Users must ensure that their content:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-2 text-gray-700 marker:text-red-500">
                                    <li>Does not violate any law</li>
                                    <li>Does not harm anyone’s reputation</li>
                                    <li>Does not promote hate, violence, discrimination, or misinformation</li>
                                    <li>Does not infringe copyright</li>
                                    <li>Does not contain misleading or fake news</li>
                                </ul>
                                <p className="mb-2"><strong>2.4</strong> If any user-generated content results in a complaint, dispute, legal action, penalty, or damage to any person/organization, the user who posted the content will bear full legal and financial responsibility, not Public Tak.</p>
                                <p><strong>2.5</strong> Public Tak reserves the right to remove, block, report, or suspend/ban any user or content that appears suspicious, offensive, illegal, or inappropriate—without prior notice or explanation.</p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">3. INFORMATION WE COLLECT</h2>
                                
                                <h3 className="text-lg font-semibold mb-2 text-gray-700">3.1 Personal Information (when provided by the user)</h3>
                                <ul className="list-disc pl-5 space-y-1 mb-3">
                                    <li>Name</li>
                                    <li>Email address</li>
                                    <li>Mobile number (if provided)</li>
                                    <li>Profile information</li>
                                    <li>Information submitted during article/post creation</li>
                                </ul>
                                <p className="mb-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">This information is collected only for account creation, login, verification, and platform functionality.</p>

                                <h3 className="text-lg font-semibold mb-2 text-gray-700">3.2 User-Generated Content</h3>
                                <p className="mb-3">When you upload articles, posts, images, videos, or other content, it may be publicly visible on the platform.</p>
                                
                                <h3 className="text-lg font-semibold mb-2 text-gray-700">3.3 Traffic & Device Information</h3>
                                <p className="mb-2">We may automatically collect:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-4">
                                    <li>IP Address</li>
                                    <li>Device details</li>
                                    <li>App/Website interaction data</li>
                                    <li>Approximate location</li>
                                    <li>Browser/OS details</li>
                                    <li>Usage analytics</li>
                                </ul>
                            </section>
                        </div>

                        <div>
                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">4. PURPOSE OF DATA COLLECTION</h2>
                                <p className="mb-3">We use your information for:</p>
                                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                                    <li>Account creation, login, and verification</li>
                                    <li>Enabling users to post news articles/content</li>
                                    <li>Improving App/Website functionality</li>
                                    <li>Fixing bugs, crashes, and technical issues</li>
                                    <li>Enhancing user experience</li>
                                    <li>Preventing misuse, spam, and fake accounts</li>
                                    <li>Security and platform moderation</li>
                                    <li>Analytics and performance measurement</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">5. DATA SHARING</h2>
                                <p className="mb-4">We do not sell or rent your personal data. We may share necessary or non-personal data with:</p>
                                
                                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h3 className="text-lg font-semibold text-blue-700">5.1 Advertising Services</h3>
                                    <p>e.g., <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google AdMob</a> & <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google Adsense</a>. For showing relevant advertisements.</p>
                                </div>

                                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h3 className="text-lg font-semibold text-blue-700">5.2 Analytics Services</h3>
                                    <p>e.g., <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Firebase Analytics</a>. To understand usage behavior and improve performance.</p>
                                </div>

                                <p className="mt-4 text-sm text-gray-500">These services have their own Privacy Policies, which apply additionally. You can also review <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">6. DATA STORAGE & SECURITY</h2>
                                <p className="mb-2">We use appropriate technical and organizational measures to ensure:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-3">
                                    <li>Data security</li>
                                    <li>Prevention of unauthorized access</li>
                                    <li>Protection against data loss or theft</li>
                                </ul>
                                <p className="text-red-500 font-medium bg-red-50 p-2 rounded inline-block">However, no online platform can guarantee 100% security.</p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">7. USER RIGHTS</h2>
                                <p className="mb-2">Users have the right to:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-2">
                                    <li>Request review or correction of their personal information</li>
                                    <li>Request deletion of their personal data</li>
                                    <li>Request restrictions on how their data is used</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">10. GRIEVANCE REDRESSAL</h2>
                                <p className="mb-4">For complaints, queries, or requests, contact:</p>
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 inline-block w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-blue-600">support_agent</span>
                                        <p className="font-bold text-gray-800 text-lg">Grievance Officer</p>
                                    </div>
                                    <p className="text-gray-600">Email: <a href="mailto:support@publictak.app" className="text-blue-600 hover:underline font-medium">support@publictak.app</a></p>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-500">
                        <h3 className="font-bold text-gray-700 mb-2">11. CHANGES TO THIS POLICY</h3>
                        <p>This Privacy Policy may be updated from time to time. Continued use of the App/Website will be considered acceptance of the updated policy.</p>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default PrivacyPage;
