// MUST be first - ensure environment variables are loaded before any other imports
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { prisma } from './prisma.js';
import { logger } from './utils/logger.js';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { redactSensitive, auditAction } from './utils/redactor.js';
import { fetchAlphaFoldStructureBackend } from './utils/alphafoldUtil.js';

// Defensive logging to check if DATABASE_URL is available
logger.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 5000;

// Multer storage configuration
const multerStorage = multer.diskStorage({
  destination: './storage/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: multerStorage });

// Prisma client is now imported from ./prisma.js

// Test database connection on startup with defensive error handling
async function testDbConnection() {
  if (!prisma) {
    logger.error('Prisma Client not initialized');
    return;
  }

  try {
    await prisma.$connect();
    logger.log('✓ Connected to database');
  } catch (error) {
    logger.error('✗ Database connection failed:', error);
    logger.log('Note: Database connection is required for full functionality');
  }
}

// Run connection test with async/await handling to prevent crashes
testDbConnection().catch(error => {
  logger.error('Database connection test failed:', error);
  logger.log('Server will continue running without database connection');
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit middleware
app.use(async (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Audit API endpoints only, for successful requests
    if (req.path.startsWith('/api/') && statusCode < 400 && req.method !== 'GET') {
      try {
        const entityParts = req.path.split('/');
        const entityTypeRaw = entityParts[entityParts.length - 1] || 'N/A';
        const entityType = entityTypeRaw.replace(/s$/, ''); // variants -> variant

        await auditAction(
          prisma,
          `${req.method} ${req.path}`,
          req.body.id || req.params.id || 'N/A',
          entityType,
          null, // oldValues
          redactSensitive(req.body),
          req.body.userId
        );
      } catch (error) {
        logger.error('Middleware Audit failure:', error);
      }
    }
  });

  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'MutationMechanic Backend API' });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const healthData = {
    app: 'ok',
    db: 'unavailable',
    timestamp: new Date().toISOString()
  };

  try {
    // Perform a lightweight query to check DB connectivity
    if (prisma) {
      await prisma.$executeRawUnsafe('SELECT 1');
      healthData.db = 'ok';
    }
  } catch (error) {
    logger.error('Health check DB failed:', error);
    healthData.db = 'unavailable';
  }

  return res.json(healthData);
});

// Test clinical variant schema endpoint
app.get('/api/test-schema', async (req, res) => {
  try {
    const count = await prisma.variant.count();
    return res.json({ status: 'Schema ready', variantCount: count });
  } catch (error) {
    logger.error('Error in test-schema:', error);
    return res.status(500).json({ error: 'Schema test failed' });
  }
});

// POST /api/structures - Upload protein structure file
app.post('/api/structures', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.variantId) {
      return res.status(400).json({ error: 'Missing file or variantId' });
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const checksum = crypto.createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const structureFile = await prisma.structureFile.create({
      data: {
        variantId: req.body.variantId,
        file_type: req.body.file_type || 'pdb',
        file_name: req.file.originalname,
        file_size: req.file.size,
        local_path: req.file.path,
        checksum
      }
    });

    // Audit log
    await auditAction(prisma, 'structure_uploaded', structureFile.id, 'StructureFile', null, {
      file_type: structureFile.file_type,
      file_name: structureFile.file_name,
      file_size: structureFile.file_size
    });

    return res.json(structureFile);
  } catch (error) {
    logger.error('Error uploading structure:', error);
    return res.status(500).json({ error: 'Failed to upload structure' });
  }
});

// GET /api/alphafold/:gene - Fetch structure from public AlphaFold DB
app.get('/api/alphafold/:gene', async (req, res) => {
  const { gene } = req.params;
  try {
    const structureId = await fetchAlphaFoldStructureBackend(gene);
    res.json({ success: true, structureId });
  } catch (error) {
    logger.error(`Error fetching AlphaFold structure for gene ${gene}:`, error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/test-storage - Verify storage readiness
app.get('/api/test-storage', async (req, res) => {
  try {
    const count = await prisma.structureFile.count();
    return res.json({ status: 'Storage ready', structureCount: count });
  } catch (error) {
    logger.error('Error in test-storage:', error);
    return res.status(500).json({ error: 'Storage test failed' });
  }
});

// Variant routes
app.post('/api/variants', async (req, res) => {
  try {
    const { patientId, gene, hgvs_c, ...otherData } = req.body;

    // Ensure patient exists or create it
    let patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: { patientId }
      });
      await auditAction(prisma, 'patient_created', patient.id, 'Patient', null, { patientId });
    }

    const variant = await prisma.variant.upsert({
      where: {
        patientId_gene_hgvs_c: {
          patientId: patient.id,
          gene,
          hgvs_c
        }
      },
      update: {
        ...otherData
      },
      create: {
        patientId: patient.id,
        gene,
        hgvs_c,
        ...otherData
      }
    });

    await auditAction(prisma, 'variant_updated_or_created', variant.id, 'Variant', null, redactSensitive(req.body));

    return res.json(variant);
  } catch (error) {
    logger.error('Error upserting variant:', error);
    return res.status(500).json({ error: 'Failed to process variant' });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const { patientId, name } = req.body;
    const patient = await prisma.patient.create({
      data: { patientId, name }
    });
    await auditAction(prisma, 'patient_created', patient.id, 'Patient', null, redactSensitive(req.body));
    return res.json(patient);
  } catch (error) {
    logger.error('Error creating patient:', error);
    return res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientId: true,
        name: true,     // ← CRITICAL: Include name!
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(patients);
  } catch (error) {
    logger.error('Error fetching patients:', error);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.get('/api/variants', async (req, res) => {
  try {
    const { patientId } = req.query;
    const variants = await prisma.variant.findMany({
      where: patientId ? {
        patient: { patientId: patientId as string }
      } : {},
      orderBy: { id: 'desc' }
    });
    return res.json(variants);
  } catch (error) {
    logger.error('Error fetching variants:', error);
    return res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// Audit routes
app.get('/api/audits', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const audits = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return res.json(audits);
  } catch (error) {
    logger.error('Error fetching audits:', error);
    return res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

app.get('/api/audits/stats', async (req, res) => {
  try {
    // Note: Prisma 7 $queryRaw requires specific treatment for PostgreSQL types if using strings
    const stats = await prisma.$queryRaw`
      SELECT 
        "entityType", 
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM "createdAt")::int) as avg_time
      FROM "audit_logs" 
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
      GROUP BY "entityType"
    `;

    // Convert BigInt to Number for JSON serialization if needed
    const serializedStats = JSON.parse(JSON.stringify(stats, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return res.json(serializedStats);
  } catch (error) {
    logger.error('Error fetching audit stats:', error);
    return res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});
// POST /api/predictions - Log an ML prediction
app.post('/api/predictions', async (req, res) => {
  try {
    const {
      variantId,
      modelId,
      model_name,
      model_version,
      model_provider,
      raw_prompt,
      raw_response,
      parsed_output,
      execution_time,
      confidence
    } = req.body;

    const prediction = await prisma.prediction.create({
      data: {
        variantId,
        modelId,
        model_name,
        model_version,
        model_provider: model_provider || 'google',
        raw_prompt,
        raw_response,
        parsed_output,
        execution_time: execution_time || 0,
        confidence
      }
    });

    return res.json(prediction);
  } catch (error) {
    logger.error('Error logging prediction:', error);
    return res.status(500).json({ error: 'Failed to log prediction' });
  }
});

// GET /api/models - List active ML models
app.get('/api/models', async (req, res) => {
  try {
    const models = await prisma.modelRegistry.findMany({
      where: { is_active: true }
    });
    return res.json(models);
  } catch (error) {
    logger.error('Error fetching models:', error);
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// POST /api/seed-models - Seed initial models
app.post('/api/seed-models', async (req, res) => {
  try {
    // Dynamic import for the seed script
    const seed = await import('../prisma/seed.js');
    await seed.main();
    return res.json({ status: 'Models seeded' });
  } catch (error) {
    logger.error('Error seeding models:', error);
    return res.status(500).json({ error: 'Failed to seed models' });
  }
});

// TEMPORARY: POST /api/seed-clinical - Bulk seed clinical data
app.post('/api/seed-clinical', async (req, res) => {
  try {
    const CLINICAL_PATIENTS = [
      { patientId: 'P123', name: 'SMA Patient A' },
      { patientId: 'P456', name: 'Cystic Fibrosis Cohort' },
      { patientId: 'P789', name: 'Cancer Panel 1' },
      { patientId: 'P101', name: 'Rare Disease Family' }
    ];

    const REAL_CLINICAL_VARIANTS = [
      { patientId: 'P123', gene: 'SMN1', hgvs_c: 'c.840+2T>G', hgvs_p: 'p.Gly281*', gnomad_freq: 0.00012, clinvar_path: true, acmg_class: 'PVS1+PM2' },
      { patientId: 'P123', gene: 'SMN2', hgvs_c: 'c.85T>G', hgvs_p: 'p.Cys29Gly', gnomad_freq: 0.0012, clinvar_path: false },
      { patientId: 'P456', gene: 'CFTR', hgvs_c: 'c.1520_1523del', hgvs_p: 'p.Phe508del', gnomad_freq: 0.00045, clinvar_path: true, acmg_class: 'PVS1+PM3' },
      { patientId: 'P789', gene: 'BRCA1', hgvs_c: 'c.5266dupC', hgvs_p: 'p.Gln1756Profs74', gnomad_freq: 0.0, clinvar_path: true },
      { patientId: 'P789', gene: 'BRCA2', hgvs_c: 'c.5946delT', hgvs_p: 'p.Ser1989Argfs5', gnomad_freq: 0.0, clinvar_path: true },
      { patientId: 'P101', gene: 'BCR-ABL1', hgvs_c: 't(9;22)(q34;q11)', hgvs_p: 'p210 fusion', gnomad_freq: 0.0, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P101', gene: 'EML4-ALK', hgvs_c: 't(2;5)(p21;p23)', hgvs_p: 'p.E13;A20 fusion', gnomad_freq: 0.0, clinvar_path: true },
      // 10 NEW VARIETY VARIANTS
      { patientId: 'P789', gene: 'TP53', hgvs_c: 'c.524G>A', hgvs_p: 'p.Arg175His', gnomad_freq: 0.00001, clinvar_path: true, acmg_class: 'PVS1+PS2' },
      { patientId: 'P789', gene: 'KRAS', hgvs_c: 'c.35G>A', hgvs_p: 'p.Gly12Asp', gnomad_freq: 0.00002, clinvar_path: true, acmg_class: 'PVS1+PM2' },
      { patientId: 'P789', gene: 'EGFR', hgvs_c: 'c.2573T>G', hgvs_p: 'p.Leu858Arg', gnomad_freq: 0.00000, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P789', gene: 'BRAF', hgvs_c: 'c.1799T>A', hgvs_p: 'p.Val600Glu', gnomad_freq: 0.00003, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P101', gene: 'VHL', hgvs_c: 'c.499C>T', hgvs_p: 'p.Arg167Trp', gnomad_freq: 0.00005, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P123', gene: 'MTHFR', hgvs_c: 'c.677C>T', hgvs_p: 'p.Ala222Val', gnomad_freq: 0.35, clinvar_path: false, acmg_class: 'BENIGN' },
      { patientId: 'P123', gene: 'DMD', hgvs_c: 'c.262delG', hgvs_p: 'p.Ala88fs', gnomad_freq: 0.00001, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P456', gene: 'HBB', hgvs_c: 'c.20A>T', hgvs_p: 'p.Glu6Val', gnomad_freq: 0.05, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P456', gene: 'PAH', hgvs_c: 'c.1222C>T', hgvs_p: 'p.Arg408Trp', gnomad_freq: 0.00018, clinvar_path: true, acmg_class: 'PVS1' },
      { patientId: 'P101', gene: 'FBN1', hgvs_c: 'c.3046T>C', hgvs_p: 'p.Cys1016Arg', gnomad_freq: 0.00009, clinvar_path: true, acmg_class: 'PVS1' }
    ];

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
    const patientMap: Record<string, string> = {};

    for (const p of CLINICAL_PATIENTS) {
      const patient = await prisma.patient.upsert({
        where: { patientId: p.patientId },
        update: { name: p.name },
        create: p
      });
      patientMap[p.patientId] = patient.id;
    }

    for (const v of ALL_VARIANTS) {
      const internalId = patientMap[v.patientId];
      const variant = await prisma.variant.upsert({
        where: { patientId_gene_hgvs_c: { patientId: internalId, gene: v.gene, hgvs_c: v.hgvs_c } },
        update: { hgvs_p: v.hgvs_p, gnomad_freq: v.gnomad_freq, clinvar_path: v.clinvar_path, acmg_class: v.acmg_class },
        create: {
          patientId: internalId,
          gene: v.gene,
          hgvs_c: v.hgvs_c,
          hgvs_p: v.hgvs_p,
          gnomad_freq: v.gnomad_freq,
          clinvar_path: v.clinvar_path,
          acmg_class: v.acmg_class,
          zygosity: 'heterozygous',
          ref_allele: v.hgvs_c.includes('>') ? v.hgvs_c.split('>')[0].slice(-1) : 'N',
          alt_allele: v.hgvs_c.includes('>') ? v.hgvs_c.split('>')[1] : 'N'
        }
      });

      await prisma.prediction.create({
        data: {
          variantId: variant.id,
          modelId: 'cmjeue3dp0000vou72g6ouie8',
          model_name: 'gemini-1.5-pro',
          model_version: '20241217',
          model_provider: 'google',
          parsed_output: {
            pathogenicity: v.clinvar_path ? 'PATHOGENIC' : 'Benign',
            splicing_impact: v.gene === 'SMN1' ? 'HIGH' : 'LOW',
            fusion_partner: v.gene.includes('-') ? v.gene.split('-')[1] : null
          },
          confidence: 0.92,
          execution_time: 2450
        }
      });
    }

    return res.json({ message: 'Seeding successful', count: ALL_VARIANTS.length });
  } catch (error) {
    logger.error('Error in bulk seed:', error);
    return res.status(500).json({ error: 'Bulk seed failed' });
  }
});

// User routes
app.post('/api/users', async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await prisma.user.create({
      data: {
        email,
        name
      }
    });
    return res.json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        analyses: true,
        userPreferences: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Analysis routes
app.post('/api/analyses', async (req, res) => {
  try {
    const { userId, gene, variant, ...analysisData } = req.body;
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        gene,
        variant,
        ...analysisData
      }
    });
    return res.json(analysis);
  } catch (error) {
    logger.error('Error creating analysis:', error);
    return res.status(500).json({ error: 'Failed to create analysis' });
  }
});

app.get('/api/analyses', async (req, res) => {
  try {
    const { userId } = req.query;
    const analyses = await prisma.analysis.findMany({
      where: {
        userId: userId as string
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(analyses);
  } catch (error) {
    logger.error('Error fetching analyses:', error);
    return res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

app.get('/api/analyses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        user: true,
        historyRecords: true,
        splicingAnalysis: true
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    return res.json(analysis);
  } catch (error) {
    logger.error('Error fetching analysis:', error);
    return res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// History routes
app.post('/api/history', async (req, res) => {
  try {
    const { userId, analysisId, gene, variant, ...historyData } = req.body;
    const history = await prisma.historyRecord.create({
      data: {
        userId,
        analysisId,
        gene,
        variant,
        ...historyData
      }
    });
    return res.json(history);
  } catch (error) {
    logger.error('Error creating history record:', error);
    return res.status(500).json({ error: 'Failed to create history record' });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await prisma.historyRecord.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50 // Limit to last 50 records
    });
    return res.json(history);
  } catch (error) {
    logger.error('Error fetching history records:', error);
    return res.status(500).json({ error: 'Failed to fetch history records' });
  }
});

// Splicing analysis routes
app.post('/api/splicing', async (req, res) => {
  try {
    const { userId, analysisId, gene, variant, ...splicingData } = req.body;
    const splicingAnalysis = await prisma.splicingAnalysis.create({
      data: {
        userId,
        analysisId,
        gene,
        variant,
        ...splicingData
      }
    });
    return res.json(splicingAnalysis);
  } catch (error) {
    logger.error('Error creating splicing analysis:', error);
    return res.status(500).json({ error: 'Failed to create splicing analysis' });
  }
});

// Sharing routes
app.post('/api/share', async (req, res) => {
  try {
    const { analysisId, sharedWithId, permissionType, isPublic } = req.body;
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sharedAccess = await prisma.sharedAccess.create({
      data: {
        analysisId,
        sharedById: req.body.userId, // This should come from authentication
        sharedWithId,
        shareToken,
        permissionType,
        isPublic
      }
    });

    return res.json(sharedAccess);
  } catch (error) {
    logger.error('Error creating shared access:', error);
    return res.status(500).json({ error: 'Failed to create shared access' });
  }
});

// Comments routes
app.post('/api/comments', async (req, res) => {
  try {
    const { analysisId, userId, content, parentId } = req.body;
    const comment = await prisma.comment.create({
      data: {
        analysisId,
        userId,
        content,
        parentId
      }
    });
    return res.json(comment);
  } catch (error) {
    logger.error('Error creating comment:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.get('/api/comments/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { analysisId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(comments);
  } catch (error) {
    logger.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// LONGEVITY RISK ASSESSMENT ENDPOINTS

// GET /api/risk-assessments - Get all risk assessments for a patient
app.get('/api/risk-assessments', async (req, res) => {
  try {
    const { patientId } = req.query;
    const assessments = await prisma.riskAssessment.findMany({
      where: patientId ? { patientId: patientId as string } : {},
      include: {
        variant: true,
        patient: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(assessments);
  } catch (error) {
    logger.error('Error fetching risk assessments:', error);
    return res.status(500).json({ error: 'Failed to fetch risk assessments' });
  }
});

// POST /api/risk-assessments - Create or update a risk assessment
app.post('/api/risk-assessments', async (req, res) => {
  try {
    const { patientId, variantId, diseaseType, riskScore, biologicalAge,
            relativeRisk, confidenceIntervalLower, confidenceIntervalUpper,
            riskTrajectoryCurrent, riskTrajectory5Year, riskTrajectory10Year,
            riskTrajectoryLifetime, severityLevel, riskCategory } = req.body;

    const assessment = await prisma.riskAssessment.create({
      data: {
        patientId,
        variantId,
        diseaseType,
        riskScore,
        biologicalAge: biologicalAge || null,
        relativeRisk,
        confidenceIntervalLower,
        confidenceIntervalUpper,
        riskTrajectoryCurrent: riskTrajectoryCurrent || null,
        riskTrajectory5Year: riskTrajectory5Year || null,
        riskTrajectory10Year: riskTrajectory10Year || null,
        riskTrajectoryLifetime: riskTrajectoryLifetime || null,
        severityLevel,
        riskCategory
      },
      include: {
        variant: true,
        patient: true
      }
    });

    return res.json(assessment);
  } catch (error) {
    logger.error('Error creating risk assessment:', error);
    return res.status(500).json({ error: 'Failed to create risk assessment' });
  }
});

// GET /api/interventions - Get interventions for a risk assessment
app.get('/api/interventions', async (req, res) => {
  try {
    const { riskAssessmentId } = req.query;
    const interventions = await prisma.intervention.findMany({
      where: riskAssessmentId ? { riskAssessmentId: riskAssessmentId as string } : {},
      include: {
        riskAssessment: {
          include: {
            patient: true,
            variant: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(interventions);
  } catch (error) {
    logger.error('Error fetching interventions:', error);
    return res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

// POST /api/interventions - Create an intervention
app.post('/api/interventions', async (req, res) => {
  try {
    const { riskAssessmentId, interventionType, interventionName, interventionDescription,
            evidenceLevel, expectedRiskReduction, preventableYears, recommended } = req.body;

    const intervention = await prisma.intervention.create({
      data: {
        riskAssessmentId,
        interventionType,
        interventionName,
        interventionDescription: interventionDescription || '',
        evidenceLevel,
        expectedRiskReduction: expectedRiskReduction || null,
        preventableYears: preventableYears || null,
        recommended: recommended !== undefined ? recommended : true
      },
      include: {
        riskAssessment: {
          include: {
            patient: true,
            variant: true
          }
        }
      }
    });

    return res.json(intervention);
  } catch (error) {
    logger.error('Error creating intervention:', error);
    return res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// GET /api/polygenic-scores - Get polygenic scores for a patient
app.get('/api/polygenic-scores', async (req, res) => {
  try {
    const { patientId } = req.query;
    const scores = await prisma.polygenicScore.findMany({
      where: patientId ? { patientId: patientId as string } : {},
      orderBy: { createdAt: 'desc' }
    });
    return res.json(scores);
  } catch (error) {
    logger.error('Error fetching polygenic scores:', error);
    return res.status(500).json({ error: 'Failed to fetch polygenic scores' });
  }
});

// POST /api/polygenic-scores - Create or update a polygenic score
app.post('/api/polygenic-scores', async (req, res) => {
  try {
    const { patientId, diseaseType, prsScore, prsPercentile, referencePopulation, variantCount } = req.body;

    const score = await prisma.polygenicScore.upsert({
      where: {
        patientId_diseaseType: {
          patientId,
          diseaseType
        }
      },
      update: {
        prsScore,
        prsPercentile,
        referencePopulation,
        variantCount,
        updatedAt: new Date()
      },
      create: {
        patientId,
        diseaseType,
        prsScore,
        prsPercentile,
        referencePopulation,
        variantCount
      }
    });

    return res.json(score);
  } catch (error) {
    logger.error('Error creating/updating polygenic score:', error);
    return res.status(500).json({ error: 'Failed to create/update polygenic score' });
  }
});

// GET /api/family-risks - Get family risk assessments for a patient
app.get('/api/family-risks', async (req, res) => {
  try {
    const { patientId } = req.query;
    const risks = await prisma.familyRisk.findMany({
      where: patientId ? { patientId: patientId as string } : {},
      include: {
        variant: true,
        patient: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(risks);
  } catch (error) {
    logger.error('Error fetching family risks:', error);
    return res.status(500).json({ error: 'Failed to fetch family risks' });
  }
});

// POST /api/family-risks - Create or update a family risk assessment
app.post('/api/family-risks', async (req, res) => {
  try {
    const { patientId, relativeType, relationship, variantId, recurrenceRisk,
            inheritancePattern, geneticCounselingNeeded } = req.body;

    const risk = await prisma.familyRisk.create({
      data: {
        patientId,
        relativeType,
        relationship,
        variantId: variantId || null,
        recurrenceRisk,
        inheritancePattern,
        geneticCounselingNeeded: geneticCounselingNeeded || false
      }
    });

    return res.json(risk);
  } catch (error) {
    logger.error('Error creating family risk assessment:', error);
    return res.status(500).json({ error: 'Failed to create family risk assessment' });
  }
});

// GET /api/risk-assessment/:patientId - Get risk assessment for a patient
app.get('/api/risk-assessment/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    // Get patient variants from database
    const variants = await prisma.variant.findMany({
      where: { patientId: patientId }
    });

    // SIMPLE MOCK CALCULATION (we'll make it real later)
    const riskScore = {
      cardiovascular: calculateRisk(variants, 'cardiovascular'),
      cancer: calculateRisk(variants, 'cancer'),
      neurodegenerative: calculateRisk(variants, 'neurodegenerative'),
      metabolic: calculateRisk(variants, 'metabolic'),
      biologicalAge: 45, // Mock for now
      chronologicalAge: 40, // Get from patient data
      longevityScore: 72,
      topInterventions: [
        'Start statin therapy (APOE4 carrier)',
        'Annual colonoscopy (Lynch syndrome)',
        'Mediterranean diet (CAD risk)'
      ]
    };

    res.json(riskScore);
  } catch (error) {
    logger.error('Error calculating risk assessment:', error);
    return res.status(500).json({ error: 'Failed to calculate risk assessment' });
  }
});

function calculateRisk(variants, category) {
  // TEMPORARY: Return mock percentages
  // TODO: Integrate with ClinVar/gnomAD later
  const mockRisks = {
    cardiovascular: 35,
    cancer: 22,
    neurodegenerative: 18,
    metabolic: 28
  };
  return mockRisks[category] || 15;
}

// End of routes and app definition
export { prisma, app };