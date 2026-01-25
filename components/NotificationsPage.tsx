
import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User, Notification, View } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface NotificationsPageProps {
  onBack: () => void;
  currentUser: User | null;
  onViewPost: (postId: string) => void;
  onNavigate: (view: View, params?: any) => void;
}

const SkeletonNotification = () => (
  <div className="p-4 md:p-5 flex items-center gap-4 animate-pulse border-b border-gray-50">
    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// --- Swipeable Notification Item Component ---
interface SwipeableItemProps {
    notification: Notification;
    onClick: (notification: Notification) => void;
    onDelete: (id: string) => void;
    getIcon: (type: string) => string;
    getIconColor: (type: string) => string;
    getNotificationText: (n: Notification) => string;
    timeAgo: (d: Date) => string;
}

const SwipeableNotificationItem: React.FC<SwipeableItemProps> = ({ 
    notification, onClick, onDelete, getIcon, getIconColor, getNotificationText, timeAgo 
}) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef<number | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const DELETE_BTN_WIDTH = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;

        let newOffset = diff;
        if (offsetX < 0) {
             newOffset = -DELETE_BTN_WIDTH + diff;
        }

        if (newOffset > 0) newOffset = 0;
        if (newOffset < -DELETE_BTN_WIDTH * 1.5) newOffset = -DELETE_BTN_WIDTH * 1.5;

        setOffsetX(newOffset);
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        startX.current = null;

        if (offsetX < -(DELETE_BTN_WIDTH / 2)) {
            setOffsetX(-DELETE_BTN_WIDTH);
        } else {
            setOffsetX(0);
        }
    };

    const handleContentClick = () => {
        if (offsetX !== 0) {
            setOffsetX(0);
        } else {
            onClick(notification);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(notification.id);
        setOffsetX(0);
    };

    const bgClass = !notification.read ? 'bg-blue-50/60 border-l-4 border-blue-500' : 'bg-white border-l-4 border-transparent';

    return (
        <div className="relative overflow-hidden border-b border-gray-100 last:border-b-0 select-none">
            <div className="absolute inset-y-0 right-0 w-full bg-red-600 flex justify-end items-center z-0">
                <button 
                    onClick={handleDeleteClick}
                    className="h-full flex flex-col items-center justify-center text-white px-6 active:bg-red-700 transition-colors"
                    style={{ width: `${DELETE_BTN_WIDTH}px` }}
                >
                    <span className="material-symbols-outlined text-2xl">delete</span>
                    <span className="text-[10px] font-bold uppercase mt-1">Delete</span>
                </button>
            </div>

            <div 
                ref={itemRef}
                className={`relative z-10 w-full p-4 md:p-5 flex items-center gap-4 ${bgClass}`}
                style={{ 
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleContentClick}
            >
                <div className="relative flex-shrink-0">
                    <img 
                        src={notification.fromUserProfilePicUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${notification.fromUserName || notification.id}`} 
                        alt={notification.fromUserName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm pointer-events-none"
                    />
                    <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-white shadow-sm ${getIconColor(notification.type)}`}>
                        <span className="material-symbols-outlined text-[14px] block">{getIcon(notification.type)}</span>
                    </div>
                </div>
                
                <div className="flex-1 min-w-0 pointer-events-none">
                    <p className="text-base text-gray-800 leading-snug pr-2">
                        {notification.type === 'global_broadcast' ? (
                            <><span className="font-bold text-red-600">OFFICIAL:</span> {notification.message}</>
                        ) : (
                            <><span className="font-bold">{notification.fromUserName}</span> {getNotificationText(notification)}</>
                        )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {timeAgo(notification.createdAt)}
                    </p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>
                    )}
                </div>
            </div>
        </div>
    );
};


const NotificationsPage: React.FC<NotificationsPageProps> = ({ onBack, currentUser, onViewPost, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsubPersonal = db.collection('users')
      .doc(currentUser.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(30);

    const unsubGlobal = db.collection('global_notifications')
      .orderBy('createdAt', 'desc')
      .limit(10);

    const unsubscribePersonal = unsubPersonal.onSnapshot(pSnap => {
        const personal = pSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Notification));

        unsubGlobal.get().then(gSnap => {
            const global = gSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'global_broadcast',
                fromUserName: 'Public Tak Team',
                read: true, // Broadcasts are usually informational
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as Notification));

            const combined = [...personal, ...global].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setNotifications(combined);
            setLoading(false);
        });
    });

    return () => unsubscribePersonal();
  }, [currentUser]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser) return;
    if (notification.type === 'global_broadcast') return;

    if (!notification.read) {
      try {
        await db.collection('users')
          .doc(currentUser.uid)
          .collection('notifications')
          .doc(notification.id)
          .update({ read: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    if (notification.videoId) {
        onNavigate(View.Videos, { videoId: notification.videoId });
    } else if (notification.postId) {
        onViewPost(notification.postId);
    }
  };

  const handleDeleteOne = async (notificationId: string) => {
    if (!currentUser) return;
    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('notifications')
            .doc(notificationId)
            .delete();
        showToast("Notification removed", "success");
    } catch (error) {
        // Might be a global notification (can't delete globally from here)
    }
  };

  const handleClearAll = async () => {
      if (!currentUser || notifications.length === 0) return;
      setIsDeleting(true);
      try {
          const batch = db.batch();
          notifications.forEach(notif => {
              if (notif.type !== 'global_broadcast') {
                const ref = db.collection('users').doc(currentUser.uid).collection('notifications').doc(notif.id);
                batch.delete(ref);
              }
          });
          await batch.commit();
          showToast("Personal notifications cleared", "success");
      } catch (error) {
          showToast("Failed to clear notifications", "error");
      } finally {
          setIsDeleting(false);
          setIsClearModalOpen(false);
      }
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationText = (notification: Notification) => {
    const contentName = notification.videoId ? 'video' : 'post';
    const title = notification.postTitle || 'Untitled';
    
    switch (notification.type) {
      case 'new_like':
        return `liked your ${contentName} "${title}"`;
      case 'new_comment':
        return `commented on your ${contentName} "${title}"`;
      case 'new_share':
        return `shared your video news "${title}"`;
      case 'new_follower':
        return `started following you`;
      case 'new_post':
        return `published a new post "${title}"`;
      case 'new_video':
        return `published a new video news "${title}"`;
      default:
        return 'interacted with you';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_like': return 'favorite';
      case 'new_comment': return 'chat_bubble';
      case 'new_share': return 'share';
      case 'new_follower': return 'person_add';
      case 'new_post': return 'article';
      case 'new_video': return 'movie';
      case 'global_broadcast': return 'campaign';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'new_like': return 'text-red-500 bg-red-50';
      case 'new_comment': return 'text-blue-500 bg-blue-50';
      case 'new_share': return 'text-green-500 bg-green-50';
      case 'new_follower': return 'text-purple-500 bg-purple-50';
      case 'new_post': return 'text-indigo-500 bg-indigo-50';
      case 'new_video': return 'text-orange-500 bg-orange-50';
      case 'global_broadcast': return 'text-white bg-red-600 animate-pulse';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <Header title={t('notifications')} showBackButton onBack={onBack} />
      <main className="flex-grow overflow-y-auto p-0 md:p-6 pb-20">
        <div className="w-full">
          {!currentUser ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">lock</span>
              <p className="text-lg font-medium">Please log in to see notifications.</p>
            </div>
          ) : loading ? (
            <div className="glass-card overflow-hidden w-full divide-y divide-gray-100">
              {[...Array(8)].map((_, i) => <SkeletonNotification key={i} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <span className="material-symbols-outlined text-8xl text-gray-200 mb-6">notifications_off</span>
              <p className="text-xl font-medium text-gray-600">No notifications yet.</p>
              <p className="text-sm mt-2 text-gray-400">We'll let you know when something happens.</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
                <div className="flex justify-end px-4 md:px-0">
                    <button 
                        onClick={() => setIsClearModalOpen(true)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        Clear Personal
                    </button>
                </div>

                <div className="glass-card overflow-hidden w-full">
                    <div>
                        {notifications.map(notification => (
                            <SwipeableNotificationItem
                                key={notification.id}
                                notification={notification}
                                onClick={handleNotificationClick}
                                onDelete={handleDeleteOne}
                                getIcon={getIcon}
                                getIconColor={getIconColor}
                                getNotificationText={getNotificationText}
                                timeAgo={timeAgo}
                            />
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAll}
        title="Clear Notifications"
        message="Are you sure you want to delete your personal notifications? Broadcasts will remain."
        confirmButtonText={isDeleting ? "Clearing..." : "Clear"}
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default NotificationsPage;
