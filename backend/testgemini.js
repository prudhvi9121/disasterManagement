const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getCache, setCache } = require('../services/cache');
const { logAction } = require('../services/logger');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// POST /geocode
router.post('/', async (req, res) => {
  try {
    const { description } = "Heavy flooding in Manhattan";
    if (!description) return res.status(400).json({ error: 'Description required' });

    const cacheKey = `geocode:${description}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logAction('Geocoding cache hit', { description });
      return res.json(cached);
    }

    logAction('Geocoding started', { description });

    // Step 1: Use Gemini API (raw fetch via axios)
    const prompt = `Extract the specific location name from this disaster description. Return only the location name, nothing else. If no specific location is mentioned, return "Unknown Location".

Description: ${description}

Examples:
- "Heavy flooding in Manhattan" → "Manhattan"
- "Wildfire spreading in Los Angeles County" → "Los Angeles"
- "Tornado touchdown in Dallas suburbs" → "Dallas"
- "Earthquake in Tokyo" → "Tokyo"

Location:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await axios.post(geminiUrl, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const location_name = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Unknown Location';
    logAction('Gemini API location extraction successful', { location_name });
    // Step 2: Geocode location name using OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location_name)}&format=json&limit=1`;
    const geoRes = await axios.get(url, {
      headers: {
        'User-Agent': 'DisasterResponsePlatform/1.0'
      }
    });

    const geo = geoRes.data[0];
    if (!geo) {
      logAction('Geocoding failed - location not found', { location_name });
      return res.status(404).json({ error: 'Location not found', location_name });
    }

    const result_data = {
      location_name,
      lat: parseFloat(geo.lat),
      lon: parseFloat(geo.lon),
      display_name: geo.display_name,
      confidence: geo.importance || 0.5
    };

    await setCache(cacheKey, result_data, 3600); // Cache for 1 hour
    logAction('Geocoding completed', {
      location_name,
      lat: result_data.lat,
      lon: result_data.lon
    });

    res.json(result_data);
  } catch (err) {
    logAction('Geocoding error', { error: err.message });
    res.status(500).json({ error: 'Geocoding failed', details: err.message });
  }
});

module.exports = router;
