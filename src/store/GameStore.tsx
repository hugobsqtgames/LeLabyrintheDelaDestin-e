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
import type { CharacterDraft, GameContent, GameState } from '../engine/types';
import type { SaveManager } from '../persistence/saves';

export type Route = 'title' | 'create' | 'game' | 'saves' | 'settings' | 'gallery';
export type SavesMode = 'new' | 'load' | 'copy';
export type Tab = 'story' | 'character' | 'inventory' | 'map' | 'quests' | 'chronicle' | 'archives';
export type LanguageSetting = 'auto' | Lang;

export interface Settings {
  reduceMotion: boolean;
  haptics: boolean;
  textScale: number;
  lastSlot: number;
  /** Choix chronométrés (désactivables : le temps n'est alors plus compté). */
  timedChoices: boolean;
  /** Volume de l'ambiance sonore, 0 à 1 (0 : coupé). */
  volume: number;
  language: LanguageSetting;
}

export const DEFAULT_SETTINGS: Settings = { reduceMotion: false, haptics: true, textScale: 1, lastSlot: 0, timedChoices: true, volume: 0.5, language: 'auto' };

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
  | { type: 'recap'; value: boolean };

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
      return { ...model, game: action.game, slot: action.slot, route: 'game', tab: 'story', saveError: null, pendingSlot: null, recap: false };
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
  closeGame: () => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
  setPendingSlot: (slot: number | null) => void;
  dismissRecap: () => void;
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
    settings: DEFAULT_SETTINGS,
    systemReduceMotion: false,
    saveError: null,
    saveCount: 0,
    pendingSlot: null,
    recap: false,
    ...initial,
  });
  const lastActivity = useRef(0);
  const languageRef = useRef(model.settings.language);
  useEffect(() => {
    languageRef.current = model.settings.language;
  }, [model.settings.language]);
  const settingsLoaded = useRef(!saves);

  useEffect(() => {
    lastActivity.current = Date.now();
  }, []);

  // Paramètres persistants.
  useEffect(() => {
    if (!saves) return;
    let alive = true;
    saves.loadSettings(DEFAULT_SETTINGS).then((s) => {
      if (!alive) return;
      dispatch({ type: 'settings', patch: s });
      settingsLoaded.current = true;
    });
    return () => {
      alive = false;
    };
  }, [saves]);
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
    async (slot: number) => {
      if (!saves) return { ok: false, error: 'Persistance désactivée.', notes: [] };
      const res = await saves.load(slot);
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

  const lang = resolveLanguage(model.settings.language);
  const content = contentFor(lang);

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
      loadGame,
      closeGame,
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      setPendingSlot: (slot) => dispatch({ type: 'pendingSlot', slot }),
      dismissRecap: () => dispatch({ type: 'recap', value: false }),
      feedback,
    }),
    [model, content, lang, saves, reduceMotion, update, startNewGame, loadGame, closeGame, feedback],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
