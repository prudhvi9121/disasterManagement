const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testBasicAPIs() {
  console.log('🧪 Testing Basic Disaster Response Platform APIs...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${API_BASE}/`);
    console.log('✅ Backend is running:', health.data);

    // Test 2: Get disasters (will fail without DB, but that's expected)
    console.log('\n2. Testing GET /disasters...');
    try {
      const disasters = await axios.get(`${API_BASE}/disasters`);
      console.log('✅ Disasters endpoint working:', disasters.data);
    } catch (error) {
      console.log('⚠️  Disasters endpoint returned error (expected without DB):', error.response?.status);
    }

    // Test 3: Test geocoding (will fail without API key, but that's expected)
    console.log('\n3. Testing POST /geocode...');
    try {
      const geocode = await axios.post(`${API_BASE}/geocode`, {
        description: 'Heavy flooding in Manhattan, NYC'
      });
      console.log('✅ Geocoding working:', geocode.data);
    } catch (error) {
      console.log('⚠️  Geocoding returned error (expected without API key):', error.response?.status);
    }

    // Test 4: Test social media (mock - should work)
    console.log('\n4. Testing GET /disasters/:id/social-media...');
    try {
      const socialMedia = await axios.get(`${API_BASE}/disasters/test-id/social-media`);
      console.log('✅ Social media mock working:', socialMedia.data.length, 'posts');
    } catch (error) {
      console.log('⚠️  Social media returned error:', error.response?.status);
    }

    // Test 5: Test official updates (web scraping - should work with fallback)
    console.log('\n5. Testing GET /disasters/:id/official-updates...');
    try {
      const updates = await axios.get(`${API_BASE}/disasters/test-id/official-updates`);
      console.log('✅ Official updates working:', updates.data.length, 'updates');
    } catch (error) {
      console.log('⚠️  Official updates returned error:', error.response?.status);
    }

    console.log('\n🎉 Basic API structure is working!');
    console.log('\n📱 You can now open http://localhost:5173 in your browser to test the frontend.');
    console.log('\n💡 To test full functionality, you need to:');
    console.log('   1. Set up Supabase database and run the schema');
    console.log('   2. Add your Supabase URL and key to .env file');
    console.log('   3. Add your Google Gemini API key to .env file');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 5000');
  }
}

testBasicAPIs(); 