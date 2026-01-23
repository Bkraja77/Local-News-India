
import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { User, View, Draft, VideoPost } from '../types';
import { db, storage, serverTimestamp } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import LocationSelector from './LocationSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { APP_LOGO_URL } from '../utils/constants';

interface CreateVideoPageProps {
  onBack: () => void;
  currentUser: User | null;
  onNavigate: (view: View, params?: any) => void;
  draftId?: string | null;
  videoId?: string | null;
}

const newsCategories = ['Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];

const CreateVideoPage: React.FC<CreateVideoPageProps> = ({ onBack, currentUser, onNavigate, draftId, videoId }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
    const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => {
        if (draftId && currentUser) {
            setIsLoading(true);
            db.collection('users').doc(currentUser.uid).collection('drafts').doc(draftId).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data() as Draft;
                    populateFields(data);
                }
                setIsLoading(false);
            }).catch(e => {
                showToast("Error loading draft", "error");
                setIsLoading(false);
            });
        } else if (videoId) {
            setIsLoading(true);
            db.collection('videos').doc(videoId).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data() as any;
                    populateFields(data);
                }
                setIsLoading(false);
            }).catch(e => {
                showToast("Error loading video data", "error");
                setIsLoading(false);
            });
        }
    }, [draftId, videoId, currentUser]);

    const populateFields = (data: any) => {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setCategory(data.category || '');
        setState(data.state || '');
        setDistrict(data.district || '');
        setBlock(data.block || '');
        if (data.videoUrl) {
            setExistingVideoUrl(data.videoUrl);
            setVideoPreviewUrl(data.videoUrl);
        }
        if (data.thumbnailUrl) {
            setExistingThumbnailUrl(data.thumbnailUrl);
            setCapturedThumbnail(data.thumbnailUrl);
        }
    };

    useEffect(() => {
        return () => {
            if (videoPreviewUrl && !videoPreviewUrl.startsWith('http')) {
                URL.revokeObjectURL(videoPreviewUrl);
            }
        };
    }, [videoPreviewUrl]);

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 50 * 1024 * 1024) { 
                setError("Video is too large. Max limit is 50MB.");
                return;
            }
            
            if (videoPreviewUrl && !videoPreviewUrl.startsWith('http')) {
                URL.revokeObjectURL(videoPreviewUrl);
            }

            const localUrl = URL.createObjectURL(file);
            setVideoFile(file);
            setVideoPreviewUrl(localUrl);
            setCapturedThumbnail(null);
            setError(null);
        }
    };

    const captureThumbnail = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedThumbnail(dataUrl);
                showToast("Thumbnail frame captured!", "success");
            }
        }
    };

    const handleRemoveVideo = () => {
        if (videoPreviewUrl && !videoPreviewUrl.startsWith('http')) {
            URL.revokeObjectURL(videoPreviewUrl);
        }
        setVideoFile(null);
        setVideoPreviewUrl(null);
        setCapturedThumbnail(null);
    };

    const uploadBase64Image = async (base64: string, path: string) => {
        const ref = storage.ref(path);
        await ref.putString(base64, 'data_url');
        return await ref.getDownloadURL();
    };

    const handleSaveDraft = async () => {
        if (!currentUser) return;
        if (!title.trim()) {
            showToast("Please provide a title to save a draft.", "info");
            return;
        }

        setIsSavingDraft(true);
        setUploadProgress(5);
        setUploadStatus('Processing Draft...');
        setError(null);
        try {
            const vidId = draftId || videoId || uuidv4();
            let videoUrl = existingVideoUrl || '';
            
            setUploadStatus('Uploading Image...');
            let thumbUrl = capturedThumbnail && capturedThumbnail.startsWith('data:') 
                ? await uploadBase64Image(capturedThumbnail, `video-thumbnails/drafts/${currentUser.uid}/${vidId}.jpg`)
                : (existingThumbnailUrl || APP_LOGO_URL);
            
            setUploadProgress(20);

            if (videoFile) {
                setUploadStatus('Uploading Video...');
                const extension = videoFile.name.split('.').pop() || 'mp4';
                const videoRef = storage.ref(`videos/drafts/${currentUser.uid}/${vidId}.${extension}`);
                const videoUploadTask = videoRef.put(videoFile);
                
                videoUploadTask.on('state_changed', (snap) => {
                    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 70); // 20% to 90%
                    setUploadProgress(20 + pct);
                });
                
                await videoUploadTask;
                videoUrl = await videoRef.getDownloadURL();
            }

            setUploadProgress(95);
            setUploadStatus('Saving Draft Data...');

            const draftData = {
                type: 'video',
                title,
                description,
                videoUrl,
                thumbnailUrl: thumbUrl,
                category,
                state,
                district,
                block,
                updatedAt: serverTimestamp(),
            };

            const draftsCollection = db.collection('users').doc(currentUser.uid).collection('drafts');
            if (draftId) {
                await draftsCollection.doc(draftId).set(draftData, { merge: true });
            } else {
                await draftsCollection.add({ ...draftData, createdAt: serverTimestamp() });
            }

            setUploadProgress(100);
            showToast("Video draft saved!", "success");
            onNavigate(View.User, { initialTab: 'drafts' });
        } catch (err: any) {
            console.error("Draft error:", err);
            setError(err.message || "Failed to save draft");
            showToast("Draft saving failed", "error");
        } finally {
            setIsSavingDraft(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showToast("Please login to publish", "error");
            return;
        }
        
        if (!videoFile && !existingVideoUrl) {
            setError("A news video file is required.");
            return;
        }
        
        if (!title.trim() || !category) {
            setError("Title and category are required.");
            return;
        }

        if (!capturedThumbnail && !existingThumbnailUrl) {
            setError("Please capture a thumbnail frame from the video first.");
            return;
        }

        setIsLoading(true);
        setUploadProgress(2);
        setUploadStatus('Initializing...');
        setError(null);
        
        try {
            const vidId = videoId || uuidv4();
            let videoUrl = existingVideoUrl || '';
            let thumbUrl = existingThumbnailUrl || '';

            // 1. Upload Thumbnail if changed
            if (capturedThumbnail && capturedThumbnail.startsWith('data:')) {
                setUploadStatus('Uploading Thumbnail...');
                // Cleanup old if exists
                if (existingThumbnailUrl?.includes('firebasestorage')) {
                    storage.refFromURL(existingThumbnailUrl).delete().catch(() => {});
                }
                thumbUrl = await uploadBase64Image(capturedThumbnail, `video-thumbnails/${vidId}.jpg`);
                setUploadProgress(15);
            }

            // 2. Upload Video if changed
            if (videoFile) {
                setUploadStatus('Uploading News Video...');
                // Cleanup old
                if (existingVideoUrl?.includes('firebasestorage')) {
                    storage.refFromURL(existingVideoUrl).delete().catch(() => {});
                }
                const extension = videoFile.name.split('.').pop() || 'mp4';
                const vRef = storage.ref(`videos/${vidId}.${extension}`);
                const videoUploadTask = vRef.put(videoFile);
                
                videoUploadTask.on('state_changed', 
                    (snapshot) => {
                        const snapPct = (snapshot.bytesTransferred / snapshot.totalBytes);
                        const mappedProgress = Math.round(15 + (snapPct * 75));
                        setUploadProgress(mappedProgress);
                    }
                );
                
                await videoUploadTask;
                videoUrl = await vRef.getDownloadURL();
            }

            // 3. Save to Firestore
            setUploadStatus('Finalizing News Post...');
            setUploadProgress(95);
            
            const payload = {
                title,
                description,
                videoUrl,
                thumbnailUrl: thumbUrl || APP_LOGO_URL,
                category,
                authorId: currentUser.uid,
                authorName: currentUser.name,
                authorProfilePicUrl: currentUser.profilePicUrl,
                updatedAt: serverTimestamp(),
                state,
                district,
                block,
                locationType: block ? 'Block' : (district ? 'District' : (state ? 'State' : 'Overall'))
            };

            if (videoId) {
                await db.collection("videos").doc(videoId).update(payload);
            } else {
                await db.collection("videos").add({
                    ...payload,
                    viewCount: 0,
                    shareCount: 0,
                    createdAt: serverTimestamp()
                });
            }

            if (draftId) {
                await db.collection('users').doc(currentUser.uid).collection('drafts').doc(draftId).delete().catch(console.warn);
            }

            setUploadProgress(100);
            showToast(videoId ? "Video updated successfully!" : "Video news published successfully!", "success");
            onNavigate(View.Videos);
        } catch (err: any) {
            console.error("Publishing error:", err);
            setError(err.message || "Failed to publish video.");
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <Header title={videoId ? "Edit Video News" : (draftId ? "Edit Video Draft" : "Post Video News")} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                    {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 animate-in fade-in slide-in-from-top-1">{error}</div>}
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">News Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Describe the news briefly..." required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">News Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none" placeholder="Details about this news..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none cursor-pointer" required>
                            <option value="">Select Category</option>
                            {newsCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <LocationSelector state={state} setState={setState} district={district} setDistrict={setDistrict} block={block} setBlock={setBlock} />

                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">News Video & Thumbnail</label>
                        
                        {!videoPreviewUrl ? (
                            <div className="p-12 border-2 border-dashed border-gray-300 rounded-3xl text-center hover:bg-gray-50 hover:border-red-400 transition-all relative bg-gray-50/50 group cursor-pointer">
                                <input type="file" accept="video/*" onChange={handleVideoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-4xl text-red-600">videocam</span>
                                    </div>
                                    <p className="text-base font-bold text-gray-800">Select News Video File</p>
                                    <p className="text-xs text-gray-500 mt-2">MP4, MOV up to 50MB</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in zoom-in-95">
                                <div className="glass-card overflow-hidden border border-gray-200 rounded-2xl relative shadow-xl bg-black">
                                    <video 
                                        ref={videoRef}
                                        src={videoPreviewUrl} 
                                        className="w-full h-auto max-h-[400px]" 
                                        controls 
                                        muted
                                        crossOrigin="anonymous"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleRemoveVideo}
                                        className="absolute top-4 right-4 bg-white/90 hover:bg-white text-red-600 p-2 rounded-full shadow-lg transition-all active:scale-90 flex items-center justify-center border border-gray-100"
                                        title="Remove"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Set Video Thumbnail</p>
                                            <p className="text-[10px] text-gray-500">Play/Seek to a clear moment and capture frame</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={captureThumbnail}
                                            className="px-5 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                                        >
                                            Capture Frame
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="w-40 aspect-video bg-gray-200 rounded-xl overflow-hidden border-2 border-white shadow-md flex items-center justify-center text-gray-400 relative">
                                            {capturedThumbnail ? (
                                                <img src={capturedThumbnail} className="w-full h-full object-cover" alt="Thumb" />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl">photo_camera</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Preview Image</p>
                                            <p className="text-[10px] text-gray-500 leading-relaxed">This image represents your news in the feed.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    {(isLoading || isSavingDraft) && (
                        <div className="w-full space-y-3 p-5 bg-red-50 rounded-2xl border border-red-100 shadow-sm animate-in slide-in-from-bottom-2">
                             <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{videoId ? 'UPDATING NEWS' : (isLoading ? 'PUBLISHING NEWS' : 'SAVING DRAFT')}</p>
                                    <p className="text-xs font-bold text-red-500 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                        {uploadStatus}
                                    </p>
                                </div>
                                <p className="text-2xl font-black text-red-600">{uploadProgress}%</p>
                            </div>
                            <div className="w-full bg-red-100 rounded-full h-3.5 overflow-hidden shadow-inner p-0.5">
                                <div 
                                    className="bg-red-600 h-full rounded-full transition-all duration-500 ease-out shadow-lg" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={handleSaveDraft} 
                            disabled={isLoading || isSavingDraft} 
                            className="flex-1 p-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSavingDraft ? "Saving..." : "Save Draft"}
                        </button>
                        <button 
                            disabled={isLoading || isSavingDraft || (!videoFile && !existingVideoUrl)} 
                            type="submit" 
                            className="flex-[2] p-4 gradient-button text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "UPLOADING..." : (videoId ? "Save Changes" : "Publish Video News")}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CreateVideoPage;
