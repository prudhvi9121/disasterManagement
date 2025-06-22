const express = require('express');
const router = express.Router({ mergeParams: true });
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getCache, setCache } = require('../services/cache');
const { logAction } = require('../services/logger');
require('dotenv').config();

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /disasters/:id/verify-image
router.post('/', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url } = req.body;
    
    if (!image_url) return res.status(400).json({ error: 'image_url required' });
    
    const cacheKey = `verify:${id}:${image_url}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logAction('Image verification cache hit', { disaster_id: id, image_url });
      return res.json(cached);
    }

    logAction('Image verification started', { disaster_id: id, image_url });

    // 1. Fetch the image data from the URL
    const imageResponse = await axios.get(image_url, { 
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'DisasterResponsePlatform/1.0'
      }
    });
    
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
    const mimeType = imageResponse.headers['content-type'];
    
    if (!mimeType || !mimeType.startsWith('image/')) {
      logAction('Image verification failed - invalid image', { image_url, mimeType });
      return res.status(400).json({ error: 'URL does not point to a valid image' });
    }

    // 2. Use Gemini Vision API for image analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze this image for disaster response verification. Answer the following questions:

1. Does this image show a real disaster or emergency situation?
2. Are there any signs of digital manipulation, AI generation, or fake content?
3. Is the image contextually relevant to disaster response?
4. What type of disaster or emergency is shown (if any)?

Provide a detailed analysis and then give a final verification status: "verified" (real disaster image), "unverified" (fake/manipulated/irrelevant), or "uncertain" (cannot determine).

Be thorough in your analysis.`;

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBuffer.toString('base64')
          }
        }
      ]);

      const analysis = result.response.text().trim();
      
      // Determine verification status based on analysis
      let status = 'uncertain';
      const analysisLower = analysis.toLowerCase();
      
      if (analysisLower.includes('verified') || (analysisLower.includes('real') && !analysisLower.includes('fake'))) {
        status = 'verified';
      } else if (analysisLower.includes('unverified') || analysisLower.includes('fake') || 
                 analysisLower.includes('manipulated') || analysisLower.includes('generated')) {
        status = 'unverified';
      }

      const verificationResult = {
        image_url,
        status,
        analysis,
        disaster_id: id,
        verified_at: new Date().toISOString()
      };

      await setCache(cacheKey, verificationResult, 3600); // Cache for 1 hour
      logAction('Image verification completed', { 
        disaster_id: id, 
        image_url, 
        status,
        analysis_length: analysis.length 
      });
      
      res.json(verificationResult);
      
    } catch (geminiError) {
      logAction('Gemini API image verification failed', { 
        disaster_id: id, 
        image_url, 
        error: geminiError.message 
      });
      
      // Fallback: Return uncertain status with error message
      const verificationResult = {
        image_url,
        status: 'uncertain',
        analysis: 'Image verification service temporarily unavailable. Please verify manually.',
        disaster_id: id,
        verified_at: new Date().toISOString(),
        error: 'Gemini API unavailable'
      };
      
      await setCache(cacheKey, verificationResult, 1800); // Cache for 30 minutes
      res.json(verificationResult);
    }
  } catch (err) {
    logAction('Image verification error', { 
      disaster_id: req.params.id, 
      image_url: req.body.image_url, 
      error: err.message 
    });
    
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(400).json({ error: 'Invalid image URL or network error' });
    }
    
    res.status(500).json({ error: 'Image verification failed', details: err.message });
  }
});

module.exports = router; 