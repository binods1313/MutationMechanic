import React from 'react';
import { VariantInfo } from '../types';
import { DISEASE_VARIANTS } from '../constants';
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react';

interface VariantSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ selectedId, onSelect, loading }) => {
  return (
    <div className="bg-slate-850 p-6 rounded-xl border border-slate-700 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Target Variant</h2>
          <p className="text-slate-400 text-sm">Select a pathological variant to analyze structure and function.</p>
        </div>
        
        <div className="relative min-w-[300px]">
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            disabled={loading}
            aria-label="Select variant"
            className="w-full appearance-none bg-slate-900 border border-slate-700 text-white py-3 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 transition-opacity"
          >
            <option value="" disabled>Select a variant...</option>
            {DISEASE_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.protein} : {v.variant} ({v.disease})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {selectedId && (
        <div className="mt-4 pt-4 border-t border-slate-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-scientific-blue flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-scientific-blue uppercase tracking-wider">Mechanism Hypothesis</span>
            <p className="text-slate-300 text-sm mt-1">
              {DISEASE_VARIANTS.find(v => v.id === selectedId)?.mechanism_summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;