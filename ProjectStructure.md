# MutationMechanic - Project Structure and Overview

## Project Structure

```
mutationmechanic/
├── .env
├── .env.local
├── .gitignore
├── App.tsx
├── README.md
├── constants.ts
├── index.html
├── index.tsx
├── metadata.json
├── mutationmechanic.zip
├── package-lock.json
├── package.json
├── tsconfig.json
├── types.ts
├── vite.config.ts
├── components/
│   ├── AnalysisPanel.tsx
│   ├── ChatWidget.tsx
│   ├── CompensatoryDesignTab.tsx
│   ├── ConfidenceHeatmap.tsx
│   ├── DiseaseTracerTab.tsx
│   ├── ErrorBoundary.tsx
│   ├── GenomicAnnotationPanel.tsx
│   ├── Header.tsx
│   ├── MechanismExplainer.tsx
│   ├── OrthologTable.tsx
│   ├── ProteinStructureViewer.tsx
│   ├── SettingsModal.tsx
│   ├── ShortcutsModal.tsx
│   ├── StructureCharts.tsx
│   ├── Tabs.tsx
│   ├── ToastNotification.tsx
│   ├── VariantExplainerTab.tsx
│   ├── VariantSelector.tsx
│   ├── Analytics/
│   │   ├── AnalyticsDashboard.tsx
│   │   └── HistoryTable.tsx
│   ├── SplicingDecoder/
│   │   ├── ClinicalInterpretationPanel.tsx
│   │   ├── SplicingDecoderTab.tsx
│   │   └── SplicingVisualizer.tsx
│   └── __tests__/
│       └── ProteinStructureViewer.test.tsx
├── prisma/
│   └── schema.prisma (empty/corrupted file)
├── routes/
│   └── splicing/
│       └── index.ts
├── services/
│   ├── alphaGenomeClient/
│   │   └── index.ts
│   ├── geminiService.ts
│   ├── genomicAnnotationService.ts
│   ├── historyService.ts
│   └── medgemmaClient.ts
├── types/
│   ├── genomics.ts
│   ├── medgemma.ts
│   └── splicing/
│       └── index.ts
├── utils/
│   ├── alphafoldClient.ts
│   ├── cacheLayer.ts
│   ├── logger.ts
│   ├── presetStorage.ts
│   ├── storage.ts
│   ├── uniprot.test.ts
│   └── uniprot.ts
└── docs/
    └── diagnostics/
        └── PTM-ortholog-alpha-medgemma-check.md
```

## What is MutationMechanic?

MutationMechanic is an AI-driven protein engineering dashboard designed for analyzing pathogenicity, structural impact, and splicing defects of genetic variants. It's a comprehensive platform that provides researchers, clinicians, and computational biologists with sophisticated tools to understand how genetic mutations affect protein structure and function.

## Specialties of the Project

### 1. **Variant Explainer**
- Visualizes protein structures with per-residue confidence (pLDDT) heatmaps
- Compare Wild-Type vs Mutant structures side-by-side
- Detailed structural impact analysis with confidence metrics

### 2. **Compensatory Design**
- AI-suggested stabilizing mutations to rescue protein function
- Compensatory mutation prediction and ranking
- Structural stability optimization suggestions

### 3. **Splicing Decoder**
- Deep learning integration (AlphaGenome/DeepSplicer) to predict exon skipping
- Predicts cryptic splice site activation
- Includes clinical interpretation with MedGemma integration

### 4. **Interactive 3D Visualization**
- WebGL-based structure viewer using 3Dmol.js
- Molecular surface and confidence coloring
- Real-time interaction with protein structures

### 5. **Client-Side Architecture**
- No backend server required - all processing happens in the browser
- Uses IndexedDB for persistent data storage
- Works offline with cached data

## What is it Useful For?

### **Research Applications**
- Understanding disease-causing mutations
- Protein structure-function relationship studies
- Drug target identification
- Therapeutic design

### **Clinical Applications**
- Pathogenicity assessment of genetic variants
- Clinical decision support
- Patient genetic analysis
- Treatment recommendation based on variant interpretation

### **Educational Applications**
- Teaching protein structure and function
- Demonstrating mutation effects
- Bioinformatics training

## Who Should Use This Project?

### **Researchers & Scientists**
- **Why**: Need sophisticated tools to analyze how mutations affect protein structure and function
- **Use Case**: Understanding molecular mechanisms of disease, designing experiments, validating hypotheses

### **Clinicians & Genetic Counselors**
- **Why**: Need to interpret genetic variants for patient care
- **Use Case**: Assessing pathogenicity of variants identified in patients, understanding clinical implications

### **Bioinformatics Professionals**
- **Why**: Require advanced computational tools for variant analysis
- **Use Case**: Pipeline integration, automated analysis, data visualization

### **Pharmaceutical Companies**
- **Why**: Need to understand target protein structure for drug design
- **Use Case**: Drug development, target validation, mechanism of action studies

### **Academic Institutions**
- **Why**: Need teaching and research tools for computational biology
- **Use Case**: Educational demonstrations, student research projects, laboratory training

## Key Features That Make It Valuable

1. **AI-Powered Analysis**: Uses advanced AI models (Gemini, ESMFold) for predictions
2. **Multi-Modal Integration**: Combines structural, splicing, and clinical data
3. **Real-time Visualization**: Interactive 3D protein structure visualization
4. **Offline Capabilities**: Works without constant internet connection using cached data
5. **Comprehensive Mock Data**: Functional even without API keys using extensive mock datasets
6. **Privacy-Focused**: All processing happens client-side, no sensitive data is transmitted to external servers
7. **Clinical Relevance**: Provides clinically interpretable results with disease associations
8. **Therapeutic Suggestions**: Offers potential therapeutic approaches based on variant analysis

## Technical Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **3D Visualization**: 3Dmol.js for molecular graphics
- **AI Integration**: Google GenAI SDK for Gemini API
- **Data Storage**: IndexedDB (browser-based database)
- **Build System**: Vite with optimized development server
- **Caching**: Multi-tier system with localStorage and IndexedDB

The project is specifically designed for research use only and provides a comprehensive platform for genetic variant analysis without requiring backend infrastructure.