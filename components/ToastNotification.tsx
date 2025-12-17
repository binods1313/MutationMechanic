import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Loader2, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const ToastNotification: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0 && type !== 'loading') {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  const styles = {
    success: 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-900/20',
    error: 'bg-red-900/90 text-white border-red-700 shadow-red-900/20',
    loading: 'bg-indigo-900/90 text-white border-indigo-700 shadow-indigo-900/20',
    info: 'bg-slate-800/90 text-white border-slate-600 shadow-slate-900/20',
    warning: 'bg-amber-900/90 text-white border-amber-700 shadow-amber-900/20',
  };

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-400" />,
    error: <AlertCircle size={20} className="text-red-400" />,
    loading: <Loader2 size={20} className="text-indigo-400 animate-spin" />,
    info: <Info size={20} className="text-blue-400" />,
    warning: <AlertCircle size={20} className="text-amber-400" />,
  };

  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 border backdrop-blur-sm ${styles[type]}`}>
      {icons[type]}
      <span className="font-medium text-sm pr-2">{message}</span>
      {type !== 'loading' && (
        <button 
          onClick={onClose} 
          className="ml-auto opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
          aria-label="Close notification"
        >
          <X size={16}/>
        </button>
      )}
    </div>
  );
};

export default ToastNotification;
