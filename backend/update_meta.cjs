
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const updated = await prisma.variant.update({
            where: {
                patientId_gene_hgvs_c: {
                    patientId: "cmjeu71280000ygu725n4hwmf",
                    gene: "SMN1",
                    hgvs_c: "c.840+2T>G"
                }
            },
            data: {
                gnomad_freq: 0.00012,
                acmg_class: "PVS1+PM2",
                clinvar_path: true,
                hgvs_p: "p.Gly281*"
            }
        })
        console.log("UPDATED_VARIANT:", JSON.stringify(updated))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
