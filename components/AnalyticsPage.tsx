import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User, Post } from '../types';
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';


interface AnalyticsPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const StatCard: React.FC<{ icon: string; value: string; label: string; color: string; }> = ({ icon, value, label, color }) => (
    <div className={`p-6 rounded-xl shadow-lg flex items-center space-x-4 bg-gradient-to-br ${color}`}>
        <span className="material-symbols-outlined text-4xl text-white">{icon}</span>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-white/80">{label}</p>
        </div>
    </div>
);

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
                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            borderRadius: 5,
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
        if(loading) return <p className="text-center text-gray-500">Loading analytics...</p>;
        if(error) return <div className="text-center text-red-700 bg-red-100 p-4 rounded-lg"><p>{error}</p></div>;

        return (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon="group" value={userCount.toLocaleString()} label="Total Users" color="from-blue-500 to-cyan-400" />
                    <StatCard icon="article" value={postCount.toLocaleString()} label="Total Posts" color="from-green-500 to-teal-400" />
                    <StatCard icon="visibility" value={totalViews.toLocaleString()} label="Total Views" color="from-purple-500 to-pink-400" />
                </div>
                
                <div className="chart-container">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Top 5 Most Viewed Posts</h2>
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
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <div className="max-w-6xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AnalyticsPage;
