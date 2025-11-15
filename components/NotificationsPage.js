import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User, Notification } from '../types';

interface NotificationsPageProps {
  onBack: () => void;
  currentUser: User | null;
  onViewPost: (postId: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onBack, currentUser, onViewPost }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const notificationsRef = db.collection('users').doc(currentUser.uid).collection('notifications');
    const q = notificationsRef.orderBy('createdAt', 'desc');

    const unsubscribe = q.onSnapshot((snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Notification));
      setNotifications(fetchedNotifications);
      setLoading(false);
      markNotificationsAsRead(fetchedNotifications);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    const markNotificationsAsRead = async (notificationsToMark: Notification[]) => {
      const unread = notificationsToMark.filter(n => !n.read);
      if (unread.length > 0 && currentUser) {
        const batch = db.batch();
        unread.forEach(notification => {
          const notificationDocRef = db.doc(`users/${currentUser.uid}/notifications/${notification.id}`);
          batch.update(notificationDocRef, { read: true });
        });
        await batch.commit().catch(e => console.error("Failed to mark notifications as read:", e));
      }
    };

    return () => unsubscribe();
  }, [currentUser]);

  const timeAgo = (date: Date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-center text-gray-500 mt-8">Loading notifications...</p>;
    }
    if (!currentUser) {
       return <p className="text-center text-gray-500 mt-8">Please log in to see your notifications.</p>;
    }
    if (notifications.length === 0) {
      return (
        <div className="text-center py-10 flex flex-col items-center">
            <span className="material-symbols-outlined text-8xl text-gray-400 mb-4">notifications_off</span>
            <p className="text-gray-500">You don't have any notifications yet.</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-gray-200">
        {notifications.map(notification => {
          const handleNotificationClick = () => {
            if (notification.postId) {
                onViewPost(notification.postId);
            }
          };
      
          let message: React.ReactNode;
          switch (notification.type) {
              case 'new_follower':
                  message = <>started following you.</>;
                  break;
              case 'new_like':
                  message = <>liked your post: <span className="font-semibold italic text-blue-600">"{notification.postTitle}"</span></>;
                  break;
              case 'new_comment':
                  message = <>commented on your post: <span className="font-semibold italic text-blue-600">"{notification.postTitle}"</span></>;
                  break;
              case 'new_post':
                  message = <>published a new post: <span className="font-semibold italic text-blue-600">"{notification.postTitle}"</span></>;
                  break;
              default:
                  message = <>sent you a notification.</>;
          }
          
          return (
            <div 
                key={notification.id} 
                className={`p-4 flex items-start gap-4 transition-colors ${!notification.read ? 'bg-blue-500/10' : 'bg-transparent'} ${notification.postId ? 'cursor-pointer hover:bg-black/5' : ''}`}
                onClick={handleNotificationClick}
            >
              <img src={notification.fromUserProfilePicUrl} alt={notification.fromUserName} className="w-10 h-10 rounded-full object-cover"/>
              <div className="flex-grow">
                <p className="text-gray-700">
                  <span className="font-bold text-gray-900">{notification.fromUserName}</span> {message}
                </p>
                <p className="text-xs text-gray-500">{timeAgo(notification.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <Header title="Notifications" showBackButton onBack={onBack} />
      <main className="flex-grow overflow-y-auto pb-20">
        {renderContent()}
      </main>
    </div>
  );
};

export default NotificationsPage;
