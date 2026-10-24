/**
 * Galerie des maquettes : chaque écran réel, rendu avec un état produit par
 * le moteur, dans un cadre aux proportions d'un iPhone (390 × 844 pt).
 * Les maquettes sont interactives mais n'écrivent jamais dans les vraies sauvegardes.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { ScreenProps } from '../AppRouter';
import { CONTENT } from '../content';
import { SaveManager, slotKey } from '../persistence/saves';
import { serialize } from '../persistence/schema';
import { MemoryStorage } from '../persistence/storage';
import { GameProvider, useStore } from '../store/GameStore';
import { ModalModeContext } from '../ui/components/Sheet';
import { Button, IconButton, Label, Screen } from '../ui/components/primitives';
import { useT } from '../i18n';
import { colors, fonts, radius, space, type } from '../ui/theme';
import { buildMockups, midGame, type Mockup } from './fixtures';

const PHONE = { w: 390, h: 844 };
const FAKE_INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

function PhoneFrame({ children, width }: { children: React.ReactNode; width: number }) {
  const scale = width / PHONE.w;
  return (
    <View testID="phone-frame" style={[styles.frame, { width: width + 12, height: PHONE.h * scale + 12 }]}>
      <View style={{ width, height: PHONE.h * scale, overflow: 'hidden', borderRadius: 34 * scale }}>
        <View
          style={{
            width: PHONE.w,
            height: PHONE.h,
            position: 'absolute',
            left: -(PHONE.w - width) / 2,
            top: -(PHONE.h - PHONE.h * scale) / 2,
            transform: [{ scale }],
          }}
        >
          {children}
          <View style={styles.island} pointerEvents="none" />
        </View>
      </View>
    </View>
  );
}

/** Chaque maquette dispose de ses propres sauvegardes, en mémoire et jetables. */
/** Le routeur est fourni par l'appelant : l'importer ici créerait un cycle AppRouter ↔ galerie. */
export type RouterComponent = React.ComponentType<{ screenProps?: ScreenProps }>;

function MockupPreview({ mockup, Router }: { mockup: Mockup; Router: RouterComponent }) {
  const [saves] = useState(() => {
    const storage = new MemoryStorage();
    // Une partie en cours, pour que l'écran titre montre « Continuer ».
    storage.data.set(slotKey(1), serialize(CONTENT, midGame(), Date.UTC(2026, 9, 12, 21, 40)));
    return new SaveManager(storage, CONTENT);
  });
  return (
    <GameProvider saves={saves} initial={mockup.model}>
      <Router screenProps={mockup.screenProps} />
    </GameProvider>
  );
}

export function GalleryScreen({ Router }: { Router: RouterComponent }) {
  const { back } = useStore();
  const t = useT();
  const mockups = useMemo(() => buildMockups(), []);
  const [index, setIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(PHONE.w, width - 2 * space.lg - 12, ((height - 240) * PHONE.w) / PHONE.h);
  const m = mockups[index];
  // Stockage en mémoire : chaque maquette dispose de ses propres sauvegardes jetables.

  return (
    <Screen aura="neutral">
      <View style={styles.header}>
        <IconButton icon="back" label={t('common.back')} onPress={back} />
        <View style={{ flex: 1 }}>
          <Label color={colors.rustBright}>
            {t('gallery.count', { n: index + 1, total: mockups.length })}
          </Label>
          <Text style={type.h2} numberOfLines={1}>
            {m.title}
          </Text>
        </View>
      </View>
      <Text style={[type.uiSmall, { marginBottom: space.sm }]}>{m.caption}</Text>
      <View style={{ alignItems: 'center' }}>
        <PhoneFrame width={Math.max(220, frameWidth)}>
          <SafeAreaInsetsContext.Provider value={FAKE_INSETS}>
            <ModalModeContext.Provider value="inline">
              <MockupPreview key={m.id} mockup={m} Router={Router} />
            </ModalModeContext.Provider>
          </SafeAreaInsetsContext.Provider>
        </PhoneFrame>
      </View>
      <View style={styles.nav}>
        <Button label={t('gallery.prev')} compact variant="secondary" disabled={index === 0} onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />
        <Button label={t('gallery.next')} compact disabled={index === mockups.length - 1} onPress={() => setIndex(index + 1)} style={{ flex: 1 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: space.sm }}>
        {mockups.map((mk, i) => (
          <Pressable
            key={mk.id}
            accessibilityRole="button"
            accessibilityLabel={mk.title}
            onPress={() => setIndex(i)}
            style={[styles.chip, i === index && styles.chipActive]}
          >
            <Text style={[styles.chipText, i === index && { color: colors.bg }]}>
              {i + 1}. {mk.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  frame: { padding: 6, borderRadius: 44, backgroundColor: '#050505', borderWidth: 1, borderColor: colors.lineStrong },
  island: { position: 'absolute', top: 11, left: PHONE.w / 2 - 62, width: 124, height: 36, borderRadius: 18, backgroundColor: '#000' },
  nav: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 7, backgroundColor: 'rgba(255,248,240,0.06)' },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.uiBold, fontSize: 12.5, color: colors.textDim },
});
