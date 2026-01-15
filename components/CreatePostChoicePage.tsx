
import React from 'react';
import Header from './Header';
import { View } from '../types';

interface CreatePostChoicePageProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
}

const CreatePostChoicePage: React.FC<CreatePostChoicePageProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Create News" showBackButton onBack={onBack} />
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => onNavigate(View.CreatePost)}
            className="glass-card p-8 flex flex-col items-center text-center group hover:border-red-500 transition-all hover:shadow-xl active:scale-95"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
              <span className="material-symbols-outlined text-4xl text-red-600 group-hover:text-white">article</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Post News Article</h3>
            <p className="text-sm text-gray-500 mt-2">Write detailed news with photos and formatting.</p>
          </button>

          <button 
            onClick={() => onNavigate(View.CreateVideo)}
            className="glass-card p-8 flex flex-col items-center text-center group hover:border-blue-500 transition-all hover:shadow-xl active:scale-95"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <span className="material-symbols-outlined text-4xl text-blue-600 group-hover:text-white">videocam</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Post Video News</h3>
            <p className="text-sm text-gray-500 mt-2">Upload a news video clip to reach a wider audience.</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreatePostChoicePage;
