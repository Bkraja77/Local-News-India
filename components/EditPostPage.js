import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { User, Post } from '../types';
import { db, storage, serverTimestamp } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';
import LocationSelector from './LocationSelector';
import { GoogleGenAI } from "@google/genai";

interface EditPostPageProps {
  onBack: () => void;
  currentUser: User;
  postId: string;
}

const newsCategories = ['Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];
const MAX_TITLE_LENGTH = 100;

/**
 * Compresses an image file client-side before uploading.
 * @param file The image file to compress.
 * @param quality The desired quality (0 to 1).
 * @param maxSize The maximum width or height of the image.
 * @returns A promise that resolves with the compressed image file.
 */
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
}

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({ editorRef, onImageUpload }) => {
    const handleCommand = (command: string, value: string | null = null) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, value);
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleCommand('foreColor', e.target.value);
    };

    // Prevents the editor from losing focus when a button is clicked
    const preventDefault = (e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>) => e.preventDefault();

    return (
        <div className="flex items-center flex-wrap gap-1 p-2 border border-b-0 border-gray-300 bg-gray-50 rounded-t-lg text-gray-700">
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('bold')} className="p-2 hover:bg-gray-200 rounded" title="Bold"><span className="material-symbols-outlined">format_bold</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('italic')} className="p-2 hover:bg-gray-200 rounded" title="Italic"><span className="material-symbols-outlined">format_italic</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('underline')} className="p-2 hover:bg-gray-200 rounded" title="Underline"><span className="material-symbols-outlined">format_underlined</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded" title="Align Left"><span className="material-symbols-outlined">format_align_left</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded" title="Align Center"><span className="material-symbols-outlined">format_align_center</span></button>
            <button type="button" onMouseDown={preventDefault} onClick={() => handleCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded" title="Align Right"><span className="material-symbols-outlined">format_align_right</span></button>
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


const EditPostPage: React.FC<EditPostPageProps> = ({ onBack, currentUser, postId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const savedRange = useRef<Range | null>(null);
    
    // Location state
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');

    useEffect(() => {
        const fetchPost = async () => {
            setIsLoading(true);
            const postDocRef = db.collection('posts').doc(postId);
            const postSnap = await postDocRef.get();

            if (postSnap.exists) {
                const postData = postSnap.data() as Omit<Post, 'id'>;
                // Security check
                if (postData.authorId !== currentUser.uid && currentUser.role !== 'admin') {
                    setError("You are not authorized to edit this post.");
                    setIsLoading(false);
                    return;
                }
                setTitle(postData.title);
                setContent(postData.content);
                setCategory(postData.category || 'General');
                setThumbnailPreview(postData.thumbnailUrl);
                setExistingThumbnailUrl(postData.thumbnailUrl);
                setState(postData.state || '');
                setDistrict(postData.district || '');
                setBlock(postData.block || '');
            } else {
                setError("Post not found.");
            }
            setIsLoading(false);
        };
        fetchPost();
    }, [postId, currentUser.uid, currentUser.role]);

    useEffect(() => {
        if (editorRef.current && content && isInitialLoad.current) {
            editorRef.current.innerHTML = content;
            isInitialLoad.current = false;
        }
    }, [content]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
                setError("Image is too large. Please select a file under 10MB.");
                return;
            }
            try {
                const compressedFile = await compressImage(file);
                setThumbnailFile(compressedFile);
                setThumbnailPreview(URL.createObjectURL(compressedFile));
                setError(null); // Clear previous errors
            } catch (err) {
                console.error("Image compression error:", err);
                setError("Could not process image. Please try another one.");
            }
        }
    };
    
    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        setContent(e.currentTarget.innerHTML);
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
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError("Image file is too large. Please select an image under 5MB.");
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

        } catch (err) {
            console.error("Image upload failed:", err);
            setError("Image upload failed. Please try again.");
        } finally {
            setIsUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const isContentEmpty = !content || content.replace(/<[^>]*>?/gm, '').trim().length === 0;

        if (!title.trim() || isContentEmpty || !category) {
            setError("Title, content and category cannot be empty.");
            return;
        }

        setIsLoading(true);

        try {
             // Automatic Content Moderation
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const strippedContent = content.replace(/<[^>]*>?/gm, '');
            const prompt = `Analyze the following news article content for any of the following categories: sexually explicit material, hate speech, harassment, violent content, or promotion of illegal acts. Respond with a single word: 'SAFE' if the content is appropriate for a general news audience, or 'UNSAFE' if it violates these policies.\n\nTitle: "${title}"\n\nContent: "${strippedContent.substring(0, 2000)}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            const moderationResult = response.text.trim().toUpperCase();

            if (moderationResult !== 'SAFE') {
                setError("This post could not be updated because it appears to violate our content policy regarding inappropriate material. Please revise your content.");
                setIsLoading(false);
                return;
            }

            let locationType: 'Overall' | 'State' | 'District' | 'Block' = 'Overall';
            if (state && district && block) {
                locationType = 'Block';
            } else if (state && district) {
                locationType = 'District';
            } else if (state) {
                locationType = 'State';
            }

            let newThumbnailUrl = existingThumbnailUrl;

            // If a new thumbnail is uploaded
            if (thumbnailFile) {
                // 1. Delete old thumbnail from Storage
                if (existingThumbnailUrl) {
                    const oldStorageRef = storage.refFromURL(existingThumbnailUrl);
                    try {
                        await oldStorageRef.delete();
                    } catch (storageError) {
                        console.warn("Could not delete old thumbnail, it might not exist:", storageError);
                    }
                }

                // 2. Upload new thumbnail
                const fileExtension = thumbnailFile.name.split('.').pop();
                const newThumbnailRef = storage.ref(`thumbnails/${uuidv4()}.${fileExtension}`);
                const uploadResult = await newThumbnailRef.put(thumbnailFile);
                newThumbnailUrl = await uploadResult.ref.getDownloadURL();
            }

            // 3. Update post document in Firestore
            const postDocRef = db.collection('posts').doc(postId);
            await postDocRef.update({
                title: title,
                content: content,
                category: category,
                thumbnailUrl: newThumbnailUrl,
                updatedAt: serverTimestamp(),
                locationType,
                state,
                district,
                block,
            });

            onBack();

        } catch (err: any) {
            console.error("Error updating post:", err);
            setError(err.message || "Failed to update post. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !title) { // Show loading only on initial fetch
        return (
            <div className="flex flex-col h-full bg-transparent">
                <Header title="Edit Post" showBackButton onBack={onBack} />
                <div className="flex items-center justify-center h-full">
                    <p>Loading post...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Edit Post" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-5 md:p-10">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto glass-card p-6 space-y-6">
                     {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" required maxLength={MAX_TITLE_LENGTH} />
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <p className="text-gray-500">A clear, catchy title works best.</p>
                            <p className={`font-medium ${
                                title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                                {title.length}/{MAX_TITLE_LENGTH}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full p-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="" disabled>Select a category</option>
                            {newsCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <LocationSelector 
                      state={state}
                      setState={setState}
                      district={district}
                      setDistrict={setDistrict}
                      block={block}
                      setBlock={setBlock}
                    />

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                           Thumbnail Image <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                             <div className="space-y-1 text-center">
                                {thumbnailPreview ? (
                                    <img src={thumbnailPreview} alt="Thumbnail Preview" className="mx-auto h-32 w-auto object-contain rounded" />
                                ) : (
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                <div className="flex text-sm text-gray-600 justify-center mt-2">
                                    <label htmlFor="edit-post-file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1">
                                        <span>{thumbnailPreview ? 'Change thumbnail' : 'Upload a file'}</span>
                                        <input id="edit-post-file-upload" name="edit-post-file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange}/>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                            News Article <span className="text-red-500">*</span>
                        </label>
                        <RichTextEditorToolbar editorRef={editorRef} onImageUpload={handleTriggerImageUpload} />
                        <div className="relative">
                            <div
                                id="content"
                                ref={editorRef}
                                contentEditable="true"
                                onInput={handleContentChange}
                                className="w-full p-3 border border-gray-300 bg-white rounded-b-lg h-60 resize-y overflow-y-auto text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {isUploadingImage && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-b-lg z-10">
                                    <div className="text-center p-4 bg-white/50 rounded-lg">
                                        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="mt-2 text-gray-700 font-semibold">Uploading image...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isLoading} className="w-full p-4 gradient-button text-white border-none rounded-lg text-lg font-bold cursor-pointer mt-2 disabled:opacity-50">
                        {isLoading ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                </form>
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </main>
        </div>
    );
};

export default EditPostPage;
