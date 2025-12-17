import React from 'react';
import { Microscope, AlertTriangle } from 'lucide-react';

const DiseaseTracerTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-scientific-green/20 blur-xl rounded-full"></div>
        <div className="relative p-6 bg-slate-850 rounded-full border border-slate-700 shadow-xl">
          <Microscope className="h-16 w-16 text-scientific-green" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">Disease Tracer <span className="text-scientific-green text-sm align-super bg-scientific-green/10 px-2 py-0.5 rounded-full border border-scientific-green/20">BETA</span></h2>
      <p className="text-slate-400 max-w-xl text-lg mb-8">
        Trace the evolutionary path of pathogenic mutations and visualize their distribution across the human population.
      </p>

      <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-6 max-w-md w-full flex items-start text-left">
        <AlertTriangle className="h-6 w-6 text-yellow-500 mr-4 flex-shrink-0" />
        <div>
          <h3 className="text-yellow-200 font-semibold mb-1">Under Development</h3>
          <p className="text-yellow-400/80 text-sm">
            This module is currently being built. It will integrate with ClinVar and gnomAD to provide population genetics data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiseaseTracerTab;