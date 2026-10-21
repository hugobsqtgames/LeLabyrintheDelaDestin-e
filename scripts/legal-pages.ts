/**
 * Pages web publiques (GitHub Pages, dossier docs/) : politique de
 * confidentialité en français et en anglais, et page d'assistance exigée
 * par App Store Connect. Générées depuis src/legal/privacy.ts : la page web
 * et le texte affiché dans le jeu ne peuvent pas diverger.
 * Aucune ressource externe (ni police, ni script, ni mesure d'audience).
 */
import { CONTACT_EMAIL, PRIVACY, PRIVACY_URL, PUBLISHER, SUPPORT_URL, type LegalDoc } from '../src/legal/privacy';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mail = (s: string) => esc(s).replace(esc(CONTACT_EMAIL), `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`);

const STYLE = `
:root{--bg:#0B0A0A;--panel:#161413;--text:#EDE6DA;--dim:#B8AE9F;--accent:#FF8A5B;--line:rgba(237,230,218,.14)}
@media (prefers-color-scheme: light){:root:not([data-theme=dark]){--bg:#F6F1E8;--panel:#FFFFFF;--text:#1B1714;--dim:#5C534A;--accent:#B4441D;--line:rgba(27,23,20,.14)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:40px 16px 64px}
.kicker{font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
h1{font:400 clamp(30px,7vw,44px)/1.1 Georgia,"Times New Roman",serif;margin:8px 0 6px;letter-spacing:-.5px}
h2{font-size:19px;margin:32px 0 8px}
p{margin:0 0 12px}.dim{color:var(--dim)}
.summary{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:20px 0 8px}
a{color:var(--accent)}nav{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 24px;font-size:15px}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--dim)}
ul{padding-left:20px;margin:0 0 12px}li{margin:0 0 6px}
`;

function page(lang: 'fr' | 'en', title: string, description: string, body: string): string {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="dark light">
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<footer>Valombre · © 2026 ${esc(PUBLISHER)} · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></footer>
</main>
</body>
</html>
`;
}

function policy(lang: 'fr' | 'en', doc: LegalDoc): string {
  const nav =
    lang === 'fr'
      ? `<nav><a href="./">Assistance</a><a href="privacy.html" hreflang="en" lang="en">English version</a></nav>`
      : `<nav><a href="./">Support</a><a href="confidentialite.html" hreflang="fr" lang="fr">Version française</a></nav>`;
  const sections = doc.sections
    .map((s) => {
      const items = s.paragraphs.filter((p) => p.startsWith('• '));
      const paras = s.paragraphs.filter((p) => !p.startsWith('• '));
      // Les puces suivent le paragraphe d'introduction ; le reste vient après la liste.
      const [intro, ...rest] = paras;
      const list = items.length ? `<ul>${items.map((i) => `<li>${mail(i.slice(2))}</li>`).join('')}</ul>` : '';
      return `<h2>${esc(s.title)}</h2>\n${intro ? `<p>${mail(intro)}</p>` : ''}${list}${rest.map((p) => `<p>${mail(p)}</p>`).join('')}`;
    })
    .join('\n');
  return page(
    lang,
    doc.title,
    doc.summary,
    `${nav}
<div class="kicker">Valombre</div>
<h1>${esc(doc.title)}</h1>
<p class="dim">${esc(doc.updated)}</p>
<div class="summary"><p>${esc(doc.summary)}</p></div>
${sections}`,
  );
}

function support(): string {
  return page(
    'fr',
    'Valombre — Assistance / Support',
    'Assistance du jeu Valombre : contact, questions fréquentes, confidentialité.',
    `<div class="kicker">Valombre · Assistance</div>
<h1>Valombre</h1>
<p class="dim">Sept jours pour fuir. Un récit de survie interactif pour iPhone, en français et en anglais.</p>
<div class="summary"><p>Une question, un problème, une idée ? Écrivez à <a href="mailto:${CONTACT_EMAIL}?subject=Valombre">${CONTACT_EMAIL}</a>. Précisez si possible le modèle de votre iPhone, la version d’iOS et ce que vous faisiez dans le jeu.</p></div>
<h2>Questions fréquentes</h2>
<p><strong>Faut-il une connexion internet ?</strong> Non. Le jeu fonctionne entièrement hors ligne, sans compte, sans publicité et sans achat intégré.</p>
<p><strong>Où sont mes sauvegardes ?</strong> Sur votre iPhone uniquement. La partie se sauvegarde automatiquement après chaque décision, dans l’emplacement choisi (trois emplacements, avec une copie de secours).</p>
<p><strong>Comment tout recommencer ?</strong> Paramètres › Recommencer de zéro › Tout effacer. Pour une seule partie : Charger une partie › Supprimer.</p>
<p><strong>Changer de langue ?</strong> Paramètres › Langue (français ou anglais). Vos parties sont conservées.</p>
<p><strong>Le rappel de reprise ?</strong> Facultatif : Paramètres › Rappel de reprise. Il est programmé sur l’appareil, rien n’est envoyé.</p>
<p><a href="confidentialite.html">Politique de confidentialité</a></p>
<h2 lang="en">Support (English)</h2>
<div lang="en">
<p>Questions, problems or ideas? Write to <a href="mailto:${CONTACT_EMAIL}?subject=Valombre">${CONTACT_EMAIL}</a>, ideally with your iPhone model, iOS version and what you were doing in the game.</p>
<p><strong>Do I need an internet connection?</strong> No. The game is fully offline, with no account, no ads and no in-app purchases.</p>
<p><strong>Where are my saves?</strong> Only on your iPhone. The game saves automatically after every decision, in the slot you chose (three slots, with a backup copy).</p>
<p><strong>How do I start over?</strong> Settings › Start from scratch › Erase everything. For a single game: Load a game › Delete.</p>
<p><a href="privacy.html">Privacy Policy</a></p>
</div>`,
  );
}

/** Pages à publier : chemin relatif à docs/ → contenu. */
export function legalPages(): Record<string, string> {
  return {
    'confidentialite.html': policy('fr', PRIVACY.fr),
    'privacy.html': policy('en', PRIVACY.en),
    'index.html': support(),
    // Pas de traitement Jekyll : les fichiers sont servis tels quels.
    '.nojekyll': '',
  };
}

export const PUBLIC_URLS = { privacyFr: PRIVACY_URL.fr, privacyEn: PRIVACY_URL.en, support: SUPPORT_URL };
