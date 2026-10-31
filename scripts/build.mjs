import 'dotenv/config';
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

mkdirSync(join(root, 'dist'), { recursive: true });

// Build client entries
const entries = [
  join(root, 'src/entries/sign-in.js'),
  join(root, 'src/entries/onboarding.js'),
  join(root, 'src/entries/dashboard.js'),
  join(root, 'src/entries/courses.js'),
  join(root, 'src/entries/resources.js'),
  join(root, 'src/entries/forum.js'),
  join(root, 'src/entries/mentors.js'),
  join(root, 'src/entries/tools.js'),
  join(root, 'src/entries/profile.js'),
  join(root, 'src/entries/home.js'),
  join(root, 'src/entries/hire-marketers.js'),
  join(root, 'src/entries/marketer-profile.js'),
  join(root, 'src/entries/events.js'),
  join(root, 'src/entries/submit-event.js'),
  join(root, 'src/entries/blog.js'),
  join(root, 'src/entries/newsletter.js'),
  join(root, 'src/entries/admin-dashboard.js'),
  join(root, 'src/entries/admin-panel.js'),
  join(root, 'src/entries/saved-resources.js'),
];

for (const entry of entries) {
  if (existsSync(entry)) {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      outfile: join(root, 'dist/assets/js', entry.split('/').pop().replace('.js', '.bundle.js')),
      define: {
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY || ''),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || ''),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID || ''),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID || ''),
      }
    });
  }
}

// Copy HTML files
const htmlFiles = [
  'index.html', 'sign-in.html', 'onboarding.html', 'dashboard.html', 
  'courses.html', 'course-view.html', 'resources.html', 
  'forum.html', 'forum-thread.html', 'mentors.html', 'tools.html', 'profile.html',
  'hire-marketers.html', 'marketer-profile.html', 'events.html', 'submit-event.html',
  'blog.html', 'newsletter.html', 'admin-dashboard.html', 'admin-panel.html', 'saved-resources.html'
];
for (const f of htmlFiles) {
  if (existsSync(join(root, 'public', f))) {
    cpSync(join(root, 'public', f), join(root, 'dist', f));
  }
}

// Copy styles
if (existsSync(join(root, 'src/styles'))) {
  mkdirSync(join(root, 'dist/styles'), { recursive: true });
  cpSync(join(root, 'src/styles/main.css'), join(root, 'dist/styles/main.css'));
  cpSync(join(root, 'src/styles/tokens.css'), join(root, 'dist/styles/tokens.css'));
}

// Copy assets
if (existsSync(join(root, 'public/assets'))) {
  mkdirSync(join(root, 'dist/assets'), { recursive: true });
  cpSync(join(root, 'public/assets'), join(root, 'dist/assets'), { recursive: true });
}

console.log('Build complete');
