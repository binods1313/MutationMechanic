import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

let prisma: any;

try {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter }) as any;
} catch (error) {
    // Fallback for types and immediate initialization
    prisma = new PrismaClient() as any;
}

// Get ALL existing MRN- patients + assign variants
const MRN_PATIENTS_VARIANTS = [
// MRN-226856 → Oncology panel
{ patientId: 'MRN-226856', gene: 'EGFR', hgvs_c: 'c.2369C>T', acmg_class: 'PS1', description: 'Lung adenocarcinoma' },
{ patientId: 'MRN-226856', gene: 'KRAS', hgvs_c: 'c.35G>A', acmg_class: 'PS1', description: 'G12D driver mutation' },
{ patientId: 'MRN-226856', gene: 'TP53', hgvs_c: 'c.817C>T', acmg_class: 'PS1', description: 'Loss of function' },

// MRN-703891 → Neuromuscular
{ patientId: 'MRN-703891', gene: 'DMD', hgvs_c: 'c.5258dupT', acmg_class: 'PVS1', description: 'Duchenne muscular dystrophy' },
{ patientId: 'MRN-703891', gene: 'DMD', hgvs_c: 'c.9070G>A', acmg_class: 'PM1', description: 'Frameshift' },
{ patientId: 'MRN-703891', gene: 'DMD', hgvs_c: 'c.10148C>T', acmg_class: 'PM2', description: 'Missense' },

// MRN-953582 → Pediatric oncology
{ patientId: 'MRN-953582', gene: 'EWSR1-FLI1', hgvs_c: 't(11;22)', acmg_class: 'PVS1', description: 'Ewing sarcoma' },
{ patientId: 'MRN-953582', gene: 'TP53', hgvs_c: 'c.524G>A', acmg_class: 'PS1', description: 'R175H hotspot' },

// MRN-566465 → Cardiomyopathy
{ patientId: 'MRN-566465', gene: 'MYH7', hgvs_c: 'c.1988G>A', acmg_class: 'PS1', description: 'Hypertrophic cardiomyopathy' },
{ patientId: 'MRN-566465', gene: 'MYH7', hgvs_c: 'c.4538T>C', acmg_class: 'PM1', description: 'R1513P' },
{ patientId: 'MRN-566465', gene: 'TNNT2', hgvs_c: 'c.851T>C', acmg_class: 'PM2', description: 'Dilated cardiomyopathy' },

// MRN-461835 → Metabolic disorder
{ patientId: 'MRN-461835', gene: 'PAH', hgvs_c: 'c.800C>T', acmg_class: 'PVS1', description: 'Phenylketonuria' },
{ patientId: 'MRN-461835', gene: 'PAH', hgvs_c: 'c.1222C>T', acmg_class: 'PM1', description: 'Missense' },
{ patientId: 'MRN-461835', gene: 'G6PD', hgvs_c: 'c.1184G>A', acmg_class: 'PM2', description: 'Glucose-6-phosphate dehydrogenase deficiency' },

// MRN-123 → Expand existing SMN1 to 3+ variants
{ patientId: 'MRN-123', gene: 'SMN2', hgvs_c: 'c.85T>G', acmg_class: 'PM2', description: 'SMN2 modifier effect' },
{ patientId: 'MRN-123', gene: 'NAIP', hgvs_c: 'c.1334G>A', acmg_class: 'PM4', description: 'Neuronal apoptosis inhibitory protein' }
]

async function main() {
console.log('🩺 Adding variants to ALL MRN- patients...')

for (const variant of MRN_PATIENTS_VARIANTS) {
// First, find the patient by patientId to get the internal ID
const patient = await prisma.patient.findUnique({
    where: { patientId: variant.patientId }
});

if (!patient) {
    console.log(`⚠️ Patient ${variant.patientId} not found, skipping variant ${variant.gene} ${variant.hgvs_c}`);
    continue;
}

await prisma.variant.upsert({
    where: {
        patientId_gene_hgvs_c: {
            patientId: patient.id, // Use internal ID, not patientId string
            gene: variant.gene,
            hgvs_c: variant.hgvs_c
        }
    },
    update: {
        acmg_class: variant.acmg_class,
        hgvs_p: 'p.Arg175His', // Example
        ref_allele: 'C',
        alt_allele: 'T',
        gnomad_freq: 0.00001,
        clinvar_path: true
    },
    create: {
        patientId: patient.id, // Use internal ID
        gene: variant.gene,
        hgvs_c: variant.hgvs_c,
        hgvs_p: 'p.Arg175His', // Example
        ref_allele: 'C',
        alt_allele: 'T',
        gnomad_freq: 0.00001,
        clinvar_path: true,
        acmg_class: variant.acmg_class,
        zygosity: 'heterozygous' // Required field
    }
})
console.log(`✅ ${variant.patientId} → ${variant.gene} ${variant.hgvs_c}`)
}

console.log('🎉 ALL MRN- patients now have clinical variants!')
}

main().finally(() => prisma.$disconnect())