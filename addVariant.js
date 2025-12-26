
async function addVariant() {
    const response = await fetch('http://localhost:5000/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientId: "P123",
            gene: "SMN1",
            hgvs_c: "c.840+2T>G",
            hgvs_p: "p.Gly281*",
            ref_allele: "T",
            alt_allele: "G",
            zygosity: "heterozygous",
            gnomad_freq: 0.00012,
            clinvar_path: true,
            acmg_class: "PVS1+PM2"
        })
    });
    const data = await response.json();
    console.log(JSON.stringify(data));
}
addVariant();
