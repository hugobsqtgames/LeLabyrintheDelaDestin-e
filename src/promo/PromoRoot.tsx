/**
 * Mode capture (web uniquement, `?promo=<id>&lang=fr|en`) : affiche un vrai
 * écran du jeu, en plein écran au format iPhone, dans l'état d'une maquette.
 * Sert à filmer l'application pour la vidéo de présentation et les captures
 * de l'App Store (voir promo/README.md). Aucune sauvegarde réelle n'est touchée.
 */
import React, { useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppRouter } from '../AppRouter';
import { contentFor } from '../content/localized';
import { buildMockups, midGame } from '../gallery/fixtures';
import type { Lang } from '../i18n/lang';
import { SaveManager, SETTINGS_KEY, slotKey } from '../persistence/saves';
import { serialize } from '../persistence/schema';
import { MemoryStorage } from '../persistence/storage';
import { DEFAULT_SETTINGS, GameProvider } from '../store/GameStore';
import { ModalModeContext } from '../ui/components/Sheet';

/** Zones de sécurité d'un iPhone 16 Pro (393 × 852 pt). */
const IPHONE_INSETS = { top: 59, bottom: 34, left: 0, right: 0 };

export function promoParams(): { id: string; lang: Lang; textScale?: number } | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const q = new URLSearchParams(window.location.search);
  const id = q.get('promo');
  if (!id) return null;
  const scale = Number(q.get('scale'));
  // `scale` : taille du texte du récit (tests de mise en page), sinon celle de la maquette.
  return { id, lang: q.get('lang') === 'en' ? 'en' : 'fr', textScale: Number.isFinite(scale) && scale > 0 ? scale : undefined };
}

export function PromoRoot({ id, lang, textScale }: { id: string; lang: Lang; textScale?: number }) {
  const content = contentFor(lang);
  const [setup] = useState(() => {
    const mockups = buildMockups(content);
    const mockup = mockups.find((m) => m.id === id) ?? mockups[0];
    const storage = new MemoryStorage();
    storage.data.set(slotKey(1), serialize(content, midGame(), Date.UTC(2026, 9, 12, 21, 40)));
    storage.data.set(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: lang, haptics: false, volume: 0 }));
    const model = textScale ? { ...mockup.model, settings: { ...DEFAULT_SETTINGS, tutorialDone: true, ...mockup.model.settings, textScale } } : mockup.model;
    return { mockup, model, saves: new SaveManager(storage, content) };
  });
  return (
    <SafeAreaInsetsContext.Provider value={IPHONE_INSETS}>
      <ModalModeContext.Provider value="inline">
        <GameProvider saves={setup.saves} initial={setup.model}>
          <AppRouter screenProps={setup.mockup.screenProps} />
        </GameProvider>
      </ModalModeContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
}
