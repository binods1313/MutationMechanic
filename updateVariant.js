
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function updateVariant() {
    try {
        const variant = await prisma.variant.update({
            where: {
                patientId_gene_hgvs_c: {
                    patientId: "cmjeu71280000ygu725n4hwmf", // Internal patient ID
                    gene: "SMN1",
                    hgvs_c: "c.840+2T>G"
                }
            },
            data: {
                hgvs_p: "p.Gly281*",
                gnomad_freq: 0.00012,
                clinvar_path: true,
                acmg_class: "PVS1+PM2"
            }
        });
        console.log(JSON.stringify(variant));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
updateVariant();
