import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function main() {
    await prisma.modelRegistry.createMany({
        data: [
            {
                name: 'gemini-1.5-pro',
                version: '20241217',
                provider: 'google',
                is_active: true,
                input_schema: { type: 'object', properties: { prompt: { type: 'string' } } },
                output_schema: { type: 'object', properties: { predictions: { type: 'array' } } }
            },
            {
                name: 'alphafold3',
                version: 'v1.0',
                provider: 'deepmind',
                is_active: true
            }
        ],
        skipDuplicates: true
    });

    console.log('✅ Model registry seeded');
}

if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
    main()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
