import path from 'node:path';

/** Sesión Playwright (cookies + localStorage + IndexedDB de Firebase). */
export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
