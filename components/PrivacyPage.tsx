import React from 'react';
import Header from './Header';

interface PrivacyPageProps {
  onBack: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Privacy Policy" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="glass-card p-6 prose max-w-4xl mx-auto prose-a:text-blue-600 hover:prose-a:text-blue-500">
                <h1>Privacy Policy</h1>
                <p>Effective Date: 27/06/2025</p>
                <p>This Privacy Policy applies to the application <strong>Local News India</strong>, developed by <b>Bikash Kumar Singh</b>. Your privacy is important to us, and we are committed to safeguarding your personal data while you use our apps.</p>
                <h2>1. Information We Collect</h2>
                <ul>
                    <li><strong>Personal Data:</strong> We do not collect personal data such as your name, email address, or contact details.</li>
                    <li><strong>Non-Personal Data:</strong> We may collect non-personal information, such as:
                        <ul>
                            <li>Device information (e.g., device type, operating system).</li>
                            <li>App usage statistics (e.g., features used, session duration).</li>
                            <li>Crash logs and performance data for troubleshooting.</li>
                        </ul>
                    </li>
                </ul>
                <h2>2. Purpose of Data Collection</h2>
                <p>We collect non-personal data to:</p>
                <ul>
                    <li>Improve app functionality and performance.</li>
                    <li>Analyze user behavior to enhance user experience.</li>
                    <li>Resolve technical issues and bugs.</li>
                </ul>
                <h2>3. Data Storage and Security</h2>
                <p>All data collected is stored securely using industry-standard practices. We ensure your data is protected from unauthorized access, alteration, disclosure, or destruction.</p>
                <h2>4. Data Sharing</h2>
                <p>We do not sell, trade, or rent your data to third parties. However, we may share non-personal data with third-party services like:</p>
                <ul>
                    <li><a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">AdMob</a>: For displaying ads.</li>
                    <li><a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google Analytics</a>: For tracking app usage and performance.</li>
                </ul>
                <p>These services have their own privacy policies. Please review them for more details.</p>
                <h2>5. User Rights</h2>
                <p>You have the following rights:</p>
                <ul>
                    <li>Request access to any data collected about you.</li>
                    <li>Request the deletion of your data.</li>
                    <li>Opt-out of non-personal data collection for analytics and advertising.</li>
                </ul>
                <p>To exercise these rights, contact us at <a href="mailto:bikash512singh@gmail.com">bikash512singh@gmail.com</a>.</p>
                <h2>6. Third-Party Services</h2>
                <p>We use third-party services to enhance app functionality and deliver ads. These services may collect data in accordance with their privacy policies. Please review their policies for details:</p>
                <ul>
                    <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                </ul>
                <h2>7. Children’s Privacy</h2>
                <p>Our apps are not intended for use by children under the age of 13. We do not knowingly collect data from children. If you believe a child has provided us with personal information, contact us, and we will delete it.</p>
                <h2>8. Policy Updates</h2>
                <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page, with the effective date updated accordingly. We encourage you to review this policy periodically.</p>
                <h2>9. Contact Information</h2>
                <p>If you have any questions or concerns about this Privacy Policy, please contact us:</p>
                <p><strong>Email:</strong> <a href="mailto:bikash512singh@gmail.com">bikash512singh@gmail.com</a></p>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPage;