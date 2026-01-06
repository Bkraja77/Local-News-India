
import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User, Post } from '../types';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { formatCount } from '../utils/formatters';


interface AnalyticsPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const StatCard: React.FC<{ icon: string; value: string; label: string; color: string; }> = ({ icon, value, label, color }) => (
    <div className={`p-6 rounded-2xl shadow-lg flex items-center space-x-5 bg-gradient-to-br ${color} text-white transition-transform hover:scale-105`}>
        <div className="p-3 bg-white/20 rounded-full">
            <span className="material-symbols-outlined text-4xl">{icon}</span>
        </div>
        <div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="opacity-90 text-sm font-medium uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

const SkeletonStat = () => <div className="p-6 rounded-2xl shadow-lg bg-gray-200 animate-pulse h-32"></div>;

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack, currentUser }) => {
    const [userCount, setUserCount] = useState(0);
    const [postCount, setPostCount] = useState(0);
    const [totalViews, setTotalViews] = useState(0);
    const [topPosts, setTopPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            setLoading(false);
            return;
        }

        const handleFirestoreError = (err: Error) => {
            console.error("Firestore error in AnalyticsPage:", err);
            setError("Failed to load analytics data. Ensure your Firestore security rules grant admin access.");
            setLoading(false);
        };

        const unsubUsers = db.collection('users').onSnapshot((snapshot) => {
            setUserCount(snapshot.size);
        }, handleFirestoreError);

        const unsubPosts = db.collection('posts').onSnapshot((snapshot) => {
            let views = 0;
            const postsData = snapshot.docs.map(doc => {
                const data = doc.data();
                views += data.viewCount || 0;
                return { id: doc.id, ...data } as Post;
            });
            setPostCount(snapshot.size);
            setTotalViews(views);
            setError(null);
            setLoading(false);

            const sortedPosts = [...postsData].sort((a, b) => b.viewCount - a.viewCount);
            setTopPosts(sortedPosts.slice(0, 5));
        }, handleFirestoreError);

        return () => {
            unsubUsers();
            unsubPosts();
        };
    }, [currentUser]);

    useEffect(() => {
        if (chartRef.current && topPosts.length > 0) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                const chartConfig: ChartConfiguration = {
                    type: 'bar',
                    data: {
                        labels: topPosts.map(p => p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title),
                        datasets: [{
                            label: 'Views',
                            data: topPosts.map(p => p.viewCount),
                            backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red-500 with opacity
                            borderColor: 'rgba(239, 68, 68, 1)',
                            borderWidth: 1,
                            borderRadius: 8,
                            hoverBackgroundColor: 'rgba(220, 38, 38, 0.9)',
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    title: (tooltipItems) => {
                                        const index = tooltipItems[0].dataIndex;
                                        return topPosts[index].title;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#4b5563' },
                                grid: { color: 'rgba(0, 0, 0, 0.05)' }
                            },
                            x: {
                                ticks: { color: '#4b5563' },
                                grid: { display: false }
                            }
                        }
                    }
                };
                chartInstanceRef.current = new Chart(ctx, chartConfig);
            }
        }
    }, [topPosts]);

    if (currentUser?.role !== 'admin') {
        return (
             <div className="flex flex-col h-full bg-transparent">
                <Header title="Analytics" showBackButton onBack={onBack} />
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
        if(loading) {
            return (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SkeletonStat /><SkeletonStat /><SkeletonStat />
                    </div>
                    <div className="chart-container bg-white/80 animate-pulse border border-gray-200">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="h-64 bg-gray-100 rounded-lg"></div>
                    </div>
                </div>
            );
        }
        if(error) return <div className="text-center text-red-700 bg-red-100 p-4 rounded-lg"><p>{error}</p></div>;

        return (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon="group" value={formatCount(userCount)} label="Total Users" color="from-blue-500 to-cyan-400" />
                    <StatCard icon="article" value={formatCount(postCount)} label="Total Posts" color="from-green-500 to-teal-400" />
                    <StatCard icon="visibility" value={formatCount(totalViews)} label="Total Views" color="from-purple-500 to-pink-400" />
                </div>
                
                <div className="chart-container bg-white/80">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Top 5 Most Viewed Posts</h2>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Real-time</span>
                    </div>
                    <div className="relative h-80">
                        {topPosts.length > 0 ? (
                            <canvas ref={chartRef}></canvas>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Not enough data to display chart.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Analytics" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <div className="w-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AnalyticsPage;
