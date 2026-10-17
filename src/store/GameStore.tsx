/**
 * Pont entre le moteur pur et l'interface.
 *
 * - Toute modification de partie passe par `update(fn)`, où `fn` est une
 *   fonction du moteur : l'interface ne modifie jamais l'état elle-même.
 * - Chaque nouvel état est sauvegardé automatiquement dans l'emplacement
 *   de la partie (file d'écriture du SaveManager).
 * - La navigation est un état : un retour arrière ou une interruption ne
 *   peut pas désynchroniser l'écran et la partie.
 */
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AccessibilityInfo, AppState as RNAppState, Platform } from 'react-native';
import { contentFor } from '../content/localized';
import { type Lang, resolveLanguage } from '../i18n/lang';
import { addPlaytime, newGame } from '../engine/narrative';
import { newSeed } from '../engine/rng';
import { absorbGame, type AchievementDef, emptyMeta, type MetaProfile, readMeta } from '../engine/meta';
import { takeOver } from '../engine/relay';
import { hoursLeft } from '../engine/rules';
import { translate } from '../i18n/translate';
import { cancelReminders, scheduleReminder } from '../notifications/reminders';
import type { ChapterId, CharacterDraft, CharacterId, GameContent, GameState, ItemId } from '../engine/types';
import { META_KEY, type SaveManager } from '../persistence/saves';
import { DEFAULT_SETTINGS, type Settings } from './settings';

export type Route = 'title' | 'create' | 'game' | 'saves' | 'settings' | 'gallery' | 'memories';
export type SavesMode = 'new' | 'load' | 'copy';
export type Tab = 'story' | 'character' | 'inventory' | 'map' | 'quests' | 'chronicle' | 'archives';
export { DEFAULT_SETTINGS, type LanguageSetting, type Settings } from './settings';

export interface AppModel {
  route: Route;
  prevRoute: Route;
  savesMode: SavesMode;
  tab: Tab;
  slot: number | null;
  game: GameState | null;
  settings: Settings;
  systemReduceMotion: boolean;
  saveError: string | null;
  saveCount: number;
  /** Emplacement choisi pour une nouvelle partie (après confirmation). */
  pendingSlot: number | null;
  /** Afficher le résumé « Que s'est-il passé ? » (après un chargement). */
  recap: boolean;
  /** Mémoires hors partie (succès, codex, personnages, chapitres). */
  meta: MetaProfile;
  /** Succès qui viennent d'être débloqués (bandeau à afficher). */
  unlocked: AchievementDef[];
  /** « Rejouer un chapitre » : chapitre choisi, en attente d'un emplacement. */
  pendingChapter: ChapterId | null;
}

type Action =
  | { type: 'route'; route: Route; savesMode?: SavesMode }
  | { type: 'tab'; tab: Tab }
  | { type: 'update'; fn: (g: GameState) => GameState }
  | { type: 'start'; slot: number | null; game: GameState }
  | { type: 'close' }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'systemReduceMotion'; value: boolean }
  | { type: 'saved' }
  | { type: 'saveError'; error: string | null }
  | { type: 'pendingSlot'; slot: number | null }
  | { type: 'recap'; value: boolean }
  | { type: 'meta'; meta: MetaProfile; unlocked?: AchievementDef[] }
  | { type: 'dismissUnlocked' }
  | { type: 'pendingChapter'; chapter: ChapterId | null };

function reducer(model: AppModel, action: Action): AppModel {
  switch (action.type) {
    case 'route':
      return { ...model, prevRoute: model.route, route: action.route, savesMode: action.savesMode ?? model.savesMode };
    case 'tab':
      return { ...model, tab: action.tab };
    case 'update': {
      if (!model.game) return model;
      const game = action.fn(model.game);
      return game === model.game ? model : { ...model, game };
    }
    case 'start':
      return { ...model, game: action.game, slot: action.slot, route: 'game', tab: 'story', saveError: null, pendingSlot: null, pendingChapter: null, recap: false };
    case 'close':
      return { ...model, game: null, slot: null, route: 'title', tab: 'story' };
    case 'settings':
      return { ...model, settings: { ...model.settings, ...action.patch } };
    case 'systemReduceMotion':
      return { ...model, systemReduceMotion: action.value };
    case 'saved':
      return { ...model, saveError: null, saveCount: model.saveCount + 1 };
    case 'saveError':
      return { ...model, saveError: action.error };
    case 'pendingSlot':
      return { ...model, pendingSlot: action.slot };
    case 'recap':
      return { ...model, recap: action.value };
    case 'meta':
      return { ...model, meta: action.meta, unlocked: action.unlocked?.length ? [...model.unlocked, ...action.unlocked] : model.unlocked };
    case 'dismissUnlocked':
      return { ...model, unlocked: model.unlocked.slice(1) };
    case 'pendingChapter':
      return { ...model, pendingChapter: action.chapter };
    default:
      return model;
  }
}

export interface Store {
  model: AppModel;
  content: GameContent;
  lang: Lang;
  saves: SaveManager | null;
  reduceMotion: boolean;
  go: (route: Route) => void;
  back: () => void;
  openSaves: (mode: SavesMode) => void;
  setTab: (tab: Tab) => void;
  update: (fn: (g: GameState) => GameState) => void;
  startNewGame: (draft: CharacterDraft, slot: number | null) => GameState;
  loadGame: (slot: number) => Promise<{ ok: boolean; error?: string; notes: string[] }>;
  /** Recharge l'état mis de côté juste avant la dernière relève de cet emplacement. */
  restoreBeforeRelay: (slot: number) => Promise<{ ok: boolean; error?: string; notes: string[] }>;
  /** Relève : met de côté l'état de la mort, puis le compagnon reprend la route. */
  relayTakeOver: (hero: CharacterId, picks: ItemId[]) => void;
  closeGame: () => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
  setPendingSlot: (slot: number | null) => void;
  dismissRecap: () => void;
  dismissUnlocked: () => void;
  /** Rejouer un chapitre : choisit le chapitre, puis l'emplacement. */
  setPendingChapter: (chapter: ChapterId | null) => void;
  startFromChapter: (chapter: ChapterId, slot: number) => Promise<{ ok: boolean; error?: string }>;
  feedback: (kind: 'light' | 'heavy' | 'success' | 'error') => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore doit être utilisé dans un GameProvider.');
  return s;
}

/** Raccourci : la partie en cours (garantie présente dans les écrans de jeu). */
export function useGame(): GameState {
  const { model } = useStore();
  if (!model.game) throw new Error('Aucune partie en cours.');
  return model.game;
}

const MAX_IDLE_MS = 5 * 60 * 1000;

export function GameProvider({
  children,
  saves,
  initial,
}: {
  children: React.ReactNode;
  /** null : pas de persistance (galerie de maquettes). */
  saves: SaveManager | null;
  initial?: Partial<AppModel>;
}) {
  const [model, dispatch] = useReducer(reducer, {
    route: 'title',
    prevRoute: 'title',
    savesMode: 'load',
    tab: 'story',
    slot: null,
    game: null,
    // Maquettes et vidéo (état initial fourni) : pas de tutoriel par-dessus.
    settings: initial ? { ...DEFAULT_SETTINGS, tutorialDone: true } : DEFAULT_SETTINGS,
    systemReduceMotion: false,
    saveError: null,
    saveCount: 0,
    pendingSlot: null,
    recap: false,
    meta: emptyMeta(),
    unlocked: [],
    pendingChapter: null,
    ...initial,
  });
  const lastActivity = useRef(0);
  const languageRef = useRef(model.settings.language);
  useEffect(() => {
    languageRef.current = model.settings.language;
  }, [model.settings.language]);
  const settingsLoaded = useRef(!saves);
  // Maquettes : le tutoriel n'apparaît que si la maquette le demande.
  const mockTutorial = initial ? (initial.settings?.tutorialDone ?? true) : null;

  useEffect(() => {
    lastActivity.current = Date.now();
  }, []);

  // Paramètres persistants.
  // Une maquette qui fixe ses propres paramètres les garde tels quels (rien n'est relu ni écrit).
  const fixedSettings = !!initial?.settings;
  useEffect(() => {
    if (!saves || fixedSettings) return;
    let alive = true;
    saves.loadSettings(DEFAULT_SETTINGS).then((s) => {
      if (!alive) return;
      dispatch({ type: 'settings', patch: mockTutorial === null ? s : { ...s, tutorialDone: mockTutorial } });
      settingsLoaded.current = true;
    });
    return () => {
      alive = false;
    };
  }, [saves, mockTutorial, fixedSettings]);
  useEffect(() => {
    if (saves && settingsLoaded.current) saves.saveSettings(model.settings).catch(() => undefined);
  }, [saves, model.settings]);

  // Préférence système « réduire les animations ».
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && dispatch({ type: 'systemReduceMotion', value: v }))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => dispatch({ type: 'systemReduceMotion', value: v }));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  // Autosauvegarde à chaque changement d'état de partie.
  useEffect(() => {
    if (!saves || !model.game || model.slot === null) return;
    saves
      .save(model.slot, model.game)
      .then(() => dispatch({ type: 'saved' }))
      .catch((e: Error) => dispatch({ type: 'saveError', error: e?.message ?? 'Sauvegarde impossible.' }));
  }, [saves, model.game, model.slot]);

  // Mémoires : chargées une fois, enrichies à chaque changement de partie (jamais pour les maquettes).
  const metaLoaded = useRef(false);
  const prevScene = useRef<string | null>(null);
  const chapterSaved = useRef(new Set<string>());
  useEffect(() => {
    if (!saves || mockTutorial !== null) return;
    let alive = true;
    saves.loadJson(META_KEY).then((raw) => {
      if (!alive) return;
      metaLoaded.current = true;
      dispatch({ type: 'meta', meta: readMeta(raw) });
    });
    return () => {
      alive = false;
    };
  }, [saves, mockTutorial]);
  const metaRef = useRef(model.meta);
  useEffect(() => {
    metaRef.current = model.meta;
  }, [model.meta]);
  useEffect(() => {
    const g = model.game;
    if (!g || !saves || mockTutorial !== null || !metaLoaded.current) return;
    const c = contentFor(resolveLanguage(languageRef.current));
    const res = absorbGame(metaRef.current, c, g, prevScene.current, c.achievements, Date.now());
    prevScene.current = g.currentScene;
    if (res.meta !== metaRef.current) {
      dispatch({ type: 'meta', meta: res.meta, unlocked: res.unlocked });
      saves.saveJson(META_KEY, res.meta).catch(() => undefined);
    }
    // Début de chapitre mémorisé pour « Rejouer un chapitre ».
    const ch = c.chapters.find((x) => x.start === g.currentScene);
    const key = `${g.id}:${ch?.id}`;
    if (ch && !g.ending && model.slot !== null && !chapterSaved.current.has(key)) {
      chapterSaved.current.add(key);
      saves.saveChapterStart(ch.id, g).catch(() => undefined);
    }
  }, [model.game, model.slot, saves, mockTutorial]);

  // Rappel de reprise (opt-in) : programmé en quittant une partie en cours, annulé au retour.
  const reminderGame = useRef<GameState | null>(null);
  useEffect(() => {
    reminderGame.current = model.game;
  }, [model.game]);
  useEffect(() => {
    if (!model.settings.reminders || mockTutorial !== null) return;
    const sub = RNAppState.addEventListener('change', (st) => {
      const g = reminderGame.current;
      if (st === 'active') cancelReminders();
      else if (st === 'background' && g && !g.ending) {
        const lang = resolveLanguage(languageRef.current);
        const left = Math.max(0, Math.round(hoursLeft(g.clock)));
        scheduleReminder(translate(lang, 'notif.title'), translate(lang, 'notif.body', { name: g.player.name, left }));
      }
    });
    return () => sub.remove();
  }, [model.settings.reminders, mockTutorial]);

  // Mise en arrière-plan : on vide la file d'écriture.
  useEffect(() => {
    if (!saves) return;
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st !== 'active') saves.flush().catch(() => undefined);
      else lastActivity.current = Date.now();
    });
    return () => sub.remove();
  }, [saves]);

  const update = useCallback((fn: (g: GameState) => GameState) => {
    const now = Date.now();
    const elapsed = Math.min(now - lastActivity.current, MAX_IDLE_MS);
    lastActivity.current = now;
    dispatch({ type: 'update', fn: (g) => {
      const next = fn(g);
      return next === g ? g : addPlaytime(next, elapsed);
    } });
  }, []);

  const startNewGame = useCallback(
    (draft: CharacterDraft, slot: number | null) => {
      const game = newGame(contentFor(resolveLanguage(languageRef.current)), draft, { seed: newSeed(), id: `partie-${Date.now()}`, now: Date.now() });
      lastActivity.current = Date.now();
      // L'ancienne partie de cet emplacement (écrasement confirmé) disparaît avec sa copie de secours.
      if (slot !== null && saves) saves.remove(slot).catch(() => undefined);
      dispatch({ type: 'start', slot, game });
      if (slot !== null) dispatch({ type: 'settings', patch: { lastSlot: slot } });
      return game;
    },
    [saves],
  );

  const loadGame = useCallback(
    async (slot: number, beforeRelay = false) => {
      if (!saves) return { ok: false, error: 'Persistance désactivée.', notes: [] };
      const res = beforeRelay ? await saves.loadRelaySnapshot(slot) : await saves.load(slot);
      if (!res.ok || !res.state) return { ok: false, error: res.error, notes: [] };
      lastActivity.current = Date.now();
      dispatch({ type: 'start', slot, game: res.state });
      dispatch({ type: 'settings', patch: { lastSlot: slot } });
      if (res.state.turn > 0 && !res.state.ending) dispatch({ type: 'recap', value: true });
      const notes = [...(res.repairs ?? [])];
      if (res.fromBackup) notes.unshift('La sauvegarde principale était endommagée : la copie de secours a été restaurée.');
      if (res.migratedFrom) notes.unshift(`Sauvegarde mise à jour depuis le format v${res.migratedFrom}.`);
      return { ok: true, notes };
    },
    [saves],
  );

  const lang = resolveLanguage(model.settings.language);
  const content = contentFor(lang);

  const startFromChapter = useCallback(
    async (chapter: ChapterId, slot: number) => {
      if (!saves) return { ok: false, error: 'Persistance désactivée.' };
      const res = await saves.loadChapterStart(chapter);
      if (!res.ok || !res.state) return { ok: false, error: res.error };
      await saves.remove(slot);
      const now = Date.now();
      const game: GameState = { ...res.state, id: `partie-${now}`, createdAt: now, ending: null, notices: [] };
      lastActivity.current = now;
      dispatch({ type: 'start', slot, game });
      dispatch({ type: 'settings', patch: { lastSlot: slot } });
      return { ok: true };
    },
    [saves],
  );

  const restoreBeforeRelay = useCallback((slot: number) => loadGame(slot, true), [loadGame]);

  const relayTakeOver = useCallback(
    (hero: CharacterId, picks: ItemId[]) => {
      // La copie passe par la file d'écriture avant l'autosauvegarde du nouvel état.
      if (saves && model.slot !== null && model.game?.ending) saves.saveRelaySnapshot(model.slot, model.game).catch(() => undefined);
      update((g) => takeOver(content, g, hero, picks));
    },
    [saves, model.slot, model.game, update, content],
  );

  const closeGame = useCallback(async () => {
    if (saves) await saves.flush().catch(() => undefined);
    dispatch({ type: 'close' });
  }, [saves]);

  const reduceMotion = model.settings.reduceMotion || model.systemReduceMotion;
  const hapticsOn = model.settings.haptics;

  const feedback = useCallback(
    (kind: 'light' | 'heavy' | 'success' | 'error') => {
      if (!hapticsOn || Platform.OS === 'web') return;
      const run =
        kind === 'light'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          : kind === 'heavy'
            ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      run.catch(() => undefined);
    },
    [hapticsOn],
  );


  const store = useMemo<Store>(
    () => ({
      model,
      content,
      lang,
      saves,
      reduceMotion,
      go: (route) => dispatch({ type: 'route', route }),
      back: () => dispatch({ type: 'route', route: model.prevRoute === model.route ? (model.game ? 'game' : 'title') : model.prevRoute }),
      openSaves: (mode) => dispatch({ type: 'route', route: 'saves', savesMode: mode }),
      setTab: (tab) => dispatch({ type: 'tab', tab }),
      update,
      startNewGame,
      loadGame: (slot: number) => loadGame(slot),
      restoreBeforeRelay,
      relayTakeOver,
      closeGame,
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      setPendingSlot: (slot) => dispatch({ type: 'pendingSlot', slot }),
      dismissRecap: () => dispatch({ type: 'recap', value: false }),
      dismissUnlocked: () => dispatch({ type: 'dismissUnlocked' }),
      setPendingChapter: (chapter) => dispatch({ type: 'pendingChapter', chapter }),
      startFromChapter,
      feedback,
    }),
    [model, content, lang, saves, reduceMotion, update, startNewGame, loadGame, restoreBeforeRelay, relayTakeOver, startFromChapter, closeGame, feedback],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
