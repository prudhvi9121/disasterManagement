const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { logAction } = require('../services/logger');
const mockAuth = require('../middleware/auth');

const reportsRouter = require('./reports');
const socialMediaRouter = require('./socialMedia');
const resourcesRouter = require('./resources');
const updatesRouter = require('./updates');
const verifyImageRouter = require('./verifyImage');

// Attach Socket.IO from app
let io;
router.use((req, res, next) => {
  if (!io && req.app.get('io')) io = req.app.get('io');
  next();
});

router.use(mockAuth);

// Nested Routers
router.use('/:id/reports', reportsRouter);
router.use('/:id/social-media', socialMediaRouter);
router.use('/:id/resources', resourcesRouter);
router.use('/:id/official-updates', updatesRouter);
router.use('/:id/verify-image', verifyImageRouter);

// POST /disasters
router.post('/', async (req, res, next) => {
  try {
    const { title, location_name, location, description, tags } = req.body;
    const owner_id = req.user.id;
    const audit_trail = [{ action: 'create', user_id: owner_id, timestamp: new Date().toISOString() }];
    const { data, error } = await supabase.from('disasters').insert([
      { title, location_name, location, description, tags, owner_id, audit_trail }
    ]).select('*').single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    logAction('Disaster created', { title, owner_id });
    if (io) io.emit('disaster_updated', data);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /disasters
router.get('/', async (req, res, next) => {
  try {
    const { tag } = req.query;
    let query = supabase.from('disasters').select('*');
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /disasters/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, location_name, location, description, tags } = req.body;
    const user_id = req.user.id;
    // Fetch current audit trail
    const { data: current, error: fetchErr } = await supabase.from('disasters').select('audit_trail').eq('id', id).single();
    if (fetchErr) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    const audit_trail = current.audit_trail || [];
    audit_trail.push({ action: 'update', user_id, timestamp: new Date().toISOString() });
    const { data, error } = await supabase.from('disasters').update({ title, location_name, location, description, tags, audit_trail }).eq('id', id).select('*').single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    logAction('Disaster updated', { id, user_id });
    if (io) io.emit('disaster_updated', data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /disasters/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    // Fetch current audit trail
    const { data: current, error: fetchErr } = await supabase.from('disasters').select('audit_trail').eq('id', id).single();
    if (fetchErr) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    const audit_trail = current.audit_trail || [];
    audit_trail.push({ action: 'delete', user_id, timestamp: new Date().toISOString() });
    const { data, error } = await supabase.from('disasters').update({ audit_trail }).eq('id', id);
    if (error) {
      // If the update fails, we shouldn't proceed to delete
      return res.status(400).json({ error: error.message });
    }
    const { error: deleteError } = await supabase.from('disasters').delete().eq('id', id);
    if (deleteError) {
      // This is tricky, the audit log was updated but delete failed.
      // For now, we'll report the error. A transaction would be better.
      return res.status(400).json({ error: deleteError.message });
    }
    logAction('Disaster deleted', { id, user_id });
    if (io) io.emit('disaster_updated', { id, deleted: true });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;