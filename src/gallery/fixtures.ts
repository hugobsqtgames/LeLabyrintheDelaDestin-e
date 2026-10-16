/**
 * États de démonstration pour la galerie de maquettes.
 * Tous sont produits par le vrai moteur (choix, combats, effets) : les
 * maquettes montrent exactement ce que le joueur verra.
 */
import { CONTENT } from '../content';
import { maxHp } from '../engine/character';
import { performAction } from '../engine/combat';
import { applyEffects } from '../engine/effects';
import { addItem, equip } from '../engine/inventory';
import { choose, enterScene, newGame } from '../engine/narrative';
import type { CharacterDraft, GameContent, GameState } from '../engine/types';
import { serialize } from '../persistence/schema';
import type { AppModel, SavesMode, Tab } from '../store/GameStore';
import { DEFAULT_SETTINGS } from '../store/settings';
import type { ScreenProps } from '../AppRouter';

/** Contenu utilisé pour construire les états (français par défaut, ou la langue demandée). */
let C: GameContent = CONTENT;

export const DEMO_DRAFT: CharacterDraft = {
  name: 'Lou Ardent',
  profile: 'eclaireur',
  background: 'ambulancier',
  emblem: 'corbeau',
  allocated: { force: 1, discretion: 2, survie: 2, astuce: 1 },
};

function base(seed = 7): GameState {
  return newGame(C, DEMO_DRAFT, { seed, id: 'demo', now: 0 });
}

function pick(s: GameState, choiceId: string): GameState {
  const r = choose(C, s, s.currentScene, choiceId);
  return r.ok ? r.state : s;
}

/** Une partie avancée au chapitre 2, avec compagnons, quêtes et chronique fournie. */
export function midGame(): GameState {
  let s = base(11);
  for (const c of ['noter', 'dire', 'porte', 'expertise', 'ouvrir', 'dette', 'accepter', 'theo', 'partir', 'reserve', 'partir', 'super']) s = pick(s, c);
  s = pick(s, 'partir');
  for (const c of ['hopital', 'morgue', 'monter', 'lire', 'partir', 'clocher']) s = pick(s, c);
  s = applyEffects(C, s, [{ type: 'giveItem', item: 'ration', qty: 2 }]);
  for (const c of ['donner', 'partir', 'rentrer', 'donner', 'respecter', 'monter']) s = pick(s, c);
  // Raccourci narratif cohérent vers le chapitre 2.
  s = applyEffects(C, s, [
    { type: 'companion', character: 'maelle', status: 'companion' },
    { type: 'companion', character: 'theo', status: 'companion' },
    { type: 'companion', character: 'ines', status: 'companion' },
    { type: 'relation', character: 'ines', amount: 3 },
    { type: 'quest', quest: 'q_malik', status: 'active', step: 'chercher' },
    { type: 'quest', quest: 'q_veilleurs', status: 'active', step: 'demande' },
    { type: 'world', location: 'pharmacie', change: 'incendie' },
    { type: 'journal', text: 'La pharmacie Saint-Clair a brûlé. Le groupe s’enfonce sous la ville.' },
    { type: 'xp', amount: 160 },
  ]);
  s = enterScene(C, { ...s, combat: null }, 'c2_ossuaire');
  for (const l of ['brasserie', 'galerie_craie', 'puits_noye', 'ossuaire', 'grande_salle']) s = applyEffects(C, s, [{ type: 'discover', location: l }]);
  return { ...s, notices: [] };
}

export interface Mockup {
  id: string;
  title: string;
  caption: string;
  model: Partial<AppModel>;
  screenProps?: ScreenProps;
}

function game(state: GameState, tab: Tab = 'story', extra: Partial<AppModel> = {}): Partial<AppModel> {
  return { route: 'game', game: state, tab, slot: 1, ...extra };
}

export function buildMockups(content: GameContent = CONTENT): Mockup[] {
  C = content;
  const start = base();
  const kazDoor = (() => {
    let s = pick(pick(pick(start, 'noter'), 'dire'), 'porte');
    // Éclaireur sans passé d'ambulancier pour montrer un choix verrouillé.
    s = { ...s, player: { ...s.player, background: 'cataphile' } };
    return s;
  })();
  const checkResult = (() => {
    for (let seed = 1; seed < 40; seed += 1) {
      const s = pick(base(seed), 'regler');
      if (s.lastCheck?.success) return s;
    }
    return pick(base(), 'regler');
  })();
  const combat = (() => {
    let s = enterScene(C, pick(start, 'noter'), 'c1_super_combat');
    s = performAction(C, s, { type: 'attack', weapon: 'ranged', target: 'e1' });
    s = performAction(C, s, { type: 'attack', weapon: 'melee', target: 'e1' });
    return s;
  })();
  const boss = (() => {
    let s = midGame();
    s = enterScene(C, s, 'c2_berger_isole');
    s = addItem(C, s, 'molotov', 2).state;
    s = performAction(C, s, { type: 'item', item: 'molotov', target: 'e1' });
    s = performAction(C, s, { type: 'skill', target: 'e1' });
    s = { ...s, player: { ...s.player, hp: Math.max(9, Math.round(maxHp(C, s) * 0.55)) } };
    return s;
  })();
  const levelUp = (() => {
    const s = midGame();
    return { ...s, player: { ...s.player, unspentStatPoints: 1, unspentPerks: 1 } };
  })();
  const fullBag = (() => {
    let s = midGame();
    for (const [id, q] of [['machette', 1], ['gilet', 1], ['trousse', 2], ['cafeine', 2], ['carreau', 6], ['composants', 2], ['carnet_malik', 1], ['semelles', 1], ['fusee', 2]] as const) {
      s = addItem(C, s, id, q, false).state;
    }
    s = equip(C, s, 'semelles');
    s = { ...s, ground: { masse: 1 } };
    return s;
  })();
  const emptyBag = { ...base(), inventory: {}, equipment: { melee: null, ranged: null, armor: null, accessory: null } };
  const chapterEnd = (() => {
    const s = midGame();
    return enterScene(C, { ...s, chapter: 'c1' }, 'c1_fin');
  })();
  const death = (() => {
    // Personne pour prendre la relève : la mort est définitive.
    const s = applyEffects(C, midGame(), [
      { type: 'companion', character: 'ines', status: 'away' },
      { type: 'companion', character: 'maelle', status: 'away' },
      { type: 'companion', character: 'kaz', status: 'away' },
    ]);
    return enterScene(C, s, 'c2_mort_berger');
  })();
  const relay = (() => {
    // Mort sur la route, Kaz, Maëlle et Inès présents : la relève est proposée, le corps peut être fouillé.
    let s = applyEffects(C, midGame(), [
      { type: 'giveItem', item: 'molotov', qty: 1 },
      { type: 'giveItem', item: 'bandage', qty: 2 },
    ]);
    s = { ...s, chapter: 'r6' };
    return enterScene(C, { ...s, previousScene: 'r6_passe' }, 'r6_mort');
  })();
  const ending = (() => {
    let s = midGame();
    s = applyEffects(C, s, [
      { type: 'setFlag', flag: 'theo_soigne' },
      { type: 'setFlag', flag: 'veilleurs_allies' },
      { type: 'setFlag', flag: 'verite_ferrand' },
      { type: 'setFlag', flag: 'prisonniers_liberes' },
      { type: 'setFlag', flag: 'cloche_utilisee' },
      { type: 'setFlag', flag: 'promis_maelle' },
      { type: 'companion', character: 'nour', status: 'companion' },
      { type: 'companion', character: 'kaz', status: 'dead' },
      { type: 'quest', quest: 'q_theo', status: 'completed', step: 'choix' },
      { type: 'quest', quest: 'q_malik', status: 'completed' },
    ]);
    return enterScene(C, s, 'c4_fin_accord');
  })();

  const assault = (() => {
    const s = enterScene(C, pick(start, 'noter'), 'c1_assaut');
    return { ...s, notices: [] };
  })();
  const archives = (() => {
    let s = midGame();
    s = applyEffects(C, s, [
      { type: 'document', doc: 'doc_carte_theo' },
      { type: 'document', doc: 'doc_affiche' },
      { type: 'document', doc: 'doc_lettre' },
      { type: 'setFlag', flag: 'theo_soigne' },
      { type: 'diary', chapter: 'c1' },
    ]);
    return { ...s, notices: [] };
  })();
  const worn = (() => {
    let s = midGame();
    s = addItem(C, s, 'chiffons', 2, false).state;
    s = addItem(C, s, 'alcool', 1, false).state;
    s = addItem(C, s, 'ferraille', 2, false).state;
    s = addItem(C, s, 'machette', 1, false).state;
    const melee = s.equipment.melee;
    return { ...s, durability: melee ? { ...s.durability, [melee]: 9 } : s.durability, clock: 58 };
  })();

  const slots = () => {
    const mid = midGame();
    return [
      { slot: 1, status: 'ok' as const, savedAt: Date.UTC(2026, 9, 12, 21, 40), summary: JSON.parse(serialize(C, mid, 0)).summary },
      { slot: 2, status: 'corrupt' as const, error: 'Sauvegarde altérée (somme de contrôle incorrecte).' },
      { slot: 3, status: 'empty' as const },
    ];
  };

  const savesModel = (mode: SavesMode): Partial<AppModel> => ({ route: 'saves', savesMode: mode });

  return [
    { id: 'title', title: 'Écran titre', caption: 'Emblème animé, reprise de la dernière partie, menu principal.', model: { route: 'title' } },
    { id: 'create-id', title: 'Création · identité', caption: 'Nom validé en direct et choix d’un emblème.', model: { route: 'create' }, screenProps: { create: { initialDraft: { ...DEMO_DRAFT, profile: null, background: null, allocated: { force: 0, discretion: 0, survie: 0, astuce: 0 } }, initialStep: 0 } } },
    { id: 'create-profile', title: 'Création · profil', caption: 'Trois profils, leurs bonus et leur compétence de combat. État sélectionné.', model: { route: 'create' }, screenProps: { create: { initialDraft: { ...DEMO_DRAFT, background: null, allocated: { force: 0, discretion: 0, survie: 0, astuce: 0 } }, initialStep: 1 } } },
    { id: 'create-stats', title: 'Création · aptitudes', caption: 'Budget de points, plafonds, conséquences calculées par le moteur.', model: { route: 'create' }, screenProps: { create: { initialDraft: { ...DEMO_DRAFT, allocated: { force: 0, discretion: 2, survie: 1, astuce: 0 } }, initialStep: 3 } } },
    { id: 'create-summary', title: 'Création · récapitulatif', caption: 'Dernière vérification avant de prendre la garde.', model: { route: 'create', pendingSlot: 1 }, screenProps: { create: { initialDraft: DEMO_DRAFT, initialStep: 4 } } },
    { id: 'transition', title: 'Transition de chapitre', caption: 'Carton plein écran à chaque nouveau chapitre, teinté par l’ambiance du chapitre.', model: game(midGame()), screenProps: { game: { intro: true } } },
    { id: 'story', title: 'Récit · ouverture', caption: 'Bandeau du lieu, narration, dialogue radio, choix numérotés avec probabilité.', model: game(start), screenProps: { game: { intro: false } } },
    { id: 'story-art', title: 'Récit · illustration et choix chronométré', caption: 'Illustration plein cadre aux moments clés, compte à rebours avec choix de repli (désactivable).', model: game(assault), screenProps: { game: { intro: false } } },
    { id: 'story-locked', title: 'Récit · dialogue et choix verrouillé', caption: 'Répliques des personnages ; un choix réservé à un passé, avec sa raison.', model: game(kazDoor), screenProps: { game: { intro: false } } },
    { id: 'story-check', title: 'Récit · jet et conséquences', caption: 'Résultat du jet 2d6, journal des effets appliqués.', model: game(checkResult), screenProps: { game: { intro: false } } },
    { id: 'combat', title: 'Combat', caption: 'Intentions annoncées, ciblage, actions avec chances, journal.', model: game(combat), screenProps: { game: { intro: false } } },
    { id: 'boss', title: 'Combat · boss', caption: 'Le Berger : faiblesses, statuts, phases.', model: game(boss), screenProps: { game: { intro: false } } },
    { id: 'recap', title: 'Reprise · que s’est-il passé ?', caption: 'Résumé affiché au chargement : lieu, heure, objectif, derniers faits, journal.', model: game(midGame(), 'story', { recap: true }), screenProps: { game: { intro: false } } },
    { id: 'archives', title: 'Carnet · archives', caption: 'Documents trouvés (à lire sur papier) et pages du journal intime.', model: game(archives, 'archives'), screenProps: { game: { intro: false } } },
    { id: 'workshop', title: 'Sac · usure et comparaison', caption: 'Solidité des armes, matériaux pour l’atelier, horloge des sept jours.', model: game(worn, 'inventory'), screenProps: { game: { intro: false } } },
    { id: 'character', title: 'Fiche · progression', caption: 'Points et compétence à attribuer, relations.', model: game(levelUp, 'character'), screenProps: { game: { intro: false } } },
    { id: 'inventory', title: 'Sac · plein', caption: 'Charge, équipement, objet trop lourd laissé au sol.', model: game(fullBag, 'inventory'), screenProps: { game: { intro: false } } },
    { id: 'inventory-empty', title: 'Sac · vide', caption: 'État vide explicite.', model: game(emptyBag, 'inventory'), screenProps: { game: { intro: false } } },
    { id: 'map', title: 'Carte', caption: 'Lieux révélés progressivement, notes des changements du monde.', model: game(midGame(), 'map'), screenProps: { game: { intro: false } } },
    { id: 'quests', title: 'Quêtes', caption: 'Principales et secondaires, étapes franchies.', model: game(midGame(), 'quests'), screenProps: { game: { intro: false } } },
    { id: 'chronicle', title: 'Chronique', caption: 'Toutes les décisions, longue liste virtualisée.', model: game(midGame(), 'chronicle'), screenProps: { game: { intro: false } } },
    { id: 'chapter-end', title: 'Fin de chapitre', caption: 'Bilan des événements marquants du chapitre.', model: game(chapterEnd), screenProps: { game: { intro: false } } },
    { id: 'pause', title: 'Pause', caption: 'Autosauvegarde, copie vers un emplacement, paramètres.', model: game(midGame()), screenProps: { game: { initialPaused: true } } },
    { id: 'settings', title: 'Paramètres', caption: 'Langue, ambiance sonore, choix chronométrés, animations, taille du texte.', model: { route: 'settings' } },
    { id: 'saves', title: 'Sauvegardes', caption: 'Emplacements, sauvegarde corrompue, suppression confirmée.', model: savesModel('load'), screenProps: { saves: { initialSlots: slots() } } },
    { id: 'tutorial', title: 'Tutoriel · les choix', caption: 'Visite guidée au premier lancement : récit, choix et probabilités, bandeau, horloge, chaque onglet. Rejouable dans les paramètres.', model: game(start, 'story', { settings: { ...DEFAULT_SETTINGS, tutorialDone: false } }), screenProps: { game: { intro: false, tutorialStep: 2 } } },
    { id: 'tutorial-tab', title: 'Tutoriel · un onglet', caption: 'Chaque étape ouvre l’onglet qu’elle présente et l’entoure dans la barre.', model: game(midGame(), 'inventory', { settings: { ...DEFAULT_SETTINGS, tutorialDone: false } }), screenProps: { game: { intro: false, tutorialStep: 7 } } },
    { id: 'relay', title: 'Relève · un compagnon reprend la route', caption: 'À la mort du héros, un compagnon jouable prend le relais avec sa propre fiche ; fouille du corps limitée à trois objets.', model: game(relay), screenProps: { game: { intro: false } } },
    { id: 'death', title: 'Mort définitive', caption: 'Épitaphe, récapitulatif, recommencer sans écraser.', model: game(death), screenProps: { game: { intro: false } } },
    { id: 'ending', title: 'Fin · L’Accord', caption: 'Épilogue conditionné par les choix, alliés, bilan.', model: game(ending), screenProps: { game: { intro: false } } },
  ];
}
