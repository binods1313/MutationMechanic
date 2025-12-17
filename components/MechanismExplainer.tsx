import React from 'react';
import { BookOpen, Activity, ArrowRight } from 'lucide-react';

interface MechanismExplainerProps {
  mechanism: string;
  summary?: string;
}

const MechanismExplainer: React.FC<MechanismExplainerProps> = ({ mechanism, summary }) => {
  return (
    <div className="bg-slate-850 rounded-xl border border-slate-700 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-scientific-blue/20 rounded-lg">
          <Activity className="h-6 w-6 text-scientific-blue" />
        </div>
        <h3 className="text-2xl font-bold text-white">Mechanism of Action</h3>
      </div>
      
      <div className="space-y-6">
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-slate-300 leading-relaxed border-l-4 border-scientific-blue pl-4">
            {mechanism}
          </p>
          {summary && (
             <p className="text-slate-400 mt-4 leading-relaxed">
               {summary}
             </p>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-slate-500 mt-0.5" />
          <div>
             <h4 className="text-sm font-semibold text-slate-300">AI Interpretation</h4>
             <p className="text-xs text-slate-500 mt-1">
               Structural disruption often leads to loss of function (LOF) or gain of toxic function (GOF). 
               Compensatory strategies aim to restore native stability.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanismExplainer;