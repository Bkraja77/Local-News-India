
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
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Context fail'));
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => { if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', quality);
            };
        };
    });
};

const CreatePostPage: React.FC<CreatePostPageProps> = ({ onBack, currentUser, draftId, onNavigate }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [categoriesList, setCategoriesList] = useState<string[]>([]);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');
    const { t } = useLanguage();
    const { showToast } = useToast();

    useEffect(() => {
        const unsub = db.collection('site_settings').doc('categories').onSnapshot(doc => {
            if (doc.exists) setCategoriesList(doc.data()?.list || []);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (draftId && currentUser) {
            db.collection('users').doc(currentUser.uid).collection('drafts').doc(draftId).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data() as Draft;
                    setTitle(data.title || '');
                    setCategory(data.category || '');
                    if (editorRef.current) editorRef.current.innerHTML = data.content || '';
                }
            });
        }
    }, [draftId, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !category) return;
        setIsLoading(true);
        try {
            let thumbUrl = existingThumbnailUrl || '';
            if (thumbnailFile) {
                const ref = storage.ref(`thumbnails/${uuidv4()}`);
                await ref.put(thumbnailFile);
                thumbUrl = await ref.getDownloadURL();
            }
            await db.collection("posts").add({
                title, content: editorRef.current?.innerHTML || '', category, thumbnailUrl: thumbUrl,
                authorId: currentUser?.uid, authorName: currentUser?.name, authorProfilePicUrl: currentUser?.profilePicUrl,
                createdAt: serverTimestamp(), viewCount: 0, state, district, block
            });
            showToast("Published!", "success");
            onNavigate(View.Main);
        } catch (e) { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <Header title={t('newPost')} showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 pb-20">
                <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="News Title" className="w-full p-3 border rounded-xl" required />
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border rounded-xl" required>
                        <option value="">Select Category</option>
                        {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <LocationSelector state={state} setState={setState} district={district} setDistrict={setDistrict} block={block} setBlock={setBlock} />
                    <div ref={editorRef} contentEditable className="min-h-[300px] p-4 border rounded-xl outline-none" />
                    <button type="submit" disabled={isLoading} className="w-full p-4 gradient-button rounded-xl font-bold">{isLoading ? 'Publishing...' : 'Publish News'}</button>
                </form>
            </main>
        </div>
    );
};

export default CreatePostPage;
