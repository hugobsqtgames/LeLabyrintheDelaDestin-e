/**
 * Données de l'univers : profils, passés, compétences, personnages, lieux,
 * quêtes, chapitres et fins.
 */
import type {
  BackgroundDef,
  BackgroundId,
  ChapterDef,
  CharacterDef,
  EndingDef,
  LocationDef,
  PerkDef,
  PerkId,
  ProfileDef,
  ProfileId,
  QuestDef,
} from '../engine/types';

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

export const PROFILES: Record<ProfileId, ProfileDef> = {
  guerrier: {
    id: 'guerrier',
    name: 'Guerrier',
    tagline: 'Encaisser. Protéger. Frapper.',
    description:
      'Vous avez appris à vous battre avant la Fièvre, et vous n’avez jamais arrêté. Vous ouvrez les portes que les autres contournent et vous tenez la ligne quand tout cède.',
    bonuses: { force: 2, survie: 1 },
    skill: {
      name: 'Charge brutale',
      description: 'Une frappe de mêlée qui inflige 180 % des dégâts et étourdit la cible (sauf boss enragé).',
      staminaCost: 5,
      cooldown: 3,
    },
    skill2: {
      name: 'Rempart',
      description: 'Vous encaissez tout : aucun dégât subi ce tour, étreintes brisées, +4 endurance.',
      staminaCost: 3,
      cooldown: 4,
      level: 4,
    },
    startingItems: { hachette: 1, blouson: 1, bandage: 2, ration: 2 },
    startingEquipment: { melee: 'hachette', armor: 'blouson' },
    art: 'guerrier',
  },
  eclaireur: {
    id: 'eclaireur',
    name: 'Éclaireur',
    tagline: 'Voir sans être vu.',
    description:
      'Vous traversez la ville par les toits et les cours. Vous évitez les combats inutiles, et quand il faut frapper, vous frappez le premier, là où ça compte. Chaque esquive réussie déclenche une contre-attaque.',
    bonuses: { discretion: 2, astuce: 1 },
    skill: {
      name: 'Frappe dans l’ombre',
      description: 'Un coup précis qui ne rate jamais : critique renforcé (×2,6 sur une cible distraite ou étourdie) et saignement.',
      staminaCost: 4,
      cooldown: 2,
    },
    skill2: {
      name: 'Disparition',
      description: 'Vous vous fondez dans l’ombre : esquive garantie ce tour, et votre prochaine attaque compte comme une attaque surprise.',
      staminaCost: 5,
      cooldown: 4,
      level: 4,
    },
    startingItems: { couteau: 1, arbalete_poing: 1, carreau: 8, bandage: 1, ration: 2 },
    startingEquipment: { melee: 'couteau', ranged: 'arbalete_poing' },
    art: 'eclaireur',
  },
  technicien: {
    id: 'technicien',
    name: 'Survivant technique',
    tagline: 'Tout se répare. Tout se détourne.',
    description:
      'Électricien, mécanicienne, bricoleur de génie : vous faites parler les machines mortes. Vous ne gagnez pas les combats à la force des bras, mais en changeant les règles.',
    bonuses: { astuce: 2, survie: 1 },
    skill: {
      name: 'Leurre bricolé',
      description: 'Un réveil trafiqué distrait tous les ennemis pendant deux tours : ils n’agissent plus et subissent +30 % de dégâts.',
      staminaCost: 5,
      cooldown: 4,
    },
    skill2: {
      name: 'Charge improvisée',
      description: 'Une bonbonne de gaz piégée : 6 à 10 dégâts à tous les ennemis, qui s’embrasent.',
      staminaCost: 6,
      cooldown: 5,
      level: 4,
    },
    startingItems: { pied_de_biche: 1, cloueur: 1, clou: 14, outils: 1, composants: 2, molotov: 1, bandage: 2, ration: 1 },
    startingEquipment: { melee: 'pied_de_biche', ranged: 'cloueur' },
    art: 'technicien',
  },
};

// ---------------------------------------------------------------------------
// Passés
// ---------------------------------------------------------------------------

export const BACKGROUNDS: Record<BackgroundId, BackgroundDef> = {
  ambulancier: {
    id: 'ambulancier',
    name: 'Ancien ambulancier',
    description: 'Douze ans de nuits de garde au SAMU de Valombre. Vous avez vu la Fièvre arriver avant tout le monde.',
    advantage: 'Soins +50 %. Vous reconnaissez une morsure au premier regard. Trousse de soins au départ.',
    drawback: 'Dos usé par les brancards : capacité de transport −2 kg.',
    healingMultiplier: 1.5,
    capacityModifier: -2,
    startingItems: { trousse: 1 },
  },
  detenu: {
    id: 'detenu',
    name: 'Sorti de prison la veille',
    description: 'Libéré le matin où tout s’est effondré. Personne ne vous a jamais demandé pourquoi vous étiez dedans.',
    advantage: 'Crochetage et intimidation : de nouvelles options. Les Ferrailleurs vous parlent d’égal à égal. Jeu de rossignols au départ.',
    drawback: 'On se méfie de vous : Maëlle et les Veilleurs commencent avec moins de confiance.',
    startingItems: { rossignol: 1 },
    startingRelations: { maelle: -1, helene: -2 },
  },
  cataphile: {
    id: 'cataphile',
    name: 'Ancien cataphile',
    description: 'Avant, vous passiez vos week-ends dans les carrières interdites sous la ville. Vous en connaissez les codes.',
    advantage: 'Raccourcis et signes secrets dans les Carrières. Corde d’escalade au départ.',
    drawback: 'Silhouette fine, peu de réserves : santé maximale −3.',
    bonusMaxHp: -3,
    startingItems: { corde: 1 },
  },
  pompier: {
    id: 'pompier',
    name: 'Pompier volontaire',
    description: 'Caserne de la rue Gambetta. Vous avez porté des gens hors des flammes ; maintenant vous les portez hors de pire.',
    advantage: 'Santé maximale +4. Vous savez manier le feu et lire un bâtiment qui s’effondre.',
    drawback: 'Habitudes de caserne, pas de cambrioleur : −1 aux jets de Discrétion.',
    bonusMaxHp: 4,
    checkModifiers: { discretion: -1 },
    startingItems: { molotov: 1 },
  },
};

// ---------------------------------------------------------------------------
// Compétences
// ---------------------------------------------------------------------------

export const PERKS: Record<PerkId, PerkDef> = {
  premiers_secours: { id: 'premiers_secours', name: 'Premiers secours', description: 'Les objets de soin rendent 50 % de santé en plus.' },
  pas_de_loup: { id: 'pas_de_loup', name: 'Pas de loup', description: '+10 % de chances d’esquive et de fuite.' },
  main_lourde: { id: 'main_lourde', name: 'Main lourde', description: '+2 dégâts au corps à corps.' },
  oeil_de_lynx: { id: 'oeil_de_lynx', name: 'Œil de lynx', description: '+10 % de précision avec les armes à distance.' },
  sang_froid: { id: 'sang_froid', name: 'Sang-froid', description: '+1 à tous les jets de compétence.' },
  dos_solide: { id: 'dos_solide', name: 'Dos solide', description: '+4 kg de capacité de transport.' },
  second_souffle: { id: 'second_souffle', name: 'Second souffle', description: '+3 endurance maximale.' },
};

// ---------------------------------------------------------------------------
// Personnages
// ---------------------------------------------------------------------------

export const CHARACTERS: Record<string, CharacterDef> = {
  maelle: {
    id: 'maelle',
    name: 'Maëlle Ternier',
    role: 'Infirmière, cheffe du refuge',
    description:
      'Quarante-quatre ans, des mains qui ne tremblent jamais. Elle a transformé la pharmacie Saint-Clair en refuge et tient ses règles d’acier. Elle garde un secret sur son fils.',
    color: '#7FA38A',
    initials: 'MT',
    eats: true,
    combatAssist: { kind: 'heal', amount: [3, 5], every: 3, text: 'panse vos plaies en pleine mêlée' },
  },
  theo: {
    id: 'theo',
    name: 'Théo Ternier',
    role: 'Fils de Maëlle, quinze ans',
    description:
      'Il dessine des cartes de la ville sur les murs de la réserve. Silencieux, obstiné, plus courageux qu’il ne le croit. Une cicatrice ronde sur l’épaule qu’il cache toujours.',
    color: '#C9A86A',
    initials: 'TT',
    eats: true,
  },
  kaz: {
    id: 'kaz',
    name: 'Bastien « Kaz » Kaczmarek',
    role: 'Ancien éclusier',
    description:
      'Cinquante ans, des épaules de docker, un rire trop fort. Il connaît le fleuve et ses écluses par cœur. Il doit quelque chose à quelqu’un de dangereux.',
    color: '#B5654B',
    initials: 'BK',
    eats: true,
    combatAssist: { kind: 'damage', amount: [3, 5], every: 2, text: 'cogne avec sa clé à molette' },
  },
  ines: {
    id: 'ines',
    name: 'Inès Bakari',
    role: 'Passeuse des Carrières',
    description:
      'Ancienne géologue, elle guide les survivants dans le labyrinthe sous la ville contre un prix. Arbalète, craie et patience infinie. Elle cherche son frère.',
    color: '#8B9FC4',
    initials: 'IB',
    eats: true,
    combatAssist: { kind: 'damage', amount: [2, 5], every: 2, text: 'décoche un carreau' },
  },
  odilon: {
    id: 'odilon',
    name: 'Odilon Brac',
    role: 'Le carillonneur de Saint-Clair',
    description:
      'Soixante-dix-huit ans, sacristain à la retraite. Chaque soir, il sonne les cloches pour attirer les Muets loin des vivants. Personne ne le sait.',
    color: '#A69C8A',
    initials: 'OB',
    eats: false,
  },
  helene: {
    id: 'helene',
    name: 'Hélène Vasseur',
    role: 'Guide des Veilleurs',
    description:
      'Ancienne juge d’instruction. Elle dirige la communauté des Veilleurs dans l’ossuaire Saint-Roch avec une justice froide et des règles qui ont sauvé quarante vies.',
    color: '#C2B48F',
    initials: 'HV',
    eats: false,
  },
  gaspard: {
    id: 'gaspard',
    name: 'Gaspard Lenoir',
    role: 'Chef des Ferrailleurs',
    description:
      'Ancien patron de casse automobile. Il tient le Pont de Fer et vend ce qui a de la valeur : essence, armes, et désormais des êtres humains.',
    color: '#8E5A4A',
    initials: 'GL',
    eats: false,
  },
  sorel: {
    id: 'sorel',
    name: 'Docteure Anaïs Sorel',
    role: 'Médecin de l’Institut Ferrand',
    description:
      'Épidémiologiste, voix de la radio. Elle croit au vaccin plus qu’à tout le reste, et c’est peut-être son plus grand danger.',
    color: '#9FB7B5',
    initials: 'AS',
    eats: false,
  },
  rousset: {
    id: 'rousset',
    name: 'Capitaine Rousset',
    role: 'Commandant de la Destinée',
    description: 'Il applique le protocole. Toujours. Même quand le protocole n’a plus de sens.',
    color: '#7D8590',
    initials: 'CR',
    eats: false,
  },
  cazal: {
    id: 'cazal',
    name: 'Mère Cazal',
    role: 'Marchande de la péniche La Mouette',
    description: 'Une vieille batelière qui commerce avec tout le monde et ne prend parti pour personne.',
    color: '#B49A6E',
    initials: 'MC',
    eats: false,
  },
  nour: {
    id: 'nour',
    name: 'Nour',
    role: 'Prisonnière des Ferrailleurs',
    description: 'Douze ans, porteuse comme Théo. Les Ferrailleurs l’ont capturée pour la vendre à l’Institut.',
    color: '#D49C8C',
    initials: 'N',
    eats: true,
  },
};

// ---------------------------------------------------------------------------
// Lieux (coordonnées en % de la carte de chaque région)
// ---------------------------------------------------------------------------

const locations: LocationDef[] = [
  // Quartier des Tanneurs
  {
    id: 'pharmacie',
    name: 'Pharmacie Saint-Clair',
    region: 'Quartier des Tanneurs',
    description: 'Le refuge de Maëlle : rideaux de fer soudés, toit-terrasse, réserve transformée en dortoir.',
    x: 46,
    y: 54,
    danger: 1,
    changes: {
      barricade: 'Kaz a renforcé la barricade de la porte arrière.',
      incendie: 'Le refuge a brûlé pendant l’assaut du Hurleur.',
    },
  },
  {
    id: 'rue_tanneurs',
    name: 'Rue des Tanneurs',
    region: 'Quartier des Tanneurs',
    description: 'Une rue pavée encombrée de voitures calcinées. Le cœur du quartier.',
    x: 40,
    y: 38,
    danger: 2,
  },
  {
    id: 'supermarche',
    name: 'Supermarché Prixdoux',
    region: 'Quartier des Tanneurs',
    description: 'Vitrines éventrées, rayons renversés. Il reste toujours quelque chose, pour qui sait chercher.',
    x: 18,
    y: 30,
    danger: 2,
    changes: { fouille: 'Les rayons ont été fouillés.', reserve: 'La réserve a été vidée.' },
  },
  {
    id: 'hopital',
    name: 'Hôpital Delorme',
    region: 'Quartier des Tanneurs',
    description: 'Aile B, celle des urgences. Là où la Fièvre a commencé à Valombre.',
    x: 70,
    y: 20,
    danger: 3,
    changes: { pharmacie_vide: 'La pharmacie de l’aile B a été vidée.' },
  },
  {
    id: 'clinique_veto',
    name: 'Clinique vétérinaire des Saules',
    region: 'Quartier des Tanneurs',
    description: 'Un rideau métallique intact, un chenil silencieux.',
    x: 78,
    y: 62,
    danger: 2,
    changes: { videe: 'L’armoire à médicaments a été vidée.' },
  },
  {
    id: 'clocher',
    name: 'Clocher de Saint-Clair',
    region: 'Quartier des Tanneurs',
    description: 'La plus haute tour du quartier. Les cloches y sonnent encore chaque soir.',
    x: 26,
    y: 70,
    danger: 1,
    changes: { aide: 'Odilon a été ravitaillé. Il continue de sonner.', vole: 'Odilon a été dépouillé de ses fusées.' },
  },
  // Les Carrières
  {
    id: 'brasserie',
    name: 'Cave de la brasserie Mauduit',
    region: 'Les Carrières',
    description: 'Fûts éventrés, odeur de levure aigre. Une porte de fer mène sous la ville.',
    x: 12,
    y: 16,
    danger: 1,
  },
  {
    id: 'galerie_craie',
    name: 'Galerie des Craies',
    region: 'Les Carrières',
    description: 'Un carrefour de galeries couvertes de signes à la craie laissés par les passeurs.',
    x: 34,
    y: 34,
    danger: 2,
  },
  {
    id: 'puits_noye',
    name: 'Le Puits noyé',
    region: 'Les Carrières',
    description: 'Une salle inondée jusqu’à la poitrine. L’eau est noire et glacée.',
    x: 22,
    y: 58,
    danger: 2,
    changes: { pompe: 'La pompe des Veilleurs a été réparée.' },
  },
  {
    id: 'ossuaire',
    name: 'Ossuaire Saint-Roch',
    region: 'Les Carrières',
    description: 'Des murs de crânes empilés et, au milieu, quarante vivants qui veillent.',
    x: 54,
    y: 54,
    danger: 1,
    changes: { allies: 'Les Veilleurs vous considèrent comme des leurs.' },
  },
  {
    id: 'grande_salle',
    name: 'La Grande Salle',
    region: 'Les Carrières',
    description: 'Une cathédrale de calcaire où dort le troupeau du Berger.',
    x: 74,
    y: 34,
    danger: 3,
    changes: { libre: 'Le Berger est mort. La Grande Salle est silencieuse.' },
  },
  {
    id: 'aqueduc',
    name: 'L’Aqueduc',
    region: 'Les Carrières',
    description: 'Un conduit romain qui débouche sur les berges de la Lisière.',
    x: 88,
    y: 76,
    danger: 2,
  },
  // Port fluvial
  {
    id: 'quai',
    name: 'Quai des Tonneliers',
    region: 'Port fluvial',
    description: 'Grues figées, péniches coulées. Le fleuve sent la rouille et le gasoil.',
    x: 18,
    y: 50,
    danger: 2,
  },
  {
    id: 'capitainerie',
    name: 'Capitainerie',
    region: 'Port fluvial',
    description: 'Un bureau vitré au pied de la tour radio du port. Une bonne planque.',
    x: 34,
    y: 28,
    danger: 1,
    changes: { radio: 'L’émetteur de la tour radio a été réparé.' },
  },
  {
    id: 'mouette',
    name: 'La Mouette',
    region: 'Port fluvial',
    description: 'La péniche-comptoir de Mère Cazal, amarrée au milieu du bassin.',
    x: 46,
    y: 70,
    danger: 1,
  },
  {
    id: 'casse',
    name: 'Casse Lenoir',
    region: 'Port fluvial',
    description: 'Un royaume de carcasses empilées, de chiens et de cages.',
    x: 70,
    y: 40,
    danger: 3,
    changes: { liberee: 'Les cages de la casse ont été ouvertes.', tombee: 'Gaspard Lenoir est tombé.' },
  },
  {
    id: 'pont_fer',
    name: 'Pont de Fer',
    region: 'Port fluvial',
    description: 'Le seul pont encore debout vers la rive droite et la route de l’écluse.',
    x: 86,
    y: 62,
    danger: 2,
  },
  // Écluse de Morvan
  {
    id: 'halage',
    name: 'Chemin de halage',
    region: 'Écluse de Morvan',
    description: 'Douze kilomètres de berge sous les peupliers, entre le fleuve et les champs en friche.',
    x: 16,
    y: 40,
    danger: 2,
  },
  {
    id: 'ecluse',
    name: 'Écluse de Morvan',
    region: 'Écluse de Morvan',
    description: 'Deux portes d’acier, un bassin, une grille. Et derrière, la Destinée.',
    x: 56,
    y: 50,
    danger: 2,
  },
  {
    id: 'destinee',
    name: 'La Destinée',
    region: 'Écluse de Morvan',
    description: 'Une barge-citerne repeinte en blanc, un pavillon frappé d’un caducée.',
    x: 82,
    y: 36,
    danger: 2,
  },
];

export const LOCATIONS: Record<string, LocationDef> = Object.fromEntries(locations.map((l) => [l.id, l]));

export const REGIONS = ['Quartier des Tanneurs', 'Les Carrières', 'Port fluvial', 'Écluse de Morvan'];

// ---------------------------------------------------------------------------
// Quêtes
// ---------------------------------------------------------------------------

const quests: QuestDef[] = [
  {
    id: 'q_destinee',
    title: 'La Destinée',
    kind: 'main',
    chapter: 'c1',
    summary: 'Une voix à la radio : une barge, la Destinée, embarquera des survivants à l’écluse de Morvan à l’aube du septième jour.',
    steps: [
      { id: 'message', text: 'Vous avez capté le message de la Destinée.' },
      { id: 'carrieres', text: 'Traverser le Labyrinthe des Carrières sous la ville.' },
      { id: 'port', text: 'Franchir le port fluvial et le Pont de Fer.' },
      { id: 'ecluse', text: 'Atteindre l’écluse de Morvan.' },
      { id: 'choix', text: 'Décider du sort de Théo et du groupe.' },
    ],
  },
  {
    id: 'q_fievre',
    title: 'La fièvre de Théo',
    kind: 'main',
    chapter: 'c1',
    summary: 'La plaie de Théo s’est infectée. Sans antibiotiques, il ne passera pas la semaine.',
    steps: [
      { id: 'trouver', text: 'Trouver des antibiotiques : l’hôpital Delorme ou la clinique vétérinaire des Saules.' },
      { id: 'rapporter', text: 'Rapporter les antibiotiques à la pharmacie.' },
    ],
  },
  {
    id: 'q_carillon',
    title: 'Le Carillonneur',
    kind: 'side',
    chapter: 'c1',
    summary: 'Un vieil homme sonne les cloches de Saint-Clair chaque soir. Il n’a plus rien à manger.',
    steps: [
      { id: 'rencontre', text: 'Odilon a besoin de deux rations pour tenir.' },
      { id: 'ravitailler', text: 'Apporter deux rations au clocher.' },
    ],
  },
  {
    id: 'q_kaz',
    title: 'La dette de Kaz',
    kind: 'side',
    chapter: 'c1',
    summary: 'Kaz doit quelque chose à Gaspard Lenoir, le chef des Ferrailleurs.',
    steps: [
      { id: 'aveu', text: 'Kaz a avoué une dette envers les Ferrailleurs.' },
      { id: 'verite', text: 'Kaz a promis à Gaspard de lui livrer un porteur.' },
      { id: 'reglement', text: 'Régler la dette de Kaz, d’une manière ou d’une autre.' },
    ],
  },
  {
    id: 'q_malik',
    title: 'Le frère d’Inès',
    kind: 'side',
    chapter: 'c2',
    summary: 'Malik, le frère d’Inès, a disparu dans les Carrières il y a trois semaines.',
    steps: [
      { id: 'chercher', text: 'Suivre les marques de craie de Malik dans la Galerie des Craies.' },
    ],
  },
  {
    id: 'q_veilleurs',
    title: 'L’eau des Veilleurs',
    kind: 'side',
    chapter: 'c2',
    summary: 'La pompe qui filtre l’eau de l’ossuaire est en panne. Les Veilleurs boivent l’eau du Puits noyé.',
    steps: [
      { id: 'demande', text: 'Réparer la pompe du Puits noyé.' },
    ],
  },
  {
    id: 'q_berger',
    title: 'Le Berger',
    kind: 'main',
    chapter: 'c2',
    summary: 'Le troupeau du Berger bloque la Grande Salle, seule route vers le fleuve.',
    steps: [
      { id: 'rumeur', text: 'Franchir la Grande Salle ou trouver un autre chemin.' },
    ],
  },
  {
    id: 'q_theo',
    title: 'Le secret de Théo',
    kind: 'main',
    chapter: 'c1',
    summary: 'Une cicatrice, une lettre, des silences. Maëlle cache quelque chose sur son fils.',
    steps: [
      { id: 'soupcon', text: 'La cicatrice de Théo ressemble à une morsure guérie.' },
      { id: 'verite', text: 'Théo est un porteur : mordu, jamais transformé.' },
      { id: 'choix', text: 'Décider de ce que vaut la vie d’un porteur.' },
    ],
  },
  {
    id: 'q_radio',
    title: 'La voix du fleuve',
    kind: 'side',
    chapter: 'c3',
    summary: 'La tour radio du port pourrait capter les communications internes de la Destinée.',
    steps: [
      { id: 'reparer', text: 'Réparer l’émetteur de la capitainerie.' },
    ],
  },
  {
    id: 'q_cages',
    title: 'Les cages de la casse',
    kind: 'side',
    chapter: 'c3',
    summary: 'Les Ferrailleurs retiennent des prisonniers qu’ils comptent vendre à l’Institut Ferrand.',
    steps: [
      { id: 'reperer', text: 'Les prisonniers sont enfermés dans la casse Lenoir.' },
    ],
  },
];

export const QUESTS: Record<string, QuestDef> = Object.fromEntries(quests.map((q) => [q.id, q]));

// ---------------------------------------------------------------------------
// Chapitres & fins
// ---------------------------------------------------------------------------

export const CHAPTERS: ChapterDef[] = [
  { id: 'c1', number: 1, title: 'Le Dernier Comptoir', subtitle: 'Deux jours avant le départ', region: 'Quartier des Tanneurs', start: 'c1_toit' },
  { id: 'c2', number: 2, title: 'Le Labyrinthe', subtitle: 'Sous Valombre', region: 'Les Carrières', start: 'c2_brasserie' },
  { id: 'c3', number: 3, title: 'La Ferraille et l’Eau', subtitle: 'Le port fluvial', region: 'Port fluvial', start: 'c3_quai' },
  { id: 'c4', number: 4, title: 'La Destinée', subtitle: 'L’aube du septième jour', region: 'Écluse de Morvan', start: 'c4_halage' },
];

const endings: EndingDef[] = [
  { id: 'mort', title: 'La fin du chemin', kind: 'death', epitaph: 'Valombre garde ses morts.' },
  { id: 'mort_berger', title: 'Le troupeau', kind: 'death', epitaph: 'Une cloche sonne dans le noir. Vous la suivez.' },
  { id: 'mort_cage', title: 'Marchandise', kind: 'death', epitaph: 'Le port a toujours vendu ce qui flotte.' },
  { id: 'mort_ecluse', title: 'Le protocole', kind: 'death', epitaph: 'Une ligne de plus dans un registre.' },
  { id: 'fin_accord', title: 'L’Accord', kind: 'ending', epitaph: 'Un porteur n’est pas une marchandise. C’est un passager.' },
  { id: 'fin_capitaines', title: 'Les Capitaines', kind: 'ending', epitaph: 'La Destinée a changé de main. Le fleuve, lui, ne change pas.' },
  { id: 'fin_prix', title: 'Le Prix du passage', kind: 'ending', epitaph: 'Vous êtes à bord. Vous avez payé.' },
  { id: 'fin_gardien', title: 'Le Gardien de l’écluse', kind: 'ending', epitaph: 'Quelqu’un devait tenir la vanne.' },
  { id: 'fin_racines', title: 'Les Racines', kind: 'ending', epitaph: 'Certains bateaux ne valent pas le voyage.' },
  { id: 'fin_errance', title: 'Le Fleuve', kind: 'ending', epitaph: 'Sans personne, mais en vie. C’est déjà quelque chose.' },
];

export const ENDINGS: Record<string, EndingDef> = Object.fromEntries(endings.map((e) => [e.id, e]));
