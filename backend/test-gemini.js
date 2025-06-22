const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Integration...\n');

  // Check if API key is set
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key') {
    console.log('❌ Gemini API key not found or not set properly');
    console.log('💡 Please:');
    console.log('   1. Get a Gemini API key from https://aistudio.google.com/app/apikey');
    console.log('   2. Add it to your .env file as GEMINI_API_KEY=your_key_here');
    console.log('   3. Restart the backend server');
    return;
  }

  console.log('✅ Gemini API key found');
  console.log(`   Key: ${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}`);

  const testCases = [
    {
      name: 'Location Extraction',
      prompt: `Extract the specific location name from this disaster description. Return only the location name, nothing else. If no specific location is mentioned, return "Unknown Location".

Description: Heavy flooding in Manhattan, NYC. Streets are submerged and power outages reported.

Examples:
- "Heavy flooding in Manhattan" → "Manhattan"
- "Wildfire spreading in Los Angeles County" → "Los Angeles"
- "Tornado touchdown in Dallas suburbs" → "Dallas"
- "Earthquake in Tokyo" → "Tokyo"

Location:`,
      expected: 'Manhattan'
    },
    {
      name: 'Kakinada Location Extraction',
      prompt: `Extract the specific location name from this disaster description. Return only the location name, nothing else. If no specific location is mentioned, return "Unknown Location".

Description: Heavy flooding in Kakinada, Andrapradesh. Streets are submerged and power outages reported.

Examples:
- "Heavy flooding in Manhattan" → "Manhattan"
- "Wildfire spreading in Los Angeles County" → "Los Angeles"
- "Tornado touchdown in Dallas suburbs" → "Dallas"
- "Earthquake in Tokyo" → "Tokyo"

Location:`,
      expected: 'Kakinada'
    },
    {
      name: 'Image Verification',
      prompt: `Analyze this image for disaster response verification. Answer the following questions:

1. Does this image show a real disaster or emergency situation?
2. Are there any signs of digital manipulation, AI generation, or fake content?
3. Is the image contextually relevant to disaster response?
4. What type of disaster or emergency is shown (if any)?

Provide a detailed analysis and then give a final verification status: "verified" (real disaster image), "unverified" (fake/manipulated/irrelevant), or "uncertain" (cannot determine).

Be thorough in your analysis.`,
      expected: 'Analysis provided'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}. Testing: ${testCase.name}`);
    
    try {
      // Test different Gemini models
      const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];
      
      for (const model of models) {
        try {
          console.log(`   Trying model: ${model}`);
          
          const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          
          const response = await axios.post(geminiUrl, {
            contents: [
              {
                parts: [
                  {
                    text: testCase.prompt
                  }
                ]
              }
            ]
          }, {
            timeout: 15000,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          
          if (result) {
            console.log(`   ✅ ${model} - Success!`);
            console.log(`   Response: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
            
            if (testCase.name === 'Location Extraction') {
              if (result.toLowerCase().includes(testCase.expected.toLowerCase())) {
                console.log(`   🎯 Correctly extracted: ${testCase.expected}`);
              } else {
                console.log(`   ⚠️  Expected: ${testCase.expected}, Got: ${result}`);
              }
            }
            
            break; // If this model works, don't try others
          } else {
            console.log(`   ❌ ${model} - No response text`);
          }
          
        } catch (modelError) {
          console.log(`   ❌ ${model} - Failed: ${modelError.response?.data?.error?.message || modelError.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Test image verification with a real image
  console.log('\n4. Testing Image Verification with Real Image...');
  try {
    const imageUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb';
    
    // Download the image
    const imageResponse = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
    const mimeType = imageResponse.headers['content-type'];
    
    console.log(`   Image downloaded: ${mimeType}, ${imageBuffer.length} bytes`);
    
    // Try Gemini Vision API
    const visionUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const visionResponse = await axios.post(visionUrl, {
      contents: [
        {
          parts: [
            {
              text: "Analyze this image for disaster context. Is it related to flooding, fire, or other emergency?"
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBuffer.toString('base64')
              }
            }
          ]
        }
      ]
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const visionResult = visionResponse.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (visionResult) {
      console.log(`   ✅ Image analysis successful!`);
      console.log(`   Analysis: ${visionResult.substring(0, 200)}${visionResult.length > 200 ? '...' : ''}`);
    } else {
      console.log(`   ❌ No image analysis response`);
    }
    
  } catch (error) {
    console.log(`   ❌ Image verification failed: ${error.response?.data?.error?.message || error.message}`);
  }

  console.log('\n🎯 Gemini API Test Summary:');
  console.log('   - If you see ✅ Success messages, your API key is working');
  console.log('   - If you see ❌ Failed messages, check your API key or model names');
  console.log('   - Different models may work differently (gemini-1.5-flash, gemini-2.0-flash, gemini-pro)');
  console.log('\n💡 Next steps:');
  console.log('   1. If tests pass, your geocoding and image verification will work');
  console.log('   2. If tests fail, double-check your API key and restart the server');
  console.log('   3. Try the complete integration test: node test-frontend-integration.js');
}

async function runGeminiTest() {
  console.log('🚀 Starting Gemini API Test...\n');
  await testGeminiAPI();
}

runGeminiTest().catch(console.error); 