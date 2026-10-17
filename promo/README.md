# Vidéo de présentation (App Store Preview) et captures App Store

Tout ce qui apparaît dans la vidéo est **la vraie application** : les écrans sont filmés image par image dans le
build web du jeu, puis mis en scène dans un iPhone 3D, avec la typographie, les couleurs, les halos et le grain de
l’application. Rien n’est redessiné, aucune fonctionnalité n’est inventée.

| Livrable | Format | Fichier |
| --- | --- | --- |
| App Store Preview (FR) | 886 × 1920, 30 i/s, 30 s, H.264 + AAC stéréo | `docs/promo/app-preview-fr.mp4` |
| App Store Preview (EN) | idem | `docs/promo/app-preview-en.mp4` |
| Image d’affiche (poster frame) | 886 × 1920 | `docs/promo/poster-fr.jpg`, `poster-en.jpg` |
| Captures App Store iPhone 6,9" | 1290 × 2796, 6 par langue | `docs/appstore/fr/`, `docs/appstore/en/` |

## Storyboard (30 s)

Le récit suit : **problème → découverte → fonctionnalités → expérience → appel à l’action**.

| Temps | Plan | Texte | Ce qu’on voit (écran réel) | Caméra |
| --- | --- | --- | --- | --- |
| 0,0 – 2,7 | Ouverture | *Valombre · Jour 1 · 23 h* — « La ville est tombée. » | noir, braise, poussière | — |
| 2,7 – 5,7 | Le besoin | « Il vous reste *sept jours.* » | scène illustrée du Hurleur, compte à rebours du choix chronométré | le téléphone surgit du bas, incliné en 3D |
| 5,7 – 8,3 | Découverte | *Un récit de survie interactif* — « Survivre *est un choix.* » | écran titre (emblème qui tourne, reprise de partie) | il se redresse face caméra, lente poussée |
| 8,3 – 12,2 | Choix | « Chaque choix *compte.* » puis « Les dés *ne mentent pas.* » | défilement vers les choix, **appui sur « Astuce 83 % »**, ouverture du détail du jet | zoom serré sur le choix, puis recul |
| 12,2 – 15,6 | Combat | « Des combats *sans pitié.* » | deux coups portés : éclair rouge sur l’ennemi, journal, barres de vie | léger pivot, secousse à l’impact |
| 15,6 – 18,8 | Relations | « Ils se souviennent *de vous.* » | fiche : portrait, tuiles, défilement jusqu’aux rencontres | pivot opposé |
| 18,8 – 22,3 | Monde | « Un monde qui garde *vos traces.* » | trois téléphones : **carte** (chemins), **archives** (document ouvert), **atelier** (onglet ouvert) | éventail, dérive latérale |
| 22,3 – 25,8 | Récit | *15 chapitres · 6 fins · 396 scènes* | carton de chapitre de l’application | plongée : l’écran remplit le cadre |
| 25,8 – 30,0 | Conclusion | « Le Labyrinthe *de la Destinée* » · *Hors ligne · Sans pub · Sans compte* · **Entrez dans le Labyrinthe** | icône de l’application | apparition mot à mot |

Chaque chiffre affiché est vrai (validateur : 396 scènes, 6 fins et 4 morts ; 15 chapitres ; aucune connexion,
publicité ni compte). Les appuis visibles (point + onde) sont les **vrais clics** enregistrés pendant la capture.

**Son** : bande-son synthétisée (`soundtrack.py`), calée sur la scène — impact sur chaque coupe, tic-tac sur « sept
jours », battement de cœur, clics d’interface synchronisés sur les appuis, coups en combat, montées avant les
révélations, cloche et accord résolu sur la conclusion. Même palette que les ambiances du jeu.

## Fabrication

```bash
npm run promo            # tout : capture FR/EN, rendu des deux vidéos, captures App Store
# ou étape par étape :
npm run promo:capture    # export web + capture des plans (promo/.cache/<langue>/<plan>/)
npm run promo:render     # vidéos (promo/out/app-preview-<langue>.mp4)
npm run promo:stills     # captures App Store (promo/out/appstore-<langue>/)
node promo/render.mjs --lang fr --frames 0,300,600   # images de contrôle seulement
```

Prérequis : Node, Chromium (Playwright ; `CHROMIUM_PATH` pour en imposer un), Python 3 + numpy, ffmpeg (libx264).

1. **`capture.mjs`** ouvre l’application en mode capture (`?promo=<maquette>&lang=…`, voir
   `src/promo/PromoRoot.tsx`) au format iPhone 16 Pro (393 × 852 pt, zones de sécurité réelles), avec une **horloge
   virtuelle à l’arrêt** : chaque image avance le temps de l’application d’exactement 1/30 s. Les animations du jeu
   (fondus, barres de vie, feuilles, carton de chapitre) sont donc parfaitement fluides et identiques à chaque rendu.
   Les plans et leurs interactions sont décrits dans **`clips.mjs`**.
2. **`stage/`** est la scène de composition (HTML/CSS, 886 × 1920) : iPhone 3D, textes, halos, grain. Tout y est
   fonction du temps (`renderFrame(t)`) — aucune animation CSS — donc le rendu est déterministe. Le storyboard, les
   textes FR/EN et les mouvements de caméra sont dans **`stage/timeline.js`** ; les captures App Store dans
   **`stage/stills.js`**. Ouvrir la scène dans un navigateur avec `?t=12.5` affiche l’image à 12,5 s.
3. **`render.mjs`** photographie la scène image par image, génère la bande-son puis encode en H.264.

Pour modifier un texte, un minutage ou un mouvement : éditer `stage/timeline.js`, puis `npm run promo:render`.
Si l’interface change, relancer `npm run promo:capture` : la vidéo se met à jour avec les nouveaux écrans.
