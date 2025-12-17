import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, RotateCcw, ZoomIn, ZoomOut, Info, AlertTriangle } from 'lucide-react';

interface ProteinStructureViewerProps {
  pdbData: string | null;
  highlightResidue?: number;
  loading?: boolean;
  label?: string;
  colorBy?: 'spectrum' | 'confidence' | 'conservation';
  customScores?: number[];
  onResidueHover?: (info: { residue: string; position: number; confidence: number } | null) => void;
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

const ProteinStructureViewer: React.FC<ProteinStructureViewerProps> = ({ 
  pdbData, 
  highlightResidue, 
  loading,
  label = "Protein Structure",
  colorBy = 'confidence',
  customScores,
  onResidueHover
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ residue: string; position: number; confidence: number } | null>(null);
  const [libLoaded, setLibLoaded] = useState(false);

  // Check for 3Dmol library loading
  useEffect(() => {
    const checkLibrary = () => {
      if (typeof window !== 'undefined' && window.$3Dmol) {
        setLibLoaded(true);
        return true;
      }
      return false;
    };

    if (checkLibrary()) return;

    const interval = setInterval(() => {
      if (checkLibrary()) {
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.$3Dmol) {
        setError("3D Visualization Library failed to load. Please check your connection.");
      }
    }, 15000); 

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!libLoaded || !containerRef.current || !pdbData) return;
    
    try {
      if (!viewerRef.current) {
        const config = { backgroundColor: '#0f172a' }; 
        viewerRef.current = window.$3Dmol.createViewer(containerRef.current, config);
      }

      const viewer = viewerRef.current;
      viewer.clear();
      
      const model = viewer.addModel(pdbData, "pdb");
      
      let style: any = {};
      
      if (colorBy === 'confidence') {
          style = { 
              cartoon: { 
                  colorfunc: (atom: any) => {
                      if (atom.b >= 90) return '#3b82f6'; 
                      if (atom.b >= 70) return '#eab308'; 
                      if (atom.b >= 50) return '#f97316'; 
                      return '#ef4444'; 
                  }
              } 
          };
      } else if (colorBy === 'conservation' && customScores) {
          const atoms = model.selectedAtoms({});
          for (let i = 0; i < atoms.length; i++) {
             const atom = atoms[i];
             if (atom.resi && atom.resi <= customScores.length) {
                 atom.b = customScores[atom.resi - 1]; 
             }
          }
          style = {
              cartoon: {
                  colorscheme: {
                      prop: 'b',
                      gradient: 'whiteGreen', 
                      min: -2,
                      max: 4
                  }
              }
          };
      } else {
          style = { cartoon: { color: 'spectrum' } };
      }
      
      viewer.setStyle({}, style);

      if (highlightResidue) {
        const sel = { resi: highlightResidue };
        viewer.addStyle(sel, { stick: { colorscheme: 'redCarbon', radius: 0.2 } });
        viewer.addStyle(sel, { sphere: { color: '#ef4444', opacity: 0.6, scale: 0.8 } });
        
        viewer.addLabel(`Mut ${highlightResidue}`, { 
          position: sel, 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          fontColor: 'white',
          fontSize: 12,
          borderRadius: 4,
          padding: 2,
          borderThickness: 1,
          borderColor: '#ef4444'
        });
      }

      viewer.setHoverable({}, true, (atom: any) => {
          if(!atom) {
              setHoverInfo(null);
              if (onResidueHover) onResidueHover(null);
              return;
          }
          const info = {
              residue: atom.resn,
              position: atom.resi,
              confidence: atom.b 
          };
          setHoverInfo(info);
          if (onResidueHover) onResidueHover(info);
      }, () => {
          setHoverInfo(null);
          if (onResidueHover) onResidueHover(null);
      });

      viewer.zoomTo();
      viewer.render();

    } catch (e: any) {
      console.error("3Dmol rendering error:", e);
      setError("Failed to render structure. Invalid PDB data.");
    }

  }, [pdbData, highlightResidue, colorBy, customScores, libLoaded]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (viewerRef.current) {
      viewerRef.current.zoom(direction === 'in' ? 1.5 : 0.7, 500);
    }
  };

  const handleReset = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
        <span className="text-sm font-medium animate-pulse">⏳ Rendering Structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-80 bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
        <div className="bg-slate-800 p-4 rounded-full mb-3">
           <AlertTriangle size={24} className="text-amber-500" />
        </div>
        <p className="text-sm text-amber-200/80 mb-2 font-bold">Visualization Error</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  if (!pdbData) {
    return (
      <div className="w-full h-80 bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-500">
        <Maximize2 size={24} className="opacity-50 mb-2" />
        <p className="text-sm">No structure data loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-80 group">
      <div 
        ref={containerRef} 
        className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 shadow-inner overflow-hidden cursor-move relative z-0"
        role="application"
        aria-label="3D Protein Structure Viewer"
      ></div>
      
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 text-xs text-white font-mono pointer-events-none flex items-center gap-2 z-10 shadow-lg">
        {label}
        {colorBy === 'confidence' && <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f6]"></div>}
        {colorBy === 'conservation' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]"></div>}
      </div>

      {hoverInfo && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-slate-900/95 border border-slate-600 p-3 rounded-lg shadow-2xl text-white text-xs z-20 backdrop-blur-md min-w-[120px]"
            role="tooltip"
            aria-live="polite"
          >
              <div className="font-bold text-lg mb-1 flex items-center gap-2 text-white">
                  <Info size={16} className="text-primary"/> {hoverInfo.residue}{hoverInfo.position}
              </div>
              <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between gap-4">
                      <span>{colorBy === 'conservation' ? 'Conservation' : 'pLDDT'}:</span>
                      <span className={`font-mono font-bold ${hoverInfo.confidence > 70 ? 'text-blue-400' : hoverInfo.confidence < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {hoverInfo.confidence.toFixed(1)}
                      </span>
                  </div>
              </div>
          </div>
      )}

      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-2 rounded-lg text-[10px] text-white flex flex-col gap-1.5 pointer-events-none border border-white/10 z-10 shadow-lg">
          {colorBy === 'confidence' && (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#3b82f6]"></div> &gt;90 High</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#eab308]"></div> 70-90 Good</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#f97316]"></div> 50-70 Low</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#ef4444]"></div> &lt;50 Poor</div>
              </>
          )}
          {colorBy === 'conservation' && (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-green-700"></div> Conserved</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-green-400"></div> Variable</div>
                <div className="flex items-center gap-2"><div className="w-3 h-1 bg-white"></div> Divergent</div>
              </>
          )}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <button onClick={() => handleZoom('out')} className="p-2 bg-slate-800/90 text-white rounded-lg hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-lg" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleReset} className="p-2 bg-slate-800/90 text-white rounded-lg hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-lg" title="Reset View">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => handleZoom('in')} className="p-2 bg-slate-800/90 text-white rounded-lg hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all shadow-lg" title="Zoom In">
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
};

export default ProteinStructureViewer;