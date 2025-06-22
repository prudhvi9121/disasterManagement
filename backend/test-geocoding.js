const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testGeocoding() {
  console.log('🧪 Testing Geocoding Functionality...\n');

  const testCases = [
    {
      description: "Heavy flooding in Manhattan",
      expected: "Manhattan"
    },
    {
      description: "Heavy flooding in Kakinada, Andrapradesh. Streets are submerged and power outages reported",
      expected: "Kakinada"
    },
    {
      description: "Wildfire spreading in Los Angeles County",
      expected: "Los Angeles"
    },
    {
      description: "Tornado touchdown in Dallas suburbs",
      expected: "Dallas"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}. Testing: "${testCase.description}"`);
    console.log(`   Expected location: ${testCase.expected}`);
    
    try {
      const response = await axios.post(`${API_BASE}/geocode`, {
        description: testCase.description
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`   ✅ Success!`);
      console.log(`   Extracted location: ${response.data.location_name}`);
      console.log(`   Coordinates: ${response.data.lat}, ${response.data.lon}`);
      console.log(`   Display name: ${response.data.display_name}`);
      console.log(`   Confidence: ${response.data.confidence}`);
      
      if (response.data.fallback) {
        console.log(`   ⚠️  Used fallback coordinates`);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.status === 404) {
        console.log(`   💡 Location not found in geocoding service`);
      } else if (error.response?.status === 500) {
        console.log(`   💡 Server error - check if Gemini API key is set`);
      }
    }
  }

  console.log('\n🎯 Test Summary:');
  console.log('   - If you see "Used fallback coordinates", the system is working with predefined data');
  console.log('   - If you see 404 errors, the geocoding service is not finding the locations');
  console.log('   - If you see 500 errors, check your Gemini API key in .env file');
  console.log('\n💡 To get real geocoding working:');
  console.log('   1. Get a Gemini API key from https://aistudio.google.com/app/apikey');
  console.log('   2. Add it to your .env file as GEMINI_API_KEY=your_key_here');
  console.log('   3. Restart the backend server');
}

// Test the backend health first
async function testBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE}/`);
    console.log('✅ Backend is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend is not running. Please start it with: npm run dev');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Geocoding Tests...\n');
  
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    return;
  }
  
  await testGeocoding();
}

runTests().catch(console.error); 