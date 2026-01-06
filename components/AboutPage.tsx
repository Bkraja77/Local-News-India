
import React from 'react';
import Header from './Header';
import { APP_LOGO_URL } from '../utils/constants';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="About Us" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="glass-card p-8 md:p-12 w-full prose max-w-none prose-lg prose-slate prose-a:text-blue-600 hover:prose-a:text-blue-500">
                    
                    <div className="flex flex-col items-center text-center mb-12">
                        <img 
                            src={APP_LOGO_URL}
                            alt="Public Tak Logo"
                            className="w-28 h-28 object-contain mb-6 drop-shadow-xl hover:scale-105 transition-transform duration-300"
                        />
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4">About Public Tak</h1>
                        <p className="text-xl text-gray-600 max-w-3xl">Your trusted source for daily news and updates from your community and across the nation.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h2>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Our mission is to empower you with information, keeping you connected to your local surroundings and the world. We believe that well-informed citizens are the backbone of a strong society.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Public Tak is designed to bring you timely, accurate, and relevant news that matters to you, focusing on hyper-local content that often goes unnoticed by mainstream media.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Why Choose Us?</h2>
                            <ul className="space-y-4 list-none pl-0">
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-500 mt-1">check_circle</span>
                                    <div>
                                        <strong className="text-gray-900 block">User-Friendly Design</strong>
                                        <span className="text-gray-600 text-sm">Simple, clean interface for a smooth reading experience.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-500 mt-1">check_circle</span>
                                    <div>
                                        <strong className="text-gray-900 block">Fast & Reliable</strong>
                                        <span className="text-gray-600 text-sm">Instant updates and news from verified sources.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-500 mt-1">check_circle</span>
                                    <div>
                                        <strong className="text-gray-900 block">Privacy Focused</strong>
                                        <span className="text-gray-600 text-sm">We respect your privacy and minimize data collection.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Key Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 text-center hover:shadow-md transition-shadow">
                                <span className="material-symbols-outlined text-4xl text-blue-600 mb-3">location_on</span>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Local Focus</h3>
                                <p className="text-sm text-gray-600">Get the latest news from your city, town, and neighborhood.</p>
                            </div>
                            <div className="p-6 bg-green-50 rounded-xl border border-green-100 text-center hover:shadow-md transition-shadow">
                                <span className="material-symbols-outlined text-4xl text-green-600 mb-3">newspaper</span>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Comprehensive</h3>
                                <p className="text-sm text-gray-600">Politics, business, sports, entertainment, technology, and more.</p>
                            </div>
                            <div className="p-6 bg-purple-50 rounded-xl border border-purple-100 text-center hover:shadow-md transition-shadow">
                                <span className="material-symbols-outlined text-4xl text-purple-600 mb-3">breaking_news_alt_1</span>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Live Updates</h3>
                                <p className="text-sm text-gray-600">Stay ahead with breaking news and live event coverage.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                        <p className="text-lg font-medium text-gray-800">Thank you for choosing Public Tak.</p>
                        <p className="text-gray-500">We are constantly working to improve and add new features to bring you the best news experience!</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default AboutPage;