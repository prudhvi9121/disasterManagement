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
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const cacheKey = `geocode:${description}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logAction('Geocoding cache hit', { description });
      return res.json(cached);
    }

    logAction('Geocoding started', { description });

    let location_name = 'Unknown Location';

    // Step 1: Try Gemini API first, fallback to keyword extraction
    if (GEMINI_API_KEY) {
      try {
        const prompt = `Extract the specific location name from this disaster description. Return only the location name, nothing else. If no specific location is mentioned, return "Unknown Location".

Description: ${description}

Examples:
- "Heavy flooding in Manhattan" → "Manhattan"
- "Wildfire spreading in Los Angeles County" → "Los Angeles"
- "Tornado touchdown in Dallas suburbs" → "Dallas"
- "Earthquake in Tokyo" → "Tokyo"

Location:`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        location_name = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Unknown Location';
        logAction('Gemini API location extraction successful', { location_name });
        
      } catch (geminiError) {
        logAction('Gemini API failed, using fallback extraction', { 
          error: geminiError.message,
          description 
        });
        
        // Fallback to keyword extraction
        location_name = extractLocationFromKeywords(description);
      }
    } else {
      // No API key, use keyword extraction
      location_name = extractLocationFromKeywords(description);
    }

    // Step 2: Geocode location name using OpenStreetMap Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location_name)}&format=json&limit=1`;
      logAction('Attempting geocoding', { url, location_name });
      
      const geoRes = await axios.get(url, {
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        },
        timeout: 10000
      });

      logAction('Geocoding response received', { 
        status: geoRes.status, 
        dataLength: geoRes.data?.length || 0 
      });

      const geo = geoRes.data[0];
      if (!geo) {
        logAction('Geocoding failed - location not found', { location_name });
        throw new Error('Location not found in geocoding service');
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
      
    } catch (geoError) {
      logAction('OpenStreetMap geocoding failed', { 
        location_name, 
        error: geoError.message,
        status: geoError.response?.status
      });
      
      // Return fallback coordinates for common locations
      const fallbackCoords = {
        'manhattan': { lat: 40.7589, lon: -73.9851 },
        'nyc': { lat: 40.7128, lon: -74.0060 },
        'new york': { lat: 40.7128, lon: -74.0060 },
        'los angeles': { lat: 34.0522, lon: -118.2437 },
        'dallas': { lat: 32.7767, lon: -96.7970 },
        'chicago': { lat: 41.8781, lon: -87.6298 },
        'miami': { lat: 25.7617, lon: -80.1918 },
        'kakinada': { lat: 16.9891, lon: 82.2475 },
        'andhra pradesh': { lat: 15.9129, lon: 79.7400 },
        'andrapradesh': { lat: 15.9129, lon: 79.7400 },
        'india': { lat: 20.5937, lon: 78.9629 }
      };
      
      // Try to find a fallback match by checking if any part of the location name matches
      let fallback = null;
      const locationLower = location_name.toLowerCase();
      logAction('Finding fallback', { locationLower });

      // First try exact match
      if (fallbackCoords[locationLower]) {
        fallback = fallbackCoords[locationLower];
        logAction('Fallback exact match found', { locationLower });
      } else {
        // Try matching individual words
        const words = locationLower.split(/[,\s]+/).filter(word => word.length > 0);
        logAction('Fallback checking words', { words });
        for (const word of words) {
          if (fallbackCoords[word]) {
            fallback = fallbackCoords[word];
            logAction('Fallback word match found', { word, fallback });
            break;
          }
        }
      }
      
      if (fallback) {
        const result_data = {
          location_name,
          lat: fallback.lat,
          lon: fallback.lon,
          display_name: location_name,
          confidence: 0.3,
          fallback: true,
          error: geoError.message
        };
        
        await setCache(cacheKey, result_data, 3600);
        logAction('Using fallback coordinates', { 
          location_name, 
          lat: fallback.lat, 
          lon: fallback.lon 
        });
        res.json(result_data);
      } else {
        // If no fallback found, return a generic location
        const result_data = {
          location_name,
          lat: 0,
          lon: 0,
          display_name: location_name,
          confidence: 0.1,
          fallback: true,
          error: 'No coordinates available for this location'
        };
        
        await setCache(cacheKey, result_data, 3600);
        logAction('No fallback coordinates available', { location_name });
        res.json(result_data);
      }
    }
    
  } catch (err) {
    logAction('Geocoding error', { error: err.message });
    res.status(500).json({ error: 'Geocoding failed', details: err.message });
  }
});

// Helper function for keyword-based location extraction
function extractLocationFromKeywords(description) {
  const locationKeywords = [
    'manhattan', 'nyc', 'new york', 'los angeles', 'la', 'california', 'dallas', 'texas',
    'chicago', 'illinois', 'miami', 'florida', 'seattle', 'washington', 'boston', 'massachusetts',
    'philadelphia', 'pennsylvania', 'phoenix', 'arizona', 'san antonio', 'houston', 'austin',
    'san diego', 'denver', 'colorado', 'atlanta', 'georgia', 'nashville', 'tennessee',
    'kakinada', 'andhra pradesh', 'andrapradesh', 'india'
  ];
  
  const descriptionLower = description.toLowerCase();
  for (const keyword of locationKeywords) {
    if (descriptionLower.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  // If no keyword found, try to extract any capitalized words that might be locations
  const words = description.split(' ');
  for (const word of words) {
    if (word.length > 2 && word[0] === word[0].toUpperCase() && /^[A-Za-z]+$/.test(word)) {
      return word;
    }
  }
  
  return 'Unknown Location';
}

module.exports = router;
