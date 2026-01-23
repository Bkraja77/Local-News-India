
import React, { useState, useEffect, useRef } from 'react';
import { View, User } from './types';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import FeedbackPage from './components/FeedbackPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import AboutPage from './components/AboutPage';
import AdminPage from './components/AdminPage';
import UserPage from './components/UserPage';
import LoginPage from './components/LoginPage';
import CreatePostPage from './components/CreatePostPage';
import CreateVideoPage from './components/CreateVideoPage';
import CreatePostChoicePage from './components/CreatePostChoicePage';
import VideosPage from './components/VideosPage';
import EditPostPage from './components/EditPostPage';
import EditProfilePage from './components/EditProfilePage';
import ManageUsersPage from './components/ManageUsersPage';
import AnalyticsPage from './components/AnalyticsPage';
import ModerateContentPage from './components/ModerateContentPage';
import NotificationsPage from './components/NotificationsPage';
import SiteSettingsPage from './components/SiteSettingsPage';
import SearchPage from './components/SearchPage';
import BottomNavBar from './components/BottomNavBar';
import { auth, db, messaging, serverTimestamp, firebase, arrayUnion } from './firebaseConfig';
import PublicProfilePage from './components/PublicProfilePage';
import AdminEditUserPage from './components/AdminEditUserPage';
import ManageAccountPage from './components/ManageAccountPage';
import ChangePasswordPage from './components/ChangePasswordPage';
import ManageAdsPage from './components/ManageAdsPage';
import ViewFeedbackPage from './components/ViewFeedbackPage';
import PostDetailPage from './components/PostDetailPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Sidebar from './components/Sidebar';
import InstallPWA from './components/InstallPWA';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Main);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [shouldFocusComment, setShouldFocusComment] = useState(false);
  const [userPageInitialTab, setUserPageInitialTab] = useState<'posts' | 'videos' | 'drafts'>('posts');
  const [searchMode, setSearchMode] = useState<'all' | 'video' | 'video-user'>('all');
  const currentViewRef = useRef(currentView);
  const { showToast } = useToast();

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  }, []);

  // --- Push Notification Registration ---
  useEffect(() => {
    if (!currentUser || !messaging) return;

    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await messaging.getToken({
            vapidKey: 'BIsy_7L9i5U7yX9J_X8V6O8_7L9i5U7yX9J_X8V6O8_7L9i5U7yX9J_X8V6O8_7L9i5U7yX9J_X8V6O8'
          });
          
          if (token) {
            await db.collection('users').doc(currentUser.uid).update({
              fcmTokens: arrayUnion(token),
              lastActive: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error("Notification setup failed:", err);
      }
    };

    setupNotifications();

    const unsubscribeMessaging = messaging.onMessage((payload) => {
      showToast(payload.notification?.body || "New notification received!", "success");
      setUnreadNotificationsCount(prev => prev + 1);
    });

    return () => unsubscribeMessaging();
  }, [currentUser, showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('videoId');
    const postId = params.get('postId');
    const userId = params.get('userId');
    const page = params.get('page');

    if (videoId) navigateTo(View.Videos, { videoId });
    else if (postId) navigateTo(View.PostDetail, { postId });
    else if (userId) navigateTo(View.PublicProfile, { userId });
    else if (page === 'login') navigateTo(View.Login);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        const { view, postId, userId, adminUserId, draftId, initialTab, videoId, searchMode } = event.state;
        if (postId) setSelectedPostId(postId);
        if (userId) setSelectedUserId(userId);
        if (videoId) setSelectedVideoId(videoId);
        if (adminUserId) setSelectedUserIdForAdmin(adminUserId);
        if (draftId) setSelectedDraftId(draftId); else setSelectedDraftId(null);
        if (initialTab) setUserPageInitialTab(initialTab);
        setSearchMode(searchMode || 'all');
        setCurrentView(view);
        setShouldFocusComment(false);
      } else setCurrentView(View.Main);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        userDocRef.onSnapshot((doc) => {
            if(doc.exists) {
                 const userData = doc.data();
                 const userObj: User = {
                    uid: firebaseUser.uid,
                    name: userData?.name || firebaseUser.displayName,
                    username: userData?.username || 'user',
                    bio: userData?.bio || '',
                    email: firebaseUser.email,
                    profilePicUrl: userData?.profilePicUrl || firebaseUser.photoURL || `https://api.dicebear.com/8.x/identicon/svg?seed=${firebaseUser.uid}`,
                    role: userData?.role || 'user',
                    preferredState: userData?.preferredState || '',
                    preferredDistrict: userData?.preferredDistrict || '',
                    preferredBlock: userData?.preferredBlock || '',
                };
                setCurrentUser(userObj);
                if (currentViewRef.current === View.Login) navigateTo(View.Main);
            }
        });
        const unsubNotifs = db.collection('users').doc(firebaseUser.uid).collection('notifications')
          .where('read', '==', false)
          .onSnapshot(snap => setUnreadNotificationsCount(snap.size));
        return () => unsubNotifs();
      } else {
          setCurrentUser(null);
          setUnreadNotificationsCount(0);
          if (currentViewRef.current === View.User || currentViewRef.current === View.Admin || currentViewRef.current === View.EditProfile) {
              navigateTo(View.Main);
          }
      }
    });
    return () => unsubAuth();
  }, []);
  
  const navigateTo = (view: View, params: any = {}) => {
    setCurrentView(view);
    if (params.postId) setSelectedPostId(params.postId);
    if (params.userId) setSelectedUserId(params.userId);
    if (params.videoId) setSelectedVideoId(params.videoId); else setSelectedVideoId(null);
    if (params.adminUserId) setSelectedUserIdForAdmin(params.adminUserId);
    if (params.draftId) setSelectedDraftId(params.draftId); else setSelectedDraftId(null);
    if (params.initialTab) setUserPageInitialTab(params.initialTab);
    setSearchMode(params.searchMode || 'all');
    setShouldFocusComment(!!params.focusComment);

    const url = new URL(window.location.origin);
    if (params.videoId) url.searchParams.set('videoId', params.videoId);
    if (params.postId) url.searchParams.set('postId', params.postId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (view === View.Login) url.searchParams.set('page', 'login');

    window.history.pushState({ view, ...params }, '', url.toString());
  };

  const handleLogout = async () => {
      try {
          await auth.signOut();
          showToast("Logged out successfully", "success");
          navigateTo(View.Main);
      } catch (err) {
          showToast("Logout failed", "error");
      }
  };

  const PageWrapper: React.FC<{ view: View, children: React.ReactNode }> = ({ view, children }) => (
    <div className={`w-full h-full flex flex-col ${currentView === view ? 'flex' : 'hidden'}`}>{children}</div>
  );

  return (
    <div className="font-sans text-gray-800 bg-gray-100 h-screen flex overflow-hidden">
        <Sidebar onNavigate={navigateTo} currentUser={currentUser} currentView={currentView} unreadCount={unreadNotificationsCount} onLogout={handleLogout} onLogin={() => navigateTo(View.Login)} />
        <div className="relative flex flex-col flex-1 h-full w-full overflow-hidden">
            <div className="relative flex-1 w-full h-full overflow-hidden md:overflow-y-auto pb-[calc(52px+env(safe-area-inset-bottom))] md:pb-0">
                <PageWrapper view={View.Main}><HomePage onNavigate={navigateTo} currentUser={currentUser} onLogin={() => navigateTo(View.Login)} onLogout={handleLogout} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} onViewUser={id => navigateTo(View.PublicProfile, {userId:id})} onEditPost={id => navigateTo(View.EditPost, {postId:id})} /></PageWrapper>
                <PageWrapper view={View.Videos}><VideosPage onNavigate={navigateTo} currentUser={currentUser} onLogin={() => navigateTo(View.Login)} videoId={selectedVideoId} isCurrentView={currentView === View.Videos} /></PageWrapper>
                <PageWrapper view={View.Search}><SearchPage onNavigate={navigateTo} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} currentUser={currentUser} onViewUser={id => navigateTo(View.PublicProfile, {userId:id})} searchMode={searchMode} /></PageWrapper>
                <PageWrapper view={View.CreatePostChoice}><CreatePostChoicePage onBack={() => window.history.back()} onNavigate={navigateTo} /></PageWrapper>
                <PageWrapper view={View.CreateVideo}><CreateVideoPage onBack={() => window.history.back()} currentUser={currentUser} onNavigate={navigateTo} draftId={selectedDraftId} /></PageWrapper>
                <PageWrapper view={View.CreatePost}><CreatePostPage onBack={() => window.history.back()} currentUser={currentUser} onNavigate={navigateTo} draftId={selectedDraftId} /></PageWrapper>
                <PageWrapper view={View.User}><UserPage onBack={() => window.history.back()} currentUser={currentUser} onLogout={handleLogout} onNavigate={navigateTo} onEditPost={id => navigateTo(View.EditPost, {postId:id})} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} onViewUser={id => navigateTo(View.PublicProfile, {userId:id})} initialTab={userPageInitialTab} /></PageWrapper>
                <PageWrapper view={View.PostDetail}>{selectedPostId && <PostDetailPage postId={selectedPostId} currentUser={currentUser} onBack={() => window.history.back()} onLogin={() => navigateTo(View.Login)} onNavigate={navigateTo} onViewUser={id => navigateTo(View.PublicProfile, {userId:id})} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} onEditPost={id => navigateTo(View.EditPost, {postId:id})} focusComment={shouldFocusComment} />}</PageWrapper>
                <PageWrapper view={View.PublicProfile}>{selectedUserId && <PublicProfilePage userId={selectedUserId} currentUser={currentUser} onBack={() => window.history.back()} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} onLogin={() => navigateTo(View.Login)} onNavigate={navigateTo} onAdminEditUser={id => navigateTo(View.AdminEditUser, {adminUserId:id})} />}</PageWrapper>
                <PageWrapper view={View.Login}><LoginPage onBack={() => window.history.back()} onLoginSuccess={() => navigateTo(View.Main)} /></PageWrapper>
                <PageWrapper view={View.Settings}><SettingsPage onBack={() => window.history.back()} onNavigate={navigateTo} currentUser={currentUser} onLogout={handleLogout} /></PageWrapper>
                <PageWrapper view={View.About}><AboutPage onBack={() => window.history.back()} /></PageWrapper>
                <PageWrapper view={View.Privacy}><PrivacyPage onBack={() => window.history.back()} /></PageWrapper>
                <PageWrapper view={View.Terms}><TermsPage onBack={() => window.history.back()} /></PageWrapper>
                <PageWrapper view={View.Feedback}><FeedbackPage onBack={() => window.history.back()} currentUser={currentUser} onNavigate={navigateTo} /></PageWrapper>
                <PageWrapper view={View.Notifications}><NotificationsPage onBack={() => window.history.back()} currentUser={currentUser} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} onNavigate={navigateTo} /></PageWrapper>
                <PageWrapper view={View.Admin}><AdminPage onBack={() => window.history.back()} currentUser={currentUser} onLogin={() => navigateTo(View.Login)} onLogout={handleLogout} onNavigate={navigateTo} unreadNotificationsCount={unreadNotificationsCount} /></PageWrapper>
                <PageWrapper view={View.ManageUsers}><ManageUsersPage onBack={() => window.history.back()} currentUser={currentUser} onEditUser={id => navigateTo(View.AdminEditUser, {adminUserId:id})} /></PageWrapper>
                <PageWrapper view={View.AdminEditUser}>{selectedUserIdForAdmin && <AdminEditUserPage userId={selectedUserIdForAdmin} onBack={() => window.history.back()} onEditPost={id => navigateTo(View.EditPost, {postId:id})} onViewPost={id => navigateTo(View.PostDetail, {postId:id})} />}</PageWrapper>
                <PageWrapper view={View.ManageAds}><ManageAdsPage onBack={() => window.history.back()} currentUser={currentUser} /></PageWrapper>
                <PageWrapper view={View.Analytics}><AnalyticsPage onBack={() => window.history.back()} currentUser={currentUser} /></PageWrapper>
                <PageWrapper view={View.ModerateContent}><ModerateContentPage onBack={() => window.history.back()} currentUser={currentUser} /></PageWrapper>
                <PageWrapper view={View.ViewFeedback}><ViewFeedbackPage onBack={() => window.history.back()} currentUser={currentUser} /></PageWrapper>
                <PageWrapper view={View.SiteSettings}><SiteSettingsPage onBack={() => window.history.back()} /></PageWrapper>
                <PageWrapper view={View.ManageAccount}><ManageAccountPage onBack={() => window.history.back()} onNavigate={navigateTo} currentUser={currentUser} /></PageWrapper>
                <PageWrapper view={View.ChangePassword}><ChangePasswordPage onBack={() => window.history.back()} /></PageWrapper>
                <PageWrapper view={View.EditProfile}>{currentUser && <EditProfilePage onBack={() => window.history.back()} currentUser={currentUser} onProfileUpdate={(data) => setCurrentUser(prev => prev ? {...prev, ...data} : null)} />}</PageWrapper>
                <PageWrapper view={View.EditPost}>{selectedPostId && currentUser && <EditPostPage postId={selectedPostId} currentUser={currentUser} onBack={() => window.history.back()} />}</PageWrapper>
            </div>
            <BottomNavBar onNavigate={navigateTo} currentUser={currentUser} currentView={currentView} unreadCount={unreadNotificationsCount} />
        </div>
        <InstallPWA />
    </div>
  );
};

const App: React.FC = () => (<LanguageProvider><ToastProvider><AppContent /></ToastProvider></LanguageProvider>);
export default App;
