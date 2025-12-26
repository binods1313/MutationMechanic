
async function getModels() {
    const response = await fetch('http://localhost:5000/api/models');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}
getModels();
