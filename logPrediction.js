
async function logPrediction() {
    const response = await fetch('http://localhost:5000/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            variantId: "cmjeu716j0001ygu7ixth77m0",
            modelId: "cmjeue3dp0000vou72g6ouie8",
            model_name: "gemini-1.5-pro",
            model_version: "20241217",
            model_provider: "google",
            parsed_output: { splicing_impact: "HIGH", exons_skipped: ["Exon 7"] },
            confidence: 0.92
        })
    });
    const data = await response.json();
    console.log(JSON.stringify(data));
}
logPrediction();
