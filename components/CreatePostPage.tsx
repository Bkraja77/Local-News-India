import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
import { User, Draft, View } from '../types';
import { db, storage, serverTimestamp } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import LocationSelector from './LocationSelector';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

interface CreatePostPageProps {
  onBack: () => void;
  currentUser: User | null;
  draftId?: string | null;
  onNavigate: (view: View, params?: any) => void;
}

const newsCategories = ['Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];
const MAX_TITLE_LENGTH = 200;

const compressImage = (file: File, quality: number = 0.8, maxSize: number = 1280): Promise<File> => {
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


interface RichTextEditorToolbarProps {
    editorRef: React.RefObject<HTMLDivElement>;
    onImageUpload: () => void;
    onAlign: (alignment: 'left' | 'center' | 'right') => void;
    isImageSelected: boolean;
}

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({ editorRef, onImageUpload, onAlign, isImageSelected }) => {
    const handleCommand = (command: string, value: string | null = null) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, value || undefined);
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleCommand('foreColor', e.target.value);
    };

    const preventDefault = (e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>) => e.preventDefault();

    return (
        <div className="flex items-center flex-wrap gap-1 p-2 border border-b-0 border-gray-300 bg-gray-50 rounded-t-lg text-gray-700 sticky top-0 z-10">
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('bold')} className="p-2 hover:bg-gray-200 rounded" title="Bold"><span className="material-symbols-outlined">format_bold</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('italic')} className="p-2 hover:bg-gray-200 rounded" title="Italic"><span className="material-symbols-outlined">format_italic</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('underline')} className="p-2 hover:bg-gray-200 rounded" title="Underline"><span className="material-symbols-outlined">format_underlined</span></button>
            
            <div className="h-6 border-l border-gray-300 mx-1"></div>
            
            <button 
                type="button" 
                onMouseDown={preventDefault} 
                onClick={() => onAlign('left')} 
                className={`p-2 hover:bg-gray-200 rounded ${isImageSelected ? 'text-blue-600' : ''}`} 
                title={isImageSelected ? "Align Image Left" : "Align Text Left"}
            >
                <span className="material-symbols-outlined">format_align_left</span>
            </button>
            <button 
                type="button" 
                onMouseDown={preventDefault} 
                onClick={() => onAlign('center')} 
                className={`p-2 hover:bg-gray-200 rounded ${isImageSelected ? 'text-blue-600' : ''}`} 
                title={isImageSelected ? "Align Image Center" : "Align Text Center"}
            >
                <span className="material-symbols-outlined">format_align_center</span>
            </button>
            <button 
                type="button" 
                onMouseDown={preventDefault} 
                onClick={() => onAlign('right')} 
                className={`p-2 hover:bg-gray-200 rounded ${isImageSelected ? 'text-blue-600' : ''}`} 
                title={isImageSelected ? "Align Image Right" : "Align Text Right"}
            >
                <span className="material-symbols-outlined">format_align_right</span>
            </button>

            <div className="h-6 border-l border-gray-300 mx-1"></div>

            <div className="relative p-2 hover:bg-gray-200 rounded" title="Text Color">
                <span className="material-symbols-outlined">format_color_text</span>
                <input type="color" onChange={handleColorChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
            <div className="h-6 border-l border-gray-300 mx-1"></div>
            <button type="button" onMouseDown={preventDefault} onClick={onImageUpload} className="p-2 hover:bg-gray-200 rounded" title="Insert Image">
                <span className="material-symbols-outlined">image</span>
            </button>
        </div>
    );
};

const CreatePostPage: React.FC<CreatePostPageProps> = ({ onBack, currentUser, draftId, onNavigate }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const savedRange = useRef<Range | null>(null);
    
    const selectedImageRef = useRef<HTMLImageElement | null>(null);
    const [isImageSelected, setIsImageSelected] = useState(false);
    
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');
    
    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => {
        if (draftId && currentUser) {
            setIsLoading(true);
            const draftRef = db.collection('users').doc(currentUser.uid).collection('drafts').doc(draftId);
            draftRef.get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data() as Draft;
                    setTitle(data.title || '');
                    setContent(data.content || '');
                    setCategory(data.category || '');
                    setState(data.state || '');
                    setDistrict(data.district || '');
                    setBlock(data.block || '');
                    if (data.thumbnailUrl) {
                        setThumbnailPreview(data.thumbnailUrl);
                        setExistingThumbnailUrl(data.thumbnailUrl);
                    }
                    if (editorRef.current) {
                        editorRef.current.innerHTML = data.content || '';
                    }
                }
                setIsLoading(false);
            }).catch(err => {
                console.error("Error loading draft:", err.message || err);
                showToast("Failed to load draft", "error");
                setIsLoading(false);
            });
        }
    }, [draftId, currentUser]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { 
                setError("Image is too large. Please select a file under 10MB.");
                showToast("Image is too large", "error");
                return;
            }
            try {
                const compressedFile = await compressImage(file);
                setThumbnailFile(compressedFile);
                setThumbnailPreview(URL.createObjectURL(compressedFile));
                setError(null);
            } catch (err) {
                console.error("Image compression error:", err);
                setError("Could not process image. Please try another one.");
                showToast("Could not process image", "error");
                setThumbnailFile(null);
                setThumbnailPreview(null);
            }
        }
    };
    
    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        setContent(e.currentTarget.innerHTML);
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (selectedImageRef.current && target !== selectedImageRef.current) {
            if (selectedImageRef.current.isConnected) {
                selectedImageRef.current.style.outline = 'none';
            }
            selectedImageRef.current = null;
            setIsImageSelected(false);
        }
        if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            selectedImageRef.current = img;
            img.style.outline = '3px solid #3b82f6';
            img.style.outlineOffset = '2px';
            setIsImageSelected(true);
        }
    };

    const handleAlignment = (alignment: 'left' | 'center' | 'right') => {
        if (selectedImageRef.current) {
            const img = selectedImageRef.current;
            if (alignment === 'left') {
                img.style.float = 'left';
                img.style.margin = '0 1rem 1rem 0';
                img.style.display = 'block';
            } else if (alignment === 'right') {
                img.style.float = 'right';
                img.style.margin = '0 0 1rem 1rem';
                img.style.display = 'block';
            } else if (alignment === 'center') {
                img.style.float = 'none';
                img.style.margin = '1rem auto';
                img.style.display = 'block';
            }
            if (editorRef.current) {
                setContent(editorRef.current.innerHTML);
            }
        } else {
            const command = alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : 'justifyRight';
            document.execCommand(command, false, undefined);
            editorRef.current?.focus();
        }
    };
    
    const handleTriggerImageUpload = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0);
        }
        imageInputRef.current?.click();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { 
            setError("Image file is too large. Please select an image under 5MB.");
            showToast("Image file is too large", "error");
            return;
        }
        setIsUploadingImage(true);
        setError(null);
        try {
            const imageRef = storage.ref(`post-images/${uuidv4()}-${file.name}`);
            const uploadTask = await imageRef.put(file);
            const imageUrl = await uploadTask.ref.getDownloadURL();
            if (savedRange.current) {
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(savedRange.current);
            } else {
                editorRef.current?.focus();
            }
            const imgHtml = `<img src="${imageUrl}" alt="uploaded content" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; display: block;" />`;
            document.execCommand('insertHTML', false, imgHtml);
            if (editorRef.current) {
                setContent(editorRef.current.innerHTML);
            }
            savedRange.current = null;
            showToast("Image inserted successfully", "success");
        } catch (err) {
            console.error("Image upload failed:", err);
            setError("Image upload failed. Please try again.");
            showToast("Image upload failed", "error");
        } finally {
            setIsUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSaveDraft = async () => {
        if (!currentUser) {
            showToast("Please log in to save drafts.", "error");
            return;
        }
        if (!title.trim()) {
            showToast("Please add at least a title to save a draft.", "error");
            return;
        }
        setIsSavingDraft(true);
        try {
            let thumbnailUrl = existingThumbnailUrl || '';
            if (thumbnailFile) {
                const fileExtension = thumbnailFile.name.split('.').pop();
                const thumbnailRef = storage.ref(`thumbnails/drafts/${currentUser.uid}/${uuidv4()}.${fileExtension}`);
                const uploadResult = await thumbnailRef.put(thumbnailFile);
                thumbnailUrl = await uploadResult.ref.getDownloadURL();
                setExistingThumbnailUrl(thumbnailUrl);
                setThumbnailFile(null); 
            }
            const draftData = {
                type: 'article',
                title,
                content,
                category,
                thumbnailUrl,
                state,
                district,
                block,
                authorId: currentUser.uid,
                updatedAt: serverTimestamp(),
            };
            const cleanData = Object.fromEntries(Object.entries(draftData).filter(([_, v]) => v !== undefined));
            const draftsCollection = db.collection('users').doc(currentUser.uid).collection('drafts');
            if (draftId) {
                await draftsCollection.doc(draftId).set(cleanData, { merge: true });
            } else {
                await draftsCollection.add({ ...cleanData, createdAt: serverTimestamp() });
            }
            showToast("Draft saved successfully!", "success");
            onNavigate(View.User, { initialTab: 'drafts' });
        } catch (error: any) {
            console.error("Error saving draft:", error instanceof Error ? error.message : String(error));
            showToast(`Failed to save draft: ${error.message}`, "error");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!currentUser) {
            setError("You must be logged in to create a post.");
            showToast("Please log in to create a post", "error");
            return;
        }
        const isContentEmpty = !content || content.replace(/<[^>]*>?/gm, '').trim().length === 0;
        if (!title.trim() || isContentEmpty || !category) {
            setError("Title, category, and content are required.");
            showToast("Please fill in all required fields", "error");
            return;
        }
        if (!thumbnailFile && !existingThumbnailUrl) {
            setError("A thumbnail image is required.");
            showToast("Please upload a thumbnail", "error");
            return;
        }
        setIsLoading(true);
        showToast("Publishing your post...", "info");
        let moderationResult = 'SAFE';
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const strippedContent = content.replace(/<[^>]*>?/gm, '');
            const prompt = `Analyze the following news article content for any of the following categories: sexually explicit material, hate speech, harassment, violent content, or promotion of illegal acts. Respond with a single word: 'SAFE' if the content is appropriate for a general news audience, or 'UNSAFE' if it violates these policies.\n\nTitle: "${title}"\n\nContent: "${strippedContent.substring(0, 2000)}"`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            if (response.text) {
                moderationResult = response.text.trim().toUpperCase();
            }
        } catch (aiError: any) {
            console.warn("AI Moderation skipped due to error:", aiError.message);
        }
        if (moderationResult !== 'SAFE') {
            setError("This post could not be published because it appears to violate our content policy regarding inappropriate material. Please revise your content.");
            showToast("Content policy violation detected", "error");
            setIsLoading(false);
            return;
        }
        try {
            let locationType: 'Overall' | 'State' | 'District' | 'Block' = 'Overall';
            if (state && district && block) locationType = 'Block';
            else if (state && district) locationType = 'District';
            else if (state) locationType = 'State';

            let finalContent = content;
            if (editorRef.current) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                const images = tempDiv.querySelectorAll('img');
                images.forEach(img => {
                    img.style.outline = 'none';
                    img.style.outlineOffset = 'none';
                });
                finalContent = tempDiv.innerHTML;
            }
            let finalThumbnailUrl = existingThumbnailUrl || '';
            if (thumbnailFile) {
                const fileExtension = thumbnailFile.name.split('.').pop();
                const thumbnailRef = storage.ref(`thumbnails/${uuidv4()}.${fileExtension}`);
                const uploadResult = await thumbnailRef.put(thumbnailFile);
                finalThumbnailUrl = await uploadResult.ref.getDownloadURL();
            }
            const newPostRef = await db.collection("posts").add({
                title,
                content: finalContent,
                category,
                thumbnailUrl: finalThumbnailUrl,
                authorId: currentUser.uid,
                authorName: currentUser.name,
                authorProfilePicUrl: currentUser.profilePicUrl,
                viewCount: 0,
                shareCount: 0,
                createdAt: serverTimestamp(),
                locationType,
                state,
                district,
                block,
            });
            if (draftId) {
                try {
                    await db.collection('users').doc(currentUser.uid).collection('drafts').doc(draftId).delete();
                } catch (draftDelErr) {
                    console.warn("Could not delete draft after publishing", draftDelErr);
                }
            }
            showToast("Post published successfully!", "success");
            onNavigate(View.Main);
            const sendNotifications = async () => {
                try {
                    const followersSnapshot = await db.collection('users').doc(currentUser.uid).collection('followers').get();
                    if (!followersSnapshot.empty) {
                        const notificationBatch = db.batch();
                        followersSnapshot.forEach(followerDoc => {
                            const followerId = followerDoc.id;
                            const notificationRef = db.collection('users').doc(followerId).collection('notifications').doc();
                            notificationBatch.set(notificationRef, {
                                type: 'new_post',
                                fromUserId: currentUser.uid,
                                fromUserName: currentUser.name,
                                fromUserProfilePicUrl: currentUser.profilePicUrl,
                                postId: newPostRef.id,
                                postTitle: title,
                                createdAt: serverTimestamp(),
                                read: false
                            });
                        });
                        await notificationBatch.commit();
                    }
                } catch (notificationError) {
                    console.error("Background notification failed:", notificationError);
                }
            };
            sendNotifications();
        } catch (err: any) {
            console.error("Error creating post:", err instanceof Error ? err.message : String(err));
            setError(err.message || "Failed to create post. Please try again.");
            showToast("Failed to publish post", "error");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title={draftId ? t('edit') + ' Draft' : t('newPost')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-8 pb-20">
                <form onSubmit={handleSubmit} className="w-full glass-card p-6 md:p-8 space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">{t('error')}: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('title')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" required maxLength={MAX_TITLE_LENGTH} />
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <p className="text-gray-500">A clear, catchy title works best.</p>
                            <p className={`font-medium ${title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>{title.length}/{MAX_TITLE_LENGTH}</p>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" required>
                            <option value="" disabled>Select a category</option>
                            {newsCategories.map(cat => <option key={cat} value={cat}>{t(cat.toLowerCase())}</option>)}
                        </select>
                    </div>
                    <LocationSelector state={state} setState={setState} district={district} setDistrict={setDistrict} block={block} setBlock={setBlock} />
                    <div>
                        <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 mb-1">{t('thumbnail')} <span className="text-red-500">*</span></label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-white transition-colors">
                            <div className="space-y-1 text-center">
                                {thumbnailPreview ? <img src={thumbnailPreview} alt="Thumbnail Preview" className="mx-auto h-40 w-auto object-contain rounded" /> : <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                <div className="flex text-sm text-gray-600 justify-center mt-2">
                                    <label htmlFor="create-post-file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        <span>{t('uploadFile')}</span>
                                        <input id="create-post-file-upload" name="create-post-file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">{t('orDragDrop')}</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">{t('writeArticle')} <span className="text-red-500">*</span></label>
                        <RichTextEditorToolbar editorRef={editorRef} onImageUpload={handleTriggerImageUpload} onAlign={handleAlignment} isImageSelected={isImageSelected} />
                        <div className="relative">
                            <div id="content" ref={editorRef} contentEditable="true" onInput={handleContentChange} onClick={handleEditorClick} className="w-full p-4 border border-gray-300 bg-white rounded-b-lg h-96 resize-y overflow-y-auto text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg leading-relaxed" />
                            {(!content || content.replace(/<[^>]*>?/gm, '').trim().length === 0) && <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">{t('writeArticle')}...</div>}
                            {isUploadingImage && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-b-lg z-10"><div className="text-center p-4 bg-white/50 rounded-lg"><svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-2 text-gray-700 font-semibold">Uploading image...</p></div></div>}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft || isLoading} className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSavingDraft ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div> : <span className="material-symbols-outlined">save</span>}{isSavingDraft ? 'Saving...' : 'Save Draft'}</button>
                        <button type="submit" disabled={isLoading || isSavingDraft} className="flex-[2] px-4 py-3 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5 flex items-center justify-center gap-2"><span className="material-symbols-outlined">send</span>{isLoading ? t('publishing') : t('publish')}</button>
                    </div>
                </form>
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </main>
        </div>
    );
};

export default CreatePostPage;