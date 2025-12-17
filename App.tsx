import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/Tabs';
import VariantExplainerTab from './components/VariantExplainerTab';
import CompensatoryDesignTab from './components/CompensatoryDesignTab';
import DiseaseTracerTab from './components/DiseaseTracerTab';
import SplicingDecoderTab from './components/SplicingDecoder/SplicingDecoderTab';
import AnalyticsDashboard, { ExportConfig } from './components/Analytics/AnalyticsDashboard';
import HistoryTable from './components/Analytics/HistoryTable';
import SettingsModal from './components/SettingsModal';
import ShortcutsModal from './components/ShortcutsModal';
import ToastNotification, { ToastType } from './components/ToastNotification';
import { DISEASE_VARIANTS } from './constants';
import { VariantInfo } from './types';
import { historyService, HistoryRecord } from './services/historyService';
import logger from './utils/logger';
import { BarChart3, Clock } from 'lucide-react';

// Theme Definitions
export const THEMES = [
  { id: 'purple', name: 'Nebula Purple', primary: '#6366f1', hover: '#4f46e5' },
  { id: 'blue', name: 'Quantum Blue', primary: '#3b82f6', hover: '#2563eb' },
  { id: 'green', name: 'Bio Emerald', primary: '#10b981', hover: '#059669' },
  { id: 'red', name: 'Alert Red', primary: '#ef4444', hover: '#dc2626' },
  { id: 'orange', name: 'Amber Warning', primary: '#f59e0b', hover: '#d97706' },
  { id: 'cyan', name: 'Cyber Cyan', primary: '#06b6d4', hover: '#0891b2' },
  { id: 'pink', name: 'Neon Pink', primary: '#ec4899', hover: '#db2777' },
  { id: 'violet', name: 'Deep Violet', primary: '#8b5cf6', hover: '#7c3aed' },
  { id: 'yellow', name: 'Solar Yellow', primary: '#eab308', hover: '#ca8a04' },
  { id: 'slate', name: 'Steel Slate', primary: '#64748b', hover: '#475569' },
];

function App() {
  const [activeTab, setActiveTab] = useState('explainer');
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('purple');
  
  // Analytics State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const records = await historyService.getAllRecords();
      setHistory(records);
    } catch (e) {
      logger.error("Failed to fetch history", e);
    }
  }, []);

  useEffect(() => {
    setVariants(DISEASE_VARIANTS);
    fetchHistory();

    const savedTheme = localStorage.getItem('mutationMechanic_theme');
    if (savedTheme) applyTheme(savedTheme);
  }, [fetchHistory]);

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.primary);
      document.documentElement.style.setProperty('--color-primary-hover', theme.hover);
      setCurrentTheme(themeId);
      localStorage.setItem('mutationMechanic_theme', themeId);
    }
  };

  const handleTabChange = (tab: string) => {
    logger.info(`Switched to tab: ${tab}`);
    setActiveTab(tab);
    if (tab === 'analytics') fetchHistory();
  };

  const handleClearHistory = async () => {
    if (window.confirm("Permanent Action: This will wipe all historical analysis data. Proceed?")) {
       await historyService.clearHistory();
       fetchHistory();
       setToast({ message: "History cleared successfully", type: 'success' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    await historyService.deleteRecord(id);
    fetchHistory();
    setToast({ message: "Record deleted", type: 'success' });
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (window.confirm(`Delete ${ids.length} selected records?`)) {
      await Promise.all(ids.map(id => historyService.deleteRecord(id)));
      fetchHistory();
      setToast({ message: `${ids.length} records deleted`, type: 'success' });
    }
  };

  const handleBulkArchive = async (ids: string[], archive: boolean) => {
    await Promise.all(ids.map(id => historyService.updateRecord(id, { archived: archive })));
    fetchHistory();
    setToast({ message: `${ids.length} records ${archive ? 'archived' : 'unarchived'}`, type: 'success' });
  };

  const handleExport = (config: ExportConfig, ids?: string[]) => {
    const recordsToExport = ids ? history.filter(r => ids.includes(r.id)) : history;
    
    let content = '';
    if (config.format === 'JSON') {
      content = JSON.stringify(recordsToExport, null, 2);
    } else if (config.format === 'CSV' || config.format === 'Excel') {
      const headers = ['ID', 'Gene', 'Variant', 'Date', 'Risk', 'Score', 'Confidence', 'Type', 'Archived'];
      const rows = recordsToExport.map(r => [
        r.id, r.gene, r.variant, new Date(r.timestamp).toISOString(), 
        r.riskLevel, r.pathogenicityScore, r.confidence, r.type, r.archived ? 'YES' : 'NO'
      ]);
      content = [headers, ...rows].map(row => row.join(',')).join('\n');
    } else if (config.format === 'PDF') {
      // PDF Simulation
      content = `PROTEIN ENGINEERING REPORT: ${config.filename}\nGenerated: ${new Date().toLocaleString()}\n\nSummary:\nTotal Analyzed: ${recordsToExport.length}\n\n` + 
                recordsToExport.map(r => `[${r.gene}] ${r.variant} - Risk: ${r.riskLevel} (${r.confidence}% Confidence)`).join('\n');
    }

    const mimeType = config.format === 'JSON' ? 'application/json' : 
                     config.format === 'PDF' ? 'application/pdf' : 'text/csv';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.filename}.${config.format.toLowerCase()}`;
    a.click();
    setToast({ message: `${config.format} Report generated`, type: 'success' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans transition-colors duration-500">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full md:w-[90%] grid-cols-5">
              <TabsTrigger value="explainer">📖 Explainer</TabsTrigger>
              <TabsTrigger value="design">⚡ Design</TabsTrigger>
              <TabsTrigger value="tracer">🔬 Tracer</TabsTrigger>
              <TabsTrigger value="splicing">🧬 Splicing</TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 size={14} /> Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explainer">
            <VariantExplainerTab variants={variants} />
          </TabsContent>
          <TabsContent value="design">
            <CompensatoryDesignTab />
          </TabsContent>
          <TabsContent value="tracer">
            <DiseaseTracerTab />
          </TabsContent>
          <TabsContent value="splicing">
            <SplicingDecoderTab />
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="space-y-12">
               <AnalyticsDashboard 
                 records={history} 
                 onClear={handleClearHistory} 
                 onExport={(cfg) => handleExport(cfg)}
                 onBulkDelete={handleBulkDelete}
                 onBulkArchive={handleBulkArchive}
               />
               <div className="space-y-6">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   <Clock size={20} className="text-primary" /> Audit History
                 </h3>
                 <HistoryTable 
                   records={history} 
                   onDelete={handleDeleteRecord} 
                   onBulkDelete={handleBulkDelete}
                   onBulkArchive={handleBulkArchive}
                   onBulkExport={(ids) => handleExport({ 
                    format: 'CSV', 
                    filename: 'selected_variants_export', 
                    includeStats: false, 
                    includeCharts: false, 
                    includeRecords: true, 
                    includeMetadata: true 
                   }, ids)}
                   onView={(r) => { 
                      setActiveTab('explainer');
                      setToast({ message: `Loading detailed view for ${r.gene}...`, type: 'info' });
                   }} 
                 />
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentTheme={currentTheme} onThemeChange={applyTheme} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}

export default App;