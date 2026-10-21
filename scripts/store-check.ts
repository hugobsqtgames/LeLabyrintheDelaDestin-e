/**
 * Vérifie la fiche App Store Connect (store/APP_STORE_CONNECT.md) : limites
 * de caractères d'Apple, aucune autre plateforme citée (règle 2.3.10), et
 * chiffres de la description conformes au contenu réel du jeu (règle 2.3.1).
 *
 *   npm run store:check
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { CONTENT } from '../src/content';

const md = readFileSync(join(__dirname, '..', 'store', 'APP_STORE_CONNECT.md'), 'utf8');
const errors: string[] = [];
const check = (label: string, text: string, max: number) => {
  const n = [...text].length;
  console.log(`${n <= max ? '✓' : '✗'} ${label} : ${n}/${max}`);
  if (n > max) errors.push(`${label} dépasse ${max} caractères (${n})`);
};
/** Bloc de citation qui suit un intitulé en gras. */
const quoteAfter = (title: string) => {
  const i = md.indexOf(title);
  if (i < 0) throw new Error(`Intitulé introuvable : ${title}`);
  const lines = md.slice(i).split('\n').slice(1);
  const start = lines.findIndex((l) => l.startsWith('>'));
  const out: string[] = [];
  for (const l of lines.slice(start)) {
    if (!l.startsWith('>')) break;
    out.push(l.replace(/^> ?/, ''));
  }
  return out.join('\n').trim();
};
const codeAfter = (title: string) => {
  const i = md.indexOf(title);
  const m = md.slice(i).match(/```\n([^`]+)\n```/);
  if (!m) throw new Error(`Bloc de code introuvable après : ${title}`);
  return m[1].trim();
};

check('Nom', 'Valombre', 30);
for (const sub of ['Sept jours pour fuir', 'Seven days to escape']) {
  if (!md.includes(`\`${sub}\``)) errors.push(`Sous-titre absent : ${sub}`);
  check(`Sous-titre « ${sub} »`, sub, 30);
}
const texts = {
  'Texte promotionnel FR': [quoteAfter('**Texte promotionnel**'), 170],
  'Promotional text EN': [quoteAfter('**Promotional text**'), 170],
  'Description FR': [quoteAfter('**Description** :'), 4000],
  'Description EN': [quoteAfter('**Description**:'), 4000],
  'Mots-clés FR': [codeAfter('**Mots-clés**'), 100],
  'Keywords EN': [codeAfter('**Keywords**'), 100],
} as const;
for (const [label, [text, max]] of Object.entries(texts)) check(label, text, max);

for (const kw of [texts['Mots-clés FR'][0], texts['Keywords EN'][0]]) {
  if (/\s/.test(kw)) errors.push(`Mots-clés : pas d'espace après les virgules (${kw})`);
  if (/valombre/i.test(kw)) errors.push('Mots-clés : le nom de l’app est déjà indexé, inutile de le répéter');
}
const metadata = Object.values(texts).map(([t]) => t).join('\n');
if (/android|google play|play store|windows phone/i.test(metadata)) errors.push('Une autre plateforme est citée (règle 2.3.10)');

// Chiffres annoncés = contenu réel.
const facts: [RegExp, number, string][] = [
  [/(\d+) chapitres/, CONTENT.chapters.length, 'chapitres'],
  [/(\d+) scènes/, Object.keys(CONTENT.scenes).length, 'scènes'],
  [/(\d+) fins différentes/, Object.values(CONTENT.endings).filter((e) => e.kind === 'ending').length, 'fins'],
  [/(\d+) succès/, ACHIEVEMENTS.length, 'succès'],
  [/(\d+) chapters/, CONTENT.chapters.length, 'chapters'],
  [/(\d+) scenes/, Object.keys(CONTENT.scenes).length, 'scenes'],
  [/(\d+) different endings/, Object.values(CONTENT.endings).filter((e) => e.kind === 'ending').length, 'endings'],
  [/(\d+) achievements/, ACHIEVEMENTS.length, 'achievements'],
];
for (const [re, real, label] of facts) {
  const m = metadata.match(re);
  if (!m) errors.push(`Chiffre introuvable dans la description : ${label}`);
  else if (Number(m[1]) !== real) errors.push(`Description : ${m[1]} ${label} annoncés, ${real} dans le jeu`);
  else console.log(`✓ ${label} : ${real}`);
}
const companions = Object.keys(CONTENT.heroes).length;
if (!/Cinq compagnons/.test(metadata) || !/Five possible companions/.test(metadata) || companions !== 5) errors.push(`Compagnons annoncés : 5 ; dans le jeu : ${companions}`);

if (errors.length) {
  for (const e of errors) console.log(`✗ ${e}`);
  process.exitCode = 1;
} else console.log('Fiche App Store conforme.');
