import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { OrthologInfo } from '../types/genomics';
import { Info, Globe, ChevronDown, ChevronRight, Minimize2, Maximize2, MoreHorizontal } from 'lucide-react';
import { storage } from '../utils/storage';

interface SequenceSnippetProps {
  snippet: string;
  scores?: number[];
  differences?: { pos: number; ref: string; alt: string }[];
  highlightPos?: number;
  species: string;
  onPTMClick?: (residue: string, pos: number) => void;
}

const SequenceSnippet: React.FC<SequenceSnippetProps> = ({ 
  snippet, 
  scores, 
  differences = [], 
  highlightPos,
  species 
}) => {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getConservationColor = useCallback((score: number) => {
    if (score >= 0.9) return 'bg-emerald-600 text-white';
    if (score >= 0.7) return 'bg-emerald-400/40 text-emerald-100';
    if (score >= 0.4) return 'bg-yellow-500/20 text-yellow-100';
    return 'bg-red-500/10 text-red-200';
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx = idx;
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = Math.min(idx + 1, snippet.length - 1);
        break;
      case 'ArrowLeft':
        nextIdx = Math.max(idx - 1, 0);
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = snippet.length - 1;
        break;
      case 'PageUp':
        nextIdx = Math.max(idx - 10, 0);
        break;
      case 'PageDown':
        nextIdx = Math.min(idx + 10, snippet.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Action logic here if applicable
        return;
      default:
        return;
    }

    if (nextIdx !== idx) {
      e.preventDefault();
      const el = containerRef.current?.children[nextIdx] as HTMLElement;
      el?.focus();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="font-mono text-sm flex select-none overflow-hidden rounded border border-slate-800 bg-slate-950 shadow-inner h-10 items-center ring-offset-2 ring-offset-slate-900 focus-within:ring-2 focus-within:ring-primary/20"
      role="grid"
      aria-label={`Sequence alignment for ${species}. Use arrow keys to navigate residues.`}
    >
      {snippet.split('').map((residue, idx) => {
        const score = scores?.[idx] ?? 0.5;
        const absPos = highlightPos ? highlightPos - Math.floor(snippet.length/2) + idx : idx + 1;
        const diff = differences.find(d => d.pos === absPos);
        const isHighlight = highlightPos && absPos === highlightPos;
        const isFocused = focusedIdx === idx;
        
        return (
          <div
            key={idx}
            tabIndex={0}
            onFocus={() => setFocusedIdx(idx)}
            onBlur={() => setFocusedIdx(null)}
            onMouseEnter={() => setFocusedIdx(idx)}
            onMouseLeave={() => setFocusedIdx(null)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`
              flex-1 h-full flex items-center justify-center relative cursor-help transition-all
              ${getConservationColor(score)}
              ${diff ? 'ring-1 ring-inset ring-red-500 font-bold' : ''}
              ${isHighlight ? 'ring-2 ring-primary z-10' : ''}
              focus:ring-2 focus:ring-white focus:z-20 outline-none
              ${isFocused ? 'brightness-125' : ''}
            `}
            role="gridcell"
            aria-label={`Position ${absPos}: ${residue}. Conservation: ${(score * 100).toFixed(2)}%`}
          >
            {residue}
            
            {isFocused && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 text-[10px] pointer-events-none animate-in fade-in zoom-in-95" role="tooltip">
                <div className="font-bold text-white mb-1 uppercase tracking-widest border-b border-slate-800 pb-1">{species}</div>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Residue:</span>
                    <span className="font-bold text-primary">{residue}{absPos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conservation:</span>
                    <span className="font-bold">{(score * 100).toFixed(2)}%</span>
                  </div>
                  {diff && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-red-400 font-bold flex items-center gap-2">
                      <AlertCircle size={10} /> Diff: {diff.ref} → {diff.alt}
                    </div>
                  )}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AlertCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

interface OrthologTableProps {
  orthologs: OrthologInfo[];
}

const OrthologTable: React.FC<OrthologTableProps> = ({ orthologs }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => 
    storage.get('mm_ortholog_expanded', new Set([0]))
  );

  const toggleRow = (idx: number) => {
    const next = new Set(expandedRows);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedRows(next);
    storage.set('mm_ortholog_expanded', Array.from(next));
  };

  const expandAll = () => {
    const next = new Set(orthologs.map((_, i) => i));
    setExpandedRows(next);
    storage.set('mm_ortholog_expanded', Array.from(next));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
    storage.set('mm_ortholog_expanded', []);
  };

  if (!orthologs || orthologs.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
          <Globe size={14} className="text-primary" /> Evolutionary Conservation
        </h4>
        <div className="flex gap-2">
          <button 
            onClick={expandAll}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
            title="Expand All"
            aria-label="Expand all rows"
          >
            <Maximize2 size={14} />
          </button>
          <button 
            onClick={collapseAll}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
            title="Collapse All"
            aria-label="Collapse all rows"
          >
            <Minimize2 size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="grid">
          <thead>
            <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950 border-b border-slate-800">
              <th className="px-6 py-3 w-12"></th>
              <th className="px-6 py-3">Species</th>
              <th className="px-6 py-3">Conservation Score</th>
              <th className="px-6 py-3">Alignment Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {orthologs.map((ortho, i) => {
              const isExpanded = expandedRows.has(i);
              const avgScore = ortho.conservationScores 
                ? ortho.conservationScores.reduce((a, b) => a + b, 0) / ortho.conservationScores.length 
                : 0.5;

              return (
                <React.Fragment key={i}>
                  <tr 
                    className={`hover:bg-slate-800/30 transition-colors group cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleRow(i)}
                    role="row"
                    aria-expanded={isExpanded}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleRow(i)}
                  >
                    <td className="px-6 py-4">
                      {isExpanded ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{ortho.commonName}</span>
                        <span className="text-[10px] font-mono text-slate-500 italic">{ortho.species}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${avgScore > 0.8 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : avgScore > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${avgScore * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400">{(avgScore * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!isExpanded ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-mono text-slate-500 truncate max-w-[200px] opacity-60">
                            {ortho.sequenceSnippet}
                          </div>
                          <MoreHorizontal size={14} className="text-slate-700" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-primary font-bold uppercase tracking-tighter animate-pulse">View Detailed Alignments Below</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-950/20">
                      <td colSpan={4} className="px-6 py-8 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4">
                          <div className="flex justify-between items-end px-1">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Maximize2 size={10} /> Multiple Sequence Alignment Snippet
                              </span>
                              <div className="text-[9px] text-slate-600 font-medium">Locus focus: Residue {ortho.position} centered window</div>
                            </div>
                            <div className="flex gap-4 text-[9px] text-slate-500 font-bold uppercase">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High Conservation
                              </div>
                              <span>Distance: {ortho.phylogeneticDistance?.toFixed(2)} MY</span>
                            </div>
                          </div>
                          <SequenceSnippet 
                            snippet={ortho.sequenceSnippet || ""} 
                            scores={ortho.conservationScores} 
                            differences={ortho.differences}
                            highlightPos={ortho.position}
                            species={ortho.commonName}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-center">
        <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest flex items-center gap-2">
          <Info size={10} /> Interactive Alignment View - Click rows to toggle details
        </p>
      </div>
    </div>
  );
};

export default memo(OrthologTable);
