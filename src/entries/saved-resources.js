import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api, whenAuthReady } from '../services/api.js';
import { esc } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();

async function load() {
  try {
    const user = await whenAuthReady();
    if (!user) { window.location.href = '/sign-in.html?returnTo=/saved-resources.html'; return; }
    const { data } = await api('/api/users/saved');
    const artEl = document.getElementById('saved-articles');
    const evEl = document.getElementById('saved-events');
    if (artEl) artEl.innerHTML = (data.savedArticles||[]).map(id=>`<div class="card"><h3>${esc(id)}</h3></div>`).join('') || '<p style="color:var(--text-muted);">None</p>';
    if (evEl) evEl.innerHTML = (data.savedEvents||[]).map(id=>`<div class="card"><h3>${esc(id)}</h3></div>`).join('') || '<p style="color:var(--text-muted);">None</p>';
  } catch(e) {}
}
load();
