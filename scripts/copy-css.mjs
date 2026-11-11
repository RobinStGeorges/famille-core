import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
copyFileSync('src/theme.css', 'dist/theme.css');
console.log('theme.css copié dans dist/');
