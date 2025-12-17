import React, { useState, useMemo, memo } from 'react';
import { HistoryRecord, RiskLevel } from '../../services/historyService';
import { 
  Search, ChevronLeft, ChevronRight, MoreVertical, 
  Trash2, ExternalLink, Filter, ArrowUpDown, 
  CheckSquare, Square, Archive, ArchiveRestore, Download
} from 'lucide-react';

interface HistoryTableProps {
  records: HistoryRecord[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkArchive: (ids: string[], archive: boolean) => void;
  onBulkExport: (ids: string[]) => void;
  onView: (record: HistoryRecord) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ 
  records, 
  onDelete, 
  onBulkDelete, 
  onBulkArchive, 
  onBulkExport, 
  onView 
}) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof HistoryRecord>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Sort Logic
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => 
        r.gene.toLowerCase().includes(search.toLowerCase()) || 
        r.variant.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === undefined || valB === undefined) return 0;
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [records, search, sortField, sortDir]);

  // Section 7.2: Pagination limits DOM elements
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const toggleSort = (field: keyof HistoryRecord) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRecords.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case 'HIGH': return <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
      case 'MEDIUM': return <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      case 'LOW': return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
      
      {/* Table Header / Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50">
         <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search gene or variant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary focus:outline-none transition-all"
            />
         </div>
         <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {selectedIds.size > 0 ? (
               <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                 <button 
                  onClick={() => onBulkExport(Array.from(selectedIds))}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/30 hover:bg-primary/30 transition-all"
                 >
                   <Download size={14} /> Export ({selectedIds.size})
                 </button>
                 <button 
                  onClick={() => onBulkArchive(Array.from(selectedIds), true)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
                 >
                   <Archive size={14} /> Archive
                 </button>
                 <button 
                  onClick={() => {
                    onBulkDelete(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-400 text-xs font-bold rounded-lg border border-red-900/30 hover:bg-red-900/30 transition-all"
                 >
                   <Trash2 size={14} /> Delete
                 </button>
               </div>
            ) : (
              <select 
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 outline-none"
              >
                {[10, 25, 50].map(size => <option key={size} value={size}>Show {size}</option>)}
              </select>
            )}
         </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 w-10">
                <button onClick={toggleSelectAll} className="hover:text-primary transition-colors">
                  {selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('gene')}>
                <div className="flex items-center gap-2">Gene <ArrowUpDown size={10} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('variant')}>
                <div className="flex items-center gap-2">Variant <ArrowUpDown size={10} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('timestamp')}>
                <div className="flex items-center gap-2">Date <ArrowUpDown size={10} /></div>
              </th>
              <th className="px-6 py-4">Risk Level</th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('confidence')}>
                <div className="flex items-center gap-2">Confidence <ArrowUpDown size={10} /></div>
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">No analysis records found matching your search.</td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
                <tr key={record.id} className={`hover:bg-slate-800/30 transition-colors ${selectedIds.has(record.id) ? 'bg-primary/5' : ''} ${record.archived ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelect(record.id)} className={selectedIds.has(record.id) ? 'text-primary' : 'text-slate-700'}>
                      {selectedIds.has(record.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-bold text-white text-sm">
                    <div className="flex items-center gap-2">
                      {record.gene}
                      {/* Fixed: Wrapped Archive icon in a span with a title attribute to correctly show the tooltip, as lucide icons do not support the title prop directly. */}
                      {record.archived && <span title="Archived Record"><Archive size={10} className="text-slate-500" /></span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary">{record.variant}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-300">
                      {getRiskIcon(record.riskLevel)} {record.riskLevel}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${record.confidence}%` }}></div>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{record.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => onView(record)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all" title="View Detailed Report">
                         <ExternalLink size={14} />
                       </button>
                       <button 
                        onClick={() => onBulkArchive([record.id], !record.archived)} 
                        className={`p-2 rounded-lg transition-all ${record.archived ? 'text-primary hover:bg-primary/20' : 'text-slate-500 hover:bg-slate-700'}`} 
                        title={record.archived ? 'Unarchive' : 'Archive'}
                       >
                         {record.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                       </button>
                       <button onClick={() => onDelete(record.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-slate-600 hover:text-red-400 transition-all" title="Delete Record">
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
         <div className="text-xs text-slate-500 font-medium">
           Showing <span className="text-slate-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> of <span className="text-slate-300">{filteredRecords.length}</span> results
         </div>
         <div className="flex items-center gap-2">
           <button 
             disabled={currentPage === 1}
             onClick={() => setCurrentPage(prev => prev - 1)}
             className="p-2 border border-slate-800 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 transition-all"
           >
             <ChevronLeft size={16} />
           </button>
           <div className="text-xs font-bold text-slate-300 px-2">Page {currentPage} of {totalPages || 1}</div>
           <button 
             disabled={currentPage === totalPages || totalPages === 0}
             onClick={() => setCurrentPage(prev => prev + 1)}
             className="p-2 border border-slate-800 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 transition-all"
           >
             <ChevronRight size={16} />
           </button>
         </div>
      </div>
    </div>
  );
};

export default memo(HistoryTable);