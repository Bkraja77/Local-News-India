
import React, { useState, useEffect } from 'react';
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
import EditPostPage from './components/EditPostPage';
import EditProfilePage from './components/EditProfilePage';
import ManageUsersPage from './components/ManageUsersPage';
import AnalyticsPage from './components/AnalyticsPage';
import ModerateContentPage from './components/ModerateContentPage';
import NotificationsPage from './components/NotificationsPage';
import SiteSettingsPage from './components/SiteSettingsPage';
import SearchPage from './components/SearchPage';
import BottomNavBar from './components/BottomNavBar';
import PostDetailPage from './components/PostDetailPage';
import { auth, db, messaging, serverTimestamp, firebase } from './firebaseConfig';
import PublicProfilePage from './components/PublicProfilePage';
import AdminEditUserPage from './components/AdminEditUserPage';
import ManageAccountPage from './components/ManageAccountPage';
import ChangePasswordPage from './components/ChangePasswordPage';
import ManageAdsPage from './components/ManageAdsPage';
import ViewFeedbackPage from './components/ViewFeedbackPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Sidebar from './components/Sidebar';

// Sound effect for foreground notifications
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Gentle chime

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Main);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const { showToast } = useToast();

  // Theme Initialization
  useEffect(() => {
    // Inject Dark Mode Styles
    const style = document.createElement('style');
    style.innerHTML = `
      body.dark-mode {
        --bg-primary: #111827;
        --bg-secondary: #1f2937;
        --text-primary: #f3f4f6;
        --text-secondary: #9ca3af;
        --card-bg: rgba(31, 41, 55, 0.95);
        --card-border: rgba(255, 255, 255, 0.1);
      }
      body.dark-mode .glass-card {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
      }
      body.dark-mode input, body.dark-mode textarea, body.dark-mode select {
        background-color: #374151;
        border-color: #4b5563;
        color: #f3f4f6;
      }
      body.dark-mode .text-gray-800 { color: #f3f4f6; }
      body.dark-mode .text-gray-700 { color: #e5e7eb; }
      body.dark-mode .text-gray-600 { color: #d1d5db; }
      body.dark-mode .text-gray-500 { color: #9ca3af; }
      body.dark-mode .bg-white { background-color: #1f2937; }
      body.dark-mode .bg-gray-100 { background-color: #111827; }
      body.dark-mode .bg-gray-50 { background-color: #374151; }
      body.dark-mode .border-gray-200 { border-color: #374151; }
      body.dark-mode .border-gray-300 { border-color: #4b5563; }
    `;
    document.head.appendChild(style);

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }, []);

  // Deep Link & History Init Handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('postId');
    const userId = params.get('userId');
    
    if (postId) {
      setSelectedPostId(postId);
      setCurrentView(View.PostDetail);
      window.history.replaceState({ view: View.PostDetail, postId }, '', window.location.href);
    } else if (userId) {
        setSelectedUserId(userId);
        setCurrentView(View.PublicProfile);
        window.history.replaceState({ view: View.PublicProfile, userId }, '', window.location.href);
    } else {
        // Default initial state
        window.history.replaceState({ view: View.Main }, '', window.location.href);
    }
  }, []);

  // Back Button / PopState Listener
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        const { view, postId, userId, adminUserId, draftId } = event.state;
        
        // Restore context data if present
        if (postId) setSelectedPostId(postId);
        if (userId) setSelectedUserId(userId);
        if (adminUserId) setSelectedUserIdForAdmin(adminUserId);
        if (draftId) setSelectedDraftId(draftId); else setSelectedDraftId(null);
        
        setCurrentView(view);
      } else {
        // Fallback if no state is present (e.g. very start of history)
        setCurrentView(View.Main);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Push Notification Setup ---
  useEffect(() => {
    if (currentUser && messaging) {
        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Get the token
                    // Using the VAPID key provided by the user
                    const token = await messaging.getToken({ vapidKey: 'BA5MxdxjaYCYjzpCkBaVfYImR71PxhYQpQhQ4CRPq1YzSvhzRLm3p1j7SzfjdojjDvkAeRWwCw21Ab3bCVjYU78' });
                    
                    if (token) {
                        // Save token to Firestore so we can send notifications to this user
                        const userRef = db.collection('users').doc(currentUser.uid);
                        // Using arrayUnion to support multiple devices per user
                        await userRef.update({
                            fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
                        });
                    }
                }
            } catch (error) {
                console.error("Notification permission error:", error);
            }
        };

        requestPermission();

        // Handle foreground messages
        const unsubscribeOnMessage = messaging.onMessage((payload: any) => {
            console.log('Foreground message received:', payload);
            const { title, body } = payload.notification;
            
            // Play Sound
            const audio = new Audio(NOTIFICATION_SOUND_URL);
            audio.play().catch(e => console.log("Audio play failed (interaction needed)", e));

            // Show Toast
            showToast(`${title}: ${body}`, "info");
            
            // Optional: You could show a custom in-app modal here
        });

        return () => {
            if (unsubscribeOnMessage) unsubscribeOnMessage();
        }
    }
  }, [currentUser]);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (firebaseUser) {
        const isEmailPasswordProvider = firebaseUser.providerData.some(
          (provider) => provider.providerId === 'password'
        );

        if (isEmailPasswordProvider && !firebaseUser.emailVerified) {
          await auth.signOut();
          return;
        }

        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        
        // Initial fetch to speed up UI
        userDocRef.get().then((doc) => {
             const defaultUsername = firebaseUser.email ? firebaseUser.email.split('@')[0] : `user${Date.now()}`;
             if(doc.exists) {
                 const userData = doc.data();
                 setCurrentUser({
                    uid: firebaseUser.uid,
                    name: userData?.name || firebaseUser.displayName,
                    username: userData?.username || defaultUsername,
                    bio: userData?.bio || '',
                    email: firebaseUser.email,
                    profilePicUrl: userData?.profilePicUrl || firebaseUser.photoURL || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(firebaseUser.email || firebaseUser.uid)}`,
                    role: userData?.role || 'user',
                    preferredState: userData?.preferredState || '',
                    preferredDistrict: userData?.preferredDistrict || '',
                });
             }
        });

        try {
            const userDocSnap = await userDocRef.get();
            const isAdmin = firebaseUser.email === 'bikash512singh@gmail.com';
            
            if (!userDocSnap.exists) {
                const username = firebaseUser.email ? firebaseUser.email.split('@')[0] : `user${Date.now()}`;
                await userDocRef.set({
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'New User',
                    email: firebaseUser.email,
                    username: username,
                    bio: '',
                    profilePicUrl: firebaseUser.photoURL || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(firebaseUser.email || firebaseUser.uid)}`,
                    role: isAdmin ? 'admin' : 'user',
                    createdAt: serverTimestamp(),
                    isPublic: true,
                });
            } else if (isAdmin && userDocSnap.data()?.role !== 'admin') {
                await userDocRef.update({ role: 'admin' });
            }
        } catch (error) {
            console.error("Error ensuring user document exists:", error);
        }

        unsubscribeFirestore = userDocRef.onSnapshot((userDocSnap) => {
            const defaultUsername = firebaseUser.email ? firebaseUser.email.split('@')[0] : `user${Date.now()}`;
            if (userDocSnap.exists) {
                const userData = userDocSnap.data();
                setCurrentUser({
                    uid: firebaseUser.uid,
                    name: userData.name || firebaseUser.displayName,
                    username: userData.username || defaultUsername,
                    bio: userData.bio || '',
                    email: firebaseUser.email,
                    profilePicUrl: userData.profilePicUrl || firebaseUser.photoURL || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(firebaseUser.email || firebaseUser.uid)}`,
                    role: userData.role || 'user',
                    preferredState: userData.preferredState || '',
                    preferredDistrict: userData.preferredDistrict || '',
                });
            } else {
                setCurrentUser(null);
            }
        }, (error) => {
            console.error("Error listening to user document:", error);
        });

      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);
  
  const navigateTo = (view: View, params: { postId?: string, userId?: string, adminUserId?: string, draftId?: string } = {}) => {
    // Guards against Event objects being passed as 'view'
    if (typeof view !== 'string') {
        console.warn("navigateTo called with invalid view:", view);
        return;
    }

    // Sanitize params to ensure no Event objects or circular structures are passed
    const safeParams: any = {};
    if (params && typeof params === 'object' && params !== null) {
        // Explicitly check for Event-like properties to ignore the whole object if it's an event
        if ('preventDefault' in params || 'target' in params || 'nativeEvent' in params) {
             console.warn("navigateTo received an Event object as params. Ignoring params.");
        } else {
            // Explicitly copy only expected properties
            if (params.postId && typeof params.postId === 'string') safeParams.postId = params.postId;
            if (params.userId && typeof params.userId === 'string') safeParams.userId = params.userId;
            if (params.adminUserId && typeof params.adminUserId === 'string') safeParams.adminUserId = params.adminUserId;
            if (params.draftId && typeof params.draftId === 'string') safeParams.draftId = params.draftId;
        }
    }

    setPreviousView(currentView);
    setCurrentView(view);
    
    // Handle Draft State
    if (safeParams.draftId) {
        setSelectedDraftId(safeParams.draftId);
    } else if (view === View.CreatePost) {
        // If navigating to create post without a specific draft ID (e.g. "New Post" button), clear selection
        setSelectedDraftId(null);
    }

    // Construct URL and History State
    let url = window.location.pathname;
    // We recreate the state object purely from primitives to ensure no circular references
    const state: any = { view, ...safeParams };

    if (view === View.Main) {
        url = '/';
    } else if (view === View.PostDetail && safeParams.postId) {
        url = `?postId=${safeParams.postId}`;
    } else if (view === View.PublicProfile && safeParams.userId) {
        url = `?userId=${safeParams.userId}`;
    }
    
    // Push new state to history
    window.history.pushState(state, '', url);
  };
  
  useEffect(() => {
    if (currentUser && currentView === View.Login) {
      navigateTo(View.Main);
    }
  }, [currentUser, currentView]);

  useEffect(() => {
    if (currentUser) {
      const notificationsRef = db.collection('users').doc(currentUser.uid).collection('notifications');
      const q = notificationsRef.where('read', '==', false);
      const unsubscribe = q.onSnapshot((snapshot) => {
        setUnreadNotificationsCount(snapshot.size);
      });
      return () => unsubscribe();
    } else {
      setUnreadNotificationsCount(0);
    }
  }, [currentUser]);

  const handleEditPost = (postId: string) => {
    setSelectedPostId(postId);
    navigateTo(View.EditPost, { postId });
  };
  
  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId);
    navigateTo(View.PostDetail, { postId });
  };

  const handleViewUser = (userId: string) => {
    if (currentUser && userId === currentUser.uid) {
        navigateTo(View.User);
    } else {
        setSelectedUserId(userId);
        navigateTo(View.PublicProfile, { userId });
    }
  };

  const handleAdminEditUser = (userId: string) => {
    setSelectedUserIdForAdmin(userId);
    navigateTo(View.AdminEditUser, { adminUserId: userId });
  };

  const handleLogin = () => {
    navigateTo(View.Login);
  };

  const handleLoginSuccess = () => {
    navigateTo(View.Main);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigateTo(View.Main);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleProfileUpdate = (updatedData: Partial<User>) => {
    if (currentUser) {
        setCurrentUser(prevUser => ({
            ...prevUser!,
            ...updatedData
        }));
    }
  };

  const handleBack = () => {
      window.history.back();
  };

  const PageWrapper: React.FC<{ view: View, isMain?: boolean, children: React.ReactNode }> = ({ view, isMain = false, children }) => {
    const isActive = currentView === view;
    
    return (
      <div className={`
        w-full h-full flex flex-col
        ${isActive ? 'flex' : 'hidden'}
      `}>
        <div className="w-full h-full md:h-auto">
           {children}
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans text-gray-800 bg-gray-100 h-screen flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar 
            onNavigate={navigateTo} 
            currentUser={currentUser} 
            currentView={currentView} 
            unreadCount={unreadNotificationsCount}
            onLogout={handleLogout}
            onLogin={handleLogin}
        />

        {/* Main Content Area */}
        <div className="relative flex flex-col flex-1 h-full w-full overflow-hidden md:overflow-visible md:bg-gray-100">
            <div className="relative flex-1 w-full h-full overflow-hidden md:overflow-y-auto md:w-full md:flex md:flex-col">
                
                <PageWrapper view={View.Main} isMain={true}>
                    <HomePage 
                      onNavigate={navigateTo} 
                      currentUser={currentUser}
                      onLogin={handleLogin}
                      onLogout={handleLogout}
                      onViewPost={handleViewPost}
                      onViewUser={handleViewUser}
                      onEditPost={handleEditPost}
                    />
                </PageWrapper>

                <PageWrapper view={View.Search}>
                    <SearchPage 
                        onNavigate={navigateTo} 
                        onViewPost={handleViewPost} 
                        currentUser={currentUser}
                        onViewUser={handleViewUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.Settings}>
                    <SettingsPage 
                      onBack={handleBack} 
                      onNavigate={navigateTo} 
                      currentUser={currentUser}
                      onLogout={handleLogout}
                    />
                </PageWrapper>

                <PageWrapper view={View.ManageAccount}>
                    <ManageAccountPage 
                        onBack={handleBack}
                        onNavigate={navigateTo}
                        currentUser={currentUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.ChangePassword}>
                    <ChangePasswordPage
                        onBack={handleBack}
                    />
                </PageWrapper>

                <PageWrapper view={View.Login}>
                    <LoginPage
                        onBack={handleBack}
                        onLoginSuccess={handleLoginSuccess}
                    />
                </PageWrapper>

                <PageWrapper view={View.Admin}>
                    <AdminPage 
                        onBack={handleBack} 
                        onNavigate={navigateTo}
                        currentUser={currentUser}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                    />
                </PageWrapper>
                
                <PageWrapper view={View.ManageUsers}>
                    <ManageUsersPage 
                      onBack={handleBack} 
                      currentUser={currentUser}
                      onEditUser={handleAdminEditUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.ViewFeedback}>
                    <ViewFeedbackPage
                        onBack={handleBack}
                        currentUser={currentUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.AdminEditUser}>
                  {selectedUserIdForAdmin && (
                      <AdminEditUserPage
                          userId={selectedUserIdForAdmin}
                          onBack={handleBack}
                          onEditPost={(postId) => {
                              setSelectedPostId(postId);
                              navigateTo(View.EditPost, { postId });
                          }}
                          onViewPost={handleViewPost}
                      />
                  )}
                </PageWrapper>

                <PageWrapper view={View.ManageAds}>
                    <ManageAdsPage
                        onBack={handleBack}
                        currentUser={currentUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.Analytics}>
                    <AnalyticsPage onBack={handleBack} currentUser={currentUser}/>
                </PageWrapper>

                <PageWrapper view={View.ModerateContent}>
                    <ModerateContentPage onBack={handleBack} currentUser={currentUser}/>
                </PageWrapper>
                
                <PageWrapper view={View.Notifications}>
                    <NotificationsPage onBack={handleBack} currentUser={currentUser} onViewPost={handleViewPost} />
                </PageWrapper>

                <PageWrapper view={View.SiteSettings}>
                    <SiteSettingsPage onBack={handleBack} />
                </PageWrapper>

                <PageWrapper view={View.User}>
                    <UserPage 
                        onBack={handleBack}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onNavigate={navigateTo}
                        onEditPost={handleEditPost}
                        onViewPost={handleViewPost}
                        onViewUser={handleViewUser}
                    />
                </PageWrapper>

                <PageWrapper view={View.CreatePost}>
                    <CreatePostPage
                        onBack={handleBack}
                        currentUser={currentUser}
                        draftId={selectedDraftId}
                    />
                </PageWrapper>

                <PageWrapper view={View.EditPost}>
                    {selectedPostId && currentUser && (
                        <EditPostPage
                            onBack={handleBack}
                            currentUser={currentUser}
                            postId={selectedPostId}
                        />
                    )}
                </PageWrapper>

                <PageWrapper view={View.EditProfile}>
                    {currentUser && (
                        <EditProfilePage
                            onBack={handleBack}
                            currentUser={currentUser}
                            onProfileUpdate={handleProfileUpdate}
                        />
                    )}
                </PageWrapper>
                
                <PageWrapper view={View.PostDetail}>
                    {/* Only render PostDetailPage if it is the current view. 
                        This ensures it unmounts when navigating away (like back to home)
                        and remounts when navigating to it (resetting state and triggering
                        the view count effect on every visit). */}
                    {selectedPostId && currentView === View.PostDetail && (
                        <PostDetailPage
                            postId={selectedPostId}
                            currentUser={currentUser}
                            onBack={handleBack}
                            onLogin={handleLogin}
                            onNavigate={navigateTo}
                            onViewUser={handleViewUser}
                            onViewPost={handleViewPost}
                            onEditPost={handleEditPost}
                        />
                    )}
                </PageWrapper>

                <PageWrapper view={View.PublicProfile}>
                    {selectedUserId && (
                        <PublicProfilePage
                            userId={selectedUserId}
                            currentUser={currentUser}
                            onBack={handleBack}
                            onViewPost={handleViewPost}
                            onLogin={handleLogin}
                            onNavigate={navigateTo}
                            onAdminEditUser={handleAdminEditUser}
                        />
                    )}
                </PageWrapper>
                
                <PageWrapper view={View.Feedback}>
                    <FeedbackPage onBack={handleBack} currentUser={currentUser} onNavigate={navigateTo} />
                </PageWrapper>
                
                <PageWrapper view={View.Privacy}>
                    <PrivacyPage onBack={handleBack} />
                </PageWrapper>

                <PageWrapper view={View.Terms}>
                    <TermsPage onBack={handleBack} />
                </PageWrapper>
                
                <PageWrapper view={View.About}>
                    <AboutPage onBack={handleBack} />
                </PageWrapper>
            </div>

            <BottomNavBar
                onNavigate={navigateTo}
                currentUser={currentUser}
                currentView={currentView}
                unreadCount={unreadNotificationsCount}
            />
        </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
};

export default App;
