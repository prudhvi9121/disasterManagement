const express = require('express');
const router = express.Router({ mergeParams: true });
const supabase = require('../services/supabase');
const { logAction } = require('../services/logger');
const mockAuth = require('../middleware/auth');

router.use(mockAuth);

// POST /disasters/:id/reports
router.post('/', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, image_url } = req.body;
    const user_id = req.user.id;
    const verification_status = 'pending';
    const { data, error } = await supabase.from('reports').insert([
      { disaster_id: id, user_id, content, image_url, verification_status }
    ]).select('*').single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    logAction('Report created', { disaster_id: id, user_id });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

function classifyPriority(report) {
  const urgentWords = ['urgent', 'sos', 'emergency', 'help', 'immediate'];
  const text = report.content?.toLowerCase() || '';
  for (const word of urgentWords) {
    if (text.includes(word)) return { ...report, priority: 'high' };
  }
  return { ...report, priority: 'normal' };
}

// GET /disasters/:id/reports
router.get('/', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('reports').select('*').eq('disaster_id', id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    const classified = data.map(classifyPriority);
    res.json(classified);
  } catch (err) {
    next(err);
  }
});

module.exports = router; 