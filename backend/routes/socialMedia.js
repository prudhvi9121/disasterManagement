const express = require('express');
const router = express.Router({ mergeParams: true });
const { getCache, setCache } = require('../services/cache');
const { logAction } = require('../services/logger');

// Attach Socket.IO from app
let io;
router.use((req, res, next) => {
  if (!io && req.app.get('io')) io = req.app.get('io');
  next();
});

function classifyPriority(post) {
  const urgentWords = ['urgent', 'sos', 'emergency', 'help', 'immediate', 'critical', 'trapped', 'rescue'];
  const highPriorityWords = ['evacuate', 'flooding', 'fire', 'danger', 'warning', 'shelter', 'medical'];
  const text = post.post.toLowerCase();
  
  // Check for urgent keywords
  for (const word of urgentWords) {
    if (text.includes(word)) {
      return { ...post, priority: 'urgent', priority_reason: `Contains urgent keyword: ${word}` };
    }
  }
  
  // Check for high priority keywords
  for (const word of highPriorityWords) {
    if (text.includes(word)) {
      return { ...post, priority: 'high', priority_reason: `Contains high priority keyword: ${word}` };
    }
  }
  
  return { ...post, priority: 'normal', priority_reason: 'Standard post' };
}

function generateMockSocialMediaData(disasterId) {
  // Generate realistic disaster-related social media posts
  const mockPosts = [
    {
      post: '#floodrelief Need immediate assistance in Lower East Side. Water rising fast!',
      user: 'citizen1',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'SOS! Trapped in apartment building on 2nd floor. Water at door level. Please help!',
      user: 'citizen2',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Evacuating area near Manhattan Bridge. Emergency services on scene.',
      user: 'citizen3',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Red Cross shelter open at PS 188. Food and medical assistance available.',
      user: 'relief_worker1',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Bellevue Hospital accepting emergency cases. Ambulances available for transport.',
      user: 'medical_team',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Power outage affecting 10 blocks in East Village. Stay safe everyone!',
      user: 'citizen4',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Critical: Elderly residents need evacuation assistance on 5th floor, 123 Main St.',
      user: 'neighbor_help',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    },
    {
      post: 'Food distribution center set up at Union Square. Bring containers.',
      user: 'community_org',
      platform: 'twitter',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    }
  ];

  return mockPosts.map(classifyPriority);
}

// GET /disasters/:id/social-media
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `social:${id}`;
    
    const cached = await getCache(cacheKey);
    if (cached) {
      logAction('Social media cache hit', { disaster_id: id });
      return res.json(cached);
    }

    logAction('Social media fetch started', { disaster_id: id });
    
    // Generate mock data with priority classification
    const data = generateMockSocialMediaData(id);
    
    // Cache for 15 minutes (social media updates frequently)
    await setCache(cacheKey, data, 900);
    
    // Emit real-time update
    if (io) {
      io.emit('social_media_updated', { disaster_id: id, data });
      logAction('Social media WebSocket update sent', { disaster_id: id, post_count: data.length });
    }
    
    logAction('Social media fetch completed', { 
      disaster_id: id, 
      post_count: data.length,
      urgent_count: data.filter(p => p.priority === 'urgent').length,
      high_count: data.filter(p => p.priority === 'high').length
    });
    
    res.json(data);
  } catch (err) {
    logAction('Social media fetch error', { disaster_id: req.params.id, error: err.message });
    res.status(500).json({ error: 'Failed to fetch social media posts', details: err.message });
  }
});

module.exports = router; 