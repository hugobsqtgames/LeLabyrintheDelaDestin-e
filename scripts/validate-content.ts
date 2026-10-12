/**
 * Validation du contenu narratif en ligne de commande : npm run validate
 */
import { CONTENT } from '../src/content';
import { validateContent } from '../src/engine/validator';

const issues = validateContent(CONTENT);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const i of issues) {
  console.log(`${i.level === 'error' ? 'ERREUR ' : 'avert. '} ${i.scene ? `[${i.scene}] ` : ''}${i.message}`);
}
const scenes = Object.values(CONTENT.scenes);
console.log(
  `\n${scenes.length} scènes, ${scenes.reduce((n, s) => n + s.choices.length, 0)} choix, ` +
    `${Object.keys(CONTENT.endings).length} fins — ${errors.length} erreur(s), ${warnings.length} avertissement(s).`,
);
process.exit(errors.length ? 1 : 0);
