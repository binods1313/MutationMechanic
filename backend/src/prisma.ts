import { PrismaClient } from '@prisma/client';
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

export { prisma };
export default prisma;
