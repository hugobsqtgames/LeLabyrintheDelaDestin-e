/**
 * Politique de confidentialité : source unique. Affichée telle quelle dans
 * l'application (Paramètres → À propos, lisible hors ligne) et publiée en
 * pages web par scripts/build-legal.ts (docs/confidentialite.html,
 * docs/privacy.html). Un test vérifie que les pages publiées sont à jour.
 *
 * Elle doit décrire exactement ce que fait l'application : la modifier dès
 * qu'une fonctionnalité touche aux données (et mettre à jour la date).
 */
import type { Lang } from '../i18n/lang';

export const PUBLISHER = 'Hugo Anselme Busquet';
export const CONTACT_EMAIL = 'hugobsqt.collab@gmail.com';
/** Adresse publique des pages (GitHub Pages du dépôt « Valombre », dossier docs/). */
export const SITE_URL = 'https://hugobsqtgames.github.io/Valombre';
export const PRIVACY_URL: Record<Lang, string> = {
  fr: `${SITE_URL}/confidentialite.html`,
  en: `${SITE_URL}/privacy.html`,
};
export const SUPPORT_URL = `${SITE_URL}/`;

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
}

export const PRIVACY: Record<Lang, LegalDoc> = {
  fr: {
    title: 'Politique de confidentialité de Valombre',
    updated: 'En vigueur au 21 octobre 2026',
    summary:
      'Valombre ne collecte aucune donnée personnelle. Le jeu fonctionne entièrement hors ligne : il n’a ni compte, ni publicité, ni outil de mesure d’audience, et n’envoie rien à personne. Vos parties restent sur votre appareil.',
    sections: [
      {
        title: '1. Qui sommes-nous',
        paragraphs: [
          `Valombre est un jeu publié par ${PUBLISHER} (« l’éditeur », « nous »). Pour toute question sur cette politique ou sur vos données, écrivez à ${CONTACT_EMAIL}.`,
        ],
      },
      {
        title: '2. Données collectées : aucune',
        paragraphs: [
          'Nous ne collectons, ne recevons et ne conservons aucune donnée vous concernant : ni nom, ni adresse e-mail, ni identifiant d’appareil, ni identifiant publicitaire, ni localisation, ni contacts, ni photos, ni données d’usage, ni rapports de plantage.',
          'L’application ne contient aucune connexion à un serveur, aucun kit de développement (SDK) tiers d’analyse, de publicité, de suivi ou de rapport d’erreurs. Elle ne vous suit pas d’une application ou d’un site à l’autre et ne vous demande donc pas d’autorisation de suivi.',
        ],
      },
      {
        title: '3. Ce qui reste sur votre appareil',
        paragraphs: [
          'Pour que le jeu fonctionne, certaines informations sont enregistrées uniquement dans l’espace de stockage de l’application, sur votre appareil :',
          '• vos sauvegardes de partie (jusqu’à trois emplacements), avec le nom que vous donnez à votre personnage — vous pouvez inventer n’importe quel nom —, vos choix et votre progression, ainsi qu’une copie de secours et, le cas échéant, l’état d’une partie juste avant une relève ;',
          '• le début des chapitres déjà atteints (fonction « Rejouer un chapitre ») ;',
          '• vos « mémoires » : succès obtenus, personnages rencontrés, ennemis croisés, fins vues ;',
          '• vos paramètres : langue, volume de l’ambiance sonore, taille du texte, animations, vibrations, rappels.',
          'Ces informations ne quittent jamais l’appareil par l’intermédiaire du jeu : nous n’y avons pas accès. Si vous activez la sauvegarde de votre appareil (iCloud ou ordinateur), le système peut les inclure dans cette sauvegarde, selon vos réglages et sous la responsabilité d’Apple.',
        ],
      },
      {
        title: '4. Rappels (notifications locales)',
        paragraphs: [
          'Si vous l’activez dans Paramètres, le jeu programme sur votre appareil un rappel unique, affiché deux jours après que vous avez quitté une partie en cours, et annulé dès que vous revenez jouer. L’autorisation d’afficher des notifications vous est demandée à l’activation.',
          'Ce rappel est créé et affiché par votre appareil : il n’y a aucun serveur de notifications et aucun jeton de notification n’est créé ni envoyé. Vous pouvez désactiver les rappels à tout moment dans les paramètres du jeu ou dans les Réglages de votre appareil (Notifications › Valombre).',
        ],
      },
      {
        title: '5. Autorisations',
        paragraphs: [
          'La seule autorisation que le jeu peut demander est celle des notifications, et seulement si vous activez les rappels. Il n’accède ni à l’appareil photo, ni au micro, ni à la localisation, ni aux contacts, ni aux photos.',
        ],
      },
      {
        title: '6. Partage avec des tiers',
        paragraphs: [
          'Comme nous ne collectons aucune donnée, nous n’en partageons ni n’en vendons aucune. Aucun tiers (outil d’analyse, réseau publicitaire, SDK tiers ou entité liée à l’éditeur) n’a accès à des données vous concernant par l’intermédiaire du jeu. Si cela devait changer, ce tiers devrait offrir une protection au moins égale à celle décrite ici, et cette politique serait mise à jour avant tout changement.',
          'Les polices de caractères et les sons sont intégrés à l’application : rien n’est téléchargé pendant que vous jouez.',
          'Apple peut, indépendamment de nous, nous transmettre des statistiques agrégées et anonymes (par exemple des rapports de plantage) si vous avez accepté de partager ces informations avec les développeurs dans les Réglages de votre appareil. Ce partage est régi par la politique de confidentialité d’Apple et vous pouvez le désactiver dans Réglages › Confidentialité et sécurité › Analyse et améliorations.',
        ],
      },
      {
        title: '7. Conservation et suppression',
        paragraphs: [
          'Les données du jeu restent sur votre appareil tant que vous ne les supprimez pas. Vous pouvez à tout moment :',
          '• supprimer une sauvegarde : Charger une partie › Supprimer ;',
          '• tout effacer (sauvegardes, mémoires, chapitres à rejouer et paramètres) : Paramètres › Recommencer de zéro › Tout effacer ;',
          '• supprimer l’application : toutes ses données sont alors effacées de l’appareil.',
          'Comme nous ne détenons aucune donnée vous concernant, il n’y a rien à supprimer de notre côté ; vous pouvez néanmoins nous écrire pour toute demande, à laquelle nous répondrons.',
        ],
      },
      {
        title: '8. Consentement et vos droits',
        paragraphs: [
          'Le seul consentement que le jeu vous demande concerne les notifications ; vous le retirez en désactivant les rappels (dans le jeu ou dans les Réglages de l’appareil).',
          'Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez de droits d’accès, de rectification, d’effacement, d’opposition et de limitation. Aucune donnée vous concernant n’étant traitée par l’éditeur, ces droits s’exercent directement sur votre appareil comme indiqué ci-dessus ; pour toute question, écrivez-nous. Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).',
        ],
      },
      {
        title: '9. Enfants',
        paragraphs: [
          'Le jeu ne collecte aucune donnée, y compris auprès des enfants. Il contient des scènes de violence et d’horreur et n’est pas destiné aux jeunes enfants : reportez-vous à la classification par âge indiquée sur l’App Store.',
        ],
      },
      {
        title: '10. Cette page web',
        paragraphs: [
          'Cette politique est publiée sur GitHub Pages. En consultant cette page (et non le jeu), votre navigateur se connecte aux serveurs de GitHub, qui peuvent enregistrer des données techniques comme l’adresse IP, conformément à la déclaration de confidentialité de GitHub. Le jeu, lui, affiche la même politique sans connexion.',
        ],
      },
      {
        title: '11. Modifications',
        paragraphs: [
          'Si le fonctionnement du jeu change d’une manière qui concerne vos données, cette politique sera mise à jour avant la nouvelle version, avec une nouvelle date d’entrée en vigueur. La version en vigueur est toujours consultable dans le jeu (Paramètres › À propos) et à cette adresse.',
        ],
      },
    ],
  },
  en: {
    title: 'Valombre Privacy Policy',
    updated: 'Effective 21 October 2026',
    summary:
      'Valombre does not collect any personal data. The game runs entirely offline: it has no account, no ads and no analytics, and it sends nothing to anyone. Your games stay on your device.',
    sections: [
      {
        title: '1. Who we are',
        paragraphs: [
          `Valombre is a game published by ${PUBLISHER} (“the publisher”, “we”). For any question about this policy or your data, write to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        title: '2. Data collected: none',
        paragraphs: [
          'We do not collect, receive or keep any data about you: no name, no email address, no device identifier, no advertising identifier, no location, no contacts, no photos, no usage data and no crash reports.',
          'The app makes no connection to any server and contains no third-party software development kit (SDK) for analytics, advertising, tracking or error reporting. It does not track you across other companies’ apps or websites, so it never asks for tracking permission.',
        ],
      },
      {
        title: '3. What stays on your device',
        paragraphs: [
          'For the game to work, some information is stored only in the app’s storage on your device:',
          '• your saved games (up to three slots), including the name you give your character — you can make up any name —, your choices and progress, plus a backup copy and, where relevant, the state of a game just before a companion takes over;',
          '• the start of chapters you have reached (the “Replay a chapter” feature);',
          '• your “memories”: achievements earned, characters met, enemies encountered, endings seen;',
          '• your settings: language, ambient sound volume, text size, animations, haptics, reminders.',
          'This information never leaves the device through the game: we have no access to it. If you enable device backups (iCloud or a computer), the system may include it in those backups, according to your settings and under Apple’s responsibility.',
        ],
      },
      {
        title: '4. Reminders (local notifications)',
        paragraphs: [
          'If you turn them on in Settings, the game schedules a single reminder on your device, shown two days after you leave a game in progress and cancelled as soon as you come back to play. You are asked for permission to show notifications when you turn them on.',
          'The reminder is created and shown by your device: there is no notification server and no notification token is created or sent. You can turn reminders off at any time in the game’s settings or in your device Settings (Notifications › Valombre).',
        ],
      },
      {
        title: '5. Permissions',
        paragraphs: [
          'The only permission the game may request is notifications, and only if you turn reminders on. It does not access the camera, microphone, location, contacts or photos.',
        ],
      },
      {
        title: '6. Sharing with third parties',
        paragraphs: [
          'Since we collect no data, we share or sell none. No third party (analytics tool, advertising network, third-party SDK or entity related to the publisher) has access to any data about you through the game. Should that ever change, such a third party would have to provide the same or equal protection as described here, and this policy would be updated before any change.',
          'Fonts and sounds are bundled with the app: nothing is downloaded while you play.',
          'Independently of us, Apple may provide us with aggregated, anonymous statistics (such as crash reports) if you have chosen to share this information with app developers in your device Settings. This is governed by Apple’s privacy policy, and you can turn it off in Settings › Privacy & Security › Analytics & Improvements.',
        ],
      },
      {
        title: '7. Retention and deletion',
        paragraphs: [
          'Game data stays on your device until you delete it. At any time you can:',
          '• delete a saved game: Load a game › Delete;',
          '• erase everything (saves, memories, replayable chapters and settings): Settings › Start from scratch › Erase everything;',
          '• delete the app: all of its data is then removed from the device.',
          'As we hold no data about you, there is nothing to delete on our side; you are nevertheless welcome to write to us with any request, and we will answer.',
        ],
      },
      {
        title: '8. Consent and your rights',
        paragraphs: [
          'The only consent the game asks for concerns notifications; you withdraw it by turning reminders off (in the game or in your device Settings).',
          'Under the General Data Protection Regulation (GDPR) and applicable laws, you have rights of access, rectification, erasure, objection and restriction. As the publisher processes no data about you, these rights are exercised directly on your device as described above; for any question, write to us. You may also lodge a complaint with your data protection authority (in France, the CNIL: www.cnil.fr).',
        ],
      },
      {
        title: '9. Children',
        paragraphs: [
          'The game collects no data from anyone, including children. It contains scenes of violence and horror and is not intended for young children: see the age rating shown on the App Store.',
        ],
      },
      {
        title: '10. This web page',
        paragraphs: [
          'This policy is published on GitHub Pages. When you view this page (not the game), your browser connects to GitHub’s servers, which may log technical data such as your IP address under GitHub’s privacy statement. The game itself shows the same policy without any connection.',
        ],
      },
      {
        title: '11. Changes',
        paragraphs: [
          'If the game changes in a way that affects your data, this policy will be updated before the new version, with a new effective date. The current version is always available in the game (Settings › About) and at this address.',
        ],
      },
    ],
  },
};
