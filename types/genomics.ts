
export interface FrequencyData {
  gnomadGlobal: number;
  populations: {
    afr: number; // African
    amr: number; // Admixed American
    eas: number; // East Asian
    nfe: number; // Non-Finnish European
    sas: number; // South Asian
  };
  rarityLabel: string;
}

export interface ConservationScores {
  phyloP: number; // -14 to +6
  phastCons: number; // 0 to 1
  gerp: number; // -12 to +6
}

export interface ProteinImpact {
  sift: { score: number; prediction: string }; // 0-1 (0 is deleterious)
  polyphen: { score: number; prediction: string }; // 0-1 (1 is damaging)
  cadd: number; // >20 is pathogenic top 1%
  mutationTaster: string;
  verdict: string;
}

export interface OrthologInfo {
  species: string;
  commonName: string;
  position: number;
  aa: string;
  conserved: boolean;
  sequenceSnippet?: string; // For MSA visualization
  conservationScores?: number[]; // 0-1 per residue for granular visualization
  phylogeneticDistance?: number; // millions of years / distance metric
  // Enhanced Alignment Props
  start?: number;
  end?: number;
  differences?: { pos: number; ref: string; alt: string }[];
  source?: string;
}

export interface RegulatoryElement {
  type: 'Promoter' | 'Enhancer' | 'Silencer' | 'TFBS' | 'CpG Island' | 'Splice Site';
  name: string;
  impactScore: number; // 0-1
  description: string;
}

export interface RnaContext {
  stabilityChange: number; // kcal/mol
  structureDisrupted: boolean;
  miRNA?: string; // affected miRNA binding site
  motif?: string; // affected motif description
}

export interface ClinVarEntry {
  id: string; // VCV...
  significance: 'Benign' | 'Likely Benign' | 'VUS' | 'Likely Pathogenic' | 'Pathogenic';
  reviewStatus: string; // e.g. "criteria provided, multiple submitters, no conflicts"
  stars: number; // 0-4
  lastEvaluated: string;
  phenotypes: string[];
}

export interface OmimEntry {
  id: string; // MIM Number
  title: string;
  inheritance: string[];
  phenotypes: string[];
  url: string;
}

export interface ProteinDomain {
  name: string;
  start: number;
  end: number;
  type: string;
}

// Section 5.3: Post-Translational Modifications
// Updated to match PTMItem shape requirement
export interface PTM {
  id?: string;
  type: string;           // e.g., Phosphorylation, Ubiquitination
  position: number;       // 1-based residue index
  residue: string;        // one-letter code (formerly aa)
  source?: string;        // e.g., UniProt
  evidence?: string;
  confidence?: number;    // 0-1
  notes?: string;
  url?: string;
}

export interface DataSourceMetadata {
  name: string;
  version: string;
  url: string;
}

export interface GenomicContext {
  variantId: string;
  gene: string;
  position: string; // Genomic coordinates
  proteinLength?: number;
  domains?: ProteinDomain[];
  ptms?: PTM[]; // Added for 5.3
  frequency: FrequencyData;
  conservation: ConservationScores;
  impact: ProteinImpact;
  orthologs: OrthologInfo[];
  regulatory: RegulatoryElement[];
  rna?: RnaContext;
  clinvar?: ClinVarEntry;
  omim?: OmimEntry;
  source: string;
  timestamp: number;
  metadata?: DataSourceMetadata[]; // Added for 9.3
}
