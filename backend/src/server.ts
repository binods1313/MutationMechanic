// MUST be first - ensure environment variables are loaded before any other imports
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Defensive logging to check if DATABASE_URL is available
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Test database connection on startup with defensive error handling
async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('✓ Connected to database');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    console.log('Note: Database connection is required for full functionality');
  }
}

// Run connection test with async/await handling to prevent crashes
testDbConnection().catch(error => {
  console.error('Database connection test failed:', error);
  console.log('Server will continue running without database connection');
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'MutationMechanic Backend API' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
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

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
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
    res.json(analysis);
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Failed to create analysis' });
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
    res.json(analyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
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
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
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
    res.json(history);
  } catch (error) {
    console.error('Error creating history record:', error);
    res.status(500).json({ error: 'Failed to create history record' });
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
    res.json(history);
  } catch (error) {
    console.error('Error fetching history records:', error);
    res.status(500).json({ error: 'Failed to fetch history records' });
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
    res.json(splicingAnalysis);
  } catch (error) {
    console.error('Error creating splicing analysis:', error);
    res.status(500).json({ error: 'Failed to create splicing analysis' });
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
    
    res.json(sharedAccess);
  } catch (error) {
    console.error('Error creating shared access:', error);
    res.status(500).json({ error: 'Failed to create shared access' });
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
    res.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
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
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MutationMechanic backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export { prisma };