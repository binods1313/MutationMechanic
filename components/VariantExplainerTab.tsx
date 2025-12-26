import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Loader, BookOpen, Search, ArrowLeft, Activity, Scale, CheckSquare, Square, X, Plus, Database, History, Box, Dna, Globe, ChevronDown } from 'lucide-react';
import MechanismExplainer from './MechanismExplainer';
import ProteinStructureViewer from './ProteinStructureViewer';
import ConfidenceHeatmap from './ConfidenceHeatmap';
import GenomicAnnotationPanel, { GenomicBrowser } from './GenomicAnnotationPanel';
import AnalysisPanel from './AnalysisPanel';
import ToastNotification, { ToastType } from './ToastNotification';
import { VariantInfo } from '../types';
import { GenomicContext } from '../types/genomics';
import { DISEASE_VARIANTS } from '../constants';
import { fetchUniProtInfo } from '../utils/uniprot';
import { generateVariantReport, VariantAnalysis } from '../services/geminiService';
import { alphafoldClient } from '../utils/alphafoldClient';
import { genomicAnnotationService } from '../services/genomicAnnotationService';
import { historyService, MutationType } from '../services/historyService';

const HISTORY_KEY = 'mutationMechanic_explainer_history';
const MAX_HISTORY = 10;

const fetchVariantExplanation = async (variantInput: string): Promise<ExtendedAnalysis> => {
  const trimmedInput = variantInput.trim();
  let gene = "";
  let variant = "";

  const known = DISEASE_VARIANTS.find(v => v.id === trimmedInput);
  if (known) {
    gene = known.protein;
    variant = known.variant;
  } else {
    const parts = trimmedInput.split(/\s+/);
    if (parts.length >= 2) {
      gene = parts[0];
      variant = parts[1];
    } else {
      gene = trimmedInput;
      variant = "Unknown";
    }
  }

  const report: ExtendedAnalysis = await generateVariantReport(gene, variant);
  const seqWT = report.variant.sequence;
  const seqMut = report.variant.mutantSequence;

  if (seqWT && seqWT.length > 10) {
    try {
      const promises = [alphafoldClient.predictStructure(seqWT, `${gene}-${variant}-WT`)];
      if (seqMut && seqMut !== seqWT) {
        promises.push(alphafoldClient.predictStructure(seqMut, `${gene}-${variant}-MUT`));
      }
      const results = await Promise.all(promises);
      report.pdbData = { native: results[0].pdb };
      report.structureSource = results[0].source;
      if (results[0].pdb) {
        const pdbLines = results[0].pdb.split('\n').filter(l => l.startsWith('ATOM') && l.includes('CA '));
        report.confidenceScores = pdbLines.map(l => {
          const b = parseFloat(l.substring(60, 66));
          return isNaN(b) ? 0 : b;
        });
      }
      if (results.length > 1) {
        report.pdbData.mutant = results[1].pdb;
      }
    } catch (e) {
      console.warn("Structure prediction failed", e);
    }
  }
  return report;
};

const SequenceViewer: React.FC<{ sequence: string; variant: string; highlightPosition?: number }> = ({ sequence, variant, highlightPosition }) => {
  let position = -1;
  if (highlightPosition !== undefined) {
    position = highlightPosition;
  } else {
    const match = variant.match(/p\.([A-Z][a-z]{0,2})?(\d+)(.+)?/);
    if (match) {
      position = parseInt(match[2], 10);
    } else {
      const numMatch = variant.match(/(\d+)/);
      if (numMatch) position = parseInt(numMatch[0], 10);
    }
  }
  const index = position - 1;
  if (!sequence || sequence.includes("UNAVAILABLE")) return <span className="text-slate-500 italic text-xs">Sequence data unavailable.</span>;
  if (index < 0 || index >= sequence.length) return <div className="font-mono text-xs text-slate-300 break-all p-3 bg-slate-950 rounded border border-slate-700">{sequence}</div>;
  const before = sequence.slice(0, index);
  const residue = sequence[index];
  const after = sequence.slice(index + 1);
  return (
    <div className="font-mono text-sm text-slate-300 break-all leading-relaxed relative bg-slate-950 p-3 rounded-lg border border-slate-700/50 shadow-inner">
      <span className="opacity-50">{before}</span>
      <span className="bg-scientific-red/20 text-scientific-red font-bold px-1 rounded border border-scientific-red/40 relative group cursor-help inline-block mx-0.5 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:border-scientific-red hover:scale-110">
        {residue}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">Pos {position}</span>
      </span>
      <span className="opacity-50">{after}</span>
    </div>
  );
};

interface HistoryItem {
  id: string;
  gene: string;
  variant: string;
  date: number;
  report: VariantAnalysis;
}

interface ExtendedAnalysis extends VariantAnalysis {
  structureSource?: string;
  confidenceScores?: number[];
}

interface VariantExplainerTabProps {
  variants: VariantInfo[];
  externalVariantId?: string | null;
}

const VariantExplainerTab: React.FC<VariantExplainerTabProps> = ({ variants, externalVariantId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'report' | 'compare'>('list');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ExtendedAnalysis | null>(null);
  const [genomicData, setGenomicData] = useState<GenomicContext | null>(null);
  const [isGenomicLoading, setIsGenomicLoading] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [showMutantStructure, setShowMutantStructure] = useState(false);
  const [comparisonReport, setComparisonReport] = useState<[VariantAnalysis, VariantAnalysis] | null>(null);
  const [comparisonGenomicData, setComparisonGenomicData] = useState<[GenomicContext | null, GenomicContext | null]>([null, null]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [structureId, setStructureId] = useState<string | null>(null);

  useEffect(() => {
    if (externalVariantId) {
      handleExplain(externalVariantId);
    }
  }, [externalVariantId]);

  // Auto-trigger real AlphaFold structure for fusion genes
  useEffect(() => {
    if (report?.variant?.protein) {
      const gene = report.variant.protein;
      if (gene.includes('-') || ['SMN1', 'CFTR', 'BRCA1', 'BRCA2', 'ABL1', 'ALK', 'BCR'].includes(gene)) {
        // Auto-fetch real AlphaFold structure for fusions/clinical genes
        import('../services/alphafoldClient').then(({ fetchAlphaFoldStructure }) => {
          fetchAlphaFoldStructure(gene).then(structureId => {
            setStructureId(structureId);
            // Trigger 3D viewer with the real structure
            loadProteinStructure(structureId);
          }).catch(error => {
            console.error(`Failed to fetch AlphaFold structure for ${gene}:`, error);
          });
        });
      }
    }
  }, [report?.variant?.protein]);

  // Function to load protein structure into viewer
  const loadProteinStructure = (structureId: string) => {
    // This would fetch the structure from backend and update the viewer
    // Implementation depends on how structures are stored and retrieved
    console.log(`Loading structure with ID: ${structureId}`);
  };

  const handleExplain = async (variantId: string) => {
    setIsLoading(true);
    setSelectedVariantId(variantId);
    setError(null);
    setGenomicData(null);
    setShowMutantStructure(false);
    setToast({ message: "🔄 Analyzing Genomic Context...", type: 'loading' });
    try {
      const data = await fetchVariantExplanation(variantId);
      setReport(data);
      setIsGenomicLoading(true);
      const gData = await genomicAnnotationService.fetchAnnotations(data.variant.protein, data.variant.hgvs, variantId);
      setGenomicData(gData);

      // Extract position and type for analytics
      const posMatch = data.variant.hgvs.match(/(\d+)/);
      const numericPos = posMatch ? parseInt(posMatch[0], 10) : undefined;

      let mType: MutationType = 'MISSENSE';
      const notation = data.variant.hgvs.toLowerCase();
      if (notation.includes('fs') || notation.includes('del')) mType = 'FRAMESHIFT';
      else if (notation.includes('*') || notation.includes('ter')) mType = 'NONSENSE';
      else if (notation.includes('+') || notation.includes('-')) mType = 'SPLICE_SITE';

      // SECTION 1.1: Save to history service
      await historyService.addRecord({
        gene: data.variant.protein,
        variant: data.variant.hgvs,
        timestamp: Date.now(),
        riskLevel: gData.impact.cadd > 20 ? 'HIGH' : gData.impact.cadd > 10 ? 'MEDIUM' : 'LOW',
        pathogenicityScore: gData.impact.cadd,
        confidence: gData.conservation.phyloP > 3 ? 95 : 75,
        diseaseAssociations: gData.clinvar ? [gData.clinvar.phenotypes[0]] : [],
        therapies: [],
        type: 'EXPLAINER',
        variantType: mType,
        position: numericPos
      });

      setViewMode('report');
    } catch (err: any) {
      setError(err.message || 'Failed to load explanation');
    } finally {
      setIsLoading(false);
      setIsGenomicLoading(false);
      setTimeout(() => setToast(null), 500);
    }
  };

  const runComparison = async () => {
    if (compareSelection.length !== 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const report1 = await fetchVariantExplanation(compareSelection[0]);
      const report2 = await fetchVariantExplanation(compareSelection[1]);
      setComparisonReport([report1, report2]);
      const genomicReqs = [
        { gene: report1.variant.protein, variant: report1.variant.hgvs, variantId: report1.variant.id },
        { gene: report2.variant.protein, variant: report2.variant.hgvs, variantId: report2.variant.id }
      ];
      const results = await genomicAnnotationService.fetchBatchAnnotations(genomicReqs);
      setComparisonGenomicData([results[0], results[1]]);
      setViewMode('compare');
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setIsLoading(false);
    }
  };

  const clearView = () => { setViewMode('list'); setReport(null); setComparisonReport(null); setSelectedVariantId(null); };

  if (viewMode === 'list') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 relative">
        <div className="bg-slate-800 rounded-xl shadow-lg p-8 border-l-4 border-primary relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <BookOpen className="text-primary mr-3" size={32} />
              <h2 className="text-3xl font-bold text-white">Variant Explainer</h2>
            </div>
            <button onClick={() => setIsCompareMode(!isCompareMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${isCompareMode ? 'bg-scientific-blue/20 border-scientific-blue text-scientific-blue' : 'bg-slate-800 border-slate-700 text-slate-300'}`}><Scale size={18} /> {isCompareMode ? 'Exit Compare' : 'Compare Mode'}</button>
          </div>
        </div>

        <div>
          {isCompareMode && (
            <div className="flex justify-between items-center mb-4 bg-scientific-blue/10 p-4 rounded-lg border border-scientific-blue/20">
              <span className="text-scientific-blue font-bold">Select 2 variants to compare shared genomic tracks</span>
              <button onClick={runComparison} disabled={compareSelection.length !== 2 || isLoading} className="bg-scientific-blue hover:bg-cyan-600 disabled:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">{isLoading ? <Loader className="animate-spin h-4 w-4" /> : 'Run Comparison'}</button>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map(v => (
              <button key={v.id} onClick={() => isCompareMode ? setCompareSelection(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : prev.length >= 2 ? prev : [...prev, v.id]) : handleExplain(v.id)} className={`group bg-slate-800 border rounded-xl p-5 text-left shadow-sm transition-all ${compareSelection.includes(v.id) ? 'border-scientific-blue ring-1 ring-scientific-blue' : 'border-slate-700 hover:border-primary/50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg text-white truncate pr-2">{v.protein}</h4>
                  {isCompareMode ? <div className={compareSelection.includes(v.id) ? 'text-scientific-blue' : 'text-slate-600'}>{compareSelection.includes(v.id) ? <CheckSquare size={20} /> : <Square size={20} />}</div> : <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">{v.uniprot_id}</span>}
                </div>
                <p className="text-sm text-primary font-mono mb-1 font-semibold">{v.variant}</p>
                <p className="text-xs text-slate-400 line-clamp-1">{v.disease}</p>
              </button>
            ))}
          </div>
        </div>
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  if (viewMode === 'report' && report) {
    const currentPdb = showMutantStructure ? (report.pdbData?.mutant || report.pdbData?.native) : report.pdbData?.native;
    const highlightIndex = report.variant.mutationPositionInSnippet || parseInt(report.variant.hgvs.match(/(\d+)/)?.[0] || '1', 10);
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button onClick={clearView} className="text-primary font-semibold flex items-center gap-2 hover:bg-slate-800 px-4 py-2 rounded-lg w-fit"><ArrowLeft className="w-4 h-4" /> Back to Explainer</button>
        <div className="bg-gradient-to-r from-primary to-indigo-700 text-white rounded-xl shadow-lg p-8">
          <h2 className="text-4xl font-bold flex items-center gap-3 truncate">{report.variant.protein} <span className="opacity-75 text-2xl">{report.variant.hgvs}</span></h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-6 space-y-6">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
              <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3 flex items-center gap-2"><Dna size={14} /> Sequence Context</h4>
              <SequenceViewer sequence={report.variant.sequence} variant={report.variant.hgvs} highlightPosition={highlightIndex} />
              {report.confidenceScores && <div className="mt-4 pt-4 border-t border-slate-700"><ConfidenceHeatmap scores={report.confidenceScores} sequence={report.variant.sequence} /></div>}
            </div>
            <AnalysisPanel data={report} genomicData={genomicData} loading={false} />
            <MechanismExplainer mechanism={report.mechanism} summary={report.analysis?.summary} />
          </div>
          <div className="xl:col-span-6 space-y-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Box size={20} className="text-scientific-blue" /> AlphaFold 3</h3>
              </div>
              <ProteinStructureViewer pdbData={currentPdb || null} highlightResidue={highlightIndex} loading={false} label={showMutantStructure ? 'Mutant' : 'Wild-Type'} colorBy="confidence" />
            </div>
            <GenomicAnnotationPanel data={genomicData} loading={isGenomicLoading} />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compare' && comparisonReport && comparisonGenomicData[0]) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button onClick={clearView} className="text-primary hover:text-primary-hover font-semibold flex items-center px-4 py-2 rounded-lg hover:bg-slate-800 w-fit"><ArrowLeft className="w-4 h-4 mr-2" /> Back to List</button>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Section 6.3: Shared Genomic Locus Comparison</h2>
          <GenomicBrowser data={comparisonGenomicData[0]} compareWith={comparisonGenomicData[1]} />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
              <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Variant A Needles</div>
              <div className="text-sm text-white font-mono">{comparisonReport[0].variant.protein} {comparisonReport[0].variant.hgvs}</div>
            </div>
            <div className="p-4 bg-cyan-900/10 border border-cyan-900/30 rounded-lg">
              <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1">Variant B Needles</div>
              <div className="text-sm text-white font-mono">{comparisonReport[1].variant.protein} {comparisonReport[1].variant.hgvs}</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {comparisonReport.map((rep, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden h-[450px]">
              <div className="p-3 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-white">{rep.variant.protein} {rep.variant.hgvs}</h3>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">RMSD: {rep.predictions.delta.rmsd.toFixed(2)}Å</span>
              </div>
              <div className="flex-1 relative">
                <ProteinStructureViewer pdbData={rep.pdbData?.native || null} highlightResidue={parseInt(rep.variant.hgvs.match(/(\d+)/)?.[0] || '1', 10)} loading={!rep.pdbData?.native} label={`Variant ${idx === 0 ? 'A' : 'B'}`} colorBy="confidence" />
              </div>
              <div className="p-4 bg-slate-900/50 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Frequency</span>
                  <span className="text-white font-mono text-xs">{comparisonGenomicData[idx]?.frequency.gnomadGlobal.toExponential(1) || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">PhyloP Score</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">{comparisonGenomicData[idx]?.conservation.phyloP.toFixed(2) || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default VariantExplainerTab;