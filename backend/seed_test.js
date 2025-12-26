import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const patient = await prisma.patient.create({
        data: {
            patientId: 'P123',
            name: 'Test Patient',
            variants: {
                create: {
                    gene: 'SMN1',
                    hgvs_c: 'c.840+2T>G',
                    ref_allele: 'T',
                    alt_allele: 'G',
                    zygosity: 'heterozygous'
                }
            }
        },
        include: {
            variants: true
        }
    });
    console.log('Created patient and variant:', patient);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
