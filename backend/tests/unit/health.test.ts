import request from 'supertest';
import { app, prisma } from '../../src/server.js';
import { jest, describe, it, expect } from '@jest/globals';

// No need for jest.mock here if we can spy on the exported instance
// But we need to make sure we don't hit the real DB
beforeEach(() => {
    jest.spyOn(prisma, '$executeRawUnsafe').mockImplementation(() => Promise.resolve(1) as any);
    jest.spyOn(prisma, '$connect').mockImplementation(() => Promise.resolve() as any);
    // Also mock it on the instance methods if needed, but spyOn should handle it
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('Health Endpoint', () => {
    it('should return app ok and db ok when DB is reachable', async () => {
        (prisma.$executeRawUnsafe as any).mockResolvedValue(1);

        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.app).toBe('ok');
        expect(response.body.db).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
    });

    it('should return db unavailable when DB query fails', async () => {
        (prisma.$executeRawUnsafe as any).mockRejectedValue(new Error('DB Conn Error'));

        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.app).toBe('ok');
        expect(response.body.db).toBe('unavailable');
    });
});
