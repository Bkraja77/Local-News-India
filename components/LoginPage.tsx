
import React, { useState, useEffect } from 'react';
import { auth, db, firebase, serverTimestamp } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { APP_LOGO_URL } from '../utils/constants';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <div className={`flex items-center text-xs transition-colors ${isValid ? 'text-green-600' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined mr-1 text-sm">
            {isValid ? 'check_circle' : 'circle'}
        </span>
        {text}
    </div>
);

const LoginPage: React.FC<LoginPageProps> = ({ onBack, onLoginSuccess }) => {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [showResetMessage, setShowResetMessage] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const { t } = useLanguage();
    const { showToast } = useToast();

    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });
    
    // Clear fields when switching modes
    useEffect(() => {
        setEmail('');
        setPassword('');
        setName('');
        setConfirmPassword('');
        setError(null);
    }, [authMode]);

    useEffect(() => {
        setPasswordCriteria({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            specialChar: /[\W_]/.test(password),
        });
    }, [password]);

    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            showToast("Logged in with Google successfully!", "success");
        } catch (error: any) {
            console.error("Google login error:", error);
            
            let msg = "Google Login failed";
            if (error.code === 'auth/popup-closed-by-user') {
                msg = "Login canceled by user";
            } else if (error.code === 'auth/popup-blocked') {
                msg = "Popup blocked. Please allow popups for this site.";
            } else if (error.message) {
                msg = error.message;
            }
            
            setError(msg);
            showToast(msg, "error");
        }
    };

    const handlePasswordReset = async () => {
        setError(null);
        setShowResetMessage(false);
        if (!email.trim()) {
            setError('Please enter your email address to reset your password.');
            showToast("Please enter your email", "info");
            return;
        }
        setIsLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            setShowResetMessage(true);
            showToast("Password reset email sent", "success");
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                setShowResetMessage(true); // Security: don't reveal if user exists
                showToast("If account exists, email sent", "info");
            } else {
                setError(error.message);
                showToast(error.message, "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setShowResetMessage(false);
        setIsLoading(true);

        if (authMode === 'signup' && !name.trim()) {
            setError('Please enter your full name.');
            setIsLoading(false);
            return;
        }
        if (!email.trim()) {
            setError('Please enter your email address.');
            setIsLoading(false);
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            setIsLoading(false);
            return;
        }

        if (authMode === 'signup') {
            const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
            if (!allCriteriaMet) {
                setError('Password does not meet all the requirements.');
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                setIsLoading(false);
                return;
            }
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (!user) throw new Error("Could not create user account.");
                
                // Generate username from Name
                const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const username = `${cleanName}${randomSuffix}`;

                const profilePicUrl = `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(email)}`;
                await user.updateProfile({
                    displayName: name,
                    photoURL: profilePicUrl,
                });

                // Create User Document in Firestore immediately to ensure username is set from Name
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: name,
                    email: email,
                    username: username, // Link generated from name
                    bio: '',
                    profilePicUrl: profilePicUrl,
                    role: 'user',
                    createdAt: serverTimestamp(),
                    isPublic: true,
                });
                
                await user.sendEmailVerification();
                showToast("Verification email sent!", "success");

                setShowVerificationMessage(true);
                await auth.signOut();

            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    setError('This email address is already in use by another account. Please log in or use a different email.');
                    showToast("Email already in use", "error");
                } else {
                    setError(error.message);
                    showToast(error.message, "error");
                }
            } finally {
                setIsLoading(false);
            }
        } else { // Login mode
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                if (user && !user.emailVerified) {
                    setError('Please verify your email address. Check your inbox for a verification link.');
                    showToast("Email not verified", "error");
                    await auth.signOut();
                    setIsLoading(false);
                    return;
                }

                if (user && user.email === 'bikash512singh@gmail.com') {
                    const userDocRef = db.collection("users").doc(user.uid);
                    await userDocRef.set({ role: 'admin' }, { merge: true });
                }

                showToast("Welcome back!", "success");
                
                // Do NOT call onLoginSuccess() here.
                // We let the central auth listener in App.tsx handle the navigation when the user state updates.
            } catch (error: any) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                     setError('Incorrect email or password. Please try again.');
                     showToast("Invalid credentials", "error");
                } else {
                     setError(error.message);
                     showToast(error.message, "error");
                }
                setIsLoading(false); // Only stop loading if there was an error
            } 
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Top Red Header Strip */}
            <div className="w-full h-14 bg-red-600 flex items-center justify-between px-4 shadow-md shrink-0 z-20">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-white font-bold text-lg tracking-wide">
                    {authMode === 'login' ? 'Login' : 'Sign Up'}
                </h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>
            
            {/* Scrollable Main Content */}
            <main className="flex-grow overflow-y-auto scrollbar-thin md:scrollbar-default">
                <div className="flex items-center justify-center min-h-full p-4 md:p-8">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-300 border border-gray-100">
                        
                        {/* Logo Section - Top of Card */}
                        <div className="flex justify-center pt-8 pb-4">
                            <div className="bg-white p-2 rounded-full">
                                <img 
                                    src={APP_LOGO_URL}
                                    alt="Public Tak Logo" 
                                    className="w-20 h-20 object-contain drop-shadow-md hover:scale-105 transition-transform"
                                />
                            </div>
                        </div>

                        <div className="px-8 pb-8">
                            {showVerificationMessage ? (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-symbols-outlined text-4xl text-green-600">mark_email_read</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email</h2>
                                    <p className="text-gray-500 mb-8 leading-relaxed">
                                        We've sent a verification link to <strong>{email}</strong>. Please verify your account to continue.
                                    </p>
                                    <button
                                        onClick={() => { setShowVerificationMessage(false); setAuthMode('login'); }}
                                        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            {authMode === 'login' ? t('welcome') : t('createAccount')}
                                        </h2>
                                        <p className="text-gray-500 text-sm mt-1">
                                            {authMode === 'login' ? 'Please sign in to continue' : 'Join Public Tak for local updates'}
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {error && (
                                            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 font-medium">
                                                {error}
                                            </div>
                                        )}
                                        
                                        {showResetMessage && (
                                            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded text-xs text-green-700 font-medium">
                                                Password reset email sent. Check your inbox.
                                            </div>
                                        )}

                                        {authMode === 'signup' && (
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors">person</span>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    required
                                                    placeholder={t('fullName')}
                                                    autoComplete="name"
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all text-gray-800 text-sm font-medium placeholder:text-gray-400"
                                                />
                                            </div>
                                        )}

                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors">email</span>
                                            <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                required
                                                placeholder={t('email')}
                                                autoComplete="email"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all text-gray-800 text-sm font-medium placeholder:text-gray-400"
                                            />
                                        </div>

                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors">lock</span>
                                            <input
                                                type={isPasswordVisible ? 'text' : 'password'}
                                                id="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                                placeholder={t('password')}
                                                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all text-gray-800 text-sm font-medium placeholder:text-gray-400"
                                            />
                                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                                <span className="material-symbols-outlined text-lg">
                                                    {isPasswordVisible ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>

                                        {authMode === 'signup' && (
                                            <>
                                                <div className="relative group">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors">lock_reset</span>
                                                    <input
                                                        type={isConfirmPasswordVisible ? 'text' : 'password'}
                                                        id="confirm-password"
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        required
                                                        placeholder={t('confirmPassword')}
                                                        autoComplete="new-password"
                                                        className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all text-gray-800 text-sm font-medium placeholder:text-gray-400"
                                                    />
                                                    <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                                                        <span className="material-symbols-outlined text-lg">
                                                            {isConfirmPasswordVisible ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 pl-1">
                                                    <PasswordRequirement isValid={passwordCriteria.length} text="8+ chars" />
                                                    <PasswordRequirement isValid={passwordCriteria.uppercase} text="Uppercase" />
                                                    <PasswordRequirement isValid={passwordCriteria.lowercase} text="Lowercase" />
                                                    <PasswordRequirement isValid={passwordCriteria.number} text="Number" />
                                                    <PasswordRequirement isValid={passwordCriteria.specialChar} text="Special char" />
                                                </div>
                                            </>
                                        )}

                                        {authMode === 'login' && (
                                            <div className="flex justify-end -mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handlePasswordReset}
                                                    disabled={isLoading}
                                                    className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                                                >
                                                    {t('forgotPassword')}
                                                </button>
                                            </div>
                                        )}

                                        <button 
                                            type="submit" 
                                            disabled={isLoading}
                                            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    {t('loading')}
                                                </span>
                                            ) : (
                                                authMode === 'login' ? t('login') : t('signup')
                                            )}
                                        </button>
                                    </form>

                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-3 bg-white text-gray-400 font-medium">OR</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGoogleLogin} 
                                        className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group active:scale-95 duration-200"
                                    >
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                                        <span className="font-semibold text-gray-700 group-hover:text-gray-900 text-sm">{t('continueWithGoogle')}</span>
                                    </button>

                                    <div className="mt-8 text-center">
                                        <p className="text-gray-600 text-sm">
                                            {authMode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
                                            <button 
                                                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }} 
                                                className="ml-2 font-bold text-red-600 hover:text-red-700 hover:underline transition-colors"
                                            >
                                                {authMode === 'login' ? t('signup') : t('login')}
                                            </button>
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;