import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import VariantSelector from './VariantSelector';
import StructureCharts from './StructureCharts';
import AnalysisPanel from './AnalysisPanel';
import { AnalysisResponse } from '../types';
import { MOCK_ANALYSIS } from '../constants';
import { AlertCircle, RefreshCw, ServerCrash, Save, Book, ChevronRight, Play, Download, Upload, Trash2, Edit, Filter, ListFilter, X, Plus } from 'lucide-react';
import { presetStorage, PresetSchema } from '../utils/presetStorage';

const API_URL = 'http://localhost:3001/api/analyze';

export interface BenchmarkPreset {
  id: string;
  title: string;
  hgvs: string;
  type: 'frameshift' | 'splice' | 'control' | 'folding' | 'custom';
  description?: string;
  expectedImpact?: string;
}

const DEFAULT_PRESETS: BenchmarkPreset[] = [
  { id: 'brca2-fs', title: 'BRCA2 Frameshift', hgvs: 'BRCA2 c.5946delT', type: 'frameshift', description: 'p.Ser1982ArgfsTer22', expectedImpact: 'Severe truncation' },
  { id: 'tp53-fs', title: 'TP53 Frameshift', hgvs: 'TP53 c.375_376insA', type: 'frameshift', description: 'p.Ser126fs', expectedImpact: 'Loss of DNA binding' },
  { id: 'dmd-splice', title: 'DMD Exon 44 Donor Loss', hgvs: 'DMD c.6429+1G>A', type: 'splice', description: 'Splice site disruption (Donor Loss)', expectedImpact: 'Exon skipping' },
  { id: 'cftr-folding', title: 'CFTR F508del', hgvs: 'CFTR c.1521_1523delCTT', type: 'folding', description: 'p.Phe508del', expectedImpact: 'Misfolding & degradation' }
];

const CompensatoryDesignTab: React.FC = () => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customPresets, setCustomPresets] = useState<PresetSchema[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetForm, setPresetForm] = useState<Partial<PresetSchema>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataCache = useRef<Record<string, AnalysisResponse>>({});
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCustomPresets(presetStorage.getPresets());
    
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedVariantId) setIsSaveModalOpen(true);
      }
      if (e.key === 'Escape') setIsSaveModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    };
  }, [selectedVariantId]);

  const allPresets = useMemo(() => {
    return [...DEFAULT_PRESETS, ...customPresets];
  }, [customPresets]);

  const filteredPresets = useMemo(() => {
    if (categoryFilter === 'ALL') return allPresets;
    return allPresets.filter(p => p.type === categoryFilter);
  }, [allPresets, categoryFilter]);

  const handleSavePreset = () => {
    if (!presetForm.title) return;
    const updated = presetStorage.savePreset({
      id: presetForm.id || `custom-${Date.now()}`,
      title: presetForm.title,
      hgvs: selectedVariantId,
      type: 'custom',
      description: presetForm.description || '',
    });
    setCustomPresets(updated);
    setIsSaveModalOpen(false);
    setPresetForm({});
  };

  const handleDeletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this preset?')) {
      setCustomPresets(presetStorage.deletePreset(id));
    }
  };

  const handleExport = () => {
    const data = presetStorage.exportPresets();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mutation_mechanic_presets.json';
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = presetStorage.importPresets(evt.target?.result as string);
        setCustomPresets(imported);
      } catch (err) {
        alert((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const simulateStreaming = useCallback((fullData: AnalysisResponse) => {
    setIsStreaming(true);
    setAnalysisData({ ...fullData, aiAnalysis: { summary: '', compensatory_mutations: [] } });
    const fullSummary = fullData.aiAnalysis?.summary || '';
    let charIndex = 0;
    const typeNextChunk = () => {
      if (charIndex < fullSummary.length) {
        charIndex = Math.min(charIndex + 2, fullSummary.length);
        setAnalysisData(prev => {
          if (!prev || !prev.aiAnalysis) return null;
          return { ...prev, aiAnalysis: { ...prev.aiAnalysis, summary: fullSummary.slice(0, charIndex) } };
        });
        streamTimeoutRef.current = setTimeout(typeNextChunk, 40);
      } else {
        setAnalysisData(prev => ({ ...prev!, aiAnalysis: fullData.aiAnalysis }));
        setIsStreaming(false);
      }
    };
    typeNextChunk();
  }, []);

  const loadVariantData = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    try {
      let data: AnalysisResponse;
      if (dataCache.current[id]) {
        data = dataCache.current[id];
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        let mockKey = id;
        if (id.includes('F508del')) mockKey = 'CFTR-F508del';
        if (id.includes('TP53')) mockKey = 'TP53-R248Q'; 
        data = MOCK_ANALYSIS[mockKey] || MOCK_ANALYSIS[Object.keys(MOCK_ANALYSIS)[0]];
        dataCache.current[id] = data;
      }
      setLoading(false);
      simulateStreaming(data);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Analysis failed.");
    }
  }, [simulateStreaming]);

  useEffect(() => {
    if (selectedVariantId) loadVariantData(selectedVariantId);
  }, [selectedVariantId, loadVariantData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Book size={18} className="text-primary"/> Benchmark Repository</h3>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
               {['ALL', 'frameshift', 'splice', 'folding', 'custom'].map(cat => (
                 <button 
                  key={cat} 
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${categoryFilter === cat ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="Import Presets"><Upload size={16}/></button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json"/>
            <button onClick={handleExport} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="Export Presets"><Download size={16}/></button>
            <button 
              onClick={() => { setPresetForm({}); setIsSaveModalOpen(true); }}
              disabled={!selectedVariantId}
              className="ml-2 flex items-center gap-2 bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              <Save size={14}/> Save Preset (Ctrl+S)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {filteredPresets.map(preset => (
            <button 
              key={preset.id}
              onClick={() => setSelectedVariantId(preset.hgvs)}
              className={`text-left p-3 rounded-xl border transition-all relative group ${selectedVariantId === preset.hgvs ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
            >
              <div className="font-bold text-white text-xs mb-1 group-hover:text-primary transition-colors">{preset.title}</div>
              <div className="font-mono text-[9px] text-slate-500 truncate mb-2">{preset.hgvs}</div>
              <div className="flex justify-between items-center">
                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${preset.type === 'custom' ? 'bg-amber-900/40 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-400'}`}>{preset.type}</span>
                {preset.type === 'custom' && (
                  <button onClick={(e) => handleDeletePreset(e, preset.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-opacity"><Trash2 size={12}/></button>
                )}
              </div>
            </button>
          ))}
          {filteredPresets.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 italic text-sm border border-dashed border-slate-700 rounded-xl">No presets found in this category.</div>}
        </div>
      </div>

      <VariantSelector selectedId={selectedVariantId} onSelect={setSelectedVariantId} loading={loading || isStreaming}/>

      {(loading || analysisData) && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-7"><StructureCharts data={analysisData?.predictions} loading={loading}/></div>
          <div className="xl:col-span-5"><AnalysisPanel data={analysisData} loading={loading} isStreaming={isStreaming}/></div>
        </div>
      )}

      {/* Save Preset Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2"><Save size={16} className="text-primary"/> Save Benchmark</h3>
              <button onClick={() => setIsSaveModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Benchmark Title</label>
                <input 
                  type="text" 
                  value={presetForm.title || ''} 
                  onChange={e => setPresetForm({...presetForm, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. BRCA2 Stability Control"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Description</label>
                <textarea 
                  value={presetForm.description || ''} 
                  onChange={e => setPresetForm({...presetForm, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-primary h-24 text-xs"
                  placeholder="Optional impact notes..."
                />
              </div>
              <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold">HGVS Variant</div>
                <div className="text-xs font-mono text-primary font-bold">{selectedVariantId}</div>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
              <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white">Cancel</button>
              <button onClick={handleSavePreset} className="flex-1 py-2 bg-primary hover:bg-primary-hover rounded text-xs font-bold text-white shadow-lg shadow-primary/20">Commit to Store</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensatoryDesignTab;