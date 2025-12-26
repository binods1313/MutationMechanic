import request from 'supertest';
import { app, prisma } from '../../src/server.js';
import { jest, describe, it, expect } from '@jest/globals';

// No need for jest.mock if we spy on exported instance
beforeEach(() => {
    jest.spyOn(prisma.user, 'findUnique').mockImplementation(() => Promise.resolve(null) as any);
    jest.spyOn(prisma.analysis, 'findUnique').mockImplementation(() => Promise.resolve(null) as any);
    jest.spyOn(prisma, '$executeRawUnsafe').mockImplementation(() => Promise.resolve(1) as any);
    jest.spyOn(prisma, '$connect').mockImplementation(() => Promise.resolve() as any);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('API Integration', () => {
    describe('GET /api/users/:id', () => {
        it('should return user object on success', async () => {
            const mockUser = { id: '1', name: 'Test' };
            (prisma.user.findUnique as any).mockResolvedValue(mockUser);

            const res = await request(app).get('/api/users/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUser);
        });

        it('should return 404 error object when user not found', async () => {
            (prisma.user.findUnique as any).mockResolvedValue(null);

            const res = await request(app).get('/api/users/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'User not found' });
        });

        it('should return 500 error object on database error', async () => {
            (prisma.user.findUnique as any).mockRejectedValue(new Error('DB error'));

            const res = await request(app).get('/api/users/1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Failed to fetch user' });
        });
    });

    describe('GET /api/analyses/:id', () => {
        it('should return analysis object on success', async () => {
            const mockAnalysis = { id: 'a1', gene: 'BRCA1' };
            (prisma.analysis.findUnique as any).mockResolvedValue(mockAnalysis);

            const res = await request(app).get('/api/analyses/a1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockAnalysis);
        });

        it('should return 404 error object when analysis not found', async () => {
            (prisma.analysis.findUnique as any).mockResolvedValue(null);

            const res = await request(app).get('/api/analyses/unknown');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Analysis not found' });
        });

        it('should return 500 error object on database error', async () => {
            (prisma.analysis.findUnique as any).mockRejectedValue(new Error('DB error'));

            const res = await request(app).get('/api/analyses/a1');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Failed to fetch analysis' });
        });
    });
});
