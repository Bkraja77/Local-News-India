
import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = uuidv4();
    setToasts((prev) => {
        // Limit to 3 toasts at a time to keep UI clean
        const newToasts = [...prev, { id, message, type }];
        if (newToasts.length > 3) return newToasts.slice(newToasts.length - 3);
        return newToasts;
    });

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // CRITICAL: Memoize the context value. 
  // This ensures that the 'value' reference doesn't change when 'toasts' state changes.
  // Consumers (like App.tsx) won't re-render, satisfying the "no page render" requirement.
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container - Top Positioned */}
      <div className="fixed top-4 md:top-6 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center p-3 pl-4 pr-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-500 ease-out transform
              animate-in slide-in-from-top-full fade-in zoom-in-95 ring-1 ring-black/5
              ${toast.type === 'success' ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-500/20 text-white shadow-green-500/20' : ''}
              ${toast.type === 'error' ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-500/20 text-white shadow-red-500/30' : ''}
              ${toast.type === 'info' ? 'bg-white/95 border-gray-100 text-gray-800' : ''}
            `}
          >
            <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow-sm
                ${toast.type === 'success' ? 'bg-white/20 text-white' : ''}
                ${toast.type === 'error' ? 'bg-white/20 text-white' : ''}
                ${toast.type === 'info' ? 'bg-blue-50 text-blue-600' : ''}
            `}>
                <span className="material-symbols-outlined text-[20px]">
                    {toast.type === 'success' && 'check'}
                    {toast.type === 'error' && 'priority_high'}
                    {toast.type === 'info' && 'info'}
                </span>
            </div>
            
            <div className="flex-grow text-sm font-medium tracking-wide drop-shadow-sm">
                {toast.message}
            </div>
            
            <button 
                onClick={() => removeToast(toast.id)}
                className={`ml-3 p-1.5 rounded-full transition-colors flex-shrink-0 ${
                    toast.type === 'info' ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600' : 'hover:bg-white/20 text-white/70 hover:text-white'
                }`}
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
