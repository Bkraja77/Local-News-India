import React, { useState, useRef } from 'react';
import Header from './Header';
import { User } from '../types';
import { auth, db, storage } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { indianLocations } from '../data/locations';
import firebase from 'firebase/compat/app';

interface EditProfilePageProps {
  onBack: () => void;
  currentUser: User;
  onProfileUpdate: (updatedData: Partial<User>) => void;
}

/**
 * Compresses an image file client-side before uploading.
 * @param file The image file to compress.
 * @param quality The desired quality (0 to 1).
 * @param maxSize The maximum width or height of the image.
 * @returns A promise that resolves with the compressed image file.
 */
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

    const [preferredState, setPreferredState] = useState(currentUser.preferredState || '');
    const [preferredDistrict, setPreferredDistrict] = useState(currentUser.preferredDistrict || '');

    const states = Object.keys(indianLocations);
    const districts = preferredState ? Object.keys(indianLocations[preferredState] || {}) : [];

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferredState(e.target.value);
        setPreferredDistrict('');
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPreferredDistrict(e.target.value);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError("File is too large. Please select an image under 10MB.");
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
        const hasLocationChanged = preferredState !== (currentUser.preferredState || '') || preferredDistrict !== (currentUser.preferredDistrict || '');
    
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
                preferredBlock: '', 
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
            onProfileUpdate({ name, username, bio, profilePicUrl: newProfilePicUrl, preferredState, preferredDistrict });
            onBack();
    
            // --- Background Data Synchronization ---
            const backgroundUpdate = async () => {
                const denormalizedUpdateData = {
                    authorName: name,
                    authorProfilePicUrl: newProfilePicUrl,
                };
    
                const commitInBatches = async (querySnapshot: firebase.firestore.QuerySnapshot, updateData: object) => {
                    if (querySnapshot.empty) return;
                    const batches = [];
                    let currentBatch = db.batch();
                    let operationCount = 0;
    
                    querySnapshot.forEach(doc => {
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
                    const postsQuery = db.collection('posts').where('authorId', '==', currentUser.uid);
                    const postsSnapshot = await postsQuery.get();
                    await commitInBatches(postsSnapshot, denormalizedUpdateData);
    
                    const commentsQuery = db.collectionGroup('comments').where('authorId', '==', currentUser.uid);
                    const commentsSnapshot = await commentsQuery.get();
                    await commitInBatches(commentsSnapshot, denormalizedUpdateData);
                    
                    console.log("Background synchronization of posts and comments completed successfully.");
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
            <Header title="Edit Profile" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <form onSubmit={handleSave} className="max-w-2xl mx-auto glass-card p-6 space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <div className="flex flex-col items-center space-y-4">
                        <img 
                            className="h-32 w-32 rounded-full ring-4 ring-blue-500/20 object-cover" 
                            src={profilePicPreview} 
                            alt="Profile preview" 
                        />
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors border border-gray-300"
                        >
                            Change Photo
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/png, image/jpeg" 
                            className="hidden" 
                        />
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 resize-y focus:ring-2 focus:ring-blue-500" maxLength={150}></textarea>
                        <p className="text-right text-xs text-gray-500">{bio.length} / 150</p>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-100/50 rounded-lg border">
                        <h3 className="text-lg font-semibold text-gray-800">My Location</h3>
                        <p className="text-sm text-gray-500 -mt-2">Set your location to see relevant news on your homepage.</p>
                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State (राज्य)</label>
                            <select id="state" value={preferredState} onChange={handleStateChange} className="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500">
                                <option value="">Select State</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District (जिला)</label>
                            <select id="district" value={preferredDistrict} onChange={handleDistrictChange} disabled={!preferredState} className="w-full p-2 border border-gray-300 bg-white rounded-lg focus:ring-blue-500 disabled:bg-gray-200">
                                <option value="">Select District</option>
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>


                    <button type="submit" disabled={isLoading} className="w-full p-4 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default EditProfilePage;