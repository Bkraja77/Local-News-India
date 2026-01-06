
import React from 'react';

export interface CategoryItem {
  id: string;
  label: string;
  icon?: string;
}

interface CategoriesProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const Categories: React.FC<CategoriesProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="flex space-x-2 sm:space-x-4 overflow-x-auto p-3 px-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ease-in-out transform hover:scale-105 ${
              selectedCategory === category.id
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.icon && <span className="material-symbols-outlined text-[18px]">{category.icon}</span>}
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Categories;
