import React, { createContext, useContext } from 'react';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export const Tabs: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onValueChange, children, className }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={`flex p-1 bg-slate-900/50 rounded-xl border border-slate-800 ${className}`}>
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.onValueChange(value)}
      className={`
        flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${isActive 
          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className }) => {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-3 duration-300 ${className}`}>
      {children}
    </div>
  );
};