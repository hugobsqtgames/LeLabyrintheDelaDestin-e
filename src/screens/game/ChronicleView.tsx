/**
 * Chronique des décisions : tout ce qui a été choisi et vécu, par chapitre.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ChronicleEntry, GameState } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Segmented } from '../../ui/components/primitives';
import { colors, fonts, space, type } from '../../ui/theme';
import { useChrome } from '../../ui/components/Hud';

export function ChronicleView({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const chrome = useChrome();
  const [filter, setFilter] = useState<'all' | 'major'>('all');
  const data = useMemo(() => {
    const list = filter === 'major' ? game.chronicle.filter((c) => c.major) : game.chronicle;
    return [...list].reverse();
  }, [game.chronicle, filter]);

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
      data={data}
      keyExtractor={(e) => String(e.id)}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={{ marginTop: space.sm }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('chronicle.all') },
              { id: 'major', label: t('chronicle.major') },
            ]}
          />
        </View>
      }
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top, paddingBottom: chrome.bottom }}
      ListEmptyComponent={<Text style={[type.bodySmall, { marginTop: space.lg }]}>{t('chronicle.empty')}</Text>}
      initialNumToRender={20}
    />
  );
}

const styles = StyleSheet.create({
  chapterHead: { marginTop: space.xl, marginBottom: space.sm, gap: 2 },
  entry: { flexDirection: 'row', gap: space.md, paddingVertical: 7, borderLeftWidth: 1, borderLeftColor: colors.lineStrong, marginLeft: 5, paddingLeft: space.md },
  dot: { position: 'absolute', left: -6, top: 12, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.textFaint },
  text: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: colors.textDim },
  meta: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textFaint, marginTop: 3, letterSpacing: 0.3 },
});
