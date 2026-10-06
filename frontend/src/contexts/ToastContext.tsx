import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-brand-yellow flex-shrink-0" />;
    }
  };

  const borderStyles = {
    success: 'border-green-500/20 bg-green-950/40 text-green-100',
    error: 'border-red-500/20 bg-red-950/40 text-red-100',
    info: 'border-brand-yellow/20 bg-slate-900/60 text-slate-100',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full"
        role="live"
        aria-live="assertive"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 transition-all duration-300 animate-[slide-in_0.25s_ease-out] ${
              borderStyles[toast.type]
            }`}
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
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
