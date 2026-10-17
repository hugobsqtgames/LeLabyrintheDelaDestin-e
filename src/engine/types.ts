/**
 * Modèles de données du jeu.
 *
 * Ce fichier ne dépend d'aucune bibliothèque d'interface : le moteur
 * (src/engine) et le contenu (src/content) peuvent être testés en Node pur.
 */

import type { AchievementDef } from './meta';

// ---------------------------------------------------------------------------
// Identifiants
// ---------------------------------------------------------------------------

export type StatId = 'force' | 'discretion' | 'survie' | 'astuce';
export type ProfileId = 'guerrier' | 'eclaireur' | 'technicien' | 'eclusier' | 'infirmiere' | 'passeuse' | 'cartographe' | 'compteuse';
export type BackgroundId = 'ambulancier' | 'detenu' | 'cataphile' | 'pompier' | 'eclusier' | 'infirmiere' | 'passeuse' | 'porteur' | 'rescapee';
export type EmblemId = 'masque' | 'boussole' | 'cle' | 'corbeau' | 'fougere' | 'lame';
export type PerkId =
  | 'premiers_secours'
  | 'pas_de_loup'
  | 'main_lourde'
  | 'oeil_de_lynx'
  | 'sang_froid'
  | 'dos_solide'
  | 'second_souffle';

export type SceneId = string;
export type ItemId = string;
export type EnemyId = string;
export type QuestId = string;
export type CharacterId = string;
export type LocationId = string;
export type ChapterId = string;
export type EndingId = string;
export type DocumentId = string;
export type RecipeId = string;

export type Stats = Record<StatId, number>;

// ---------------------------------------------------------------------------
// Conditions & effets (le cœur du moteur narratif)
// ---------------------------------------------------------------------------

export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed';
/** `hero` : ce compagnon a repris la route à la place du protagoniste (relève). */
export type CompanionStatus = 'unknown' | 'met' | 'companion' | 'away' | 'captured' | 'dead' | 'hero';

export type Condition =
  | { type: 'stat'; stat: StatId; min: number }
  | { type: 'profile'; profiles: ProfileId[] }
  | { type: 'background'; backgrounds: BackgroundId[] }
  | { type: 'item'; item: ItemId; qty?: number }
  | { type: 'flag'; flag: string }
  | { type: 'notFlag'; flag: string }
  | { type: 'counter'; counter: string; min?: number; max?: number }
  | { type: 'quest'; quest: QuestId; status: QuestStatus[] }
  | { type: 'questStep'; quest: QuestId; step: string }
  | { type: 'relation'; character: CharacterId; min?: number; max?: number }
  | { type: 'companion'; character: CharacterId; status: CompanionStatus[] }
  | { type: 'hp'; min: number }
  | { type: 'level'; min: number }
  | { type: 'perk'; perk: PerkId }
  | { type: 'visited'; scene: SceneId }
  | { type: 'infection'; min?: number; max?: number }
  /** Heures écoulées depuis le début (horloge des sept jours). */
  | { type: 'clock'; min?: number; max?: number }
  /** Document d'archives trouvé. */
  | { type: 'document'; doc: DocumentId }
  | { type: 'all'; conditions: Condition[] }
  | { type: 'any'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };

export type StatusKind =
  | 'saignement'
  | 'sonne'
  | 'affaibli'
  | 'agrippe'
  | 'etourdi'
  | 'brulure'
  | 'distrait'
  | 'garde';

export type Effect =
  | { type: 'setFlag'; flag: string; value?: boolean }
  | { type: 'addCounter'; counter: string; amount: number }
  | { type: 'giveItem'; item: ItemId; qty?: number }
  | { type: 'takeItem'; item: ItemId; qty?: number }
  | { type: 'heal'; amount: number }
  /** Par défaut, les dégâts narratifs laissent au moins 1 PV ; `lethal` autorise la mort. */
  | { type: 'damage'; amount: number; cause: string; lethal?: boolean }
  | { type: 'stamina'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'relation'; character: CharacterId; amount: number }
  | { type: 'companion'; character: CharacterId; status: CompanionStatus }
  | { type: 'quest'; quest: QuestId; status?: QuestStatus; step?: string }
  | { type: 'discover'; location: LocationId }
  | { type: 'world'; location: LocationId; change: string }
  | { type: 'infection'; amount: number }
  | { type: 'cureInfection' }
  | { type: 'journal'; text: string; major?: boolean }
  | { type: 'meal' }
  | { type: 'rest'; amount?: number }
  | { type: 'chapter'; chapter: ChapterId }
  /** Fait avancer l'horloge. */
  | { type: 'time'; hours: number }
  /** Porte l'horloge au moins à cette heure absolue. */
  | { type: 'timeAtLeast'; hour: number }
  /** Attend la prochaine occurrence de cette heure de la journée (dormir jusqu'à l'aube…). */
  | { type: 'waitUntil'; hourOfDay: number }
  /** Ajoute un document aux archives. */
  | { type: 'document'; doc: DocumentId }
  /** Répare une arme (ou toutes les armes équipées si `item` est omis). */
  | { type: 'repair'; item?: ItemId; amount: number }
  /** Écrit la page du journal intime pour ce chapitre (composée selon l'état). */
  | { type: 'diary'; chapter: ChapterId }
  /** Effet conditionnel, évalué au moment de l'application. */
  | { type: 'if'; cond: Condition; then: Effect[]; else?: Effect[] };

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------

/** Un paragraphe de narration ou une réplique, éventuellement conditionnel. */
export interface TextBlock {
  text: string;
  /** Si défini, le bloc est une réplique de ce personnage (ou « moi »). */
  speaker?: CharacterId | 'moi';
  if?: Condition;
}

export type ChoiceKind =
  | 'move'
  | 'talk'
  | 'negotiate'
  | 'stealth'
  | 'explore'
  | 'item'
  | 'fight'
  | 'flee'
  | 'sacrifice'
  | 'rest';

export interface SkillCheck {
  stat: StatId;
  /** Seuil à atteindre avec 2d6 + caractéristique. */
  difficulty: number;
  success: SceneId;
  failure: SceneId;
  successEffects?: Effect[];
  failureEffects?: Effect[];
}

export interface Choice {
  id: string;
  text: string;
  kind: ChoiceKind;
  /** Conditions obligatoires : le choix est affiché verrouillé si elles manquent. */
  requires?: Condition[];
  /** Conditions de visibilité : le choix est masqué tant qu'elles manquent (secret). */
  visibleIf?: Condition[];
  /** Avertissement facultatif affiché sous le choix. */
  warning?: string;
  effects?: Effect[];
  next?: SceneId;
  check?: SkillCheck;
  /** Le choix ne peut être pris qu'une seule fois (fouille, récompense…). */
  once?: boolean;
  /** Heures consommées par l'action (horloge des sept jours). */
  time?: number;
}

/** Choix chronométré : à l'expiration, le choix de repli est appliqué. */
export interface TimedChoice {
  seconds: number;
  fallback: string;
}

export interface EncounterDef {
  enemies: EnemyId[];
  canFlee: boolean;
  victory: SceneId;
  defeat: SceneId;
  flee?: SceneId;
  /** Texte d'ambiance affiché au début du combat. */
  intro: string;
  /** L'ennemi est surpris : bonus d'ouverture (attaque sournoise de l'éclaireur). */
  ambush?: boolean;
}

export type SceneKind = 'story' | 'combat' | 'chapterEnd' | 'ending' | 'death';

export interface Scene {
  id: SceneId;
  chapter: ChapterId;
  location: LocationId;
  title: string;
  kind: SceneKind;
  text: TextBlock[];
  /**
   * Routage conditionnel : en entrant, la première route dont la condition
   * est remplie redirige immédiatement vers une autre scène.
   */
  routes?: { if: Condition; to: SceneId }[];
  /** Effets appliqués une seule fois, à la première entrée dans la scène. */
  onEnter?: Effect[];
  choices: Choice[];
  encounter?: EncounterDef;
  ending?: EndingId;
  /** Point de reprise si une sauvegarde référence une scène disparue. */
  checkpoint?: boolean;
  /** Scène optionnelle (utilisé par le validateur et les statistiques). */
  optional?: boolean;
  /** Moment de panique : les choix sont chronométrés (désactivable dans les paramètres). */
  timed?: TimedChoice;
  /** Illustration plein écran affichée à l'entrée de la scène. */
  illustration?: string;
}

// ---------------------------------------------------------------------------
// Objets & équipement
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'melee'
  | 'ranged'
  | 'ammo'
  | 'consumable'
  | 'armor'
  | 'accessory'
  | 'tool'
  | 'material'
  | 'quest';

export type EquipSlot = 'melee' | 'ranged' | 'armor' | 'accessory';

export interface ItemUse {
  heal?: number;
  stamina?: number;
  cures?: StatusKind[];
  cureInfection?: boolean;
  /** Effet de combat sur la cible (objets lancés). */
  combatDamage?: [number, number];
  applyToEnemy?: { status: StatusKind; turns: number };
  /** L'effet touche tous les ennemis. */
  targetAll?: boolean;
  /** Utilisable hors combat. */
  outOfCombat?: boolean;
  /** Utilisable en combat. */
  inCombat?: boolean;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  weight: number;
  maxStack: number;
  rarity: 'commun' | 'rare' | 'unique';
  slot?: EquipSlot;
  /** Armes : dégâts min/max, coût d'endurance, munition utilisée. */
  damage?: [number, number];
  staminaCost?: number;
  ammo?: ItemId;
  accuracy?: number;
  /** Arme de finesse : utilise la meilleure valeur entre Force et Discrétion. */
  finesse?: boolean;
  /** Bruyant : les armes à feu peuvent attirer d'autres Muets. */
  loud?: boolean;
  /** Armures/accessoires. */
  armor?: number;
  statBonus?: Partial<Stats>;
  capacityBonus?: number;
  use?: ItemUse;
  /** Objet de quête : ne peut être jeté. */
  questItem?: boolean;
  /** Armes : solidité maximale. Chaque attaque l'use ; à zéro, l'arme est abîmée. */
  durability?: number;
  icon: string;
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  description: string;
  inputs: Record<ItemId, number>;
  /** Objet produit (absent pour une réparation). */
  output?: { item: ItemId; qty: number };
  /** Réparation : points de solidité rendus aux armes équipées. */
  repair?: number;
  requires?: Condition[];
  /** Heures de travail. */
  time: number;
}

export interface DocumentDef {
  id: DocumentId;
  title: string;
  /** Provenance affichée sous le titre. */
  source: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Ennemis & combat
// ---------------------------------------------------------------------------

export type EnemyMoveKind = 'attack' | 'heavy' | 'grab' | 'bite' | 'scream' | 'guard' | 'spit';

export interface EnemyMove {
  id: string;
  name: string;
  kind: EnemyMoveKind;
  weight: number;
  damage?: [number, number];
  /** Message d'intention affiché au joueur avant l'action. */
  telegraph: string;
  applies?: { status: StatusKind; turns: number; chance: number };
  /** Pour 'scream' : ennemi invoqué. */
  summon?: EnemyId;
  infectionChance?: number;
}

export interface EnemyPhase {
  /** Seuil de PV (fraction) en dessous duquel la phase commence. */
  belowHpRatio: number;
  name: string;
  announce: string;
  moves: EnemyMove[];
  defenseBonus?: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  description: string;
  maxHp: number;
  defense: number;
  evasion: number;
  moves: EnemyMove[];
  phases?: EnemyPhase[];
  weaknesses?: { status?: StatusKind; multiplier: number; hint: string }[];
  /** Les tirs à distance infligent ce multiplicateur (ex. Gonflé : préférer la distance). */
  meleePenalty?: { damage: number; text: string };
  xp: number;
  boss?: boolean;
  art: string;
  human?: boolean;
}

export interface StatusInstance {
  kind: StatusKind;
  turns: number;
}

export interface CombatEnemy {
  uid: string;
  def: EnemyId;
  hp: number;
  maxHp: number;
  statuses: StatusInstance[];
  intent: string | null;
  phase: number;
}

export type CombatActionType = 'attack' | 'defend' | 'dodge' | 'skill' | 'skill2' | 'item' | 'flee';

export interface CombatAction {
  type: CombatActionType;
  target?: string;
  item?: ItemId;
  weapon?: 'melee' | 'ranged';
}

export interface CombatLogEntry {
  id: number;
  text: string;
  tone: 'player' | 'enemy' | 'ally' | 'system' | 'crit' | 'danger';
}

export interface CombatState {
  sceneId: SceneId;
  enemies: CombatEnemy[];
  turn: number;
  playerStatuses: StatusInstance[];
  defending: boolean;
  dodging: boolean;
  skillCooldown: number;
  ambushUsed: boolean;
  log: CombatLogEntry[];
  logCounter: number;
  outcome: 'ongoing' | 'victory' | 'defeat' | 'fled';
  summons: number;
  xpEarned: number;
  skill2Cooldown: number;
  /** Rempart du guerrier : aucun dégât subi ce tour. */
  fortified: boolean;
  /** Disparition de l'éclaireur : esquive garantie ce tour. */
  vanished: boolean;
}

// ---------------------------------------------------------------------------
// Personnage
// ---------------------------------------------------------------------------

export interface CharacterDraft {
  name: string;
  profile: ProfileId | null;
  background: BackgroundId | null;
  emblem: EmblemId | null;
  allocated: Stats;
}

export interface PlayerCharacter {
  name: string;
  profile: ProfileId;
  background: BackgroundId;
  emblem: EmblemId;
  /** Caractéristiques de base (hors bonus d'équipement). */
  stats: Stats;
  hp: number;
  stamina: number;
  level: number;
  xp: number;
  unspentStatPoints: number;
  unspentPerks: number;
  perks: PerkId[];
  /** 0 = sain, 1-3 = stades d'infection. */
  infection: number;
}

// ---------------------------------------------------------------------------
// État de partie
// ---------------------------------------------------------------------------

export interface QuestState {
  status: QuestStatus;
  step: string | null;
  completedSteps: string[];
}

export interface ChronicleEntry {
  id: number;
  turn: number;
  chapter: ChapterId;
  sceneId: SceneId;
  sceneTitle: string;
  text: string;
  major: boolean;
}

export interface Notice {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info' | 'level';
}

export interface GameState {
  id: string;
  createdAt: number;
  turn: number;
  rng: number;
  player: PlayerCharacter;
  chapter: ChapterId;
  currentScene: SceneId;
  previousScene: SceneId | null;
  inventory: Record<ItemId, number>;
  equipment: Record<EquipSlot, ItemId | null>;
  /** Objets trouvés mais trop lourds : au sol, dans la scène courante. */
  ground: Record<ItemId, number>;
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  quests: Record<QuestId, QuestState>;
  relations: Record<CharacterId, number>;
  companions: Record<CharacterId, CompanionStatus>;
  discovered: LocationId[];
  world: Record<LocationId, string[]>;
  visitedScenes: SceneId[];
  /** Effets uniques déjà consommés : `scene:<id>` et `choice:<scene>/<choice>`. */
  consumed: string[];
  chronicle: ChronicleEntry[];
  chronicleCounter: number;
  combat: CombatState | null;
  notices: Notice[];
  noticeCounter: number;
  ending: { id: EndingId; kind: 'ending' | 'death'; cause?: string } | null;
  playtimeMs: number;
  /** Heures écoulées depuis le jour 1 à minuit. */
  clock: number;
  /** Solidité restante des armes possédées. */
  durability: Record<ItemId, number>;
  /** Documents d'archives trouvés, dans l'ordre. */
  documents: DocumentId[];
  /** Journal intime : une entrée par chapitre. */
  diary: { chapter: ChapterId; text: string }[];
  /** Compagnon qui a repris la route (null : le protagoniste créé au départ). */
  hero: CharacterId | null;
  /** Ceux qui sont tombés avant la relève. */
  fallen: FallenHero[];
  /** Dernier jet de dés effectué (affiché dans l'histoire). */
  lastCheck: { stat: StatId; roll: [number, number]; total: number; difficulty: number; success: boolean } | null;
}

// ---------------------------------------------------------------------------
// Contenu
// ---------------------------------------------------------------------------

/** Un personnage joueur mort avant la relève. */
export interface FallenHero {
  name: string;
  profile: ProfileId;
  level: number;
  chapter: ChapterId;
  scene: SceneId;
  turn: number;
  /** Compagnon (id) ou null pour le protagoniste d'origine. */
  character: CharacterId | null;
}

/** Fiche d'un compagnon capable de reprendre la route (relève). */
export interface HeroSheet {
  character: CharacterId;
  /** Nom porté une fois aux commandes (court : « Kaz »). */
  name: string;
  /** Ne prend la relève que si aucun autre compagnon jouable n'est là (les plus jeunes). */
  lastResort?: boolean;
  profile: ProfileId;
  background: BackgroundId;
  /** Caractéristiques de base au niveau 1. */
  stats: Stats;
  /** Ordre d'attribution des points gagnés en montant de niveau. */
  growth: StatId[];
  /** Niveau minimal ; le niveau réel suit la progression du voyage. */
  level: number;
  perks: PerkId[];
  items: Record<ItemId, number>;
  equipment: Partial<Record<EquipSlot, ItemId>>;
  emblem: EmblemId;
}

export interface ProfileDef {
  id: ProfileId;
  name: string;
  tagline: string;
  description: string;
  bonuses: Partial<Stats>;
  skill: { name: string; description: string; staminaCost: number; cooldown: number };
  /** Seconde compétence, débloquée au niveau 4. */
  skill2: { name: string; description: string; staminaCost: number; cooldown: number; level: number };
  startingItems: Record<ItemId, number>;
  startingEquipment: Partial<Record<EquipSlot, ItemId>>;
  art: string;
  /** Famille de mécaniques de combat (les profils de compagnons réutilisent celles des trois profils). */
  family?: 'guerrier' | 'eclaireur' | 'technicien';
  /** Compétence de soin (remplace la compétence de famille). */
  healSkill?: boolean;
  /** Absent de la création de personnage. */
  hidden?: boolean;
}

export interface BackgroundDef {
  id: BackgroundId;
  name: string;
  description: string;
  advantage: string;
  drawback: string;
  bonusMaxHp?: number;
  capacityModifier?: number;
  healingMultiplier?: number;
  /** Modificateurs appliqués aux jets de compétence. */
  checkModifiers?: Partial<Stats>;
  startingItems?: Record<ItemId, number>;
  startingRelations?: Record<CharacterId, number>;
  /** Absent de la création de personnage. */
  hidden?: boolean;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  color: string;
  initials: string;
  /** Aide en combat lorsqu'il ou elle accompagne le joueur. */
  combatAssist?: { kind: 'damage' | 'heal'; amount: [number, number]; every: number; text: string };
  /** Bouche à nourrir lors des repas de groupe. */
  eats: boolean;
}

export interface LocationDef {
  id: LocationId;
  name: string;
  region: string;
  description: string;
  x: number;
  y: number;
  danger: 1 | 2 | 3;
  changes?: Record<string, string>;
}

export interface QuestDef {
  id: QuestId;
  title: string;
  kind: 'main' | 'side';
  chapter: ChapterId;
  summary: string;
  steps: { id: string; text: string }[];
}

export interface ChapterDef {
  id: ChapterId;
  number: number;
  title: string;
  subtitle: string;
  region: string;
  start: SceneId;
  /** Ambiance lumineuse de l'interface (halos du fond). */
  aura?: string;
  /** Une infection non soignée s'aggrave en entrant dans ce chapitre. */
  infects?: boolean;
  /** Heure de l'horloge à laquelle un voyageur « à l'heure » commence ce chapitre (indicateur de retard). */
  due?: number;
}

/** Une phrase du journal intime, retenue si sa condition est remplie. */
export interface DiaryRule {
  chapter: ChapterId;
  if?: Condition;
  text: string;
}

export interface EndingDef {
  /** Mort : le corps peut-il être fouillé par celui qui prend la relève ? (défaut : oui) */
  remains?: 'recoverable' | 'lost';
  id: EndingId;
  title: string;
  kind: 'ending' | 'death';
  epitaph: string;
}

export interface SummaryRule {
  if: Condition;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface PerkDef {
  id: PerkId;
  name: string;
  description: string;
}

export interface GameContent {
  scenes: Record<SceneId, Scene>;
  /** Chemins entre lieux d'une même région. */
  mapLinks: [LocationId, LocationId][];
  /** Noms des régions, dans l'ordre du voyage. */
  regions: string[];
  /** Noms des caractéristiques, dans la langue du contenu. */
  statLabels: Record<StatId, string>;
  statDescriptions: Record<StatId, string>;
  items: Record<ItemId, ItemDef>;
  enemies: Record<EnemyId, EnemyDef>;
  quests: Record<QuestId, QuestDef>;
  characters: Record<CharacterId, CharacterDef>;
  locations: Record<LocationId, LocationDef>;
  chapters: ChapterDef[];
  endings: Record<EndingId, EndingDef>;
  profiles: Record<ProfileId, ProfileDef>;
  backgrounds: Record<BackgroundId, BackgroundDef>;
  perks: Record<PerkId, PerkDef>;
  recipes: Record<RecipeId, RecipeDef>;
  documents: Record<DocumentId, DocumentDef>;
  diaryRules: DiaryRule[];
  summaryRules: SummaryRule[];
  /** Compagnons jouables en cas de relève. */
  heroes: Record<CharacterId, HeroSheet>;
  /** Succès (mémoires hors partie). */
  achievements: AchievementDef[];
  startScene: SceneId;
  /**
   * Messages du moteur (notifications, journal de combat, raisons de
   * verrouillage…) dans la langue du contenu. Paramètres entre accolades :
   * « Lieu découvert : {name} ». Voir engine/messages.ts.
   */
  messages: Record<string, string>;
}
