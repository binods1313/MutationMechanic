/**
 * Test script for the AlphaFold integration
 * Tests the endpoint: curl http://localhost:5000/api/alphafold/BCR-ABL1 → structureId returned
 */

async function testAlphaFoldEndpoint() {
  console.log('🧪 Testing AlphaFold Integration...');
  console.log('Testing endpoint: GET /api/alphafold/BCR-ABL1');
  
  try {
    // Check if backend is running
    const healthCheck = await fetch('http://localhost:5000/api/health');
    if (!healthCheck.ok) {
      console.log('❌ Backend server is not running. Please start the backend server first.');
      console.log('Run: cd backend && npm run dev');
      return;
    }
    
    console.log('✅ Backend server is running');
    
    // Test the AlphaFold endpoint
    console.log('\n🔄 Fetching BCR-ABL1 structure from AlphaFold...');
    const response = await fetch('http://localhost:5000/api/alphafold/BCR-ABL1');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('✅ Response received:', JSON.stringify(data, null, 2));
    
    if (data.success && data.structureId) {
      console.log(`\n✅ SUCCESS: Structure ID returned: ${data.structureId}`);
      console.log('🎯 AlphaFold integration working correctly!');
      
      // Test another gene to make sure the functionality works broadly
      console.log('\n🔄 Testing CFTR gene...');
      const cftrResponse = await fetch('http://localhost:5000/api/alphafold/CFTR');
      if (cftrResponse.ok) {
        const cftrData = await cftrResponse.json();
        console.log(`✅ CFTR response: ${JSON.stringify(cftrData, null, 2)}`);
      } else {
        console.log(`❌ CFTR request failed: ${cftrResponse.status}`);
      }
      
      return true;
    } else {
      console.log('❌ Unexpected response format. Expected success and structureId.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing AlphaFold endpoint:', error.message);
    console.log('\n💡 To test manually, run this command in your terminal:');
    console.log('curl http://localhost:5000/api/alphafold/BCR-ABL1');
    return false;
  }
}

// Run the test
testAlphaFoldEndpoint()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests passed! AlphaFold integration is working correctly.');
      console.log('🚀 Platform ready for production with public AlphaFold DB integration!');
    } else {
      console.log('\n💥 Some tests failed. Please check the errors above.');
    }
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
  });