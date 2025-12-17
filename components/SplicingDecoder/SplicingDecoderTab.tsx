import React, { useState, useEffect, memo, useRef } from 'react';
import { SplicingAnalysisRequest, SplicingAnalysisResult, TherapyOption } from '../../types/splicing';
import { alphaGenomeClient } from '../../services/alphaGenomeClient';
import { alphafoldClient, AlphaFold3Response } from '../../utils/alphafoldClient'; 
import { medgemmaClient } from '../../services/medgemmaClient'; 
import { MedGemmaAnalysis } from '../../types/medgemma'; 
import SplicingVisualizer from './SplicingVisualizer';
import ProteinStructureViewer from '../ProteinStructureViewer';
import ClinicalInterpretationPanel from './ClinicalInterpretationPanel'; 
import { 
  Search, GitMerge, AlertCircle, Loader2, Eraser, Activity, Pill, Dna, FileText, Info, X, 
  CheckCircle2, FlaskConical, WifiOff, Trash2, History, BarChart3, Layers, Download, Copy, 
  FileJson, ChevronDown, Check, AlertTriangle, ArrowRight, Minimize2, Box, BrainCircuit, Clock, RotateCcw, ChevronRight, Scale, HelpCircle, MousePointer2
} from 'lucide-react';

// Storage Keys
const STORAGE_KEYS = {
  HISTORY: 'mutationMechanic_splicing_history_v2', 
  COUNT: 'mutationMechanic_analysis_count',
  TEMP: 'mutationMechanic_temp_input',
  SESSION: 'mutationMechanic_splicing_decoder'
};

const MAX_HISTORY_ITEMS = 10;

const SPLICING_EXAMPLES = [
  { label: 'SMA: SMN1 Exon 7 Skipping', gene: 'SMN1', variant: 'c.840+2T>G' },
  { label: 'CF: CFTR Deep Intronic', gene: 'CFTR', variant: 'c.3849+10kbC>T' },
  { label: 'LFS: TP53 Donor Disruption', gene: 'TP53', variant: 'c.743G>A' },
  { label: 'DMD Exon 44 Skipping', gene: 'DMD', variant: 'c.6429+1G>A' },
  { label: 'CFTR F508del (Folding Defect)', gene: 'CFTR', variant: 'c.1521_1523delCTT' },
  { label: 'BRCA1 Exon 11 Donor', gene: 'BRCA1', variant: 'c.4065_4068delTCAA' },
  { label: 'NF1 Deep Intronic', gene: 'NF1', variant: 'c.5749+333C>G' }
];

// SECTION 7.4: Notification System with auto-dismiss logic
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'loading'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    if (type !== 'loading') {
        // success: 3s, error: 5s per Section 7.4
        const duration = type === 'success' ? 3000 : 5000;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }
  }, [onClose, type]);

  return (
    <div 
      role="alert"
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 border ${
      type === 'success' 
        ? 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-900/20' 
        : type === 'loading'
        ? 'bg-indigo-900/90 text-white border-indigo-700 shadow-indigo-900/20'
        : 'bg-red-900/90 text-white border-red-700 shadow-red-900/20'
    } backdrop-blur-sm`}>
      {type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : 
       type === 'loading' ? <Loader2 size={20} className="text-indigo-400 animate-spin" /> : 
       <AlertCircle size={20} className="text-red-400" />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10" aria-label="Close notification">
        <X size={16}/>
      </button>
    </div>
  );
};

// SECTION 7.3: Info Tooltip Wrapper
const MetricInfo: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="group relative inline-block ml-1">
    <HelpCircle size={12} className="text-slate-500 cursor-help hover:text-primary transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl text-[10px] text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none font-normal">
      <div className="font-bold text-white mb-1 uppercase tracking-wider">{title}</div>
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

// History Item Interface
interface HistoryItem {
  id: string;
  timestamp: number;
  gene: string;
  variant: string;
  result: SplicingAnalysisResult;
  clinical: MedGemmaAnalysis | null;
  structurePdb: string | null;
  structureConfidence: number;
}

// Session Interface for Persistence
interface SavedSession {
  targetGene: string;
  variantNotation: string;
  analysisResults: SplicingAnalysisResult;
  clinicalAnalysis: MedGemmaAnalysis | null;
  structurePdb: string | null;
  structureConfidence: number;
  lastAnalysisTimestamp: string;
}

const RiskBadge: React.FC<{ severity: string; score: number; compact?: boolean }> = memo(({ severity, score, compact }) => {
  let colorClass = '';
  let icon = null;
  let label = '';
  let message = '';

  if (severity === 'SEVERE' || score > 66) {
    colorClass = 'bg-red-900/30 text-red-200 border-red-800 hover:bg-red-900/50 hover:shadow-red-900/20'; 
    icon = <AlertCircle size={compact ? 14 : 18} className="text-red-400" />;
    label = 'HIGH RISK';
    message = "Splicing disruption probable";
  } else if (severity === 'MODERATE' || (score > 33 && score <= 66)) {
    colorClass = 'bg-yellow-900/30 text-yellow-200 border-yellow-800 hover:bg-yellow-900/50 hover:shadow-yellow-900/20';
    icon = <AlertTriangle size={compact ? 14 : 18} className="text-yellow-400" />;
    label = 'MEDIUM RISK';
    message = "Altered splicing possible";
  } else {
    colorClass = 'bg-green-900/30 text-green-200 border-green-800 hover:bg-green-900/50 hover:shadow-green-900/20';
    icon = <CheckCircle2 size={compact ? 14 : 18} className="text-green-400" />;
    label = 'LOW RISK';
    message = "Normal splicing likely";
  }

  return (
    <div 
        className={`flex flex-col gap-1 ${compact ? '' : 'w-full'} animate-in fade-in zoom-in-95 duration-500 fill-mode-backwards`}
        title={`${label}: ${message} (Score: ${score}/100)`}
        aria-live="polite"
        role="status"
    >
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm transition-all duration-200 cursor-help hover:scale-[1.02] ${colorClass}`}>
        {icon} 
        <div className="flex flex-col leading-none">
           <span className="font-bold tracking-wide text-xs">
             {label} <span className="opacity-70 font-mono font-normal">(Score: {score}/100)</span>
             {!compact && (
               <MetricInfo 
                  title="Clinical Risk" 
                  content="Predicted probability that this variant will cause significant splicing disruption based on DeepSplicer consensus." 
               />
             )}
           </span>
        </div>
      </div>
      {!compact && <div className="text-[10px] text-slate-400 ml-1">{message}</div>}
    </div>
  );
});

const ConfidenceMeter: React.FC<{ confidence: number }> = memo(({ confidence }) => {
    const [width, setWidth] = useState(0);
    
    useEffect(() => {
        const timer = setTimeout(() => setWidth(confidence), 100);
        return () => clearTimeout(timer);
    }, [confidence]);

    let message = "";
    let colorClass = "";
    let barColor = "";

    if (confidence <= 50) {
        message = "Low confidence - interpret with caution";
        colorClass = "text-red-400";
        barColor = "bg-gradient-to-r from-red-600 to-red-500";
    } else if (confidence <= 75) {
        message = "Moderate confidence - generally reliable";
        colorClass = "text-yellow-400";
        barColor = "bg-gradient-to-r from-yellow-600 to-yellow-500";
    } else if (confidence <= 90) {
        message = "High confidence - results are reliable";
        colorClass = "text-emerald-400";
        barColor = "bg-gradient-to-r from-emerald-600 to-emerald-500";
    } else {
        message = "Very high confidence - highly reliable";
        colorClass = "text-blue-400";
        barColor = "bg-gradient-to-r from-blue-600 to-blue-500";
    }

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-in fade-in duration-700">
           <div className="flex justify-between items-end mb-2">
             <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center">
               Model Confidence
               <MetricInfo title="Model Confidence" content="Statistical certainty of the DeepSplicer model across the 10kb sequence window." />
             </div>
             <div className={`font-bold ${colorClass}`}>{confidence}%</div>
           </div>
           <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2 shadow-inner" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100} aria-label="Prediction Confidence">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)] ${barColor}`} 
                style={{ width: `${width}%` }}
              ></div>
           </div>
           <p className="text-[10px] text-slate-400 text-right italic">{message}</p>
        </div>
    );
});

const SpliceSiteDiagram: React.FC<{ variant: string; gene: string; severity: string }> = memo(({ variant, severity }) => {
  const isDonor = variant.includes('+') || variant.toLowerCase().includes('donor');
  const isAcceptor = variant.includes('-') || variant.toLowerCase().includes('acceptor');
  const posMatch = variant.match(/[+-](\d+)/);
  const position = posMatch ? (variant.includes('-') ? `-${posMatch[1]}` : `+${posMatch[1]}`) : '?';
  const mutMatch = variant.match(/([A-Z])>([A-Z])/);
  const ref = mutMatch ? mutMatch[1] : '?';
  const alt = mutMatch ? mutMatch[2] : '?';

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden font-mono text-sm shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs uppercase flex items-center gap-2">
               <Activity size={14} /> Splice Site Analysis
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${severity === 'SEVERE' ? 'border-red-500/50 text-red-400 bg-red-900/20' : 'border-slate-600 text-slate-400'}`}>
                {isDonor ? "5' Donor Site" : isAcceptor ? "3' Acceptor Site" : "Exonic/Deep Intronic"}
            </span>
        </div>
        <div className="p-6 flex flex-col items-center relative" role="img" aria-label={`Diagram showing ${isDonor ? "donor" : "acceptor"} splice site disruption`}>
            <div className="w-full flex justify-between text-[10px] text-slate-500 mb-2 uppercase tracking-widest">
                <span>Exon</span>
                <span>Intron</span>
            </div>
            <div className="flex items-center justify-center gap-0.5 mb-4">
                <div className={`px-3 py-2 bg-slate-800 border-y border-l ${severity === 'SEVERE' ? 'border-red-900/30' : 'border-slate-600'} rounded-l text-slate-300`}>
                   {isDonor ? '...CAG' : '...'}
                </div>
                <div className={`px-2 py-2 font-bold border-y ${severity === 'SEVERE' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-green-900/20 border-green-500 text-green-400'}`}>
                   {isDonor ? 'GT' : 'AG'}
                </div>
                <div className={`px-3 py-2 bg-slate-800 border-y border-r ${severity === 'SEVERE' ? 'border-red-900/30' : 'border-slate-600'} rounded-r text-slate-300`}>
                   {isDonor ? 'AAGT...' : '...CAG'}
                </div>
            </div>
            <div className="flex flex-col items-center animate-bounce">
                <ArrowRight className="rotate-[270deg] text-red-500 mb-1" size={16} />
                <span className="text-xs text-red-400 font-bold bg-red-900/30 px-2 py-1 rounded border border-red-500/30">
                   {ref} &rarr; {alt}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">Position: {position}</span>
            </div>
        </div>
        <div className="bg-slate-950/50 p-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs">
               <AlertCircle size={14} className={severity === 'SEVERE' ? 'text-red-500' : 'text-yellow-500'} />
               <span className="text-slate-300">
                  {severity === 'SEVERE' 
                    ? `Variant disrupts canonical ${isDonor ? "5'" : "3'"} splice consensus sequence.`
                    : "Variant creates potential cryptic splice site nearby."}
               </span>
            </div>
        </div>
    </div>
  );
});

const TherapyCard: React.FC<{ title: string; option: TherapyOption; icon: React.ReactNode }> = memo(({ title, option, icon }) => (
    <div className={`flex flex-col p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${option.suitable ? 'bg-green-900/10 border-green-800 hover:border-green-700 hover:bg-green-900/20' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${option.suitable ? 'text-green-400 bg-green-900/30' : 'text-slate-400 bg-slate-800'}`}>{icon}</div>
            <div>
                <h4 className="font-semibold text-sm text-slate-200">{title}</h4>
                <div className={`text-[10px] uppercase font-bold ${option.suitable ? 'text-green-400' : 'text-slate-500'}`}>{option.suitable ? 'SUITABLE' : 'NOT INDICATED'}</div>
            </div>
        </div>
        <p className="text-xs text-slate-400">{option.reasoning}</p>
    </div>
));

const ExportMenu: React.FC<{ data: SplicingAnalysisResult; onExport: (type: 'json' | 'text') => void }> = ({ onExport }) => (
    <div className="flex items-center gap-2">
      <button onClick={() => onExport('text')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 text-xs rounded transition-all active:scale-95 group shadow-sm hover:shadow" aria-label="Copy report as text">
          <Copy size={14} className="group-hover:text-primary transition-colors"/> Copy as Text
      </button>
      <button onClick={() => onExport('json')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 text-xs rounded transition-all active:scale-95 group shadow-sm hover:shadow" aria-label="Export report as JSON">
          <Download size={14} className="group-hover:text-primary transition-colors"/> Export JSON
      </button>
    </div>
);

const SplicingDecoderTab: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [input, setInput] = useState({ gene: '', variant: '' });
  const [result, setResult] = useState<SplicingAnalysisResult | null>(null);
  const [structurePdb, setStructurePdb] = useState<string | null>(null); 
  const [structureConfidence, setStructureConfidence] = useState<number>(0);
  const [clinicalAnalysis, setClinicalAnalysis] = useState<MedGemmaAnalysis | null>(null);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<MedGemmaAnalysis[]>([]);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const exampleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exampleDropdownRef.current && !exampleDropdownRef.current.contains(event.target as Node)) {
        setIsExamplesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const savedCount = localStorage.getItem(STORAGE_KEYS.COUNT);
    if (savedCount) setAnalysisCount(parseInt(savedCount, 10));
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (savedSession) {
      try {
        const session: SavedSession = JSON.parse(savedSession);
        setInput({ gene: session.targetGene, variant: session.variantNotation });
        setResult(session.analysisResults);
        setStructurePdb(session.structurePdb);
        setStructureConfidence(session.structureConfidence);
        setClinicalAnalysis(session.clinicalAnalysis);
        return; 
      } catch (e) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    }
    const tempInputString = localStorage.getItem(STORAGE_KEYS.TEMP);
    if (tempInputString) {
      try { setInput(JSON.parse(tempInputString)); } catch (e) {}
    }
  }, []);

  const saveHistoryItem = (item: HistoryItem) => {
    setHistory(prev => {
      const filtered = prev.filter(h => !(h.gene === item.gene && h.variant === item.variant));
      const updated = [item, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    setInput({ gene: item.gene, variant: item.variant });
    setResult(item.result);
    setStructurePdb(item.structurePdb);
    setStructureConfidence(item.structureConfidence);
    setClinicalAnalysis(item.clinical);
    setShowHistory(false);
    saveSession({
        targetGene: item.gene,
        variantNotation: item.variant,
        analysisResults: item.result,
        clinicalAnalysis: item.clinical,
        structurePdb: item.structurePdb,
        structureConfidence: item.structureConfidence,
        lastAnalysisTimestamp: new Date().toISOString()
    });
    setToast({ message: 'Loaded from history', type: 'success' });
  };

  const saveSession = (session: SavedSession) => {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleInputChange = (field: keyof typeof input, value: string) => {
    const newInput = { ...input, [field]: value };
    setInput(newInput);
    if (error) setError(null); 
    localStorage.setItem(STORAGE_KEYS.TEMP, JSON.stringify(newInput));
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure? This will clear all history and reset the application state.")) {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.TEMP);
        localStorage.removeItem(STORAGE_KEYS.COUNT);
        setHistory([]);
        setInput({ gene: '', variant: '' });
        setResult(null);
        setStructurePdb(null);
        setClinicalAnalysis(null);
        setAnalysisCount(0);
        setError(null);
        setShowHistory(false);
        setToast({ message: 'Analysis history cleared', type: 'success' });
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.gene.trim()) { setError("Please select a target gene"); return; }
    if (!input.variant.trim()) { setError("Please enter a variant in c. notation"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setStructurePdb(null);
    setClinicalAnalysis(null);
    setBatchResults([]);

    try {
      if (mode === 'single') {
        setClinicalLoading(true);
        const dataPromise = alphaGenomeClient.predictSplicingEffect({ geneId: input.gene, variantId: input.variant, sequenceWindow: "10kb" });
        let clinicalResult: MedGemmaAnalysis | null = null;
        medgemmaClient.analyzeVariant(input.gene, input.variant)
          .then(clinical => {
             clinicalResult = clinical;
             setClinicalAnalysis(clinical);
             setClinicalLoading(false);
             if (data && afResult) {
                 saveSession({
                    targetGene: input.gene,
                    variantNotation: input.variant,
                    analysisResults: data,
                    clinicalAnalysis: clinical,
                    structurePdb: afResult.pdb_structure,
                    structureConfidence: afResult.confidence_score,
                    lastAnalysisTimestamp: new Date().toISOString()
                 });
             }
          })
          .catch(e => {
             console.warn("MedGemma failed", e);
             setClinicalLoading(false);
          });
        const data = await dataPromise;
        setResult(data);
        const dummySequence = "M" + "L".repeat(50) + "A".repeat(50);
        const afResult = await alphafoldClient.predictProteinStructure(dummySequence);
        setStructurePdb(afResult.pdb_structure);
        setStructureConfidence(afResult.confidence_score);
        const newCount = analysisCount + 1;
        setAnalysisCount(newCount);
        localStorage.setItem(STORAGE_KEYS.COUNT, newCount.toString());
        saveSession({
            targetGene: input.gene,
            variantNotation: input.variant,
            analysisResults: data,
            clinicalAnalysis: clinicalResult,
            structurePdb: afResult.pdb_structure,
            structureConfidence: afResult.confidence_score,
            lastAnalysisTimestamp: new Date().toISOString()
        });
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          gene: input.gene,
          variant: input.variant,
          result: data,
          clinical: null,
          structurePdb: afResult.pdb_structure,
          structureConfidence: afResult.confidence_score
        };
        saveHistoryItem(historyItem);
        setToast({ message: 'Analysis completed successfully', type: 'success' });
      } else {
        setBatchProgress("0/3 analyses complete");
        setToast({ message: "Starting batch comparison...", type: 'loading' });
        const variantsToCompare = [
            { gene: input.gene, variant: input.variant },
            { gene: "SMN1", variant: "c.840+2T>G" },
            { gene: "CFTR", variant: "c.3849+10kbC>T" }
        ];
        const results: MedGemmaAnalysis[] = [];
        for (let i = 0; i < variantsToCompare.length; i++) {
            const v = variantsToCompare[i];
            setBatchProgress(`${i}/${variantsToCompare.length} analyses complete`);
            const res = await medgemmaClient.analyzeVariant(v.gene, v.variant);
            results.push(res);
            setBatchResults([...results]);
            await new Promise(r => setTimeout(r, 800)); 
        }
        setBatchProgress("3/3 analyses complete");
        setToast({ message: "Batch processing complete", type: 'success' });
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setToast({ message: 'Analysis failed', type: 'error' });
      setClinicalLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setInput({ gene: '', variant: '' });
    setResult(null);
    setStructurePdb(null);
    setClinicalAnalysis(null);
    setBatchResults([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEYS.TEMP);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  const setPreset = (gene: string, variant: string) => {
    setInput({ gene, variant });
    setIsExamplesOpen(false);
  };

  const getSeverityScore = (res: SplicingAnalysisResult) => {
      if (res.clinicalSeverity === 'SEVERE') return 95;
      if (res.clinicalSeverity === 'MODERATE') return 55;
      return 15;
  };

  const handleExport = (type: 'json' | 'text') => {
      if (!result) return;
      if (type === 'json') {
          const jsonString = JSON.stringify(result, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `splicing_analysis_${result.gene}_${result.variant.replace(/[^a-z0-9]/gi, '_')}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setToast({ message: 'JSON report downloaded', type: 'success' });
      } else {
          const textReport = `
MUTATION MECHANIC REPORT
========================
Gene: ${result.gene}
Variant: ${result.variant}
Date: ${new Date(result.timestamp || Date.now()).toLocaleDateString()}

ANALYSIS SUMMARY
----------------
Clinical Severity: ${result.clinicalSeverity}
Model Confidence: ${result.confidence}%
AI Interpretation: ${result.aiInterpretation}

PREDICTED IMPACT
----------------
mRNA Stability: ${result.mRNAImpact.stabilityChange > 0 ? '+' : ''}${result.mRNAImpact.stabilityChange}%
Protein State: ${result.proteinImpact.description}
Frameshift: ${result.proteinImpact.frameshift ? 'Yes' : 'No'}

THERAPEUTIC CANDIDATES
----------------------
ASO: ${result.therapySuitability.antisenseOligonucleotide.suitable ? 'Suitable' : 'Not Indicated'}
Small Molecule: ${result.therapySuitability.smallMoleculeSpliceModulator.suitable ? 'Suitable' : 'Not Indicated'}
Gene Therapy: ${result.therapySuitability.geneTherapy.suitable ? 'Suitable' : 'Not Indicated'}
`;
          navigator.clipboard.writeText(textReport).then(() => {
              setToast({ message: 'Report copied to clipboard', type: 'success' });
          }).catch(() => {
              setToast({ message: 'Failed to copy to clipboard', type: 'error' });
          });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Header Section */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-8 border-l-4 border-violet-600 relative overflow-hidden group hover:border-violet-500 transition-colors duration-300">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
           <GitMerge size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <GitMerge className="text-violet-600" size={32} />
            <h2 className="text-3xl font-bold text-white">Splicing Decoder</h2>
          </div>
          <p className="text-slate-300 text-lg max-w-2xl">
            Analyze intronic variants for cryptic splicing, exon skipping, and therapeutic amenability using deep learning models.
          </p>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="absolute right-0 top-0 w-full max-w-md bg-slate-900 border border-slate-700 shadow-2xl rounded-xl z-50 p-4 animate-in fade-in slide-in-from-right-10 min-h-[400px]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2"><History size={18}/> Recent Analyses</h3>
            <button onClick={() => setShowHistory(false)} aria-label="Close history"><X size={18} /></button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             {history.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No recent history.</p>}
             {history.map((item) => (
               <div key={item.id} onClick={() => loadFromHistory(item)} className="w-full text-left bg-slate-800 hover:bg-slate-750 p-3 rounded-lg border border-slate-700 mb-2 cursor-pointer group relative" role="button" aria-label={`Load analysis for ${item.gene} ${item.variant}`}>
                 <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 mr-2">
                        <div className="font-bold text-white truncate" title={item.gene}>{item.gene}</div>
                        <div className="text-xs text-primary font-mono truncate" title={item.variant}>{item.variant}</div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(item.timestamp).toLocaleDateString()}</span>
                 </div>
                 <div className="mt-2 flex items-center gap-2">
                    <RiskBadge severity={item.result.clinicalSeverity} score={getSeverityScore(item.result)} compact />
                 </div>
                 <button 
                    onClick={(e) => deleteFromHistory(e, item.id)}
                    className="absolute bottom-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete item"
                 >
                    <Trash2 size={14} />
                 </button>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-sm hover:border-slate-600 transition-colors duration-300 relative z-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
             <h3 className="text-white font-semibold flex items-center gap-2">
               <Search size={18} className="text-primary"/> 
               {mode === 'single' ? 'Variant Input' : 'Batch Comparison Input'}
             </h3>
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button 
                   type="button"
                   onClick={() => setMode('single')}
                   className={`px-3 py-1 text-xs rounded transition-all duration-200 active:scale-95 ${mode === 'single' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                   aria-label="Single Analysis Mode"
                >
                   Single
                </button>
                <button 
                   type="button"
                   onClick={() => setMode('compare')}
                   className={`px-3 py-1 text-xs rounded transition-all duration-200 active:scale-95 flex items-center gap-1 ${mode === 'compare' ? 'bg-scientific-blue text-white shadow' : 'text-slate-400 hover:text-white'}`}
                   aria-label="Batch Comparison Mode"
                >
                   <Scale size={10}/> Compare
                </button>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono font-medium shadow-sm">
              <BarChart3 size={12} className="text-primary" /> Analyses: {analysisCount}
            </span>
            <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-1 text-xs px-3 py-1 rounded transition-colors active:scale-95 ${showHistory ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`} aria-label="Toggle History">
              <History size={12} /> History
            </button>
            <button 
                onClick={clearAllData}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded transition-colors text-red-400 hover:text-white hover:bg-red-900/50 border border-transparent hover:border-red-900/50 active:scale-95"
                title="Clear All Data & Reset"
                aria-label="Clear All Data and Reset"
            >
                <Trash2 size={12} /> Clear Data
            </button>
          </div>
        </div>
        
        <form onSubmit={handleAnalyze}>
           <div className="flex justify-between items-end mb-2">
             <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                {mode === 'single' ? 'Target Gene & Variant' : 'Primary Variant (will compare vs SMN1/CFTR)'}
             </label>
             {mode === 'single' && (
                 <div className="relative" ref={exampleDropdownRef}>
                    <button 
                        type="button" 
                        onClick={() => setIsExamplesOpen(!isExamplesOpen)}
                        className="text-xs text-primary hover:text-white flex items-center gap-1 transition-colors font-medium"
                    >
                      Load Example <ChevronDown size={12} className={`transition-transform duration-200 ${isExamplesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isExamplesOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 z-50 overflow-hidden">
                           {SPLICING_EXAMPLES.map((ex, i) => (
                             <button key={i} type="button" onClick={() => setPreset(ex.gene, ex.variant)} className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700/50 last:border-0 transition-colors">
                               <div className="font-bold text-white">{ex.label}</div>
                               <div className="text-slate-500 font-mono mt-0.5">{ex.gene} : {ex.variant}</div>
                             </button>
                           ))}
                        </div>
                    )}
                 </div>
             )}
           </div>
           
           <div className="flex flex-col md:flex-row gap-2 mb-4">
             <div className="flex-1 w-full relative">
               <input 
                 id="splicing-gene-input" 
                 type="text" 
                 value={input.gene} 
                 onChange={e => handleInputChange('gene', e.target.value)} 
                 disabled={loading} 
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-slate-800 focus:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-200 font-mono placeholder:text-slate-600" 
                 placeholder="Gene (e.g. SMN1)"
                 aria-label="Target Gene" 
               />
             </div>
             <div className="flex-[2] w-full relative">
               <input 
                 id="splicing-variant-input" 
                 type="text" 
                 value={input.variant} 
                 onChange={e => handleInputChange('variant', e.target.value)} 
                 disabled={loading} 
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-slate-800 focus:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-200 font-mono placeholder:text-slate-600" 
                 placeholder="Variant (e.g. c.840+2T>G)"
                 aria-label="Variant in cDNA notation" 
               />
             </div>
             <button type="button" onClick={clearForm} className="px-3 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 active:scale-95 transition-all md:w-auto w-full flex items-center justify-center" title="Clear Inputs" aria-label="Clear Inputs"><Eraser size={18} /></button>
           </div>
          
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-100 rounded-lg p-4 mb-4 flex items-start gap-3 animate-in shake"><AlertCircle size={20} className="text-red-400 flex-shrink-0" /><div className="flex-1"><p className="font-bold text-sm">Error</p><p className="text-sm opacity-90 break-words">{error}</p></div><button type="button" onClick={()=>setError(null)} className="hover:text-white transition-colors" aria-label="Dismiss error"><X size={18}/></button></div>}

          {batchProgress && mode === 'compare' && (
             <div className="mb-4 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg flex items-center gap-3 animate-in fade-in">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
                <span className="text-indigo-200 text-sm font-mono">{batchProgress}</span>
             </div>
          )}

          <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-violet-600 hover:bg-violet-500 active:scale-95 hover:shadow-lg hover:shadow-violet-500/20 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[160px] justify-center"
                aria-label={loading ? "Analysis in progress" : "Analyze Splicing Variants"}
              >
                {loading ? <><Loader2 className="animate-spin" size={18} /> Analyzing...</> : mode === 'compare' ? <><Layers size={18} /> Run Batch Comparison</> : <><GitMerge size={18} /> Analyze Splicing</>}
              </button>
          </div>
        </form>
      </div>

      {/* SECTION 7.2: Empty State Landing */}
      {!result && !loading && mode === 'single' && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-700 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="bg-violet-500/10 p-4 rounded-full mb-6 relative">
                <GitMerge size={48} className="text-violet-500 relative z-10" />
                <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ready to Decode Splicing Defects?</h3>
            <p className="text-slate-400 max-w-lg mb-8">
              Enter a genomic variant (c. notation) above or select an example from the dropdown to start your deep learning analysis. 
              Our models predict transcript integrity and therapeutic suitability.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => setPreset('SMN1', 'c.840+2T>G')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-all">
                   <MousePointer2 size={14}/> Try SMA Example
                </button>
                <button onClick={() => setPreset('CFTR', 'c.3849+10kbC>T')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-all">
                   <MousePointer2 size={14}/> Try CF Deep Intronic
                </button>
            </div>
        </div>
      )}

      {/* BATCH RESULTS VIEW */}
      {mode === 'compare' && batchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4" role="region" aria-label="Batch Analysis Results">
             {batchResults.map((res, i) => (
                 <div key={i} className="h-full">
                     <div className="mb-2 font-bold text-slate-400 text-sm flex items-center gap-2">
                        <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">#{i+1}</span>
                        {res.gene} {res.variantId.split('-')[1]}
                     </div>
                     <ClinicalInterpretationPanel data={res} loading={false} />
                 </div>
             ))}
          </div>
      )}

      {/* SINGLE RESULTS VIEW */}
      {mode === 'single' && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" role="region" aria-label="Single Analysis Results">
          
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
             <div className="flex-1 min-w-0">
               <SplicingVisualizer data={result} />
             </div>
             <div className="w-full md:w-80 flex flex-col gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-3 shadow-sm hover:border-slate-600 transition-colors">
                   <h4 className="text-sm font-bold text-slate-300">Analysis Summary</h4>
                   <RiskBadge severity={result.clinicalSeverity} score={getSeverityScore(result)} />
                   <ConfidenceMeter confidence={result.confidence} />
                </div>
                <div className="flex-1">
                   <SpliceSiteDiagram variant={result.variant} gene={result.gene} severity={result.clinicalSeverity} />
                </div>
             </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-sm">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Box size={20} className="text-scientific-blue" />
                 Predicted Protein Structure Impact
               </h3>
               <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    Confidence (pLDDT): <strong className="text-white">{structureConfidence.toFixed(1)}</strong>
                  </span>
                  <span className="text-xs bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-400">
                      AlphaFold 3
                  </span>
               </div>
             </div>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="h-80 border border-slate-700 rounded-xl overflow-hidden relative">
                   <ProteinStructureViewer 
                      pdbData={structurePdb} 
                      label={result.gene}
                      loading={!structurePdb}
                      colorBy="confidence" 
                   />
                </div>
                <div className="flex flex-col justify-center space-y-4">
                   <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center">
                        Impact Description
                        <MetricInfo title="Protein Impact" content="Estimated effect on the amino acid sequence and resulting 3D tertiary structure." />
                      </div>
                      <p className="text-sm text-slate-200">{result.proteinImpact.description}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-bold mb-1">Protein Loss</div>
                         <div className={`text-xl font-bold font-mono ${result.proteinImpact.truncationPercentage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                           {result.proteinImpact.truncationPercentage}%
                         </div>
                      </div>
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-bold mb-1">Frameshift</div>
                         <div className={`text-xl font-bold font-mono ${result.proteinImpact.frameshift ? 'text-red-400' : 'text-emerald-400'}`}>
                           {result.proteinImpact.frameshift ? "YES" : "NO"}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end">
             <ExportMenu data={result} onExport={handleExport} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-full hover:border-slate-600 transition-colors shadow-sm">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Activity size={20} className="text-purple-400"/> Splicing Impact Metrics</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide flex items-center">
                        mRNA Stability
                        <MetricInfo title="mRNA Stability" content="Percentage change in transcript half-life due to NMD or structural alteration." />
                      </div>
                      <div className={`font-mono font-bold text-lg ${result.mRNAImpact.stabilityChange < -20 ? 'text-red-400' : 'text-slate-200'}`}>
                        {result.mRNAImpact.stabilityChange > 0 ? '+' : ''}{result.mRNAImpact.stabilityChange}%
                      </div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Protein Status</div>
                      <div className="font-mono font-bold text-slate-200 text-xs truncate leading-8" title={result.proteinImpact.description}>
                        {result.proteinImpact.frameshift ? 'Frameshift' : 'In-frame'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-3">"{result.aiInterpretation}"</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-full flex flex-col hover:border-slate-600 transition-colors shadow-sm">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Pill size={20} className="text-green-400"/> Clinical Insights & Therapies</h3>
                <div className="flex flex-col md:flex-row gap-6 h-full">
                   <div className="flex-1 min-w-[300px]">
                      <ClinicalInterpretationPanel data={clinicalAnalysis} loading={clinicalLoading} />
                   </div>
                   
                   <div className="flex-1 flex flex-col gap-4">
                      <TherapyCard title="Antisense Oligo" option={result.therapySuitability.antisenseOligonucleotide} icon={<Dna size={20}/>}/>
                      <TherapyCard title="Small Molecule" option={result.therapySuitability.smallMoleculeSpliceModulator} icon={<Pill size={20}/>}/>
                      <TherapyCard title="Gene Therapy" option={result.therapySuitability.geneTherapy} icon={<FileText size={20}/>}/>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default SplicingDecoderTab;