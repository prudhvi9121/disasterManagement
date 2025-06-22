require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const supabase = require('./services/supabase');
const disastersRouter = require('./routes/disasters');
const geocodeRouter = require('./routes/geocode');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Rate limiting middleware
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

// Make services available to routes
app.set('io', io);

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Placeholder route
app.get('/', (req, res) => {
  res.send('Disaster Response Coordination Platform Backend Running');
});

app.use('/disasters', disastersRouter);
app.use('/geocode', geocodeRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 