
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { auth, db, firebase } from '../firebaseConfig';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <div className={`flex items-center text-sm transition-colors ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
        <span className="material-symbols-outlined mr-2 text-base">
            {isValid ? 'check_circle' : 'cancel'}
        </span>
        {text}
    </div>
);

const FormLabel: React.FC<{ htmlFor: string; text: string }> = ({ htmlFor, text }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {text} <span className="text-red-500">*</span>
    </label>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
     <input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
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

    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });
    
    // Pre-fill for admin user for convenience
    useEffect(() => {
        if (authMode === 'login') {
            setEmail('bikash512singh@gmail.com');
            setPassword('BabiTa512$#@');
        } else {
            setEmail('');
            setPassword('');
        }
    }, [authMode]);

    // NOTE: The logic for handling the redirect result has been moved to App.tsx
    // to avoid using `getRedirectResult()` in a potentially sandboxed environment.
    // App.tsx's `onAuthStateChanged` will now handle creating the user document.

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
            // Use redirect method which is more compatible with iframe environments.
            // The result is handled centrally by onAuthStateChanged in App.tsx.
            await auth.signInWithRedirect(provider);
        } catch (error: any) {
            console.error("Google login error:", error);
            setError(error.message);
        }
    };

    const handlePasswordReset = async () => {
        setError(null);
        setShowResetMessage(false);
        if (!email.trim()) {
            setError('Please enter your email address to reset your password.');
            return;
        }
        setIsLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            setShowResetMessage(true);
        } catch (error: any) {
            // For security, show a generic success message even if user not found, to prevent email enumeration.
            if (error.code === 'auth/user-not-found') {
                setShowResetMessage(true);
            } else {
                setError(error.message);
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
                
                // Update the Firebase Auth user profile. The onAuthStateChanged listener
                // in App.tsx will use this information to create the Firestore user document.
                const profilePicUrl = `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(email)}`;
                await user.updateProfile({
                    displayName: name,
                    photoURL: profilePicUrl,
                });
                
                await user.sendEmailVerification();
                alert("A verification link has been sent to your email. Please check your inbox and spam folder to activate your account.");

                // NOTE: User document creation is now handled centrally by the onAuthStateChanged
                // listener in App.tsx to prevent race conditions and keep logic in one place.

                setShowVerificationMessage(true);
                // Sign out to force user to log in after verification.
                await auth.signOut();

            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    setError('This email address is already in use by another account. Please log in or use a different email.');
                } else {
                    setError(error.message);
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
                    await auth.signOut();
                    setIsLoading(false);
                    return;
                }

                if (user && user.email === 'bikash512singh@gmail.com') {
                    const userDocRef = db.collection("users").doc(user.uid);
                    await userDocRef.set({ role: 'admin' }, { merge: true });
                }

                onLoginSuccess();
            } catch (error: any) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                     setError('Incorrect email or password. Please try again.');
                } else {
                     setError(error.message);
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* FIX: The `showBackButton` prop expects a boolean. The callback should be passed to the `onBack` prop. */}
            <Header title={authMode === 'login' ? 'Login' : 'Sign Up'} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 pt-8 md:p-6 flex justify-center">
                <div className="w-full max-w-md glass-card p-6 md:p-8">
                    {showVerificationMessage ? (
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-green-500 mb-4">mark_email_read</span>
                            <h2 className="text-2xl font-bold text-gray-800">Account Created! Verify Your Email</h2>
                            <p className="mt-4 text-gray-600">We've sent a verification link to your email address. Please click the link to activate your account before logging in.</p>
                            <button
                                onClick={() => { setShowVerificationMessage(false); setAuthMode('login'); }}
                                className="mt-6 w-full p-3 gradient-button text-white border-none rounded-lg font-bold"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold text-center mb-6 gradient-text">
                                {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                                        {error}
                                    </div>
                                )}
                                {showResetMessage && (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm" role="alert">
                                        If an account exists for <strong>{email}</strong>, a password reset link has been sent. Please check your inbox.
                                    </div>
                                )}
                                {authMode === 'signup' && (
                                    <div>
                                        <FormLabel htmlFor="name" text="Full Name" />
                                        <FormInput
                                            type="text"
                                            id="name"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            autoComplete="name"
                                        />
                                    </div>
                                )}
                                <div>
                                    <FormLabel htmlFor="email" text="Email" />
                                    <FormInput
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <FormLabel htmlFor="password" text="Password" />
                                    <div className="relative">
                                        <FormInput
                                            type={isPasswordVisible ? 'text' : 'password'}
                                            id="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                                        />
                                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                                            <span className="material-symbols-outlined text-xl">
                                                {isPasswordVisible ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                     {authMode === 'login' && (
                                        <div className="text-right mt-2">
                                            <button
                                                type="button"
                                                onClick={handlePasswordReset}
                                                disabled={isLoading}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {authMode === 'signup' && (
                                    <>
                                        <div>
                                            <FormLabel htmlFor="confirm-password" text="Confirm Password" />
                                            <div className="relative">
                                                <FormInput
                                                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                                                    id="confirm-password"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    required
                                                    autoComplete="new-password"
                                                />
                                                <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                                                    <span className="material-symbols-outlined text-xl">
                                                        {isConfirmPasswordVisible ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-2">
                                            <PasswordRequirement isValid={passwordCriteria.length} text="At least 8 characters" />
                                            <PasswordRequirement isValid={passwordCriteria.uppercase} text="One uppercase letter" />
                                            <PasswordRequirement isValid={passwordCriteria.lowercase} text="One lowercase letter" />
                                            <PasswordRequirement isValid={passwordCriteria.number} text="One number" />
                                            <PasswordRequirement isValid={passwordCriteria.specialChar} text="One special character" />
                                        </div>
                                    </>
                                )}
                                <button type="submit" disabled={isLoading} className="w-full p-3 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer mt-4 disabled:opacity-50">
                                    {isLoading ? 'Loading...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
                                </button>
                            </form>

                            <div className="mt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button onClick={handleGoogleLogin} className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        <i className="fa-brands fa-google mr-2"></i>
                                        Google
                                    </button>
                                </div>
                            </div>

                            <p className="mt-6 text-center text-sm text-gray-600">
                                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }} className="font-medium text-blue-600 hover:text-blue-500">
                                    {authMode === 'login' ? 'Sign up' : 'Log in'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
