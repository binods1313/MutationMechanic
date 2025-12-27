import React from 'react';
import { Palette, Check, X } from 'lucide-react';
import { THEMES } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentTheme, onThemeChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-primary" /> Configuration
          </h3>
          <button onClick={onClose} aria-label="Close settings" className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-8">
          
          {/* Theme Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
               <Palette className="w-4 h-4 text-primary" /> Appearance Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
               {THEMES.map(theme => (
                 <button
                   key={theme.id}
                   type="button"
                   onClick={() => onThemeChange?.(theme.id)}
                   className={`h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                     currentTheme === theme.id 
                       ? 'border-white scale-110 shadow-lg' 
                       : 'border-transparent hover:scale-105'
                   } bg-theme-${theme.id}`}
                   title={theme.name}
                   aria-label={theme.name}
                 >
                   {currentTheme === theme.id && <Check size={14} className="text-white drop-shadow-md" />}
                 </button>
               ))}
            </div>
            <p className="text-xs text-slate-500">Select an accent color for the application.</p>
          </div>

          <div className="h-px bg-slate-800 w-full" />

          <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-400 leading-relaxed border border-slate-800">
            <p className="mb-2"><strong>Note:</strong> API Key is managed via environment variables.</p>
            <p>If no key is detected, the application runs in Simulation Mode with synthetic data.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-lg transition-colors border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default SettingsModal;