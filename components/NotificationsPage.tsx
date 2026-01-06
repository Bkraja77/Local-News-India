
import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { db } from '../firebaseConfig';
import { User, Notification } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface NotificationsPageProps {
  onBack: () => void;
  currentUser: User | null;
  onViewPost: (postId: string) => void;
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

    const DELETE_BTN_WIDTH = 80; // Width of the revealed delete button

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;

        // Logic:
        // If currently closed (offset 0), diff < 0 opens it.
        // If currently open (offset -DELETE_BTN_WIDTH), diff > 0 closes it.
        // We calculate a raw new offset based on the current state (isOpen or not).
        // Since we don't persist "isOpen" state explicitly other than offset value, we assume start based on current offset.
        
        // However, standard behavior: just track delta from start.
        // If we started at 0: new = diff.
        // If we started at -80: new = -80 + diff.
        
        let newOffset = diff;
        if (offsetX < 0) { // Assuming it was open
             newOffset = -DELETE_BTN_WIDTH + diff;
        }

        // Constraints
        if (newOffset > 0) newOffset = 0; // Can't swipe right past start
        if (newOffset < -DELETE_BTN_WIDTH * 1.5) newOffset = -DELETE_BTN_WIDTH * 1.5; // Max drag left

        setOffsetX(newOffset);
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        startX.current = null;

        // Snap logic
        if (offsetX < -(DELETE_BTN_WIDTH / 2)) {
            setOffsetX(-DELETE_BTN_WIDTH); // Snap Open
        } else {
            setOffsetX(0); // Snap Close
        }
    };

    const handleContentClick = () => {
        if (offsetX !== 0) {
            setOffsetX(0); // Close if open
        } else {
            onClick(notification); // Normal click
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
            {/* Background Action Layer */}
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

            {/* Foreground Content Layer */}
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
                        src={notification.fromUserProfilePicUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${notification.fromUserName}`} 
                        alt={notification.fromUserName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm pointer-events-none"
                    />
                    <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-white shadow-sm ${getIconColor(notification.type)}`}>
                        <span className="material-symbols-outlined text-[14px] block">{getIcon(notification.type)}</span>
                    </div>
                </div>
                
                <div className="flex-1 min-w-0 pointer-events-none">
                    <p className="text-base text-gray-800 leading-snug pr-2">
                        <span className="font-bold">{notification.fromUserName}</span> {getNotificationText(notification)}
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
                    
                    {/* Desktop Delete Button (Hidden on Mobile as Swipe replaces it) */}
                    <button 
                        onClick={handleDeleteClick}
                        className="hidden md:block p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Notification"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


const NotificationsPage: React.FC<NotificationsPageProps> = ({ onBack, currentUser, onViewPost }) => {
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

    const unsubscribe = db.collection('users')
      .doc(currentUser.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        const fetchedNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Notification));
        setNotifications(fetchedNotifications);
        setLoading(false);
      }, error => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser) return;

    // Mark as read
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

    // Navigate if applicable
    if (notification.postId) {
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
        console.error("Error deleting notification:", error);
        showToast("Failed to delete notification", "error");
    }
  };

  const handleClearAll = async () => {
      if (!currentUser || notifications.length === 0) return;
      setIsDeleting(true);
      
      try {
          const batch = db.batch();
          notifications.forEach(notif => {
              const ref = db.collection('users').doc(currentUser.uid).collection('notifications').doc(notif.id);
              batch.delete(ref);
          });
          
          await batch.commit();
          showToast("All notifications cleared", "success");
      } catch (error) {
          console.error("Error clearing notifications:", error);
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
    switch (notification.type) {
      case 'new_like':
        return `liked your post "${notification.postTitle || 'Untitled'}"`;
      case 'new_comment':
        return `commented on your post "${notification.postTitle || 'Untitled'}"`;
      case 'new_follower':
        return `started following you`;
      case 'new_post':
        return `published a new post "${notification.postTitle || 'Untitled'}"`;
      default:
        return 'interacted with you';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_like': return 'favorite';
      case 'new_comment': return 'chat_bubble';
      case 'new_follower': return 'person_add';
      case 'new_post': return 'article';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'new_like': return 'text-red-500 bg-red-50';
      case 'new_comment': return 'text-blue-500 bg-blue-50';
      case 'new_follower': return 'text-green-500 bg-green-50';
      case 'new_post': return 'text-purple-500 bg-purple-50';
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
                {/* Clear All Button */}
                <div className="flex justify-end px-4 md:px-0">
                    <button 
                        onClick={() => setIsClearModalOpen(true)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        Clear All
                    </button>
                </div>

                <div className="glass-card overflow-hidden w-full">
                    {/* Render Swipeable Items */}
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
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmButtonText={isDeleting ? "Clearing..." : "Clear All"}
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default NotificationsPage;
