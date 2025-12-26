import React, { useState } from 'react';
import { AnalysisResponse } from '../types';
import { VariantAnalysis } from '../services/geminiService';
import { GenomicContext } from '../types/genomics';
import { Sparkles, ArrowRight, BrainCircuit, Activity, Info, X, CheckCircle2 } from 'lucide-react';
import ChatWidget from './ChatWidget';

interface AnalysisPanelProps {
  data?: AnalysisResponse | VariantAnalysis | null;
  genomicData?: GenomicContext | null; // Section 9.1: Prop drilling
  loading: boolean;
  isStreaming?: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data, genomicData, loading, isStreaming }) => {
  const [selectedMutationInfo, setSelectedMutationInfo] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Mechanism Skeleton */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 h-48 flex flex-col animate-pulse">
          <div className="h-5 w-40 bg-slate-800 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
          </div>
        </div>

        {/* RMSD Skeleton */}
        <div className="bg-slate-850/50 border border-slate-800 p-4 rounded-lg h-16 animate-pulse">
           <div className="h-full w-full bg-slate-800/50 rounded"></div>
        </div>

        {/* Mutations Skeleton */}
        <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 animate-pulse">
          <div className="h-5 w-56 bg-slate-800 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-28 bg-slate-900 rounded-lg border border-slate-800"></div>
            <div className="h-28 bg-slate-900 rounded-lg border border-slate-800"></div>
          </div>
        </div>

        {/* ChatWidget disabled/placeholder during loading */}
        <ChatWidget analysisData={null} genomicData={null} />
      </div>
    );
  }

  const analysis = (data as AnalysisResponse)?.aiAnalysis || (data as VariantAnalysis)?.analysis;
  if (!analysis || !data) return null;

  const isAnalysisReady = !isStreaming;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Mechanism Analysis */}
      <div 
        className={`bg-slate-850 p-6 rounded-xl border relative overflow-hidden group hover:border-primary/40 transition-all duration-700 border-l-4 border-l-primary/60 
        ${isAnalysisReady 
          ? 'border-slate-600 ring-1 ring-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
          : 'border-slate-700 shadow-sm'}
        animate-in fade-in zoom-in-95 duration-500`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <BrainCircuit size={100} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <h3 className="text-white font-semibold mb-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
             <Sparkles className={`h-5 w-5 text-primary ${isStreaming ? 'animate-[pulse_1s_ease-in-out_infinite]' : ''}`} />
             <span>Mechanistic Analysis</span>
          </div>
          {isAnalysisReady && <CheckCircle2 className="h-4 w-4 text-green-500 animate-in zoom-in spin-in-90 duration-300" />}
        </h3>
        <div className="prose prose-invert max-w-none relative z-10">
          <p className={`text-slate-300 leading-relaxed text-sm md:text-base ${isStreaming ? 'after:content-["▋"] after:ml-1 after:animate-pulse after:text-primary' : ''}`}>
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* RMSD Alert */}
      <div 
        className="bg-slate-850/50 border border-slate-800 p-4 rounded-lg flex items-center justify-between ring-1 ring-scientific-red/20 animate-in fade-in slide-in-from-left-2 duration-500 delay-150"
      >
        <div className="flex items-center gap-3">
          <Activity className="text-scientific-red h-5 w-5" />
          <span className="text-slate-300 text-sm">Structural Deviation (RMSD)</span>
        </div>
        <span className="text-2xl font-mono font-bold text-white">
          {data.predictions.delta.rmsd.toFixed(2)} Å
        </span>
      </div>

      {/* Compensatory Mutations */}
      <div 
        className={`bg-slate-850 p-6 rounded-xl border relative overflow-hidden transition-all duration-700 border-l-4 border-l-scientific-blue/60 
        ${isAnalysisReady 
          ? 'border-slate-600 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-scientific-blue/30' 
          : 'border-slate-700 shadow-sm'}
        animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300`}
      >
        <h3 className="text-white font-semibold mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className={`h-2 w-2 bg-scientific-blue rounded-full shadow-[0_0_10px_#06b6d4] ${isStreaming ? 'animate-pulse' : ''}`}></div>
             Suggested Compensatory Mutations
          </div>
          {isAnalysisReady && analysis.compensatory_mutations.length > 0 && (
             <span className="text-xs bg-scientific-blue/10 text-scientific-blue px-2 py-0.5 rounded animate-in fade-in">AI Optimized</span>
          )}
        </h3>
        
        <div className="space-y-4">
          {analysis.compensatory_mutations.length === 0 && isStreaming && (
            <div className="flex items-center gap-3 text-slate-500 text-sm italic animate-pulse p-2">
              <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
              <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
              Generating candidates...
            </div>
          )}
          
          {analysis.compensatory_mutations.map((mut, idx) => (
            <div 
              key={idx} 
              className={`group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-scientific-blue/40 transition-all rounded-lg p-4 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards ${(() => {
                const delays = ['delay-75','delay-150','delay-200','delay-300','delay-500','delay-700','delay-1000'];
                return delays[Math.min(idx, delays.length - 1)];
              })()}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-scientific-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-lg font-mono font-bold text-scientific-blue bg-scientific-blue/10 px-2 py-0.5 rounded">
                  {mut.mutation}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    mut.confidence > 0.8 ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'
                  }`}>
                    {(mut.confidence * 100).toFixed(0)}% Confidence
                  </span>
                  <button 
                    onClick={() => setSelectedMutationInfo(idx)}
                    className="text-slate-500 hover:text-white transition-colors p-1"
                    title="View detailed reasoning"                    aria-label={`View reasoning for ${mut.mutation}`}                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                {mut.reasoning}
              </p>
              
<button className="text-xs text-primary hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-300 relative z-10" aria-label={`Simulate variant ${mut.mutation}`}>
                Simulate this variant <ArrowRight size={12} />
              </button>

              {/* Inline Overlay Modal */}
              {selectedMutationInfo === idx && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-20 p-5 animate-in fade-in flex flex-col justify-between border border-slate-700 rounded-lg">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-bold text-white text-sm flex items-center gap-2">
                        <Info size={14} className="text-scientific-blue"/> AI Reasoning
                      </h5>
                      <button 
                        onClick={() => setSelectedMutationInfo(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Close details"
                        title="Close details"
                      >
                        <X size={16}/>
                      </button>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {mut.reasoning}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                     <button 
                       onClick={() => setSelectedMutationInfo(null)} 
                       className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
                     >
                       Close
                     </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Integrated Chat Widget - Section 9.1 */}
      <ChatWidget analysisData={data} genomicData={genomicData} />
    </div>
  );
};

export default AnalysisPanel;