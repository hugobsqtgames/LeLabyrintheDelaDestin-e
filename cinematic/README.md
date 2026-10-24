# Cinématique d'introduction — Valombre

Film de 44 s joué au tout premier lancement, avant l'écran titre, et rejouable depuis
**Paramètres › Revoir l'introduction**. Tout est original et produit dans ce dépôt :
images peintes procéduralement en Canvas 2D, bande-son synthétisée en Python. Aucune
ressource externe, aucune licence tierce, aucun réseau à l'exécution.

| Fichier | Rôle |
| --- | --- |
| `timeline.json` | Minutage de référence : plans et événements sonores (partagé par l'image et le son) |
| `../src/intro/script.ts` | Textes superposés : instants d'apparition (partagé par l'app et les aperçus) |
| `scene.js` + `index.html` | Rendu des images, déterministe (même seconde = même image) |
| `characters.js` | Les personnages du jeu en pied, dans la DA des portraits de l'app (mêmes fiches : teint, coiffure, vêtement, accessoires ; tracés de tête repris de `src/ui/art/Portraits.tsx`), éclairés selon la scène |
| `render.mjs` | Rendu image par image (Chromium headless) puis encodage H.264 (ffmpeg) |
| `soundtrack.py` | Musique, ambiances et bruitages, mixage et mastering |
| `../assets/video/intro.mp4` | **Livré dans l'app** : 1080×2340, 30 i/s, H.264 High, muet, sans texte |
| `../assets/audio/intro.m4a` | **Livré dans l'app** : bande-son AAC stéréo 160 kb/s, 44 s |
| `../docs/intro/valombre-intro-{fr,en}.mp4` | Aperçus complets (image + textes + son), non livrés dans l'app |
| `../src/screens/IntroScreen.tsx` | Lecture dans l'app, textes, « Passer », fin |
| `../src/intro/controller.ts` | Pilote testé : démarrage, synchro image/son, pause, fin unique |

## Pourquoi la vidéo est muette et sans texte

- **Textes** superposés par l'application, pas incrustés : nets sur tous les écrans,
  traduits (FR/EN) sans doubler la vidéo, lus par VoiceOver, et jamais coupés par le
  recadrage `cover` des écrans moins hauts (iPhone SE).
- **Son** joué par `expo-audio` dans la session audio du jeu, la même que l'ambiance :
  le bouton silencieux de l'iPhone est respecté, la musique de l'utilisateur n'est
  jamais interrompue, et le curseur de volume du jeu s'applique (0 = muet). La vidéo
  est muette avec `audioMixingMode = 'mixWithOthers'` : elle ne réclame jamais la
  session audio. Le pilote lance image et son ensemble et recale le son au-delà de
  120 ms d'écart.

## Storyboard (44 s)

| Temps | Plan | Image | Son | Texte à l'écran |
| --- | --- | --- | --- | --- |
| 0–5 s | Braises | Noir, une braise qui monte, cendres et volutes chaudes | Nappe grave, cendre qui crépite, **cloche** (0,5 s) | QUATORZE MOIS APRÈS LA GRANDE FIÈVRE |
| 4,2–11,4 s | Valombre | La ville morte vue des toits, clocher noir, lune, brume, feux lointains sur la Lisière, corbeaux ; grue descendante | Ré mineur → si bémol, vent, 2ᵉ cloche lointaine | Valombre ne dort plus. / Elle attend. |
| 10,8–17,4 s | La rue | Vraie perspective 3D : chaussée mouillée, flaques, voiture rouillée (flou de premier plan) ; la caméra avance et pivote vers l'abribus. Le Muet (style des ennemis du jeu : peau blafarde, vêtements en lambeaux), de dos, secousses de tête, puis il se retourne : yeux pâles | Cliquetis de dents réguliers « comme une horloge détraquée », cordes tendues, montée ; **coup** à 16,35 s | Les Muets ne crient jamais. |
| 17,4–20 s | Le toit | Coupe sèche. De dos, le protagoniste (veste matelassée, écharpe rouille, sac) sur le toit de la pharmacie, la croix verte éteinte, la lueur de la radio sur ses mains | Silence relatif : vent, souffle, nappe aiguë | — |
| 20–25,8 s | La radio | Cadran rétroéclairé, l'aiguille cherche puis accroche 101.7, vumètre, grille qui vibre | Parasites, sifflements d'accord ; puis la voix sort du bruit (texture vocale volontairement inintelligible), nappe en fa majeur | « … ici la Destinée. Nous embarquerons des survivants à l'écluse de Morvan… à l'aube du septième jour… » |
| 26–33 s | Sept jours | Une seconde par lieu : Inès (lampe frontale) et Kaz (torche) dans les carrières, le protagoniste et Théo sur les rails, Maëlle et Théo sur le quai du port, vergers noyés, barrage de Vaulx, le protagoniste sur la rocade en feu, le groupe qui s'enfonce dans la brume des tourbières | Pulsation à 120, **tom sur chaque coupe**, battements de cœur, montée | JOUR 1 / 7 … 7 / 7 — Sept jours pour traverser. |
| 32,9–38 s | L'écluse de Morvan | L'aube perce derrière la Destinée ; au premier plan, de dos sur la passerelle de la porte d'écluse, le protagoniste et Théo | Ré majeur, chœur, **corne de brume** (34 s) et ses échos, crescendo… | La Destinée n'attendra pas. |
| 38–38,6 s | — | **Coupe au noir** | **Silence total** | — |
| 38,6–44 s | L'emblème | Le labyrinthe se trace, l'aiguille tourne et désigne la sortie ; même emblème que l'écran titre | Souffle grave, cloche (rappel de l'ouverture), tic-tac de l'aiguille, accord final qui s'éteint exactement à 44 s | Valombre — *Sept jours pour fuir.* |

La fin du film se fond (450 ms) dans l'écran titre, qui porte le même emblème.

## Narration

Pas de voix off : aucun outil de synthèse vocale de qualité n'est disponible ici, et une
voix synthétique médiocre desservirait le film. Le récit passe par l'image, le son et
des textes courts. Les textes (FR et EN) sont dans `src/i18n/fr.ts` et `src/i18n/en.ts`
(clés `intro.*`) ; ils servent aussi de sous-titres et de description VoiceOver
(`intro.a11y`).

## Musique et bruitages : provenance

Tout est synthétisé par `soundtrack.py` (numpy) : nappes additives, cordes en trémolo,
chœur à formants, cloche à partiels inharmoniques, toms, battements, corne de brume,
parasites et texture vocale radio, réverbération par convolution. **Aucun échantillon,
aucune musique, aucun bruitage externe** : rien n'est soumis à licence tierce ; le tout
appartient à l'éditeur de l'application comme le reste du code.

Mastering : ≈ −16 LUFS intégrés, crête vraie ≤ −1,5 dBTP, coupure sous 70 Hz et graves
allégés (un haut-parleur de téléphone ne les restitue pas), aigus relevés pour la
clarté, silence exact à la dernière image.

## Reconstruire

```bash
python3 cinematic/soundtrack.py --stems       # assets/audio/intro.m4a (+ WAV et pistes séparées dans cinematic/out/)
node cinematic/render.mjs                      # assets/video/intro.mp4 (≈ 25 min, 1 320 images)
node cinematic/render.mjs --lang fr --audio cinematic/out/intro-mix.wav --out docs/intro/valombre-intro-fr.mp4
node cinematic/render.mjs --lang en --audio cinematic/out/intro-mix.wav --out docs/intro/valombre-intro-en.mp4
node cinematic/render.mjs --stills 2,8,14,23 --scale 0.5 --lang fr   # images de contrôle
npx vitest run tests/intro.test.ts             # minutage, textes, pilote, fichiers livrés
npx expo export --platform web --output-dir dist && node promo/e2e-intro.mjs   # parcours complet (web)
```

Dépendances : Node, Playwright (Chromium), Python 3 + numpy, ffmpeg (libx264, libvpx-vp9).

## Modifier

- **Décaler un plan ou un son** : `timeline.json` (l'image et le son le suivent tous deux).
- **Changer un texte** : `src/i18n/*.ts` ; son minutage : `CUES` dans `src/intro/script.ts`.
  Les tests vérifient qu'aucun texte ne déborde du film ni n'en chevauche un autre.
- **Changer la durée** : `duration` dans `timeline.json` **et** `INTRO_DURATION` (un test
  vérifie qu'ils concordent), puis régénérer le son et l'image.
