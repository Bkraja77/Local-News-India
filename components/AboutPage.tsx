import React from 'react';
import Header from './Header';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="About Us" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="glass-card p-6 prose max-w-4xl mx-auto prose-a:text-blue-600 hover:prose-a:text-blue-500">
                    <h1>About Local News India</h1>
                    <p>Welcome to Local News India, your trusted source for daily news and updates from your community and across the nation. This app is designed to bring you timely, accurate, and relevant news that matters to you.</p>
                    <p>Our mission is to empower you with information, keeping you connected to your local surroundings and the world.</p>
                    
                    <h2>Our Key Features</h2>
                    <p>We focus on delivering a seamless news reading experience:</p>
                    <ul>
                        <li><b>Local Focus:</b> Get the latest news from your city, town, and neighborhood, ensuring you stay informed about what's happening right where you are.</li>
                        <li><b>Comprehensive Coverage:</b> We cover a wide range of topics including politics, business, sports, entertainment, technology, and lifestyle.</li>
                        <li><b>Live Updates:</b> Stay ahead with breaking news and live event coverage as it happens.</li>
                    </ul>

                    <h2>Why Choose Us?</h2>
                    <ul>
                        <li><b>User-Friendly Design:</b> We believe a news app should be simple and easy to navigate. Our clean interface ensures a smooth reading experience for everyone.</li>
                        <li><b>Completely Offline:</b> Your convenience is paramount. You can read news articles even without an active internet connection.</li>
                        <li><b>No Data Collection:</b> As stated in our Privacy Policy, we do not collect, save, or transmit any personal information. Your privacy is respected.</li>
                        <li><b>Fast & Reliable:</b> Get instant updates and news from verified sources.</li>
                    </ul>
                    <p>Thank you for choosing Local News India. We are constantly working to improve and add new features to bring you the best news experience!</p>
                </div>
            </main>
        </div>
    );
};
export default AboutPage;