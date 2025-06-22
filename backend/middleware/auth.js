const users = {
  netrunnerX: { id: 'netrunnerX', role: 'admin' },
  reliefAdmin: { id: 'reliefAdmin', role: 'admin' },
  citizen1: { id: 'citizen1', role: 'contributor' },
};

function mockAuth(req, res, next) {
  const userId = req.headers['x-user-id'] || 'netrunnerX';
  req.user = users[userId] || users['netrunnerX'];
  next();
}

module.exports = mockAuth; 