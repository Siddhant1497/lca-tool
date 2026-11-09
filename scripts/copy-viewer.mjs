// Copies the single-file client view into public/ so the main app can serve it as a template.
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public', { recursive: true });
copyFileSync('build-viewer/viewer.html', 'public/client-view-template.html');
console.log('client view template → public/client-view-template.html');
