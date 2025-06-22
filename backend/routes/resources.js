const express = require('express');
const router = express.Router({ mergeParams: true });
const supabase = require('../services/supabase');
const mockAuth = require('../middleware/auth');

// Attach Socket.IO from app
let io;
router.use((req, res, next) => {
  if (!io && req.app.get('io')) io = req.app.get('io');
  next();
});

router.use(mockAuth);

// GET /disasters/:id/resources?lat=...&lon=...
router.get('/', async (req, res) => {
  const { id } = req.params;
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  // Geospatial query: resources within 10km
  const { data, error } = await supabase.rpc('get_resources_nearby', {
    disaster_id: id,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    radius: 10000
  });
  if (error) return res.status(400).json({ error: error.message });
  if (io) io.emit('resources_updated', { disaster_id: id, data });
  res.json(data);
});

// POST /disasters/:id/resources
router.post('/', async (req, res) => {
  const { id } = req.params;
  const { name, location_name, location, type } = req.body;
  const { data, error } = await supabase.from('resources').insert([
    { disaster_id: id, name, location_name, location, type }
  ]).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router; 