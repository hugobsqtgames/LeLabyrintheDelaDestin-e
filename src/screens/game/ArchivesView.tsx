/**
 * Archives : documents trouvés (lus sur papier) et pages du journal intime
 * écrites à la fin de chaque chapitre.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DocumentDef, GameState } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { Glass } from '../../ui/components/Glass';
import { Sheet } from '../../ui/components/Sheet';
import { Label, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_READING, radius, space, type } from '../../ui/theme';
import { useChrome } from '../../ui/components/Hud';
import { makeMatcher, SearchField } from './ChronicleView';

export function ArchivesView({ game }: { game: GameState }) {
  const { content } = useStore();
  const t = useT();
  const chrome = useChrome();
  const [open, setOpen] = useState<DocumentDef | null>(null);
  const total = Object.keys(content.documents).length;
  const allDocs = useMemo(() => game.documents.map((id) => content.documents[id]).filter(Boolean), [game.documents, content]);
  const [query, setQuery] = useState('');
  const match = useMemo(() => makeMatcher(query), [query]);
  const docs = useMemo(() => (match ? allDocs.filter((d) => match(d.title, d.source, d.body)) : allDocs), [allDocs, match]);
  const diary = useMemo(
    () =>
      match
        ? game.diary.filter((page) => {
            const ch = content.chapters.find((c) => c.id === page.chapter);
            return match(page.text, ch?.title);
          })
        : game.diary,
    [game.diary, content, match],
  );
  const hasArchives = allDocs.length > 0 || game.diary.length > 0;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top, paddingBottom: chrome.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {hasArchives && (
          <View style={{ marginTop: space.sm, gap: space.sm }}>
            <SearchField value={query} onChange={setQuery} placeholder={t('archives.search')} />
            {match && (
              <Text style={type.label}>
                {docs.length + diary.length === 0 ? t('archives.noResults', { q: query.trim() }) : t('archives.results', { docs: docs.length, pages: diary.length })}
              </Text>
            )}
          </View>
        )}
        {(!match || docs.length > 0) && (
          <SectionTitle right={<Text style={[type.number, { fontSize: 12, color: colors.textDim }]}>{match ? docs.length : `${docs.length}/${total}`}</Text>}>{t('archives.documents')}</SectionTitle>
        )}
        {allDocs.length === 0 && <Text style={type.bodySmall}>{t('archives.none')}</Text>}
        <View style={styles.grid}>
          {docs.map((d, i) => (
            <Pressable
              key={d.id}
              onPress={() => setOpen(d)}
              accessibilityRole="button"
              accessibilityLabel={`${d.title}. ${d.source}`}
              style={({ pressed }) => [styles.cell, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Glass radius={radius.lg} style={styles.doc}>
                <View style={[styles.docIcon, { transform: [{ rotate: `${(i % 3) - 1}deg` }] }]}>
                  <Icon name="archive" size={16} color={colors.paperInk} />
                </View>
                <Text style={styles.docTitle} numberOfLines={2}>
                  {d.title}
                </Text>
                <Text style={styles.docSource} numberOfLines={2}>
                  {d.source}
                </Text>
              </Glass>
            </Pressable>
          ))}
          {!match && Array.from({ length: Math.max(0, total - docs.length) }).map((_, i) => (
            <View key={`x${i}`} style={styles.cell}>
              <View style={[styles.doc, styles.missing]}>
                <Icon name="lock" size={14} color={colors.textFaint} />
              </View>
            </View>
          ))}
        </View>

        {(!match || diary.length > 0) && <SectionTitle>{t('archives.diary')}</SectionTitle>}
        {game.diary.length === 0 && <Text style={type.bodySmall}>{t('archives.noDiary')}</Text>}
        <View style={{ gap: space.md }}>
          {diary.map((page) => {
            const ch = content.chapters.find((c) => c.id === page.chapter);
            return (
              <Panel key={page.chapter} tone="paper" taped>
                <Label color="rgba(27,23,20,0.6)">{t('archives.diaryPage', { n: ch?.number ?? '' })}</Label>
                <Text style={[type.h2, { color: colors.paperInk, fontSize: 24, marginTop: 2, marginBottom: space.sm }]}>{ch?.title}</Text>
                <Text style={styles.diaryText} maxFontSizeMultiplier={MAX_SCALE_READING}>
                  {page.text}
                </Text>
              </Panel>
            );
          })}
        </View>
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && (
          <View style={styles.paper}>
            <Text style={[type.label, { color: 'rgba(27,23,20,0.6)' }]}>{open.source}</Text>
            <Text style={styles.paperText} maxFontSizeMultiplier={MAX_SCALE_READING}>
              {open.body}
            </Text>
          </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  doc: { padding: space.md, minHeight: 128, gap: 6 },
  missing: { borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  docIcon: { width: 30, height: 34, borderRadius: 4, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  docTitle: { fontFamily: fonts.uiBold, fontSize: 15, color: colors.text, letterSpacing: -0.2 },
  docSource: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16, color: colors.textDim },
  diaryText: { fontFamily: fonts.bodyItalic, fontSize: 17, lineHeight: 27, color: colors.paperInk },
  paper: { backgroundColor: colors.paper, borderRadius: radius.md, padding: space.lg, gap: space.md },
  paperText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: colors.paperInk },
});
