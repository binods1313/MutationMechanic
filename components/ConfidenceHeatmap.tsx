import React, { useState } from 'react';

interface ConfidenceHeatmapProps {
  scores: number[];
  sequence?: string;
  className?: string;
}

const ConfidenceHeatmap: React.FC<ConfidenceHeatmapProps> = ({ scores, sequence, className = '' }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // AlphaFold Color Scheme
  const getColor = (score: number) => {
    // Handle potential NaNs or undefined
    const s = score || 0;
    if (s >= 90) return 'bg-[#0053D6]'; // Very High (Dark Blue)
    if (s >= 70) return 'bg-[#65CBF3]'; // Confident (Light Blue)
    if (s >= 50) return 'bg-[#FFDB13]'; // Low (Yellow)
    return 'bg-[#FF7D45]'; // Very Low (Orange)
  };

  if (!scores || scores.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-end">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Per-Residue Confidence (pLDDT)</h4>
        {hoverIndex !== null && hoverIndex < scores.length && (
          <div className="text-xs font-mono text-white animate-fade-in">
            Pos {hoverIndex + 1} 
            {sequence ? `: ${sequence[hoverIndex] || '?'}` : ''} 
            {' '}|{' '}
            <span className={(scores[hoverIndex] || 0) < 70 ? 'text-yellow-400' : 'text-blue-400'}>
              {(scores[hoverIndex] || 0).toFixed(1)}
            </span>
          </div>
        )}
      </div>
      
      <div className="relative h-4 w-full bg-slate-900 rounded-sm overflow-hidden flex cursor-crosshair">
        {scores.map((score, idx) => (
          <div
            key={idx}
            className={`h-full flex-1 min-w-[2px] ${getColor(score)} hover:opacity-80 transition-opacity`}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-[10px] text-slate-500 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#0053D6]"></div> &gt;90 (Very High)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#65CBF3]"></div> 70-90 (Confident)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FFDB13]"></div> 50-70 (Low)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FF7D45]"></div> &lt;50 (Very Low)
        </div>
      </div>
    </div>
  );
};

export default ConfidenceHeatmap;
