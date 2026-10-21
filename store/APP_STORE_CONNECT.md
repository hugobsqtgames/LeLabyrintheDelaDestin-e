# Valombre — fiche App Store Connect

Tout ce qu'il faut saisir dans App Store Connect pour la version 1.0, prêt à copier-coller.
Chaque réponse correspond à ce que fait réellement l'application (vérifié dans le code et par
les tests `tests/legal.test.ts`). Les limites de caractères sont contrôlées par
`npm run store:check`.

---

## 0. Avant de commencer (une seule fois)

1. **Renommer le dépôt GitHub** `LeLabyrintheDelaDestin-e` → `Valombre`
   (GitHub › Settings › General › Repository name).
2. **Publier les pages** : fusionner la branche dans `main`, puis GitHub › Settings › Pages ›
   *Build and deployment* › Source « Deploy from a branch » › Branch `main`, dossier `/docs` › Save.
   Attendre une minute, puis vérifier que ces trois adresses s'ouvrent (elles doivent répondre avant la soumission,
   règle 2.1 : « fully functional URLs ») :
   - https://hugobsqtgames.github.io/Valombre/ (assistance)
   - https://hugobsqtgames.github.io/Valombre/confidentialite.html
   - https://hugobsqtgames.github.io/Valombre/privacy.html
3. **Statut de commerçant (DSA, UE)** : Business › Statut de commerçant. Jeu gratuit, sans achat ni
   publicité, sans intention commerciale → « Ce compte n'est pas un compte de commerçant »
   (aucune coordonnée publiée). Si tu comptes en tirer un revenu, choisis « commerçant » : ton adresse,
   ton téléphone et ton e-mail seront alors affichés publiquement dans l'UE.
4. **Créer l'app** : Mes apps › + › Nouvelle app
   - Plateforme : iOS
   - Nom : `Valombre`
   - Langue principale : Français (France)
   - Identifiant de bundle : `fr.valombre.app` (à enregistrer d'abord dans Certificates, Identifiers &
     Profiles s'il n'apparaît pas, ou laisser le premier `eas build` le créer)
   - SKU : `valombre-ios`
   - Accès utilisateur : accès complet

---

## 1. Informations sur l'app

| Champ | Valeur |
| --- | --- |
| Nom | `Valombre` |
| Sous-titre (FR) | `Sept jours pour fuir` |
| Sous-titre (EN) | `Seven days to escape` |
| Catégorie principale | Jeux › **Jeu de rôle** |
| Catégorie secondaire | Jeux › **Aventure** |
| Droits sur le contenu | « Non, l'app ne contient, n'affiche ni n'accède à du contenu tiers » (polices sous licence SIL OFL intégrées, textes, sons et images créés pour le jeu) |
| URL de la politique de confidentialité (FR) | `https://hugobsqtgames.github.io/Valombre/confidentialite.html` |
| URL de la politique de confidentialité (EN) | `https://hugobsqtgames.github.io/Valombre/privacy.html` |

Ajouter la localisation **Anglais (Royaume-Uni)** ou **Anglais (États-Unis)** pour la fiche anglaise.

---

## 2. Confidentialité de l'app (App Privacy)

- « Collectez-vous des données à partir de cette app ? » → **Non, nous ne collectons pas de données à partir de cette app.**
- Résultat affiché sur l'App Store : **Aucune donnée collectée** (« Data Not Collected »).

Pourquoi c'est exact : aucune connexion réseau, aucun SDK tiers, sauvegardes et paramètres stockés
uniquement sur l'appareil, notification locale sans jeton push. Apple : « Data that is processed only
on device is not "collected" ». Un test (`tests/legal.test.ts`) échoue si quelqu'un ajoute un jour un
appel réseau ou un SDK de suivi.

Suivi (App Tracking Transparency) : non. Aucune demande d'autorisation de suivi n'est nécessaire.

---

## 3. Classification par âge

Répondre honnêtement (règle 2.3.6). Contenu réel du jeu : récit de survie post-épidémie, combats
contre des infectés et des pillards, morts possibles du héros et des compagnons, ambiance d'horreur,
enfants en danger ; pas de sang détaillé ni de gore, pas de contenu sexuel, un seul juron léger.

| Question | Réponse |
| --- | --- |
| Violence de dessin animé ou fantastique | **Fréquente/intense** (combats au tour par tour contre des infectés, cœur du jeu) |
| Violence réaliste | **Peu fréquente/légère** (affrontements avec des pillards humains, décrits par le texte) |
| Violence réaliste prolongée, graphique ou sadique | Aucune |
| Thèmes d'horreur/de peur | **Fréquents/intenses** |
| Thèmes matures/suggestifs | **Peu fréquents/légers** (mort, deuil, choix moraux) |
| Grossièretés ou humour cru | **Peu fréquent/léger** |
| Consommation ou références à l'alcool, au tabac ou aux drogues | **Peu fréquente/légère** (cigarettes, alcool à brûler comme combustible, médicaments) |
| Contenu sexuel ou nudité | Aucun |
| Informations médicales ou de traitement | Aucune (soins fictifs du jeu, pas de conseil médical) |
| Jeux d'argent simulés | Aucun |
| Concours | Aucun |
| Accès web illimité | Non |
| Contenu généré par les utilisateurs / messagerie | Non |
| Contrôles parentaux, vérification d'âge | Non |
| Fonctions d'IA, assistant, chatbot | Non |
| Publicité | Non |
| « Made for Kids » / catégorie Enfants | **Non** |

La classification obtenue sera vraisemblablement **13+** (éventuellement 16+ selon la grille
d'Apple) : c'est cohérent avec le jeu, ne pas la sous-évaluer.

---

## 4. Prix et disponibilité

- Prix : **Gratuit**
- Disponibilité : tous les pays (ou France, Belgique, Suisse, Canada, Luxembourg et pays
  anglophones si tu préfères limiter à FR/EN)
- Achats intégrés : aucun
- Pas de précommande

---

## 5. Version 1.0 — fiche française

**Texte promotionnel** (modifiable sans nouvelle version) :

> Quatorze mois après la Grande Fièvre, une barge emmène les derniers survivants. Vous avez sept jours pour l'atteindre. Chaque choix laisse une trace.

**Description** :

> Valombre, quatorze mois après la Grande Fièvre. Une voix à la radio annonce qu'une barge, la Destinée, embarquera des survivants à l'écluse de Morvan à l'aube du septième jour. Il vous reste sept jours pour traverser la ville et ce qu'il y a dessous.
>
> Valombre est un récit de survie interactif : vous lisez, vous choisissez, et le monde s'en souvient.
>
> UN RÉCIT QUI SE SOUVIENT
> • 15 chapitres, 396 scènes et 6 fins différentes.
> • Vos décisions changent les lieux, les alliances et le sort de vos compagnons.
> • L'horloge tourne : chaque détour coûte des heures, et la barge n'attend personne.
>
> SURVIVRE
> • Créez votre survivant : profil, passé, aptitudes.
> • Combats au tour par tour : lisez l'intention de l'ennemi, défendez-vous, esquivez, frappez au bon moment.
> • Gérez votre sac, l'usure de vos armes, la faim et la fièvre, et fabriquez ce qui vous manque.
>
> PERSONNE NE MARCHE SEUL
> • Cinq compagnons possibles, chacun avec son histoire.
> • Si votre héros tombe, un compagnon peut reprendre la route avec ce que vous lui laissez.
>
> ET AUSSI
> • Carte, journal, archives et chronique de vos décisions.
> • 21 succès, un codex des ennemis, un arbre des choix et la possibilité de rejouer un chapitre.
> • Sauvegarde automatique après chaque décision, trois emplacements.
> • Ambiance sonore, taille du texte réglable, animations réduites.
>
> Entièrement hors ligne. Sans compte, sans publicité, sans achat intégré. Aucune donnée collectée.
> En français et en anglais.
>
> Contient des scènes de violence et d'horreur.

**Mots-clés** (séparés par des virgules, sans espace) :

```
survie,récit,interactif,choix,horreur,aventure,rpg,histoire,livre,zombie,apocalypse,texte,narratif
```

**URL d'assistance** : `https://hugobsqtgames.github.io/Valombre/`
**URL marketing** (facultatif) : `https://hugobsqtgames.github.io/Valombre/`
**Copyright** : `2026 Hugo Anselme Busquet`

---

## 6. Version 1.0 — fiche anglaise

**Promotional text**:

> Fourteen months after the Great Fever, a barge is taking the last survivors away. You have seven days to reach it. Every choice leaves a mark.

**Description**:

> Valombre, fourteen months after the Great Fever. A voice on the radio announces that a barge, the Destinée, will take survivors aboard at the Morvan lock at dawn on the seventh day. You have seven days to cross the city, and what lies beneath it.
>
> Valombre is an interactive survival story: you read, you choose, and the world remembers.
>
> A STORY THAT REMEMBERS
> • 15 chapters, 396 scenes and 6 different endings.
> • Your decisions change places, alliances and the fate of your companions.
> • The clock is ticking: every detour costs hours, and the barge waits for no one.
>
> SURVIVE
> • Create your survivor: profile, background, skills.
> • Turn-based combat: read the enemy's intent, defend, dodge, strike at the right moment.
> • Manage your bag, weapon wear, hunger and fever, and craft what you lack.
>
> NO ONE WALKS ALONE
> • Five possible companions, each with their own story.
> • If your hero falls, a companion can carry on with whatever you leave them.
>
> AND ALSO
> • Map, journal, archives and a chronicle of your decisions.
> • 21 achievements, an enemy codex, a choice tree and chapter replay.
> • Automatic save after every decision, three slots.
> • Ambient sound, adjustable text size, reduced motion.
>
> Fully offline. No account, no ads, no in-app purchases. No data collected.
> In English and French.
>
> Contains scenes of violence and horror.

**Keywords**:

```
survival,story,interactive,choices,horror,adventure,rpg,narrative,text,zombie,apocalypse,gamebook
```

---

## 7. Captures et vidéos

Uniquement **iPhone** (l'app n'est pas proposée sur iPad : `supportsTablet: false`).

| Emplacement | Fichiers | Format exigé par Apple |
| --- | --- | --- |
| iPhone 6,9" (Dynamic Island, grand écran) — captures FR | `docs/appstore/fr/01…06` (PNG d'origine : `promo/out/appstore-fr/`) | 1290 × 2796, 1 à 10 images ✔ |
| idem EN | `docs/appstore/en/01…06` | ✔ |
| Aperçu vidéo FR | `docs/promo/app-preview-fr.mp4` | 886 × 1920, H.264, 30 i/s, 29,9 s (≤ 30 s), AAC 256 kbit/s stéréo 48 kHz ✔ |
| Aperçu vidéo EN | `docs/promo/app-preview-en.mp4` | ✔ |
| Image d'affiche de la vidéo | choisir l'instant 7,2 s (écran titre) | — |

Les captures et la vidéo montrent l'application réelle (règles 2.3.3 et 2.3.4) et restent
acceptables pour un public 4+ (règle 2.3.8) : silhouettes, pas de sang ni de mort détaillée.
Elles ne mentionnent aucune autre plateforme (règle 2.3.10).

---

## 8. Build

```bash
bunx eas-cli build --platform ios --profile production   # ou : npx eas-cli@latest build …
bunx eas-cli submit --platform ios --latest
```

- Chiffrement : déjà déclaré dans l'app (`ITSAppUsesNonExemptEncryption = NO`), aucune question
  d'export à chaque envoi.
- Numéro de build : incrémenté automatiquement par EAS (`appVersionSource: remote`).
- **Tester ce build sur un vrai iPhone via TestFlight avant de soumettre** (règle 2.1 : « tested
  on-device for bugs and stability »).

---

## 9. Informations pour la vérification (App Review)

- Connexion requise : **non** (aucun compte de démonstration nécessaire).
- Coordonnées : Hugo Anselme Busquet — hugobsqt.collab@gmail.com — (ajouter un numéro de téléphone,
  exigé par le formulaire mais jamais publié).

**Notes (en anglais, lues par l'équipe d'Apple)** :

> Valombre is a fully offline, single-player interactive survival story (French and English). There is no account, no login, no network access, no ads, no in-app purchases and no data collection.
>
> How to review:
> 1. Tap "New game", choose an empty slot, create a character (5 short steps) and tap "Take the watch". A short optional tutorial explains the screen.
> 2. Read and tap choices; combat is turn-based. The game saves automatically after every decision.
> 3. The language can be switched in Settings (top of the screen). The interface and the whole story are translated.
>
> Notifications: an optional "resume reminder" (Settings > Resume reminder) schedules a single LOCAL notification on the device 48 hours after leaving a game in progress. No push server, no push token. Notification permission is requested only if the player turns this option on.
>
> Privacy: the privacy policy is available in the app (Settings > About > Privacy Policy, readable offline) and online. Settings > Start from scratch > Erase everything deletes all data stored by the game on the device.

---

## 10. Dernière vérification avant « Soumettre pour vérification »

- [ ] Les 3 URL (assistance, confidentialité FR et EN) s'ouvrent dans Safari.
- [ ] Le build a été testé sur un iPhone via TestFlight (lancement, nouvelle partie, sauvegarde,
      reprise, combat, paramètres, rappel, « Tout effacer »).
- [ ] Classification par âge, confidentialité de l'app, prix, statut de commerçant : remplis.
- [ ] Captures et vidéos déposées pour l'iPhone 6,9" en FR et en EN.
- [ ] Notes de vérification et coordonnées (avec téléphone) remplies.
