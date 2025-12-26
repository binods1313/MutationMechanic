import React, { useState, useEffect, useMemo, memo } from 'react';
import { backendService, Patient, Variant } from '../../services/backendService';
import {
  Search, ChevronLeft, ChevronRight, MoreVertical,
  Trash2, ExternalLink, Filter, ArrowUpDown,
  CheckSquare, Square, Archive, ArchiveRestore, Download, UserPlus, Database
} from 'lucide-react';

interface HistoryTableProps {
  records: any[]; // Existing records for backward compatibility
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkArchive: (ids: string[], archive: boolean) => void;
  onBulkExport: (ids: string[]) => void;
  onView: (record: any) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({
  records: initialRecords,
  onDelete,
  onBulkDelete,
  onBulkArchive,
  onBulkExport,
  onView
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log('🚀 HistoryTable loading...')
      try {
        // Test 1: Backend connection
        console.log('🔄 Testing backend...')
        const patients = await backendService.getPatients()
        console.log('✅ Patients:', patients)
        setPatients(patients)

        // Test 2: History
        const historyData = await backendService.getHistory()
        console.log('✅ History:', historyData)
        setHistory(historyData)

      } catch (error) {
        console.error('❌ Frontend error:', error)
      }
    }
    init()
  }, []);

  const loadPatients = async () => {
    try {
      const data = await backendService.getPatients();
      setPatients(data);
    } catch (e) {
      console.error("Failed to load patients", e);
    }
  };

  const loadVariants = async (patientId: string) => {
    if (!patientId) {
      setVariants([]);
      return;
    }
    setLoading(true);
    try {
      const data = await backendService.getVariants(patientId);
      setVariants(data);
    } catch (e) {
      console.error("Failed to load variants", e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await backendService.getHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleCreatePatient = async () => {
    const id = `MRN-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      await backendService.createPatient({ patientId: id });
      loadPatients();
    } catch (e) {
      console.error("Failed to create patient", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Selection & Creation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="text-primary" size={20} /> Clinical Patient Management
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              aria-label="Select research patient"
              className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none transition-all"
              value={selectedPatient}
              onChange={(e) => {
                setSelectedPatient(e.target.value);
                loadVariants(e.target.value);
              }}
            >
              <option value="">Select Research Patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.patientId}>
                  {p.name || p.patientId} {/* Show name OR ID */}
                </option>
              ))}
            </select>
            <button
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20"
              onClick={handleCreatePatient}
            >
              <UserPlus size={18} /> New Patient
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="text-primary" size={20} /> Repository Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Patients</div>
              <div className="text-2xl font-bold text-white">{patients.length}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Analyses</div>
              <div className="text-2xl font-bold text-white">{history.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Variants Table */}
      {selectedPatient && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Variants for {selectedPatient}</h3>
            <span className="text-xs text-slate-500">{variants.length} records found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Gene</th>
                  <th className="px-6 py-4">HGVS (c)</th>
                  <th className="px-6 py-4">Zygosity</th>
                  <th className="px-6 py-4">gnomAD Freq</th>
                  <th className="px-6 py-4">ACMG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading variants...</td></tr>
                ) : variants.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No variants registered for this patient.</td></tr>
                ) : (
                  variants.map(v => (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      onClick={() => onView(v)} // Trigger deep-link on click
                    >
                      <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{v.gene}</td>
                      <td className="px-6 py-4 font-mono text-xs text-primary">{v.hgvs_c}</td>
                      <td className="px-6 py-4 text-xs text-slate-300 capitalize">{v.zygosity}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{v.gnomad_freq || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${v.acmg_class === 'PVS1' ? 'bg-red-900/40 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                          {v.acmg_class || 'Not Classified'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy Audit View (Placeholder for existing analyses if still needed) */}
      <div className="p-4 bg-indigo-900/20 border border-indigo-800/30 rounded-xl">
        <p className="text-indigo-300 text-sm">
          System is connected to clinical backend. Showing <span className="font-bold">{history.length}</span> global analysis records in persistent storage.
        </p>
      </div>
    </div>
  );
};

export default memo(HistoryTable);