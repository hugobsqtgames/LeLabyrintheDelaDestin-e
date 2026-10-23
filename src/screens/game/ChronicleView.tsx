/**
 * Chronique des décisions : tout ce qui a été choisi et vécu, par chapitre.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChronicleEntry, GameState } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Glass } from '../../ui/components/Glass';
import { Segmented } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, TOUCH, type } from '../../ui/theme';
import { useChrome } from '../../ui/components/Hud';

/** Texte comparable : minuscules, sans accents ni apostrophes typographiques. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘`]/g, "'").toLowerCase().trim();
}

/** Prépare une requête : chaque mot doit apparaître dans l'un des textes. */
export function makeMatcher(query: string): ((...texts: (string | undefined)[]) => boolean) | null {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return (...texts) => {
    const hay = normalizeSearch(texts.filter(Boolean).join(' '));
    return words.every((w) => hay.includes(w));
  };
}

/** Champ de recherche en pilule de verre, avec loupe et bouton d'effacement. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const t = useT();
  return (
    <Glass radius={radius.pill} style={styles.search}>
      <Icon name="search" size={17} color={colors.textDim} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        maxFontSizeMultiplier={MAX_SCALE_UI}
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel={t('chronicle.searchClear')} hitSlop={8} style={styles.searchClear}>
          <Icon name="close" size={14} color={colors.text} />
        </Pressable>
      )}
    </Glass>
  );
}

export function ChronicleView({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const chrome = useChrome();
  const [filter, setFilter] = useState<'all' | 'major'>('all');
  const [query, setQuery] = useState('');
  const match = useMemo(() => makeMatcher(query), [query]);
  const data = useMemo(() => {
    const list = game.chronicle.filter((c) => (filter !== 'major' || c.major) && (!match || match(c.text, c.sceneTitle)));
    return list.reverse();
  }, [game.chronicle, filter, match]);

  const renderItem = ({ item, index }: { item: ChronicleEntry; index: number }) => {
    const prev = data[index - 1];
    const chapter = content.chapters.find((c) => c.id === item.chapter);
    const newChapter = !prev || prev.chapter !== item.chapter;
    return (
      <View>
        {newChapter && chapter && (
          <View style={styles.chapterHead}>
            <Text style={[type.label, { color: colors.rustBright }]}>{t('story.chapter', { n: chapter.number })}</Text>
            <Text style={[type.h2, { fontSize: 24 }]}>{chapter.title}</Text>
          </View>
        )}
        <View style={styles.entry}>
          <View style={[styles.dot, item.major && { backgroundColor: colors.rust, borderColor: colors.rust }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, item.major && { color: colors.text, fontFamily: fonts.bodyBold }]}>{item.text}</Text>
            <Text style={styles.meta}>{item.sceneTitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      automaticallyAdjustKeyboardInsets
      data={data}
      keyExtractor={(e) => String(e.id)}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={{ marginTop: space.sm, gap: space.sm }}>
          <SearchField value={query} onChange={setQuery} placeholder={t('chronicle.search')} />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('chronicle.all') },
              { id: 'major', label: t('chronicle.major') },
            ]}
          />
          {match && data.length > 0 && <Text style={[type.label, { marginTop: space.xs }]}>{data.length === 1 ? t('chronicle.result1') : t('chronicle.results', { n: data.length })}</Text>}
        </View>
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top, paddingBottom: chrome.bottom }}
      ListEmptyComponent={<Text style={[type.bodySmall, { marginTop: space.lg }]}>{match ? t('chronicle.noResults', { q: query.trim() }) : t('chronicle.empty')}</Text>}
      initialNumToRender={20}
    />
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH, paddingLeft: space.md + 2, paddingRight: space.sm },
  // Sur le web, la pilule de verre tient lieu de cadre : pas de rectangle de focus du navigateur.
  searchInput: { flex: 1, minHeight: TOUCH, color: colors.text, fontFamily: fonts.ui, fontSize: 16, paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) },
  searchClear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassStrong },
  chapterHead: { marginTop: space.xl, marginBottom: space.sm, gap: 2 },
  entry: { flexDirection: 'row', gap: space.md, paddingVertical: 7, borderLeftWidth: 1, borderLeftColor: colors.lineStrong, marginLeft: 5, paddingLeft: space.md },
  dot: { position: 'absolute', left: -6, top: 12, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.textFaint },
  text: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: colors.textDim },
  meta: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textFaint, marginTop: 3, letterSpacing: 0.3 },
});
