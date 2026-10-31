const admin = require('firebase-admin');
const { MockFirestore } = require('./mockFirestore');

let adminApp;
const mockDb = new MockFirestore();

function getAdmin() {
  if (!adminApp) {
    if (!admin.apps.length) {
      if (process.env.NODE_ENV !== 'production') {
        try {
          adminApp = admin.initializeApp({ projectId: 'marketers-club' });
        } catch (e) {
          adminApp = { firestore: () => mockDb };
        }
      } else {
        try {
          adminApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'marketers-club'
          });
        } catch (e) {
          adminApp = admin.initializeApp({ projectId: 'marketers-club' });
        }
      }
    } else {
      adminApp = admin.app();
    }
  }
  
  // In dev, use mock. Keep FieldValue statics on the function so
  // getAdmin().firestore.FieldValue.serverTimestamp() still works.
  if (process.env.NODE_ENV !== 'production') {
    const mockFirestoreFn = function() {
      return mockDb;
    };
    mockFirestoreFn.FieldValue = mockDb.FieldValue;
    adminApp.firestore = mockFirestoreFn;
  }
  
  return admin;
}

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    
    // Dev bypass for local testing
    if ((process.env.NODE_ENV !== 'production') && (token === 'dev' || token === 'test' || !process.env.NODE_ENV)) {
      req.user = { uid: 'dev-user', email: 'dev@example.com', role: 'admin' };
      return next();
    }
    
    try {
      const decoded = await getAdmin().auth().verifyIdToken(token);
      req.user = decoded;
      next();
    } catch (err) {
      // In dev, if token verification fails but looks like a Firebase token, try more lenient check
      if (process.env.NODE_ENV !== 'production') {
        // Try to decode without verification as last resort for dev
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            if (payload.user_id || payload.sub) {
              req.user = { uid: payload.user_id || payload.sub, ...payload };
              return next();
            }
          }
        } catch (_) {}
      }
      return res.status(401).json({ error: 'unauthorized' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

module.exports = { verifyToken, getAdmin };
