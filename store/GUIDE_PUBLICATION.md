# Valombre — guide complet de publication sur l'App Store

Ce guide part de zéro et va jusqu'à l'app en vente : comptes, build avec Expo (EAS), test sur
iPhone avec TestFlight, et **chaque case d'App Store Connect** avec ce qu'il faut y mettre.

- Projet : Expo SDK 57, gestionnaire npm (commandes `npx eas-cli@latest …`).
- App : **Valombre**, identifiant `fr.valombre.app`, version `1.0.0`, iPhone uniquement.
- Les textes à copier sont entre blocs ou citations. `npm run store:check` vérifie leurs longueurs et
  que les chiffres annoncés correspondent au jeu.

> Personne ne peut garantir une validation du premier coup : c'est Apple qui décide. Ce guide
> applique point par point les règles de vérification d'Apple (versions consultées en octobre 2026)
> et répond d'avance à toutes les questions qu'un vérificateur peut se poser.

---

## Sommaire

1. Ce qu'il faut avant de commencer
2. Publier les pages web (confidentialité, assistance)
3. Préparer App Store Connect (une seule fois)
4. Générer le build avec Expo (EAS Build)
5. Envoyer le build sur App Store Connect (EAS Submit)
6. Tester sur ton iPhone avec TestFlight
7. Remplir la fiche de l'app, case par case
8. Remplir la version 1.0, case par case
9. Informations pour la vérification (notes au vérificateur)
10. Soumettre, suivre, publier
11. En cas de refus
12. Mises à jour suivantes
13. Liste de contrôle finale

---

## 1. Ce qu'il faut avant de commencer

| Quoi | Où | Remarques |
| --- | --- | --- |
| Compte **Apple Developer Program** | developer.apple.com/programs | 99 USD par an. Compte individuel au nom de Hugo Anselme Busquet : c'est ce nom qui s'affichera comme vendeur sur l'App Store. L'activation peut prendre 24 à 48 h. |
| Compte **Expo** | expo.dev/signup | Gratuit. Le forfait gratuit permet de faire des builds iOS (file d'attente plus longue). |
| **Node.js** 20 ou plus et **git** | sur ton ordinateur | Pas besoin de Mac ni de Xcode : le build se fait dans le cloud d'Expo. |
| Un **iPhone** avec l'app **TestFlight** | App Store | Pour tester le vrai build avant la soumission. |
| L'**authentification à deux facteurs** activée sur ton identifiant Apple | Réglages iPhone › ton nom › Connexion et sécurité | Obligatoire pour App Store Connect. |

Récupérer le projet à jour :

```bash
git clone https://github.com/hugobsqtgames/Valombre.git   # après le renommage (étape 2)
cd Valombre
git checkout main
npm ci
```

Vérifier que tout est vert **avant chaque build** :

```bash
npm run preflight
```

Cette commande lance : vérification des types, lint, 172 tests, validation du contenu (396 scènes),
contrôle de la fiche App Store, `expo-doctor`. Si une ligne échoue, ne pas lancer de build.

---

## 2. Publier les pages web (confidentialité, assistance)

Apple refuse une app dont l'URL de confidentialité ou d'assistance ne répond pas (règle 2.1).
Les pages sont déjà dans le dossier `docs/` du dépôt ; il suffit de les mettre en ligne.

1. **Renommer le dépôt** : github.com/hugobsqtgames/LeLabyrintheDelaDestin-e › Settings › General ›
   Repository name : `Valombre` › Rename. (GitHub redirige l'ancienne adresse pour git, mais
   **pas** pour les pages : renommer avant d'activer Pages.)
2. **Fusionner la branche de travail dans `main`** : Pull requests › New › base `main` ←
   `claude/vibrant-keller-948xk5` › Create › Merge.
3. **Activer GitHub Pages** : Settings › Pages › Build and deployment ›
   Source : *Deploy from a branch* › Branch : `main`, dossier `/docs` › Save.
4. Attendre 1 à 2 minutes, puis ouvrir dans Safari sur l'iPhone :
   - https://hugobsqtgames.github.io/Valombre/ — page d'assistance
   - https://hugobsqtgames.github.io/Valombre/confidentialite.html — politique (FR)
   - https://hugobsqtgames.github.io/Valombre/privacy.html — politique (EN)

Les trois doivent s'afficher. Ces adresses sont aussi celles qu'ouvre l'app (Paramètres › À propos).

---

## 3. Préparer App Store Connect (une seule fois)

Site : **appstoreconnect.apple.com** (l'interface existe en français ; les libellés anglais sont
indiqués entre parenthèses).

### 3.1 Accords et statut de commerçant

1. **Accords, impôts et banque** (*Business*) : accepter le contrat « Free Apps » (apps gratuites).
   Rien d'autre à remplir pour une app gratuite.
2. **Statut de commerçant pour l'UE** (*Digital Services Act*) : même section *Business*.
   - Valombre est gratuite, sans achat ni publicité, sans revenu → choisir
     **« Je ne suis pas un commerçant »** (*This is not a trader account*). Aucune coordonnée ne sera publiée.
   - Si tu comptes un jour en tirer un revenu, il faudra passer en « commerçant » : adresse,
     téléphone et e-mail seront alors visibles publiquement dans l'UE.
   - Sans cette déclaration, l'app ne peut pas être distribuée dans l'UE.

### 3.2 Créer la fiche de l'app

Mes apps (*Apps*) › bouton **+** › **Nouvelle app** (*New App*) :

| Case | Valeur |
| --- | --- |
| Plateformes | **iOS** (cocher uniquement iOS) |
| Nom | `Valombre` |
| Langue principale | **Français (France)** |
| Identifiant de bundle (*Bundle ID*) | `fr.valombre.app` |
| SKU | `valombre-ios` |
| Accès utilisateur | **Accès complet** |

Si `fr.valombre.app` n'apparaît pas dans la liste : developer.apple.com › Certificates, Identifiers &
Profiles › Identifiers › **+** › App IDs › App › Description `Valombre`, Bundle ID *Explicit*
`fr.valombre.app` › cocher **Push Notifications** (voir 4.3) › Register. Revenir ensuite créer l'app.
(Le premier build EAS sait aussi l'enregistrer pour toi.)

Une fois créée, noter l'**identifiant Apple** de l'app : Informations sur l'app (*App Information*) ›
Informations générales › **Identifiant Apple** (*Apple ID*), un nombre de 10 chiffres. Il servira à
`eas submit` (étape 5).

---

## 4. Générer le build avec Expo (EAS Build)

### 4.1 Se connecter

```bash
npx eas-cli@latest login        # identifiants de ton compte Expo
npx eas-cli@latest whoami       # doit afficher ton nom d'utilisateur Expo
```

### 4.2 Lancer le build de production iOS

```bash
npm run preflight
npx eas-cli@latest build --platform ios --profile production
```

Le profil `production` d'`eas.json` est déjà prêt : numéro de build incrémenté automatiquement
(`autoIncrement`, versions gérées par EAS avec `appVersionSource: "remote"`).

### 4.3 Répondre aux questions du premier build

| Question affichée | Réponse |
| --- | --- |
| *Would you like to automatically create an EAS project for @…/valombre?* | **Yes** (ajoute `extra.eas.projectId` dans `app.json` : il faudra le commiter, voir 4.5) |
| *Do you want to log in to your Apple account?* | **Yes**, puis identifiant Apple, mot de passe et code à deux facteurs |
| *Select a Team* (si plusieurs) | ton équipe (Individual, Hugo Anselme Busquet) |
| *Bundle identifier fr.valombre.app is not registered…* | **Yes** (l'enregistrer) |
| *Generate a new Apple Distribution Certificate?* | **Yes** |
| *Generate a new Apple Provisioning Profile?* | **Yes** |
| *Would you like to set up Push Notifications for your project?* | **No** — le jeu n'utilise que des rappels **locaux**, qui ne passent par aucun serveur ni clé push. |

À propos des notifications : la bibliothèque expo-notifications ajoute toujours l'autorisation
« Push Notifications » au profil de l'app. C'est sans conséquence (aucun serveur, aucun jeton n'est
créé) et EAS l'active automatiquement sur l'identifiant de l'app. Ne pas s'en inquiéter si App Store
Connect l'affiche.

### 4.4 Attendre le build

- Le terminal affiche un lien vers expo.dev ; on peut le fermer, le build continue.
- Durée : 10 à 30 minutes selon la file d'attente du forfait gratuit.
- Suivi : `npx eas-cli@latest build:list` ou expo.dev › projet › Builds.
- Résultat attendu : statut **Finished** et un fichier `.ipa`.

Si le build échoue : ouvrir le journal sur expo.dev (étape rouge), corriger, relancer. Les erreurs
de certificats se règlent avec `npx eas-cli@latest credentials --platform ios`.

### 4.5 Commiter le lien avec le projet Expo

```bash
git add app.json eas.json
git commit -m "Lien avec le projet EAS"
git push
```

---

## 5. Envoyer le build sur App Store Connect (EAS Submit)

Facultatif mais pratique : inscrire l'identifiant Apple de l'app (étape 3.2) dans `eas.json` pour ne
plus avoir à le choisir :

```json
"submit": {
  "production": {
    "ios": { "ascAppId": "1234567890" }
  }
}
```

(remplacer `1234567890` par le vrai nombre, puis commiter).

Envoyer le dernier build :

```bash
npx eas-cli@latest submit --platform ios --latest
```

- Il demande l'identifiant Apple et peut proposer de créer une **clé d'API App Store Connect** :
  répondre **Yes** (elle évite le code à deux facteurs aux envois suivants).
- Le build apparaît dans App Store Connect › onglet **TestFlight** après **10 à 15 minutes** de
  traitement (*Processing*), puis passe à **Prêt à tester** (*Ready to Test*).
- Astuce pour les fois suivantes : build et envoi en une seule commande :
  `npx eas-cli@latest build --platform ios --profile production --auto-submit`

Conformité du chiffrement (*Export Compliance*) : rien à faire. L'app déclare déjà
`ITSAppUsesNonExemptEncryption = NO` (elle n'utilise aucun chiffrement propre), la question n'est donc
pas posée.

---

## 6. Tester sur ton iPhone avec TestFlight

Apple demande que l'app ait été testée sur un vrai appareil (règle 2.1). C'est l'étape la plus utile
pour éviter un refus : ce qui plante chez toi plantera chez le vérificateur.

### 6.1 Test interne (immédiat, sans vérification d'Apple)

1. App Store Connect › Valombre › **TestFlight** › Tests internes (*Internal Testing*) › **+** ›
   nom du groupe : `Interne`.
2. Ajouter les testeurs : toi (et jusqu'à 100 personnes ayant un accès à ton compte App Store
   Connect, Utilisateurs et accès).
3. Ajouter le build au groupe (s'il n'y est pas automatiquement).
4. Sur l'iPhone : ouvrir l'e-mail d'invitation ou l'app **TestFlight** › Valombre › **Installer**.

### 6.2 Ce qu'il faut vérifier sur l'iPhone (30 à 45 minutes)

Cocher chaque ligne ; si une seule échoue, ne pas soumettre.

- [ ] L'icône et le nom « Valombre » sous l'icône sont corrects.
- [ ] Le lancement est rapide, sans écran blanc ; l'écran titre affiche « Valombre — Sept jours pour fuir. »
- [ ] **Nouvelle partie** › choisir un emplacement › les 5 étapes de création › **Prendre la garde**.
- [ ] Le carton de chapitre puis le tutoriel s'affichent ; « Passer le tutoriel » fonctionne.
- [ ] Faire une vingtaine de choix ; un jet de dés s'affiche (« Détail du jet »).
- [ ] Un combat (hôpital Delorme au chapitre 1, ou plus loin) : attaquer, se défendre, esquiver, objet.
- [ ] Onglets **Fiche**, **Sac** (équiper, utiliser un bandage), **Carte**, **Carnet**.
- [ ] Bouton pause › **Paramètres** › retour › **Reprendre**.
- [ ] **Quitter vers le menu** › **Continuer** : la partie reprend au même endroit.
- [ ] Fermer complètement l'app (balayer vers le haut) puis la rouvrir : la partie est toujours là.
- [ ] Paramètres › **Langue** › English : tout le jeu passe en anglais ; revenir en français.
- [ ] Paramètres › son : l'ambiance sonore se coupe et revient ; le bouton silencieux de l'iPhone est respecté.
- [ ] Paramètres › **Rappel de reprise** activé : la demande d'autorisation de notifications apparaît.
- [ ] Paramètres › À propos › **Politique de confidentialité** : le texte s'affiche (même en mode Avion).
- [ ] Paramètres › À propos › **Assistance** : Safari ouvre la page d'assistance.
- [ ] Mode **Avion** activé : tout le jeu fonctionne normalement.
- [ ] Réglages iPhone › Accessibilité › Taille du texte au maximum : rien n'est coupé ni illisible.
- [ ] VoiceOver activé quelques minutes : les boutons principaux sont annoncés.
- [ ] Appel entrant ou passage dans une autre app pendant une partie : retour sans perte.
- [ ] Paramètres › Recommencer de zéro › **Tout effacer** : retour à un accueil vierge.
- [ ] Si tu as un iPad : installer aussi via TestFlight. L'app y tourne en mode iPhone ; les
      vérificateurs testent parfois sur iPad, elle doit s'ouvrir et fonctionner.

Pour signaler un problème : capture d'écran dans TestFlight › Envoyer un retour (il arrive dans
App Store Connect › TestFlight › Retours).

### 6.3 Test externe (facultatif)

Pour des amis sans accès à ton compte : TestFlight › Tests externes › **+** › groupe `Amis` › ajouter
le build. Le premier build externe passe une **vérification bêta** (environ 24 h) ; il faut remplir
*Informations sur le test* : description courte du jeu, e-mail de retour
`hugobsqt.collab@gmail.com`, et les mêmes notes que la section 9. Ensuite, lien public ou invitations
par e-mail.

---

## 7. Remplir la fiche de l'app, case par case

### 7.1 Informations sur l'app (*App Information*)

| Case | Valeur |
| --- | --- |
| Nom (FR) | `Valombre` |
| Sous-titre (FR) | `Sept jours pour fuir` |
| Catégorie principale (*Primary Category*) | **Jeux** (*Games*) › sous-catégorie **Jeu de rôle** (*Role Playing*) |
| Catégorie secondaire (*Secondary*) | **Jeux** › **Aventure** (*Adventure*) |
| Droits relatifs au contenu (*Content Rights*) | **Non, elle ne contient, n'affiche ni n'accède à du contenu tiers.** Textes, images et sons ont été créés pour le jeu ; les polices sont intégrées sous licence SIL Open Font License, ce qui ne constitue pas du contenu tiers au sens de cette question. |
| Classification par âge | voir 7.3 |
| Réglementations et autorisations UE (*App Store Regulations & Permits*) | statut de commerçant déjà déclaré (3.1) |

Ajouter la langue anglaise : en haut à droite de la page, menu de langue › **Anglais (Royaume-Uni)**
(et/ou États-Unis) :

| Case | Valeur (EN) |
| --- | --- |
| Name | `Valombre` |
| Subtitle | `Seven days to escape` |

### 7.2 Confidentialité de l'app (*App Privacy*)

| Case | Valeur |
| --- | --- |
| URL de la politique de confidentialité (FR) | `https://hugobsqtgames.github.io/Valombre/confidentialite.html` |
| Privacy Policy URL (EN) | `https://hugobsqtgames.github.io/Valombre/privacy.html` |
| URL des choix de confidentialité (*User Privacy Choices URL*) | laisser vide (rien à choisir : aucune donnée collectée) |

Puis **Commencer** (*Get Started*) dans « Types de données » :

- *Collectez-vous des données à partir de cette app ?* → **Non, nous ne collectons pas de données à partir de cette app.**
- **Enregistrer**, puis **Publier** (*Publish*) en haut à droite.
- La fiche affichera **Aucune donnée collectée** (*Data Not Collected*).

Pourquoi c'est exact (à savoir si Apple pose la question) : le jeu ne se connecte à rien ; sauvegardes,
mémoires et paramètres restent sur l'iPhone ; le rappel est une notification locale sans jeton.
Apple : « Data that is processed only on device is not "collected" ». Un test du projet échoue si un
appel réseau ou un SDK de suivi est ajouté un jour.

### 7.3 Classification par âge (*Age Rating*)

Informations sur l'app › Classification par âge › **Modifier**. Répondre honnêtement (règle 2.3.6).
Le jeu est un récit de survie après une épidémie : combats contre des infectés et des pillards, morts
possibles du héros et des compagnons, ambiance d'horreur, enfants en danger ; pas de gore détaillé,
pas de contenu sexuel, un seul juron léger. Les intitulés exacts peuvent varier légèrement selon la
version du questionnaire ; garder l'esprit des réponses :

| Thème | Réponse |
| --- | --- |
| Violence de dessin animé ou fantastique (*Cartoon or Fantasy Violence*) | **Fréquente/intense** (combats contre des infectés, au cœur du jeu) |
| Violence réaliste (*Realistic Violence*) | **Peu fréquente/légère** (affrontements avec des pillards, décrits par le texte) |
| Violence réaliste prolongée, graphique ou sadique | **Aucune** |
| Thèmes d'horreur ou de peur (*Horror/Fear Themes*) | **Fréquents/intenses** |
| Thèmes matures ou suggestifs (*Mature/Suggestive Themes*) | **Peu fréquents/légers** (mort, deuil, choix moraux) |
| Grossièretés ou humour cru (*Profanity or Crude Humor*) | **Peu fréquent/léger** |
| Alcool, tabac ou drogues (*Alcohol, Tobacco, or Drug Use or References*) | **Peu fréquent/léger** (cigarettes, alcool à brûler comme combustible, médicaments) |
| Contenu sexuel ou nudité (toutes les questions) | **Aucun** |
| Informations médicales ou de traitement | **Aucune** (soins fictifs, aucun conseil médical) |
| Jeux d'argent simulés, jeux d'argent, concours | **Aucun** / **Non** |
| Accès web illimité (*Unrestricted Web Access*) | **Non** (les deux liens des paramètres ouvrent Safari sur nos pages, sans navigateur intégré) |
| Contenu généré par les utilisateurs, messagerie, chat | **Non** |
| Fonctions d'IA, assistant, chatbot | **Non** |
| Publicité | **Non** |
| Contrôles parentaux, vérification d'âge | **Non** |
| Conçu pour les enfants (*Made for Kids*) | **Non** |
| Âge minimum plus élevé (option) | ne rien choisir |

Classification attendue : **13+** (16+ possible selon la grille d'Apple). Ne pas la sous-évaluer :
c'est un motif de refus et de signalement.

### 7.4 Prix et disponibilité (*Pricing and Availability*)

| Case | Valeur |
| --- | --- |
| Prix | **Gratuit** (*Free*, 0,00 €) |
| Disponibilité | **Tous les pays et régions** (le jeu est en français et en anglais ; limiter si tu préfères) |
| Précommande | Non |
| Appareils Apple Silicon (Mac) / Apple Vision Pro | **Décocher** « Rendre cette app disponible » : le jeu n'a été testé que sur iPhone, et une version Mac ou Vision Pro mal adaptée peut valoir un refus. |

---

## 8. Remplir la version 1.0, case par case

Dans le menu de gauche : **iOS App › 1.0 Préparer la soumission** (*Prepare for Submission*).

**Important** : le numéro de version doit être **`1.0.0`**, comme dans `app.json`. Si App Store
Connect a créé « 1.0 », cliquer sur le numéro et le remplacer par `1.0.0`, sinon le build ne pourra
pas être associé.

### 8.1 Captures d'écran et aperçus vidéo (*App Previews and Screenshots*)

Choisir l'onglet **iPhone 6,9 pouces** (*6.9" Display*). Les autres tailles d'iPhone sont générées à
partir de celle-ci. Pas d'onglet iPad (app iPhone uniquement).

| Langue | Captures (1290 × 2796, dans l'ordre) | Aperçu vidéo (886 × 1920, 29,9 s) |
| --- | --- | --- |
| Français | `promo/out/appstore-fr/01.png` … `06.png` (copies JPEG : `docs/appstore/fr/`) | `docs/promo/app-preview-fr.mp4` |
| Anglais | `promo/out/appstore-en/01.png` … `06.png` (copies JPEG : `docs/appstore/en/`) | `docs/promo/app-preview-en.mp4` |

- Glisser la vidéo **en premier**, puis les 6 captures. Image d'affiche de la vidéo (*Poster frame*) :
  choisir l'instant **7,2 s** (écran titre « Valombre »).
- Conformité vérifiée : formats acceptés par Apple, vraies images de l'app (règles 2.3.3 et 2.3.4),
  adaptées à tous les publics (2.3.8 : silhouettes, ni sang ni mort détaillée), aucune autre plateforme
  citée (2.3.10).

### 8.2 Textes de la version — français

**Texte promotionnel** (*Promotional Text*, modifiable à tout moment sans nouvelle version) :

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

**Mots-clés** (*Keywords*, séparés par des virgules, sans espace) :

```
survie,récit,interactif,choix,horreur,aventure,rpg,histoire,livre,zombie,apocalypse,texte,narratif
```

| Case | Valeur |
| --- | --- |
| URL d'assistance (*Support URL*) | `https://hugobsqtgames.github.io/Valombre/` |
| URL marketing (*Marketing URL*, facultatif) | `https://hugobsqtgames.github.io/Valombre/` |
| Nouveautés de cette version (*What's New*) | absent pour la 1.0 (case non proposée) |

### 8.3 Textes de la version — anglais

Passer la page en **Anglais** (menu de langue en haut à droite) et remplir :

**Promotional Text**:

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

Support URL et Marketing URL : les mêmes qu'en français.

### 8.4 Build

Section **Build** › **+** (ou *Ajouter un build*) › choisir le build testé dans TestFlight
(1.0.0, numéro le plus récent) › Terminé. Aucune question de chiffrement ne doit apparaître.

### 8.5 Informations générales de la version

| Case | Valeur |
| --- | --- |
| Copyright | `2026 Hugo Anselme Busquet` |
| Notation du *Game Center* | non utilisé (ne rien activer) |
| Routage (*Routing App Coverage File*) | rien (sans objet) |

### 8.6 Publication de la version (*App Store Version Release*)

Choisir **Publier manuellement cette version** (*Manually release this version*) : après
l'acceptation, tu choisis le moment de la mise en ligne (bouton *Publier cette version*).
Publication progressive (*Phased release*) : sans intérêt pour une première version.

---

## 9. Informations pour la vérification (*App Review Information*)

En bas de la page de la version 1.0.

| Case | Valeur |
| --- | --- |
| Connexion requise (*Sign-in required*) | **décoché** (aucun compte dans le jeu) |
| Prénom | `Hugo` |
| Nom | `Busquet` (ou `Anselme Busquet`) |
| Numéro de téléphone | ton numéro au format international, par ex. `+33 6 12 34 56 78` (obligatoire, jamais publié ; Apple peut appeler en cas de question) |
| Adresse e-mail | `hugobsqt.collab@gmail.com` |
| Pièce jointe (*Attachment*) | rien (facultatif) |

**Notes** (*Notes*) — coller exactement ce texte (en anglais, langue des vérificateurs ;
4 000 caractères au plus, vérifié par `npm run store:check`) :

```text
Thank you for reviewing Valombre.

WHAT THE APP IS
Valombre is a single-player, fully offline interactive survival story for iPhone (text-based narrative with choices, dice checks and turn-based combat), in English and French. The language follows the device and can be changed in Settings > Language.

NO ACCOUNT, NO NETWORK, NO PURCHASES
- No login or account of any kind; no demo account is needed.
- The app makes no network requests: no server, no analytics, no ads, no tracking, no third-party SDK that collects data. It works entirely in Airplane Mode.
- No in-app purchases, no subscriptions, no external payment links.
- App Privacy is "Data Not Collected": saves, achievements and settings are stored only on the device.

HOW TO REVIEW (about 10 minutes)
1. First launch: a 44-second opening film plays once (a "Skip" button is visible from the first frame; it can be replayed in Settings > Replay the intro). Then the title screen "Valombre": tap "New game", then "Start here" on an empty slot.
2. Create a character in 5 short steps (Identity, Profile, Background, Attributes, Departure) and tap "Take the watch". A chapter card appears, then an optional tutorial ("Skip the tutorial" is available).
3. Read and tap choices. Some choices show a success chance and roll two dice; tapping the chance opens the "Roll breakdown".
4. Combat is turn-based and starts naturally during Chapter 1 (for example at Delorme Hospital, if the stealth roll in the kitchens fails) and regularly afterwards. Actions: Strike, Defend, Dodge, Item, Flee; each enemy shows its next intent.
5. Bottom tabs: Story, Sheet, Bag (equip, use, drop items; "Workshop" for crafting and repairs), Map, Notebook (quests, chronicle, archives).
6. Pause button (top right): Resume, Settings, Copy to another slot, Quit to menu. The game saves automatically after every decision; "Continue" on the title screen resumes it.
7. Memories (title screen): achievements, faces, enemy codex. The choice tree and "Replay a chapter" open after a first finished game (an ending, or a death with no one to take over), as stated in that screen.
8. If the hero dies while a companion is present, "Taking over" lets that companion continue (permadeath otherwise).

PERMISSIONS
The only permission is notifications, requested only if the player turns on Settings > Resume reminder. It schedules a single LOCAL notification on the device 48 hours after leaving a game in progress, cancelled when the player returns. No push server and no push token are used (the push entitlement is added automatically by the notifications library but is not used).

PRIVACY AND DATA DELETION
Settings > About > Privacy Policy shows the full policy inside the app (readable offline), with links to the online policy and the support page (they open in Safari). Settings > Start from scratch > Erase everything deletes all data stored by the game (two confirmations). Individual saves can be deleted from Load a game.

CONTENT
Post-epidemic survival story with violence against infected creatures and some human raiders, horror themes and character deaths, described in text with silhouette illustrations; no sexual content, no graphic gore. The age rating was answered accordingly.

ACCESSIBILITY AND DEVICES
iPhone only (portrait). Supports Dynamic Type, Reduce Motion, VoiceOver labels and an in-game text size setting. On iPad it runs in iPhone compatibility mode.

Contact: hugobsqt.collab@gmail.com
```

---

## 10. Soumettre, suivre, publier

1. En haut de la page de la version : **Ajouter pour vérification** (*Add for Review*), puis
   **Soumettre pour vérification** (*Submit for Review*). Si un bouton reste grisé, App Store Connect
   indique la case manquante en rouge.
2. Statuts successifs : *Prêt pour soumission* → **En attente de vérification** (*Waiting for Review*)
   → **En cours de vérification** (*In Review*) → **En attente de publication par le développeur**
   (*Pending Developer Release*).
3. Délai habituel : 24 à 48 heures. Garder un œil sur les e-mails et l'app App Store Connect.
4. Une fois accepté : **Publier cette version** (*Release This Version*). L'app apparaît sur l'App Store
   en quelques heures (jusqu'à 24 h selon les pays).

---

## 11. En cas de refus

- Le message arrive dans **Centre de résolution** (*Resolution Center*, page App Review de l'app),
  avec le numéro de la règle invoquée.
- Lire calmement, corriger exactement ce qui est demandé, puis **répondre dans le Centre de
  résolution** en expliquant la correction (en anglais, poliment, factuellement).
- Si le refus vient d'un malentendu (par exemple « fonction introuvable »), répondre avec les étapes
  pour y accéder, sans renvoyer de build.
- Si une correction du code est nécessaire : nouveau build (`--auto-submit`), choisir ce build dans la
  version 1.0, soumettre à nouveau.
- Désaccord persistant : formulaire d'appel (*App Review Board*) sur developer.apple.com/contact/app-store.

Motifs fréquents et pourquoi Valombre est couvert :

| Règle | Motif fréquent | Couverture dans Valombre |
| --- | --- | --- |
| 2.1 | plantage, lien mort, contenu temporaire | 172 tests, monkey et stress tests ; pages en ligne vérifiées (étape 2) ; aucun texte provisoire |
| 2.2 | version démo ou bêta | jeu complet, aucune mention « démo » ni « bêta » |
| 2.3.1 | fonction annoncée introuvable | les notes expliquent où trouver chaque fonction, y compris celles qui se débloquent |
| 2.3.3 / 2.3.4 | captures ou vidéo trompeuses | vraies images de l'app |
| 2.3.6 | classification par âge sous-évaluée | réponses détaillées en 7.3 |
| 2.3.10 | autre plateforme citée | aucune mention d'Android ni d'autre plateforme (vérifié par script) |
| 4.2 | fonctionnalité minimale | jeu natif complet de 15 chapitres |
| 5.1.1 | politique absente ou incomplète | politique dans l'app et en ligne, conforme aux 3 exigences d'Apple |
| 5.1.1 (v) | compte sans suppression | aucun compte ; « Tout effacer » disponible |
| 4.5.4 | notifications abusives | rappel local facultatif, désactivé par défaut, jamais publicitaire |

---

## 12. Mises à jour suivantes

1. Modifier le code, puis `npm run preflight`.
2. Augmenter la version dans `app.json` (`"version": "1.0.1"` pour un correctif, `"1.1.0"` pour des
   nouveautés). Le numéro de build s'incrémente tout seul.
3. Si une fonctionnalité touche aux données : mettre à jour `src/legal/privacy.ts` (et sa date), puis
   `npm run legal`, et la réponse « Confidentialité de l'app » si nécessaire.
4. `npx eas-cli@latest build --platform ios --profile production --auto-submit`
5. Tester dans TestFlight, puis App Store Connect › **+ Version** › même procédure, en remplissant
   *Nouveautés de cette version*.

---

## 13. Liste de contrôle finale

- [ ] `npm run preflight` entièrement vert.
- [ ] Dépôt renommé « Valombre », branche fusionnée dans `main`, GitHub Pages actif.
- [ ] Les 3 URL s'ouvrent dans Safari.
- [ ] Contrat « Free Apps » accepté, statut de commerçant déclaré.
- [ ] App créée : nom `Valombre`, bundle `fr.valombre.app`, SKU `valombre-ios`.
- [ ] Build EAS terminé, envoyé, visible dans TestFlight.
- [ ] Toute la liste 6.2 cochée sur un vrai iPhone.
- [ ] Informations sur l'app : sous-titres FR/EN, catégories, droits sur le contenu.
- [ ] Confidentialité : 2 URL, « Aucune donnée collectée » publié.
- [ ] Classification par âge remplie (≈ 13+).
- [ ] Prix gratuit, disponibilité choisie, Mac et Vision Pro décochés.
- [ ] Version `1.0.0` : vidéo + 6 captures en FR et en EN, textes FR et EN, mots-clés, URL, copyright.
- [ ] Build associé à la version.
- [ ] Informations de vérification : coordonnées avec téléphone, connexion non requise, notes collées.
- [ ] Publication manuelle choisie.
- [ ] Soumettre pour vérification.
