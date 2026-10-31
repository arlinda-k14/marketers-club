require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyToken } = require('./middleware/auth');
const { claimSeededProfileMiddleware } = require('./lib/memberIdentity');

const app = express();
app.use(cors());
// Avatar uploads arrive as a resized data URL, larger than the default 100kb body limit.
app.use('/api/profile/me/avatar', express.json({ limit: '3mb' }));
app.use(express.json());

const api = express.Router();

// Public routes
api.use('/marketers', require('./routes/marketers'));
api.use('/events', require('./routes/events'));
api.use('/articles', require('./routes/articles'));
api.use('/newsletter', require('./routes/newsletter'));
api.use('/contact', require('./routes/contact'));

// Member profile: signed-in member, or the local demo member in dev
api.use('/profile', require('./routes/profile'));

// Protected routes
api.use('/users', verifyToken, claimSeededProfileMiddleware, require('./routes/users'));
api.use('/resources', verifyToken, require('./routes/resources'));
api.use('/forum', verifyToken, require('./routes/forum'));
api.use('/mentors', verifyToken, require('./routes/mentors'));
api.use('/courses', verifyToken, require('./routes/courses'));
api.use('/progress', verifyToken, require('./routes/progress'));
api.use('/certificates', verifyToken, require('./routes/certificates'));
api.use('/tools', verifyToken, require('./routes/tools'));
api.use('/waitlist', verifyToken, require('./routes/waitlist'));

app.use('/api', api);

// Serve built client assets from dist
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Marketers Club server listening on ${port}`);
});
