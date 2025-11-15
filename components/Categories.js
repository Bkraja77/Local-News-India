import React from 'react';

interface CategoriesProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const Categories: React.FC<CategoriesProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="flex space-x-2 sm:space-x-4 overflow-x-auto p-3 px-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ease-in-out transform hover:scale-105 ${
              selectedCategory === category
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Categories;
