/**
 * Fin de partie : conclusion ou mort définitive, avec récapitulatif,
 * portraits des compagnons et bilan en tuiles.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { visibleText } from '../../engine/narrative';
import { BODY_LOOT_MAX, bodyItems, bodyRecoverable, questItems, relayCandidates, relayLevel } from '../../engine/relay';
import { ConfirmDialog } from '../../ui/components/Sheet';
import { formatPlaytime, summarize } from '../../engine/summary';
import type { CharacterId, GameState, ItemId } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { ItemIcon } from '../../ui/art/ItemIcon';
import { Emblem } from '../../ui/art/Logo';
import { Portrait, PORTRAITS } from '../../ui/art/Portraits';
import { useChrome } from '../../ui/components/Hud';
import { Badge, Button, FadeIn, Label, Panel, SectionTitle, Tile, withAlpha } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_READING, MAX_SCALE_UI, space, type } from '../../ui/theme';
import { ContextHint } from '../../ui/components/ContextHint';

const STATUS_COLOR: Record<string, string> = {
  companion: colors.mossBright,
  met: colors.textDim,
  away: colors.steel,
  captured: colors.amber,
  dead: colors.blood,
  hero: colors.violet,
};

export function EndingView({ game }: { game: GameState }) {
  const { content, openSaves, closeGame, setTab } = useStore();
  const t = useT();
  const chrome = useChrome();
  const summary = summarize(content, game);
  const death = game.ending?.kind === 'death';
  const scene = content.scenes[game.currentScene];
  const blocks = scene && (scene.kind === 'ending' || scene.kind === 'death') ? visibleText(content, game, scene) : [];
  const accent = death ? colors.blood : colors.amber;
  const relay = death ? relayCandidates(content, game) : [];

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg + 4, paddingTop: chrome.top + space.lg, paddingBottom: chrome.bottom }}>
      <FadeIn>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          {death ? <Icon name="skull" size={64} color={colors.blood} strokeWidth={1.3} /> : <Emblem size={110} />}
          <Label color={accent}>{death ? (relay.length ? t('end.fallen') : t('end.death')) : t('end.ending')}</Label>
          <Text style={[type.display, { textAlign: 'center', fontSize: 52, lineHeight: 60 }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE_UI}>
            {summary.ending?.title ?? t('end.fallback')}
          </Text>
          {summary.ending && <Text style={[styles.epitaph, { color: accent }]}>« {summary.ending.epitaph} »</Text>}
          {death && summary.cause && <Text style={type.uiSmall}>{t('end.cause', { cause: summary.cause })}</Text>}
        </View>
      </FadeIn>

      {blocks.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          {blocks.map((b, i) => (
            <FadeIn key={i} delay={200 + i * 120}>
              <Text style={[type.body, { marginBottom: space.lg }]} maxFontSizeMultiplier={MAX_SCALE_READING}>
                {b.text}
              </Text>
            </FadeIn>
          ))}
        </View>
      )}

      {relay.length > 0 && <RelayPanel game={game} />}

      <SectionTitle>{t('end.stats')}</SectionTitle>
      <View style={styles.bento}>
        <Tile style={styles.tile} label={t('end.decisions')} value={summary.decisions} icon="chevron" />
        <Tile style={styles.tile} label={t('hud.levelLabel')} value={summary.level} icon="star" color={colors.violet} />
        <Tile style={styles.tile} label={t('tab.quests')} value={`${summary.questsCompleted.length}`} sub={summary.questsFailed.length ? t('end.failed', { n: summary.questsFailed.length }) : undefined} icon="quest" color={colors.mossBright} />
        <Tile style={styles.tile} label={t('end.time')} value={formatPlaytime(content, summary.playtimeMs)} icon="clock" />
      </View>

      <SectionTitle>{t('end.what')}</SectionTitle>
      <Panel style={{ gap: 8 }}>
        {summary.lines.map((l) => (
          <View key={l.text} style={styles.line}>
            <Icon name={l.tone === 'good' ? 'check' : l.tone === 'bad' ? 'close' : 'chevron'} size={14} color={l.tone === 'good' ? colors.mossBright : l.tone === 'bad' ? colors.rustBright : colors.textDim} strokeWidth={2.2} />
            <Text style={[type.bodySmall, { flex: 1, color: colors.text }]}>{l.text}</Text>
          </View>
        ))}
        {summary.lines.length === 0 && <Text style={type.bodySmall}>{t('end.short')}</Text>}
      </Panel>

      {summary.allies.length > 0 && (
        <>
          <SectionTitle>{t('end.allies')}</SectionTitle>
          <View style={styles.allies}>
            {summary.allies.map((a) => (
              <View key={a.id} style={styles.ally}>
                <View style={a.status === 'dead' ? { opacity: 0.4 } : undefined}>{PORTRAITS[a.id] ? <Portrait id={a.id} size={64} /> : <View style={styles.blank} />}</View>
                <Text style={styles.allyName} numberOfLines={2}>
                  {a.name}
                </Text>
                <Badge label={t(`status.${a.status}`)} color={STATUS_COLOR[a.status] ?? colors.textDim} />
              </View>
            ))}
          </View>
        </>
      )}

      {summary.majorEvents.length > 0 && (
        <>
          <SectionTitle>{t('chronicle.major')}</SectionTitle>
          {summary.majorEvents.slice(-10).map((e, i) => (
            <Text key={i} style={[type.bodySmall, { marginBottom: 6 }]}>
              — {e}
            </Text>
          ))}
        </>
      )}

      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Button label={t('title.new')} icon="plus" onPress={() => openSaves('new')} />
        <Button label={t('end.load')} icon="save" variant="secondary" onPress={() => openSaves('load')} />
        <Button label={t('end.chronicle')} icon="journal" variant="secondary" onPress={() => setTab('chronicle')} />
        <Button label={t('end.menu')} variant="ghost" onPress={() => closeGame()} />
      </View>
    </ScrollView>
  );
}

/** La relève : choisir le compagnon qui reprend la route, puis fouiller le corps. */
function RelayPanel({ game }: { game: GameState }) {
  const { content, relayTakeOver, setTab, feedback } = useStore();
  const t = useT();
  const candidates = relayCandidates(content, game);
  const [hero, setHero] = useState<CharacterId>(candidates[0].character);
  const [picks, setPicks] = useState<ItemId[]>([]);
  const [confirming, setConfirming] = useState(false);
  const recoverable = bodyRecoverable(content, game);
  const body = bodyItems(content, game);
  const kept = questItems(content, game);
  const heroName = candidates.find((h) => h.character === hero)?.name ?? hero;

  const toggle = (id: ItemId) => {
    feedback('light');
    setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= BODY_LOOT_MAX ? cur : [...cur, id]));
  };

  return (
    <FadeIn delay={250}>
      <SectionTitle>{t('relay.title')}</SectionTitle>
      <ContextHint id="relay" style={{ marginBottom: space.sm }} />
      <Panel style={{ gap: space.md }}>
        <Text style={type.bodySmall}>{t('relay.intro', { name: game.player.name })}</Text>
        <Label>{t('relay.choose')}</Label>
        <View style={{ gap: space.sm }}>
          {candidates.map((h) => {
            const selected = h.character === hero;
            const prof = content.profiles[h.profile];
            return (
              <Pressable
                key={h.character}
                onPress={() => {
                  feedback('light');
                  setHero(h.character);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.heroCard, selected && { borderColor: colors.violet, backgroundColor: withAlpha(colors.violet, 0.12) }]}
              >
                <Portrait id={h.character} size={52} ring={selected ? colors.violet : undefined} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.heroName}>{content.characters[h.character]?.name ?? h.character}</Text>
                  <Text style={type.uiSmall}>
                    {prof?.name} · {t('relay.level', { n: relayLevel(content, game, h) })}
                  </Text>
                  <Text style={[type.uiSmall, { color: colors.textDim }]} numberOfLines={2}>
                    {[prof?.skill.name, prof?.skill2?.name].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {selected && <Icon name="check" size={18} color={colors.violet} strokeWidth={2.4} />}
              </Pressable>
            );
          })}
        </View>

        <Label>{t('relay.search')}</Label>
        {!recoverable ? (
          <Text style={type.bodySmall}>{t('relay.bodyLost')}</Text>
        ) : body.length === 0 ? (
          <Text style={type.bodySmall}>{t('relay.bodyEmpty')}</Text>
        ) : (
          <>
            <Text style={type.uiSmall}>
              {t('relay.searchHint', { max: BODY_LOOT_MAX, name: game.player.name })} {t('relay.picked', { n: picks.length, max: BODY_LOOT_MAX })}
            </Text>
            <View style={styles.loot}>
              {body.map(({ item, qty }) => {
                const def = content.items[item];
                const on = picks.includes(item);
                const full = !on && picks.length >= BODY_LOOT_MAX;
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggle(item)}
                    disabled={full}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: full }}
                    accessibilityLabel={`${def.name} ×${qty}`}
                    style={[styles.lootItem, on && { borderColor: colors.mossBright, backgroundColor: withAlpha(colors.mossBright, 0.12) }, full && { opacity: 0.4 }]}
                  >
                    <ItemIcon icon={def.icon} category={def.category} size={30} />
                    <Text style={styles.lootName} numberOfLines={2}>
                      {def.name}
                      {qty > 1 ? ` ×${qty}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {kept.length > 0 && (
          <Text style={[type.uiSmall, { color: colors.amber }]}>{t('relay.questKept', { items: kept.map((k) => content.items[k.item]?.name ?? k.item).join(', ') })}</Text>
        )}

        <Button
          label={t('relay.go', { name: heroName })}
          icon="chevron"
          accessibilityHint={t('relay.goA11y', { name: heroName })}
          onPress={() => setConfirming(true)}
        />
      </Panel>
      <ConfirmDialog
        visible={confirming}
        title={t('relay.confirmTitle', { name: heroName })}
        message={
          recoverable && body.length
            ? t('relay.confirmBody', { name: heroName, items: picks.length ? picks.map((id) => content.items[id]?.name ?? id).join(', ') : t('relay.confirmNothing'), fallen: game.player.name })
            : t('relay.confirmBodyLost', { name: heroName, fallen: game.player.name })
        }
        confirmLabel={t('relay.confirmGo')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          feedback('success');
          relayTakeOver(hero, picks);
          setTab('story');
        }}
      />
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
  heroName: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.text },
  loot: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  lootItem: { width: 96, alignItems: 'center', gap: 4, padding: space.sm, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  lootName: { fontFamily: fonts.ui, fontSize: 12, color: colors.text, textAlign: 'center' },
  epitaph: { fontFamily: fonts.titleItalic, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  line: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bento: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tile: { flexBasis: '46%', flexGrow: 1, margin: 4 },
  allies: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  ally: { width: 92, alignItems: 'center', gap: 6 },
  allyName: { fontFamily: fonts.uiBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  blank: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.panelRaised },
});
