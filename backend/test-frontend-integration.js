const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Frontend Integration Flow...\n');

  try {
    // Step 1: Create a disaster
    console.log('1. Creating a disaster...');
    const disasterResponse = await axios.post(`${API_BASE}/disasters`, {
      title: 'Test NYC Flood',
      description: 'Heavy flooding in Manhattan, NYC. Streets are submerged and power outages reported.',
      tags: ['flood', 'urgent']
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'netrunnerX'
      }
    });

    const disaster = disasterResponse.data;
    console.log(`   ✅ Disaster created: ${disaster.title} (ID: ${disaster.id})`);

    // Step 2: Test geocoding
    console.log('\n2. Testing geocoding...');
    const geocodeResponse = await axios.post(`${API_BASE}/geocode`, {
      description: disaster.description
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const geocode = geocodeResponse.data;
    console.log(`   ✅ Geocoding result: ${geocode.location_name} (${geocode.lat}, ${geocode.lon})`);

    // Step 3: Test social media
    console.log('\n3. Testing social media...');
    const socialResponse = await axios.get(`${API_BASE}/disasters/${disaster.id}/social-media`);
    console.log(`   ✅ Social media posts: ${socialResponse.data.length} posts`);

    // Step 4: Test official updates
    console.log('\n4. Testing official updates...');
    const updatesResponse = await axios.get(`${API_BASE}/disasters/${disaster.id}/official-updates`);
    console.log(`   ✅ Official updates: ${updatesResponse.data.length} updates`);

    // Step 5: Test resources (with geocoded coordinates)
    console.log('\n5. Testing resources...');
    const resourcesResponse = await axios.get(`${API_BASE}/disasters/${disaster.id}/resources?lat=${geocode.lat}&lon=${geocode.lon}`);
    console.log(`   ✅ Resources found: ${resourcesResponse.data.length} resources`);

    // Step 6: Test image verification
    console.log('\n6. Testing image verification...');
    const verifyResponse = await axios.post(`${API_BASE}/disasters/${disaster.id}/verify-image`, {
      image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Image verification: ${verifyResponse.data.status}`);

    // Step 7: Submit a report
    console.log('\n7. Testing report submission...');
    const reportResponse = await axios.post(`${API_BASE}/disasters/${disaster.id}/reports`, {
      content: 'Need immediate assistance in Lower East Side. Water rising fast!',
      image_url: 'https://example.com/flood.jpg'
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'citizen1'
      }
    });
    console.log(`   ✅ Report submitted: ${reportResponse.data.content.substring(0, 50)}...`);

    console.log('\n🎉 All tests passed! Your system is working correctly.');
    console.log('\n📱 You can now test the frontend at http://localhost:5173');
    console.log('   - The disaster should appear in the list');
    console.log('   - You can click on it to see all the data');
    console.log('   - Try the Admin Tools for geocoding and resource finding');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n💡 Common issues:');
      console.log('   - Check if your .env file has the required API keys');
      console.log('   - Make sure the database schema is set up in Supabase');
      console.log('   - Verify the backend server is running properly');
    }
  }
}

async function runIntegrationTest() {
  console.log('🚀 Starting Frontend Integration Test...\n');
  
  // Check if backend is running
  try {
    await axios.get(`${API_BASE}/`);
    console.log('✅ Backend is running');
  } catch (error) {
    console.log('❌ Backend is not running. Please start it with: npm run dev');
    return;
  }
  
  await testCompleteFlow();
}

runIntegrationTest().catch(console.error); 