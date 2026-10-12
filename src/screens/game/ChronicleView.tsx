/**
 * Chronique des décisions : tout ce qui a été choisi et vécu, par chapitre.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChronicleEntry, GameState } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { colors, fonts, radius, space, type } from '../../ui/theme';

export function ChronicleView({ game }: { game: GameState }) {
  const { content } = useStore();
  const [majorOnly, setMajorOnly] = useState(false);
  const data = useMemo(() => {
    const list = majorOnly ? game.chronicle.filter((c) => c.major) : game.chronicle;
    return [...list].reverse();
  }, [game.chronicle, majorOnly]);

  const renderItem = ({ item, index }: { item: ChronicleEntry; index: number }) => {
    const prev = data[index - 1];
    const chapter = content.chapters.find((c) => c.id === item.chapter);
    const newChapter = !prev || prev.chapter !== item.chapter;
    return (
      <View>
        {newChapter && chapter && (
          <Text style={[type.label, { color: colors.rustBright, marginTop: space.lg, marginBottom: space.sm }]}>
            Chapitre {chapter.number} — {chapter.title}
          </Text>
        )}
        <View style={styles.entry}>
          <View style={[styles.dot, item.major && { backgroundColor: colors.rustBright, borderColor: colors.rustBright }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, item.major && { color: colors.text, fontFamily: fonts.bodyBold }]}>{item.text}</Text>
            <Text style={styles.meta}>{item.sceneTitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toggle}>
        {[
          { v: false, label: 'Toutes les décisions' },
          { v: true, label: 'Moments marquants' },
        ].map((o) => (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            accessibilityState={{ selected: majorOnly === o.v }}
            onPress={() => setMajorOnly(o.v)}
            style={[styles.toggleBtn, majorOnly === o.v && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, majorOnly === o.v && { color: colors.paper }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(e) => String(e.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxxl }}
        ListEmptyComponent={<Text style={[type.bodySmall, { marginTop: space.lg }]}>La chronique est encore vierge.</Text>}
        initialNumToRender={20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', margin: space.lg, marginBottom: 0, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.rustDeep },
  toggleText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  entry: { flexDirection: 'row', gap: space.md, paddingVertical: 6, borderLeftWidth: 1, borderLeftColor: colors.line, marginLeft: 5, paddingLeft: space.md },
  dot: { position: 'absolute', left: -6, top: 11, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.lineStrong },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  meta: { fontFamily: fonts.ui, fontSize: 12, color: colors.textFaint, marginTop: 1 },
});
