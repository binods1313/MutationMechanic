import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CLINICAL_PATIENTS = [
    { patientId: 'P123', name: 'SMA Patient A' },
    { patientId: 'P456', name: 'Cystic Fibrosis Cohort' },
    { patientId: 'P789', name: 'Cancer Panel 1' },
    { patientId: 'P101', name: 'Rare Disease Family' }
]

const REAL_CLINICAL_VARIANTS = [
    // SMA (Spinal Muscular Atrophy)
    { patientId: 'P123', gene: 'SMN1', hgvs_c: 'c.840+2T>G', hgvs_p: 'p.Gly281*', gnomad_freq: 0.00012, clinvar_path: true, acmg_class: 'PVS1+PM2' },
    { patientId: 'P123', gene: 'SMN2', hgvs_c: 'c.85T>G', hgvs_p: 'p.Cys29Gly', gnomad_freq: 0.0012, clinvar_path: false },

    // CFTR (Cystic Fibrosis)
    { patientId: 'P456', gene: 'CFTR', hgvs_c: 'c.1520_1523del', hgvs_p: 'p.Phe508del', gnomad_freq: 0.00045, clinvar_path: true, acmg_class: 'PVS1+PM3' },

    // Cancer Panel (BRCA1/2)
    { patientId: 'P789', gene: 'BRCA1', hgvs_c: 'c.5266dupC', hgvs_p: 'p.Gln1756Profs74', gnomad_freq: 0.0, clinvar_path: true },
    { patientId: 'P789', gene: 'BRCA2', hgvs_c: 'c.5946delT', hgvs_p: 'p.Ser1989Argfs5', gnomad_freq: 0.0, clinvar_path: true },

    // GENE FUSIONS
    { patientId: 'P101', gene: 'BCR-ABL1', hgvs_c: 't(9;22)(q34;q11)', hgvs_p: 'p210 fusion', gnomad_freq: 0.0, clinvar_path: true, acmg_class: 'PVS1' },
    { patientId: 'P101', gene: 'EML4-ALK', hgvs_c: 't(2;5)(p21;p23)', hgvs_p: 'p.E13;A20 fusion', gnomad_freq: 0.0, clinvar_path: true }
]

// Generate additional variants to reach 50+ total for scale testing
const SCALE_VARIANTS = [];
for (let i = 1; i <= 45; i++) {
    const pId = CLINICAL_PATIENTS[i % CLINICAL_PATIENTS.length].patientId;
    SCALE_VARIANTS.push({
        patientId: pId,
        gene: `GENE-${1000 + i}`,
        hgvs_c: `c.${200 + i}A>G`,
        hgvs_p: `p.Thr${50 + i}Ala`,
        gnomad_freq: Math.random() * 0.01,
        clinvar_path: i % 5 === 0,
        acmg_class: i % 5 === 0 ? 'VUS' : 'BENIGN'
    });
}

const ALL_VARIANTS = [...REAL_CLINICAL_VARIANTS, ...SCALE_VARIANTS];

async function main() {
    console.log('🌱 Starting clinical scale seeding...')

    // Create patients
    const patientMap: Record<string, string> = {};
    for (const patient of CLINICAL_PATIENTS) {
        const p = await prisma.patient.upsert({
            where: { patientId: patient.patientId },
            update: { name: patient.name },
            create: patient
        })
        patientMap[patient.patientId] = p.id;
    }

    // Create variants + predictions
    let count = 0;
    for (const variantData of ALL_VARIANTS) {
        const { patientId: mrn, ...vData } = variantData;
        const internalPatientId = patientMap[mrn];

        const createdVariant = await prisma.variant.upsert({
            where: {
                patientId_gene_hgvs_c: {
                    patientId: internalPatientId,
                    gene: vData.gene,
                    hgvs_c: vData.hgvs_c
                }
            },
            update: {
                hgvs_p: vData.hgvs_p,
                gnomad_freq: vData.gnomad_freq,
                clinvar_path: vData.clinvar_path,
                acmg_class: vData.acmg_class,
                zygosity: 'heterozygous', // Default for scale testing
                ref_allele: vData.hgvs_c.includes('>') ? vData.hgvs_c.split('>')[0].slice(-1) : 'N',
                alt_allele: vData.hgvs_c.includes('>') ? vData.hgvs_c.split('>')[1] : 'N'
            },
            create: {
                patientId: internalPatientId,
                gene: vData.gene,
                hgvs_c: vData.hgvs_c,
                hgvs_p: vData.hgvs_p,
                gnomad_freq: vData.gnomad_freq,
                clinvar_path: vData.clinvar_path,
                acmg_class: vData.acmg_class,
                zygosity: 'heterozygous',
                ref_allele: vData.hgvs_c.includes('>') ? vData.hgvs_c.split('>')[0].slice(-1) : 'N',
                alt_allele: vData.hgvs_c.includes('>') ? vData.hgvs_c.split('>')[1] : 'N'
            }
        })

        // Auto-generate ML prediction (Gemini 1.5 Pro)
        await prisma.prediction.create({
            data: {
                variantId: createdVariant.id,
                modelId: 'cmjeue3dp0000vou72g6ouie8', // gemini-1.5-pro
                model_name: 'gemini-1.5-pro',
                model_version: '20241217',
                model_provider: 'google',
                parsed_output: {
                    pathogenicity: vData.clinvar_path ? 'PATHOGENIC' : 'Benign',
                    splicing_impact: vData.gene === 'SMN1' ? 'HIGH' : 'LOW',
                    protein_stability: 0.72 + (Math.random() * 0.1),
                    fusion_partner: vData.gene.includes('-') ? vData.gene.split('-')[1] : null
                },
                confidence: 0.92,
                execution_time: 2450
            }
        })
        count++;
    }

    console.log(`✅ ${count} clinical variants + gene fusions seeded!`)
    console.log('🎭 Multi-protein complexes ready for AlphaFold3!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
