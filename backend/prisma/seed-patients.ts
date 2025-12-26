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

const CLINICAL_PATIENTS = [
  { patientId: 'P001', name: 'John Smith - SMA Diagnosis', createdAt: new Date('2025-01-15') },
  { patientId: 'P002', name: 'Sarah Johnson - Cystic Fibrosis', createdAt: new Date('2025-02-20') },
  { patientId: 'P003', name: 'Michael Brown - CML (BCR-ABL1+)', createdAt: new Date('2025-03-10') },
  { patientId: 'P004', name: 'Emily Davis - NSCLC (ALK Fusion)', createdAt: new Date('2025-04-05') },
  { patientId: 'P005', name: 'David Wilson - Breast Cancer BRCA1/2', createdAt: new Date('2025-05-12') },
  { patientId: 'P006', name: 'Lisa Garcia - Rare Disease Panel', createdAt: new Date('2025-06-18') },
  { patientId: 'P007', name: 'Robert Martinez - CFTR Triple Mutation', createdAt: new Date('2025-07-22') },
  { patientId: 'P008', name: 'Jennifer Anderson - SMA Type II', createdAt: new Date('2025-08-30') },
  { patientId: 'P009', name: 'Christopher Taylor - Fusion Gene Carrier', createdAt: new Date('2025-09-14') },
  { patientId: 'P010', name: 'Amanda Thomas - Oncology Panel', createdAt: new Date('2025-10-28') }
]

const PATIENT_VARIANTS = [
// P001 John Smith - SMA (3 variants)
{ patientId: 'P001', gene: 'SMN1', hgvs_c: 'c.840+2T>G', acmg_class: 'PVS1+PM2' },
{ patientId: 'P001', gene: 'SMN2', hgvs_c: 'c.85T>G', acmg_class: 'PM2' },
{ patientId: 'P001', gene: 'NAIP', hgvs_c: 'c.1334G>A', acmg_class: 'PM4' },

// P002 Sarah Johnson - Cystic Fibrosis (3 variants)
{ patientId: 'P002', gene: 'CFTR', hgvs_c: 'c.1520_1523del', acmg_class: 'PVS1+PM3' },
{ patientId: 'P002', gene: 'CFTR', hgvs_c: 'c.1657C>T', acmg_class: 'PM2' },
{ patientId: 'P002', gene: 'CFTR', hgvs_c: 'c.350G>A', acmg_class: 'PM1' },

// P003 Michael Brown - CML BCR-ABL1 (3 variants)
{ patientId: 'P003', gene: 'BCR-ABL1', hgvs_c: 't(9;22)', acmg_class: 'PVS1' },
{ patientId: 'P003', gene: 'ABL1', hgvs_c: 'c.944T>C', acmg_class: 'PM1' },
{ patientId: 'P003', gene: 'BCR', hgvs_c: 'c.2870G>A', acmg_class: 'PM2' },

// P004 Emily Davis - NSCLC ALK (3 variants)
{ patientId: 'P004', gene: 'EML4-ALK', hgvs_c: 't(2;5)(p21;p23)', acmg_class: 'PVS1' },
{ patientId: 'P004', gene: 'ALK', hgvs_c: 'c.3599T>G', acmg_class: 'PM1' },
{ patientId: 'P004', gene: 'EML4', hgvs_c: 'c.2150G>A', acmg_class: 'PM2' },

// P005 David Wilson - Breast Cancer (3 variants)
{ patientId: 'P005', gene: 'BRCA1', hgvs_c: 'c.5266dupC', acmg_class: 'PVS1+PM2' },
{ patientId: 'P005', gene: 'BRCA2', hgvs_c: 'c.5946delT', acmg_class: 'PVS1' },
{ patientId: 'P005', gene: 'TP53', hgvs_c: 'c.817C>T', acmg_class: 'PS1' },

// P006 Lisa Garcia - Rare Disease (3 variants)
{ patientId: 'P006', gene: 'DMD', hgvs_c: 'c.5258dupT', acmg_class: 'PVS1' },
{ patientId: 'P006', gene: 'DMD', hgvs_c: 'c.9070G>A', acmg_class: 'PM1' },
{ patientId: 'P006', gene: 'DMD', hgvs_c: 'c.10148C>T', acmg_class: 'PM2' },

// P007 Robert Martinez - CFTR Triple (4 variants)
{ patientId: 'P007', gene: 'CFTR', hgvs_c: 'c.1520_1523del', acmg_class: 'PVS1' },
{ patientId: 'P007', gene: 'CFTR', hgvs_c: 'c.3140-26A>G', acmg_class: 'PM4' },
{ patientId: 'P007', gene: 'CFTR', hgvs_c: 'c.1657C>T', acmg_class: 'PM2' },
{ patientId: 'P007', gene: 'CFTR', hgvs_c: 'c.350G>A', acmg_class: 'PM1' },

// P008 Jennifer Anderson - SMA Type II (3 variants)
{ patientId: 'P008', gene: 'SMN1', hgvs_c: 'c.88G>A', acmg_class: 'PVS1' },
{ patientId: 'P008', gene: 'SMN2', hgvs_c: 'c.85T>G', acmg_class: 'PM2' },
{ patientId: 'P008', gene: 'NAIP', hgvs_c: 'c.1334G>A', acmg_class: 'PM4' },

// P009 Christopher Taylor - Fusion Carrier (3 variants)
{ patientId: 'P009', gene: 'ROS1', hgvs_c: 't(6;12)', acmg_class: 'PVS1' },
{ patientId: 'P009', gene: 'RET', hgvs_c: 't(10;14)', acmg_class: 'PVS1' },
{ patientId: 'P009', gene: 'NTRK1', hgvs_c: 't(1;3)', acmg_class: 'PM1' },

// P010 Amanda Thomas - Oncology (3 variants)
{ patientId: 'P010', gene: 'EGFR', hgvs_c: 'c.2369C>T', acmg_class: 'PS1' },
{ patientId: 'P010', gene: 'KRAS', hgvs_c: 'c.35G>A', acmg_class: 'PS1' },
{ patientId: 'P010', gene: 'PIK3CA', hgvs_c: 'c.3140A>G', acmg_class: 'PS1' }
]

async function main() {
  console.log('🌱 Seeding 10 clinical patients...')

  // Create 10 patients with names
  const createdPatients = new Map();
  for (const patient of CLINICAL_PATIENTS) {
    const createdPatient = await prisma.patient.upsert({
      where: { patientId: patient.patientId },
      update: {
        name: patient.name,
        createdAt: patient.createdAt
      },
      create: {
        patientId: patient.patientId,
        name: patient.name,
        createdAt: patient.createdAt
      }
    });
    createdPatients.set(patient.patientId, createdPatient);
    console.log(`✅ ${patient.name}`)
  }

  // Clear ALL existing variants for these clinical patients first to prevent duplicates
  const patientIds = Array.from(createdPatients.values()).map(p => p.id);
  await prisma.variant.deleteMany({
    where: {
      patientId: { in: patientIds }
    }
  });
  console.log(`🗑️ Cleared existing variants for seeded patients`)

  // Add key variants
  for (const variant of PATIENT_VARIANTS) {
    const patient = createdPatients.get(variant.patientId);

    if (!patient) {
      console.log(`⚠️ Patient ${variant.patientId} not found for variant ${variant.gene}`);
      continue;
    }

    await prisma.variant.create({
      data: {
        patientId: patient.id, // Use the internal ID
        gene: variant.gene,
        hgvs_c: variant.hgvs_c,
        acmg_class: variant.acmg_class,
        ref_allele: 'A',
        alt_allele: 'T',
        gnomad_freq: 0.0001,
        clinvar_path: true,
        zygosity: 'heterozygous'  // Add required field
      }
    })
  }

  const count = await prisma.patient.count()
  console.log(`🎉 ${count} patients seeded with names + variants!`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => console.error(e))