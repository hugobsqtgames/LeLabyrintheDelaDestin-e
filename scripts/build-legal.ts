/**
 * Régénère les pages publiques (docs/) depuis src/legal/privacy.ts.
 *
 *   npm run legal
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { legalPages, PUBLIC_URLS } from './legal-pages';

const docs = join(__dirname, '..', 'docs');
for (const [file, text] of Object.entries(legalPages())) writeFileSync(join(docs, file), text);
console.log(`Pages écrites dans docs/ :\n  ${Object.keys(legalPages()).join('\n  ')}`);
console.log(`Adresses une fois GitHub Pages activé :\n  confidentialité ${PUBLIC_URLS.privacyFr}\n  privacy ${PUBLIC_URLS.privacyEn}\n  assistance ${PUBLIC_URLS.support}`);
