const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testAPIs() {
  console.log('🧪 Testing Disaster Response Platform APIs...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${API_BASE}/`);
    console.log('✅ Backend is running:', health.data);

    // Test 2: Get disasters (should be empty initially)
    console.log('\n2. Testing GET /disasters...');
    const disasters = await axios.get(`${API_BASE}/disasters`);
    console.log('✅ Disasters endpoint working:', disasters.data);

    // Test 3: Create a disaster
    console.log('\n3. Testing POST /disasters...');
    const newDisaster = await axios.post(`${API_BASE}/disasters`, {
      title: 'Test NYC Flood',
      description: 'Heavy flooding in Manhattan area',
      tags: ['flood', 'urgent']
    }, {
      headers: { 'x-user-id': 'netrunnerX' }
    });
    console.log('✅ Disaster created:', newDisaster.data.title);

    // Test 4: Get disasters again (should have one now)
    console.log('\n4. Testing GET /disasters (after creation)...');
    const disastersAfter = await axios.get(`${API_BASE}/disasters`);
    console.log('✅ Disasters count:', disastersAfter.data.length);

    // Test 5: Test geocoding
    console.log('\n5. Testing POST /geocode...');
    const geocode = await axios.post(`${API_BASE}/geocode`, {
      description: 'Heavy flooding in Manhattan, NYC'
    });
    console.log('✅ Geocoding result:', geocode.data.location_name);

    // Test 6: Test social media (mock)
    console.log('\n6. Testing GET /disasters/:id/social-media...');
    const socialMedia = await axios.get(`${API_BASE}/disasters/${newDisaster.data.id}/social-media`);
    console.log('✅ Social media posts:', socialMedia.data.length);

    // Test 7: Test official updates (web scraping)
    console.log('\n7. Testing GET /disasters/:id/official-updates...');
    const updates = await axios.get(`${API_BASE}/disasters/${newDisaster.data.id}/official-updates`);
    console.log('✅ Official updates:', updates.data.length);

    console.log('\n🎉 All API tests passed! The backend is working correctly.');
    console.log('\n📱 You can now open http://localhost:5173 in your browser to test the frontend.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Backend server is running on port 5000');
    console.log('   - Environment variables are set (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY)');
    console.log('   - Database schema has been run in Supabase');
  }
}

testAPIs(); 