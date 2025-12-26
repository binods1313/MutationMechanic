# MutationMechanic - Project Structure

## Overview
MutationMechanic is an AI-driven protein engineering dashboard for analyzing pathogenicity, structural impact, and splicing defects of genetic variants. The application includes both frontend (React/Vite) and backend (Express/Prisma/PostgreSQL) with persistent storage and clinical variant management features.

## Complete Project Structure

```
mutationmechanic/
├── backend/                          # Express/Prisma backend server
│   ├── prisma/                       # Database schema and migrations
│   │   ├── schema.prisma             # Database schema definition
│   │   └── seed-patients.ts          # Patient data seeding script
│   │   └── seed-mrn-variants.ts      # MRN patient variants seeding script  
│   ├── src/                          # Backend source code
│   │   ├── server.ts                 # Main server file with all endpoints
│   │   ├── prisma.ts                 # Prisma client configuration
│   │   ├── utils/                    # Backend utilities
│   │   │   ├── logger.ts             # Logging utilities
│   │   │   ├── redactor.ts           # Data redaction utilities
│   │   │   └── alphafoldUtil.ts      # AlphaFold API utilities
│   │   └── index.ts                  # Server entry point
│   ├── package.json                  # Backend dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   └── .env                          # Backend environment variables
├── components/                       # React UI components
│   ├── Analytics/                    # Analytics dashboard components
│   │   └── HistoryTable.tsx          # Clinical patient management table
│   ├── VariantExplainerTab.tsx       # Main variant analysis component
│   ├── ProteinStructureViewer.tsx    # 3D protein structure viewer
│   ├── ConfidenceHeatmap.tsx         # pLDDT confidence visualization
│   ├── SplicingDecoder/              # Splicing analysis components
│   ├── CompensatoryDesignTab.tsx     # Compensatory mutation design
│   └── ...                           # Other UI components
├── services/                         # API service clients and utilities
│   ├── alphafoldClient.ts            # AlphaFold3 API integration
│   ├── backendService.ts             # Backend API client
│   ├── fusionAnalysisService.ts      # Fusion analysis orchestration
│   ├── genomicAnnotationService.ts   # Genomic annotation services
│   ├── historyService.ts             # History tracking service
│   ├── geminiService.ts              # Google AI services
│   ├── medgemmaClient.ts             # MedGemma AI client
│   └── alphaGenomeClient/            # AlphaGenome API client
├── utils/                            # Frontend utility functions
│   ├── alphafoldClient.ts            # Frontend AlphaFold client
│   ├── logger.ts                     # Frontend logging
│   └── ...                           # Other utilities
├── types/                            # TypeScript type definitions
│   └── genomics.ts                   # Genomics-related types
├── docs/                             # Documentation files
├── storage/                          # Local storage for PDB files
├── App.tsx                          # Main React app component
├── index.html                       # HTML entry point
├── package.json                     # Frontend dependencies
├── vite.config.ts                   # Vite configuration
├── constants.ts                     # Application constants (UNIPROT_MAP)
├── .env.local                       # Frontend environment variables
├── .gitignore                       # Git ignore patterns
├── README.md                        # Project overview
├── Instructions.md                  # Setup and development instructions
├── Instructions_1.md                # Clinical patient and variant instructions
├── ProjectStructure.md              # This file
├── Errors.md                        # Error logs and debugging info
├── testAlphaFoldIntegration.ts      # AlphaFold integration test script
├── testFusionAnalysis.ts            # Fusion analysis test script
├── fusionMagicDemo.ts               # Fusion magic moments demo
├── addVariant.js                    # Variant addition utility
├── checkVariants.js                 # Variant checking utility
├── getModels.js                     # Model retrieval utility
├── logPrediction.js                 # Prediction logging utility
├── updateVariant.js                 # Variant update utility
├── metadata.json                    # Project metadata
└── mutationmechanic.zip             # Project archive
```

## Backend API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/patients` - Get all patients with names
- `GET /api/variants` - Get patient variants
- `POST /api/variants` - Create/update variant
- `POST /api/patients` - Create patient
- `GET /api/alphafold/:gene` - Fetch protein structure from AlphaFold DB
- `POST /api/structures` - Upload protein structure file
- `GET /api/test-storage` - Verify storage readiness
- `GET /api/test-schema` - Test clinical schema
- `POST /api/predictions` - Log ML predictions
- `GET /api/models` - List active ML models
- `POST /api/seed-clinical` - Bulk seed clinical data
- `POST /api/seed-models` - Seed model registry

### Clinical Variant Endpoints
- `GET /api/variants?patientId=...` - Get variants for specific patient
- `POST /api/variants` - Create/Update variant with patientId, gene, hgvs_c
- `GET /api/patients` - Returns patientId, name, createdAt (with name field!)

### AlphaFold Integration Endpoints
- `GET /api/alphafold/:gene` - Fetch structure from public AlphaFold DB
- `POST /api/structures` - Upload PDB files to local storage

## Clinical Variant Schema

### Patient Model
- `id`: Internal Prisma ID (cuid)
- `patientId`: External patient ID (e.g., P001, MRN-123) 
- `name`: Patient name (e.g., "John Smith - SMA Diagnosis")
- `createdAt`: Creation timestamp

### Variant Model  
- `id`: Internal Prisma ID (cuid)
- `patientId`: Links to Patient.id (foreign key)
- `gene`: Gene name (e.g., SMN1, CFTR, BCR-ABL1)
- `hgvs_c`: cDNA variant (e.g., c.840+2T>G)
- `hgvs_p`: Protein variant (e.g., p.Gly281*)
- `ref_allele`/`alt_allele`: Reference and alternative alleles
- `zygosity`: Homozygous/heterozygous
- `gnomad_freq`: gnomAD frequency
- `clinvar_path`: Pathogenicity from ClinVar
- `acmg_class`: ACMG classification (PVS1, PS1, PM1, etc.)

## Clinical Features Implemented

### Patient Management
- **10 Clinical Patients**: P001-P010 with real names and conditions
- **MRN Patients**: All existing MRN patients have 3+ clinical variants
- **Patient Names**: All patients show proper names in dropdown, not "No variants"
- **Variant Distribution**: Each patient has 3-4 specific clinical variants

### Clinical Examples
- **P001 John Smith**: SMA diagnosis (SMN1, SMN2, NAIP variants)
- **P003 Michael Brown**: CML with BCR-ABL1 fusion (BCR-ABL1, ABL1, BCR variants)
- **P007 Robert Martinez**: CFTR Triple Mutation (4 CFTR variants)
- **MRN-226856**: Oncology panel (EGFR, KRAS, TP53 variants)
- **MRN-703891**: Neuromuscular/DMD (3 DMD variants)
- **MRN-461835**: Now has 3 metabolic variants (PAH, G6PD)

### AlphaFold3 Integration
- **Public API**: Integration with AlphaFold EBI DB (2M+ structures)
- **Fusion Support**: BCR-ABL1, EML4-ALK, BRCA1-BRCA2, CFTR structure prediction
- **Auto-trigger**: Fusion genes automatically trigger real AlphaFold structure loading
- **Storage**: Real PDB structures uploaded to local backend storage
- **Endpoints**: `/api/alphafold/:gene` returns structureId when successful

## File Changes Summary

### Backend Updates
- `backend/src/server.ts`: Updated /api/patients to include name field in select
- `backend/src/utils/alphafoldUtil.ts`: AlphaFold DB API integration
- `backend/prisma/schema.prisma`: Clinical variant schema with Patient/Variant relationships
- `backend/prisma/seed-patients.ts`: Seeding script for P001-P010 patients with 3+ variants each
- `backend/prisma/seed-mrn-variants.ts`: Seeding script for MRN patients with clinical variants

### Frontend Updates  
- `components/Analytics/HistoryTable.tsx`: Updated dropdown to show `p.name || p.patientId`
- `services/alphafoldClient.ts`: Public AlphaFold DB API integration
- `constants.ts`: Added UNIPROT_MAP with clinical gene mappings
- `components/VariantExplainerTab.tsx`: Auto-trigger for fusion genes

### Clinical Variant Features
- **All Patients Have Variants**: No patient shows "No variants" anymore
- **Real Names**: Clinical patients like "John Smith - SMA Diagnosis" displayed
- **3+ Variants Per Patient**: Each patient has 3-4 clinically relevant variants
- **No Duplicates**: Seed scripts include cleanup logic to prevent duplicate variants
- **ACMG Classifications**: Proper clinical classifications assigned (PVS1, PS1, PM1, etc.)

## Testing & Validation
- `curl http://localhost:5000/api/patients` - Returns all patients with names
- `curl http://localhost:5000/api/variants?patientId=P001` - Shows 3+ variants for P001
- `curl http://localhost:5000/api/alphafold/BCR-ABL1` - Returns structureId for fusion
- Clinical dropdown shows "John Smith - SMA Diagnosis ▼", "Robert Martinez - CFTR Triple Mutation ▼", etc.

## Production Status
- **Clinical Scale**: All 20+ patients have 3+ clinical variants each
- **AlphaFold3 Ready**: Production API integration with public AlphaFold DB
- **Fusion Analysis**: BCR-ABL1 and other fusion proteins supported
- **Patient Names**: Clinical names properly displayed in frontend
- **No Duplicates**: Database cleanup ensures unique variants per patient
```