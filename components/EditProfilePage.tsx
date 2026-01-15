
import React, { useState, useRef } from 'react';
import Header from './Header';
import { User } from '../types';
import { auth, db, storage, firebase } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { indianLocations } from '../data/locations';
import { useLanguage } from '../contexts/LanguageContext';

interface EditProfilePageProps {
  onBack: () => void;
  currentUser: User;
  onProfileUpdate: (updatedData: Partial<User>) => void;
}

const compressImage = (file: File, quality: number = 0.8, maxSize: number = 512): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};


const EditProfilePage: React.FC<EditProfilePageProps> = ({ onBack, currentUser, onProfileUpdate }) => {
    const [name, setName] = useState(currentUser.name);
    const [username, setUsername] = useState(currentUser.username);
    const [bio, setBio] = useState(currentUser.bio);
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState<string>(currentUser.profilePicUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    const [preferredState, setPreferredState] = useState(currentUser.preferredState || '');
    const [preferredDistrict, setPreferredDistrict] = useState(currentUser.preferredDistrict || '');
    const [preferredBlock, setPreferredBlock] = useState(currentUser.preferredBlock || '');

    const states = Object.keys(indianLocations);
    const districts = preferredState ? Object.keys(indianLocations[preferredState] || {}) : [];
    const blocks = preferredState && preferredDistrict ? (indianLocations[preferredState][preferredDistrict] || []) : [];

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferredState(e.target.value);
        setPreferredDistrict('');
        setPreferredBlock('');
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferredDistrict(e.target.value);
        setPreferredBlock('');
    };

    const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferredBlock(e.target.value);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Updated limit to 5MB to match storage.rules
            if (file.size > 5 * 1024 * 1024) { 
                setError("File is too large. Please select an image under 5MB.");
                return;
            }
            try {
                const compressedFile = await compressImage(file);
                setProfilePicFile(compressedFile);
                setProfilePicPreview(URL.createObjectURL(compressedFile));
                setError(null);
            } catch (err) {
                console.error("Image compression error:", err);
                setError("Could not process image. Please try another one.");
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
    
        const hasTextChanged = name !== currentUser.name || username !== currentUser.username || bio !== currentUser.bio;
        const hasImageChanged = !!profilePicFile;
        const hasLocationChanged = preferredState !== (currentUser.preferredState || '') || preferredDistrict !== (currentUser.preferredDistrict || '') || preferredBlock !== (currentUser.preferredBlock || '');
    
        if (!hasTextChanged && !hasImageChanged && !hasLocationChanged) {
            onBack();
            return;
        }
    
        setIsLoading(true);
    
        try {
            let newProfilePicUrl = currentUser.profilePicUrl;
    
            // --- Critical, User-Facing Updates ---
            if (profilePicFile) {
                if (currentUser.profilePicUrl && currentUser.profilePicUrl.includes('firebasestorage.googleapis.com')) {
                    try {
                        const oldStorageRef = storage.refFromURL(currentUser.profilePicUrl);
                        await oldStorageRef.delete();
                    } catch (storageError: any) {
                        if (storageError.code !== 'storage/object-not-found') {
                            console.warn("Could not delete old profile picture:", storageError);
                        }
                    }
                }
                const fileExtension = profilePicFile.name.split('.').pop();
                const profilePicRef = storage.ref(`profile-pics/${currentUser.uid}/${uuidv4()}.${fileExtension}`);
                const uploadResult = await profilePicRef.put(profilePicFile);
                newProfilePicUrl = await uploadResult.ref.getDownloadURL();
            }
    
            const updatedFirestoreData = {
                name,
                username,
                bio,
                profilePicUrl: newProfilePicUrl,
                preferredState,
                preferredDistrict,
                preferredBlock, 
            };
    
            const userDocRef = db.collection('users').doc(currentUser.uid);
            await userDocRef.update(updatedFirestoreData);
    
            if (auth.currentUser) {
                await auth.currentUser.updateProfile({
                    displayName: name,
                    photoURL: newProfilePicUrl,
                });
            }
    
            // --- Immediate Feedback for a Smooth UX ---
            onProfileUpdate({ name, username, bio, profilePicUrl: newProfilePicUrl, preferredState, preferredDistrict, preferredBlock });
            onBack();
    
            // --- Background Data Synchronization ---
            const backgroundUpdate = async () => {
                const denormalizedUpdateData = {
                    authorName: name,
                    authorProfilePicUrl: newProfilePicUrl,
                };
    
                // Using 'any' for querySnapshot to avoid module import issues with compat types
                const commitInBatches = async (querySnapshot: any, updateData: object) => {
                    if (querySnapshot.empty) return;
                    const batches = [];
                    let currentBatch = db.batch();
                    let operationCount = 0;
    
                    querySnapshot.forEach((doc: any) => {
                        currentBatch.update(doc.ref, updateData);
                        operationCount++;
                        if (operationCount >= 499) {
                            batches.push(currentBatch);
                            currentBatch = db.batch();
                            operationCount = 0;
                        }
                    });
    
                    if (operationCount > 0) {
                        batches.push(currentBatch);
                    }
                    await Promise.all(batches.map(batch => batch.commit()));
                };
    
                try {
                    // Update Articles (Posts)
                    const postsQuery = db.collection('posts').where('authorId', '==', currentUser.uid);
                    const postsSnapshot = await postsQuery.get();
                    await commitInBatches(postsSnapshot, denormalizedUpdateData);

                    // Update Videos (This ensures the Videos Page reflects the changes)
                    const videosQuery = db.collection('videos').where('authorId', '==', currentUser.uid);
                    const videosSnapshot = await videosQuery.get();
                    await commitInBatches(videosSnapshot, denormalizedUpdateData);
    
                    // Update Comments (Universal update across all posts and videos)
                    const commentsQuery = db.collectionGroup('comments').where('authorId', '==', currentUser.uid);
                    const commentsSnapshot = await commentsQuery.get();
                    await commitInBatches(commentsSnapshot, denormalizedUpdateData);
                    
                    console.log("Background synchronization of posts, videos, and comments completed successfully.");
                } catch (syncError: any) {
                     if (syncError.code === 'failed-precondition') {
                         console.error("BACKGROUND SYNC FAILED: A composite index is required. Check the developer console for a link to create it.");
                    } else {
                        console.error("Error during background profile data synchronization:", syncError);
                    }
                }
            };
            
            backgroundUpdate();
    
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setError(err.message || "Failed to update profile. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title={t('editProfile')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10 pb-20">
                <form onSubmit={handleSave} className="w-full glass-card p-6 md:p-8 space-y-8">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">{t('error')}: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                             <img 
                                className="h-32 w-32 rounded-full ring-4 ring-blue-500/20 object-cover shadow-md" 
                                src={profilePicPreview} 
                                alt="Profile preview" 
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all"
                                title={t('changePhoto')}
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/png, image/jpeg" 
                            className="hidden" 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                            <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">{t('bio')}</label>
                        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 resize-y focus:ring-2 focus:ring-blue-500" maxLength={150}></textarea>
                        <p className="text-right text-xs text-gray-500">{bio.length} / 150</p>
                    </div>

                    <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-blue-600">location_on</span>
                            <h3 className="text-lg font-semibold text-gray-800">{t('myLocation')}</h3>
                        </div>
                        <p className="text-sm text-gray-500 -mt-4 ml-8 mb-4">Set your location to see relevant news on your homepage.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">{t('selectState')}</label>
                                <select id="state" value={preferredState} onChange={handleStateChange} className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer">
                                    <option value="">{t('selectState')}</option>
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">{t('selectDistrict')}</label>
                                <select id="district" value={preferredDistrict} onChange={handleDistrictChange} disabled={!preferredState} className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 cursor-pointer disabled:cursor-not-allowed">
                                    <option value="">{t('selectDistrict')}</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-1">{t('selectBlock')}</label>
                                <select id="block" value={preferredBlock} onChange={handleBlockChange} disabled={!preferredDistrict} className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 cursor-pointer disabled:cursor-not-allowed">
                                    <option value="">{t('selectBlock')}</option>
                                    {blocks.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>


                    <button type="submit" disabled={isLoading} className="w-full p-4 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5">
                        {isLoading ? t('loading') : t('saveChanges')}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default EditProfilePage;
