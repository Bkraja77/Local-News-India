
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { db, firebase } from '../firebaseConfig';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface ManageCategoriesPageProps {
    onBack: () => void;
    currentUser: User | null;
}

const ManageCategoriesPage: React.FC<ManageCategoriesPageProps> = ({ onBack, currentUser }) => {
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    
    const { showToast } = useToast();

    useEffect(() => {
        if (currentUser?.role !== 'admin') return;

        const unsubscribe = db.collection('site_settings').doc('categories').onSnapshot((doc) => {
            setLoading(false);
            if (doc.exists) {
                const data = doc.data();
                setCategories(data?.list || []);
            } else {
                const defaults = ['Politics', 'Crime', 'Sports', 'Entertainment', 'Business', 'Technology', 'Health', 'World', 'General'];
                db.collection('site_settings').doc('categories').set({ list: defaults });
                setCategories(defaults);
            }
        }, (error) => {
            console.error("Error fetching categories:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCategory.trim();
        if (!trimmed) return;
        if (categories.includes(trimmed)) {
            showToast("Category already exists", "error");
            return;
        }

        setSaving(true);
        try {
            await db.collection('site_settings').doc('categories').update({
                list: firebase.firestore.FieldValue.arrayUnion(trimmed)
            });
            setNewCategory('');
            showToast("Category added!", "success");
        } catch (error) {
            showToast("Failed to add category", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRenameCategory = async (oldName: string) => {
        const trimmedNewName = editValue.trim();
        if (!trimmedNewName || trimmedNewName === oldName) {
            setEditingCategory(null);
            return;
        }

        setSaving(true);
        try {
            const updatedList = categories.map(c => c === oldName ? trimmedNewName : c);
            await db.collection('site_settings').doc('categories').update({
                list: updatedList
            });
            showToast("Category renamed successfully!", "success");
            setEditingCategory(null);
        } catch (error) {
            showToast("Rename failed", "error");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (cat: string) => {
        setCategoryToDelete(cat);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setSaving(true);
        try {
            await db.collection('site_settings').doc('categories').update({
                list: firebase.firestore.FieldValue.arrayRemove(categoryToDelete)
            });
            showToast("Category deleted", "success");
        } catch (error) {
            showToast("Failed to delete", "error");
        } finally {
            setSaving(false);
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
        }
    };

    if (currentUser?.role !== 'admin') {
        return <div className="p-10 text-center font-bold">Access Denied</div>;
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            <Header title="Manage Categories" showBackButton onBack={onBack} />
            <main className="flex-grow overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-2xl mx-auto w-full space-y-6">
                    <form onSubmit={handleAddCategory} className="glass-card p-6 flex gap-2">
                        <input 
                            type="text" 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Add New Category..."
                            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? '...' : 'Add'}
                        </button>
                    </form>

                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest">Active News Categories ({categories.length})</h3>
                        </div>
                        {loading ? (
                            <div className="p-10 text-center animate-pulse text-gray-400">Loading...</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {categories.map(cat => (
                                    <div key={cat} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                                        {editingCategory === cat ? (
                                            <div className="flex items-center gap-2 flex-1 mr-4">
                                                <input 
                                                    type="text" 
                                                    value={editValue} 
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="flex-1 p-2 border border-blue-400 rounded-lg outline-none text-sm"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleRenameCategory(cat)} className="text-green-600 font-bold text-xs px-2 py-1 bg-green-50 rounded">Save</button>
                                                <button onClick={() => setEditingCategory(null)} className="text-gray-400 font-bold text-xs px-2 py-1">Cancel</button>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-gray-800">{cat}</span>
                                        )}
                                        
                                        {!editingCategory && (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => { setEditingCategory(cat); setEditValue(cat); }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                    title="Edit Name"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(cat)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Category"
                message={`Delete "${categoryToDelete}"? Existing posts in this category will remain, but users won't be able to select it for new posts.`}
            />
        </div>
    );
};

export default ManageCategoriesPage;
