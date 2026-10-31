import { initFirebase } from '../services/firebase.js';
import { getAuth } from 'firebase/auth';
import { usingServer } from '../services/api.js';
import '../styles/main.css';

initFirebase();
const auth = getAuth();

// The AI tools need the server to keep the OpenAI key secret; the live site has no server yet.
window.toolsAvailable = usingServer;

window.getToken = async function() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/tools.html';
    throw new Error('Not authenticated');
  }
  return await user.getIdToken();
};

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/tools.html';
  }
});
