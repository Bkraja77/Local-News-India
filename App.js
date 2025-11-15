import React, { useState, useEffect } from 'react';
import { View, User } from './types';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import FeedbackPage from './components/FeedbackPage';
import PrivacyPage from './components/PrivacyPage';
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
import { auth, db, serverTimestamp } from './firebaseConfig';
import PublicProfilePage from './components/PublicProfilePage';
import AdminEditUserPage from './components/AdminEditUserPage';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Main);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (firebaseUser) {
        // For email/password provider, we must check if the email is verified.
        // Google provider users are considered verified by default.
        const isEmailPasswordProvider = firebaseUser.providerData.some(
          (provider) => provider.providerId === 'password'
        );

        if (isEmailPasswordProvider && !firebaseUser.emailVerified) {
          console.log("Unverified email/password user detected. Signing out.");
          await auth.signOut();
          // The listener will re-run with a null user, correctly updating the state.
          // We can stop processing here for the unverified user.
          return;
        }

        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        
        try {
            const userDocSnap = await userDocRef.get();
            const isAdmin = firebaseUser.email === 'bikash512singh@gmail.com';
            
            // Create user document if it doesn't exist (e.g., after Google Sign-In)
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
                // Ensure admin role is correctly set for existing user
                await userDocRef.update({ role: 'admin' });
            }
        } catch (error) {
            console.error("Error ensuring user document exists:", error);
            await auth.signOut(); // Sign out on error to prevent being in a broken state
            return;
        }

        // Now that the document is guaranteed to exist, listen for real-time updates
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
                 // This case should ideally not be hit after the check above, but as a fallback:
                console.error("User document not found after initial check for UID:", firebaseUser.uid);
                setCurrentUser(null);
            }
            setIsLoadingAuth(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            setCurrentUser(null);
            setIsLoadingAuth(false);
        });

      } else {
        setCurrentUser(null);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);
  
  const navigateTo = (view: View) => {
    setCurrentView(view);
  };
  
  // Automatically navigate away from login page if user is already logged in
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
    navigateTo(View.EditPost);
  };
  
  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId);
    navigateTo(View.PostDetail);
  };

  const handleViewUser = (userId: string) => {
    if (currentUser && userId === currentUser.uid) {
        navigateTo(View.User);
    } else {
        setSelectedUserId(userId);
        navigateTo(View.PublicProfile);
    }
  };

  const handleAdminEditUser = (userId: string) => {
    setSelectedUserIdForAdmin(userId);
    navigateTo(View.AdminEditUser);
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

  const PageWrapper: React.FC<{ view: View, isMain?: boolean, children: React.ReactNode }> = ({ view, isMain = false, children }) => {
    const isActive = currentView === view;
    let transformClass = '';
    if (isActive) {
      transformClass = 'translate-x-0';
    } else {
      if (isMain) {
        if (currentView !== View.Main) {
            transformClass = '-translate-x-full opacity-0';
        }
      } else {
        transformClass = 'translate-x-full opacity-0';
      }
    }
    
    return (
      <div className={`absolute top-0 left-0 w-full h-full flex flex-col transition-all duration-500 ease-out ${transformClass} ${isActive ? 'z-20' : 'z-10'}`}>
        {children}
      </div>
    );
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-800">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  const navBarViews: View[] = [View.Main, View.Search, View.User, View.Notifications];

  return (
    <div className="font-sans text-gray-800">
        <div className="relative flex flex-col h-screen w-full bg-gray-100 shadow-2xl shadow-black/20 overflow-hidden md:max-w-7xl md:mx-auto md:my-5 md:rounded-2xl md:h-[calc(100vh-40px)]">
            <PageWrapper view={View.Main} isMain={true}>
                <HomePage 
                  onNavigate={navigateTo} 
                  currentUser={currentUser}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                  onViewPost={handleViewPost}
                  onViewUser={handleViewUser}
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
                <SettingsPage onBack={() => navigateTo(View.Main)} onNavigate={navigateTo} />
            </PageWrapper>

            <PageWrapper view={View.Login}>
                <LoginPage
                    onBack={() => navigateTo(View.Main)}
                    onLoginSuccess={handleLoginSuccess}
                />
            </PageWrapper>

            <PageWrapper view={View.Admin}>
                <AdminPage 
                    onBack={() => navigateTo(View.Main)} 
                    onNavigate={navigateTo}
                    currentUser={currentUser}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                />
            </PageWrapper>
            
            <PageWrapper view={View.ManageUsers}>
                <ManageUsersPage 
                  onBack={() => navigateTo(View.Admin)} 
                  currentUser={currentUser}
                  onEditUser={handleAdminEditUser}
                />
            </PageWrapper>

            <PageWrapper view={View.AdminEditUser}>
              {selectedUserIdForAdmin && (
                  <AdminEditUserPage
                      userId={selectedUserIdForAdmin}
                      onBack={() => navigateTo(View.ManageUsers)}
                      onEditPost={(postId) => {
                          setSelectedPostId(postId);
                          navigateTo(View.EditPost);
                      }}
                      onViewPost={handleViewPost}
                  />
              )}
            </PageWrapper>

            <PageWrapper view={View.Analytics}>
                <AnalyticsPage onBack={() => navigateTo(View.Admin)} currentUser={currentUser}/>
            </PageWrapper>

             <PageWrapper view={View.ModerateContent}>
                <ModerateContentPage onBack={() => navigateTo(View.Admin)} currentUser={currentUser}/>
            </PageWrapper>
            
            <PageWrapper view={View.Notifications}>
                <NotificationsPage onBack={() => navigateTo(View.Main)} currentUser={currentUser} onViewPost={handleViewPost} />
            </PageWrapper>

            <PageWrapper view={View.SiteSettings}>
                <SiteSettingsPage onBack={() => navigateTo(View.Admin)} />
            </PageWrapper>

            <PageWrapper view={View.User}>
                <UserPage 
                    onBack={() => navigateTo(View.Main)}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onNavigate={navigateTo}
                    onEditPost={handleEditPost}
                    onViewPost={handleViewPost}
                />
            </PageWrapper>

            <PageWrapper view={View.CreatePost}>
                <CreatePostPage
                    onBack={() => navigateTo(View.User)}
                    currentUser={currentUser}
                />
            </PageWrapper>

             <PageWrapper view={View.EditPost}>
                {selectedPostId && currentUser && (
                    <EditPostPage
                        onBack={() => {
                          if (selectedUserIdForAdmin) {
                            navigateTo(View.AdminEditUser);
                          } else {
                            navigateTo(View.User);
                          }
                        }}
                        currentUser={currentUser}
                        postId={selectedPostId}
                    />
                )}
            </PageWrapper>

            <PageWrapper view={View.EditProfile}>
                {currentUser && (
                     <EditProfilePage
                        onBack={() => navigateTo(View.User)}
                        currentUser={currentUser}
                        onProfileUpdate={handleProfileUpdate}
                    />
                )}
            </PageWrapper>
            
            <PageWrapper view={View.PostDetail}>
                {selectedPostId && (
                    <PostDetailPage
                        postId={selectedPostId}
                        currentUser={currentUser}
                        onBack={() => navigateTo(View.Main)}
                        onLogin={handleLogin}
                        onNavigate={navigateTo}
                        onViewUser={handleViewUser}
                        onViewPost={handleViewPost}
                    />
                )}
            </PageWrapper>

            <PageWrapper view={View.PublicProfile}>
                {selectedUserId && (
                    <PublicProfilePage
                        userId={selectedUserId}
                        currentUser={currentUser}
                        onBack={() => navigateTo(View.Main)}
                        onViewPost={handleViewPost}
                        onLogin={handleLogin}
                        onNavigate={navigateTo}
                    />
                )}
            </PageWrapper>
            
            <PageWrapper view={View.Feedback}>
                <FeedbackPage onBack={() => navigateTo(View.Settings)} />
            </PageWrapper>
            
            <PageWrapper view={View.Privacy}>
                <PrivacyPage onBack={() => navigateTo(View.Settings)} />
            </PageWrapper>
            
            <PageWrapper view={View.About}>
                <AboutPage onBack={() => navigateTo(View.Settings)} />
            </PageWrapper>

            {navBarViews.includes(currentView) && (
              <BottomNavBar
                onNavigate={navigateTo}
                currentUser={currentUser}
                currentView={currentView}
                unreadCount={unreadNotificationsCount}
              />
            )}
        </div>
    </div>
  );
};

export default App;
