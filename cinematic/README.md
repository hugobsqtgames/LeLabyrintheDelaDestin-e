# Bande-annonce d'introduction — Valombre

Bande-annonce de **30 s**, montée à **120 bpm**, jouée au tout premier lancement avant
l'écran titre et rejouable depuis **Paramètres › Revoir l'introduction**. But : qu'on
ait envie de commencer tout de suite.

Tout est original et produit dans ce dépôt. Les affiches, les visages et la carte du
Berger sont **les vrais dessins de l'application** (illustrations, portraits, ennemis),
capturés depuis ses composants. Le reste (radio, cartes de choix, dés, combat, titre,
typographie animée) est dessiné en Canvas 2D dans sa palette. La bande-son est
synthétisée en Python. Aucune ressource externe, aucune licence tierce, aucun réseau
à l'exécution.

| Fichier | Rôle |
| --- | --- |
| `timeline.json` | Minutage de référence : plans, apparition des titres, événements sonores (partagé par l'image et le son) |
| `trailer-text.json` | Textes FR/EN incrustés (une vidéo par langue) |
| `capture-art.mjs` | Capture des dessins du jeu depuis l'export web → `assets/*.png` |
| `scene.js` + `index.html` | Rendu des images, déterministe (même seconde = même image) |
| `render.mjs` | Rendu image par image (Chromium headless) puis encodage H.264 (ffmpeg) |
| `soundtrack.py` | Musique, bruitages, mixage et mastering |
| `../assets/video/intro-{fr,en}.mp4` | **Livrées dans l'app** : 1080×2340, 30 i/s, H.264 High, muettes |
| `../assets/audio/intro.m4a` | **Livrée dans l'app** : bande-son AAC stéréo 160 kb/s, 30 s |
| `../docs/intro/valombre-intro-{fr,en}.mp4` | Aperçus complets (image + son), non livrés dans l'app |
| `../src/screens/IntroScreen.tsx` | Lecture dans l'app, « Passer », fin |
| `../src/intro/controller.ts` | Pilote testé : démarrage, synchro image/son, pause, fin unique |

## Pourquoi la vidéo est muette

Le **son** est joué par `expo-audio` dans la session audio du jeu, la même que
l'ambiance : le bouton silencieux de l'iPhone est respecté, la musique de
l'utilisateur n'est jamais interrompue, et le curseur de volume du jeu s'applique
(0 = muet). La vidéo est muette avec `audioMixingMode = 'mixWithOthers'` : elle ne
réclame jamais la session audio. Le pilote lance image et son ensemble et recale le
son au-delà de 120 ms d'écart.

Les **titres** sont incrustés, pour tomber à l'image près sur les coups de la musique ;
d'où une vidéo par langue. Ils occupent toujours une zone réservée (en-tête, ou bandeau
sombre du bas) : rien ne se chevauche, et rien n'est rogné par le cadrage `cover`
des écrans moins hauts (iPhone SE). VoiceOver lit un résumé (`intro.a11y`).

## Storyboard (30 s)

| Temps | Image | Son | Titre |
| --- | --- | --- | --- |
| 0–3,9 s | La radio de chantier : l'aiguille cherche, accroche 101.7, le vumètre s'affole | Cœur qui bat, parasites, sifflements, voix lointaine | « … ici la Destinée… » « … écluse de Morvan. Aube du septième jour… » (tapé) |
| 4–6 s | **Affiche du Hurleur** (vert), coup de zoom | **Braam** + montée de la pulsation | IL Y A 14 MOIS, / **LE MONDE S'EST TU.** |
| 6–7 s | La dame aux yeux blancs | Braam | **LES MUETS NE CRIENT JAMAIS.** |
| 7–8 s | La brute du péage | Braam | **LES VIVANTS SONT PIRES.** |
| 8–9 s | Le Berger | Braam + grondement | — |
| 9–10 s | L'ambulance renversée | Braam | — |
| 10–12 s | **Choix chronométré** : deux cartes, la jauge fond, le doigt tranche | Horloge qui accélère, clic | **CHAQUE SECONDE COMPTE.** |
| 12–13 s | **Les dés** roulent et tombent : 6 + 5 | Dés qui roulent, se posent, carillon | **CHAQUE CHOIX A UN PRIX.** — ASTUCE +3 · 14 / 8 — RÉUSSITE |
| 13–14 s | **Combat** : la carte du Berger, une entaille, −18, la jauge chute | Lame, impact | **SURVIVEZ.** |
| 14–18 s | **Les visages** de Maëlle, Kaz, Inès, Théo claquent un par un ; puis Kaz tombe (gris, cadre rouge) | Un coup par visage ; choc, sifflement d'oreille | **ILS COMPTENT SUR VOUS.** → **TOUS NE VERRONT PAS L'AUBE.** |
| 18–20 s | La draisine au coucher du soleil | Deux braams | **7 JOURS.** / **1 BARGE.** |
| 20–22 s | **La Destinée** (croix rouge) à l'écluse | Corne de brume, chœur, montée | **LA DESTINÉE N'ATTENDRA PAS.** |
| 22–23 s | Hurleur, Berger, brute : trois coupes | Trois coups, sommet de la montée | — |
| 23–23,8 s | **Noir** | **Silence total** | — |
| 23,8–30 s | **L'emblème explose** (onde de choc, gerbe de braises), l'aiguille tourne et désigne la sortie | Explosion, cloche, tic-tac, accord final jusqu'à la dernière image | **Valombre** — *Sept jours pour fuir.* — J−7 · RÉCIT DE SURVIE |

La fin se fond (450 ms) dans l'écran titre, qui porte le même emblème.

Pas de flash blanc ni de clignotement rapide : au plus trois coupes par seconde
(22–23 s), entre images sombres (prudence vis-à-vis de la photosensibilité).

## Musique et bruitages : provenance

Tout est synthétisé par `soundtrack.py` (numpy) : braams (cuivres graves saturés),
pulsation de cordes, tambours, nappes, chœur à formants, cloche, horloge, dés, lame,
grondement, corne de brume, parasites et voix radio, réverbération par convolution.
**Aucun échantillon, aucune musique, aucun bruitage externe.**

Mastering : ≈ −15 LUFS intégrés, crête vraie ≤ −1,5 dBTP, coupure sous 70 Hz, graves
allégés (un haut-parleur de téléphone ne les restitue pas : les coups portent sur
leurs harmoniques), aigus relevés, silence exact à la dernière image.

## Reconstruire

```bash
npx expo export --platform web --output-dir dist && node cinematic/capture-art.mjs   # dessins du jeu → cinematic/assets/
python3 cinematic/soundtrack.py --stems                  # assets/audio/intro.m4a (+ WAV dans cinematic/out/)
node cinematic/render.mjs --lang fr                      # assets/video/intro-fr.mp4 (≈ 20 min, 900 images)
node cinematic/render.mjs --lang en                      # assets/video/intro-en.mp4
npm run intro:preview                                    # aperçus avec le son : docs/intro/valombre-intro-{fr,en}.mp4
node cinematic/render.mjs --lang fr --stills 4.5,12.6,17.3 --scale 0.5   # images de contrôle
npx vitest run tests/intro.test.ts                       # minutage, textes, pilote, fichiers livrés
npm run e2e:intro                                        # parcours complet (web)
```

Dépendances : Node, Playwright (Chromium), Python 3 + numpy, ffmpeg (libx264, libvpx-vp9).

## Modifier

- **Décaler un plan, un titre ou un son** : `timeline.json` (l'image et le son le suivent).
- **Changer un titre** : `trailer-text.json` (FR et EN), puis refaire les deux vidéos.
- **Changer d'affiche** : le champ `art` d'un plan (une des illustrations du jeu).
- **Changer la durée** : `duration` dans `timeline.json` **et** `INTRO_DURATION`
  (`src/intro/script.ts`) ; un test vérifie qu'ils concordent.
