
async function checkVariants() {
    const response = await fetch('http://localhost:5000/api/variants?patientId=P123');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}
checkVariants();
