import React from 'react';
import { Dna, Github, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const hasKey = !!process.env.API_KEY;

  return (
    <>
      <header className="w-full bg-slate-950 border-b border-slate-800 sticky top-0 z-40 bg-opacity-80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/20 p-2 rounded-lg border border-primary/10">
              <Dna className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Mutation<span className="text-primary">Mechanic</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="hidden md:flex items-center space-x-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-scientific-green shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'} animate-pulse`}></span>
              <span className={hasKey ? 'text-slate-300' : 'text-amber-500'}>
                {hasKey ? 'Live API Connected' : 'Simulation Mode'}
              </span>
            </div>
            
            <button 
              onClick={onOpenSettings}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            <a
              href="https://github.com/binods1313/MutationMechanic"
              className="text-slate-400 hover:text-white transition-colors p-2"
              aria-label="View repository on GitHub"
              title="View repository on GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;