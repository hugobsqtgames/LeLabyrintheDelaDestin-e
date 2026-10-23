/**
 * Fiche du personnage : portrait, tuiles de vitalité (« bento »),
 * caractéristiques, compétences de combat, atouts et relations.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { armorValue, choosePerk, effectiveStat, equipmentBonuses, maxHp, maxStamina, spendStatPoint } from '../../engine/character';
import { capacity, currentWeight } from '../../engine/inventory';
import { heroPreview } from '../../engine/relay';
import { LEVEL_MAX, STAT_IDS, STAT_MAX, xpToNext } from '../../engine/rules';
import type { CompanionStatus, GameState, PerkId } from '../../engine/types';
import { useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { EmblemBadge } from '../../ui/art/Emblems';
import { PlayerPortrait, Portrait, PORTRAITS } from '../../ui/art/Portraits';
import { Glass } from '../../ui/components/Glass';
import { useChrome } from '../../ui/components/Hud';
import { Sheet } from '../../ui/components/Sheet';
import { Badge, Bar, Label, Panel, SectionTitle, Tile } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, TOUCH, type } from '../../ui/theme';
import { ContextHint } from '../../ui/components/ContextHint';

const STATUS_COLOR: Record<CompanionStatus, string> = {
  unknown: colors.textFaint,
  met: colors.textDim,
  companion: colors.mossBright,
  away: colors.steel,
  captured: colors.amber,
  dead: colors.blood,
  hero: colors.violet,
};

function relationKey(v: number): string {
  if (v >= 7) return 'rel.loyal';
  if (v >= 4) return 'rel.trust';
  if (v >= 1) return 'rel.liking';
  if (v === 0) return 'rel.neutral';
  if (v >= -3) return 'rel.wary';
  return 'rel.hostile';
}

export function CharacterView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const t = useT();
  const chrome = useChrome();
  const p = game.player;
  const profile = content.profiles[p.profile];
  const bg = content.backgrounds[p.background];
  const bonus = equipmentBonuses(content, game);
  const people = Object.entries(game.companions).filter(([, s]) => s !== 'unknown');
  const [preview, setPreview] = useState<string | null>(null);
  const atMax = p.level >= LEVEL_MAX;
  const hpMax = maxHp(content, game);
  const stMax = maxStamina(content, game);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top + space.xs, paddingBottom: chrome.bottom }}>
      {p.unspentStatPoints + p.unspentPerks > 0 && <ContextHint id="levelup" style={{ marginBottom: space.md }} />}
      <Glass radius={radius.xl} style={styles.hero}>
        <PlayerPortrait profile={p.profile} size={112} shape="tall" />
        <View style={{ flex: 1, gap: 4 }}>
          <Label color={colors.rustBright}>{profile.name}</Label>
          <Text style={[type.h1, { fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={MAX_SCALE_UI}>
            {p.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <EmblemBadge id={p.emblem} size={20} />
            <Text style={type.uiSmall} numberOfLines={1}>
              {bg.name}
            </Text>
          </View>
          <View style={{ marginTop: space.sm, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={type.label}>{t('hud.level', { n: p.level })}</Text>
              <Text style={[type.label, { color: colors.violet }]}>{atMax ? t('char.maxLevel') : `${p.xp}/${xpToNext(p.level)} XP`}</Text>
            </View>
            <Bar value={atMax ? 1 : p.xp} max={atMax ? 1 : xpToNext(p.level)} color={colors.violet} height={4} />
          </View>
        </View>
      </Glass>

      <View style={styles.bento}>
        <Tile style={styles.tileWide} label={t('stat.hp')} icon="heart" color={colors.rust} value={`${p.hp}`} sub={`/ ${hpMax}`}>
          <Bar value={p.hp} max={hpMax} color={colors.rust} height={4} />
        </Tile>
        <Tile style={styles.tileWide} label={t('stat.stamina')} icon="bolt" color={colors.amber} value={`${p.stamina}`} sub={`/ ${stMax}`}>
          <Bar value={p.stamina} max={stMax} color={colors.amber} height={4} />
        </Tile>
        <Tile style={styles.tileWide} label={t('stat.armor')} icon="shield" color={colors.steel} value={armorValue(content, game)} />
        <Tile style={styles.tileWide} label={t('bag.load')} icon="weight" color={colors.ice} value={`${currentWeight(content, game)}`} sub={`/ ${capacity(content, game)} kg`} />
      </View>

      {p.infection > 0 && (
        <Panel tone="danger" style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.sm }}>
          <Icon name="biohazard" size={20} color={colors.mossBright} />
          <Text style={[type.bodySmall, { color: colors.text, flex: 1 }]}>{t('char.infection', { n: p.infection, hp: p.infection * 3 })}</Text>
        </Panel>
      )}

      <SectionTitle right={p.unspentStatPoints > 0 ? <Badge label={t('char.points', { n: p.unspentStatPoints })} color={colors.amber} filled /> : undefined}>{t('char.stats')}</SectionTitle>
      <View style={styles.statGrid}>
        {STAT_IDS.map((s) => {
          const eff = effectiveStat(content, game, s);
          const canSpend = p.unspentStatPoints > 0 && p.stats[s] < STAT_MAX;
          return (
            <View key={s} style={styles.statCell}>
              <Glass radius={radius.lg} style={styles.stat}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={[type.label, { flex: 1 }]}>{content.statLabels[s]}</Text>
                  {bonus[s] !== 0 && <Text style={[styles.bonus, { color: bonus[s] > 0 ? colors.mossBright : colors.rustBright }]}>{bonus[s] > 0 ? `+${bonus[s]}` : bonus[s]}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
                  <Text style={styles.statValue} maxFontSizeMultiplier={MAX_SCALE_UI}>
                    {eff}
                  </Text>
                  <View style={styles.pips}>
                    {Array.from({ length: STAT_MAX }).map((_, i) => (
                      <View key={i} style={[styles.pip, i < p.stats[s] && { backgroundColor: colors.text }]} />
                    ))}
                  </View>
                </View>
                <Text style={[type.uiSmall, { fontSize: 12, lineHeight: 16 }]} numberOfLines={3}>
                  {content.statDescriptions[s]}
                </Text>
                {canSpend && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('char.raise', { stat: content.statLabels[s] })}
                    onPress={() => {
                      feedback('success');
                      update((g) => spendStatPoint(content, g, s));
                    }}
                    style={({ pressed }) => [styles.plus, pressed && { transform: [{ scale: 0.94 }] }]}
                  >
                    <Icon name="plus" size={16} color={colors.bg} strokeWidth={2.4} />
                    <Text style={styles.plusText}>{t('char.raiseShort')}</Text>
                  </Pressable>
                )}
              </Glass>
            </View>
          );
        })}
      </View>

      <SectionTitle>{t('char.skills')}</SectionTitle>
      <View style={{ gap: space.sm }}>
        <Panel style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="star" size={15} color={colors.amber} />
            <Text style={[type.h3, { flex: 1 }]}>{profile.skill.name}</Text>
            <Badge label={`−${profile.skill.staminaCost}`} icon="bolt" color={colors.amber} />
          </View>
          <Text style={type.bodySmall}>{profile.skill.description}</Text>
        </Panel>
        <Panel style={[{ gap: 4 }, p.level < profile.skill2.level && { opacity: 0.6 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={p.level < profile.skill2.level ? 'lock' : 'sparkle'} size={15} color={colors.violet} />
            <Text style={[type.h3, { flex: 1 }]}>{profile.skill2.name}</Text>
            {p.level < profile.skill2.level ? <Badge label={t('char.unlockAt', { n: profile.skill2.level })} color={colors.violet} /> : <Badge label={`−${profile.skill2.staminaCost}`} icon="bolt" color={colors.amber} />}
          </View>
          <Text style={type.bodySmall}>{profile.skill2.description}</Text>
        </Panel>
        <Panel style={{ gap: 4 }}>
          <Label color={colors.mossBright}>{bg.name}</Label>
          <Text style={type.bodySmall}>+ {bg.advantage}</Text>
          <Text style={[type.bodySmall, { color: colors.rustBright }]}>− {bg.drawback}</Text>
        </Panel>
      </View>

      <SectionTitle right={p.unspentPerks > 0 ? <Badge label={t('char.perkToPick')} color={colors.amber} filled /> : undefined}>{t('char.perks')}</SectionTitle>
      <View style={{ gap: space.sm }}>
        {(Object.keys(content.perks) as PerkId[]).map((id) => {
          const perk = content.perks[id];
          const owned = p.perks.includes(id);
          const choosable = !owned && p.unspentPerks > 0;
          if (!owned && !choosable) return null;
          return (
            <Pressable
              key={id}
              disabled={!choosable}
              accessibilityRole="button"
              accessibilityLabel={`${perk.name}. ${perk.description}${owned ? `. ${t('char.owned')}` : ''}`}
              onPress={() => {
                feedback('success');
                update((g) => choosePerk(content, g, id));
              }}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Glass radius={radius.lg} tone={choosable ? 'accent' : 'default'} style={styles.perk}>
                <Icon name={owned ? 'check' : 'plus'} size={18} color={owned ? colors.mossBright : colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{perk.name}</Text>
                  <Text style={type.uiSmall}>{perk.description}</Text>
                </View>
              </Glass>
            </Pressable>
          );
        })}
        {p.perks.length === 0 && p.unspentPerks === 0 && <Text style={type.bodySmall}>{t('char.noPerks')}</Text>}
      </View>

      <SectionTitle>{t('char.people')}</SectionTitle>
      {people.length === 0 && <Text style={type.bodySmall}>{t('char.nobody')}</Text>}
      <View style={{ gap: space.sm }}>
        {people.map(([id, status]) => {
          const ch = content.characters[id];
          const rel = game.relations[id] ?? 0;
          return (
            <Panel key={id} style={{ padding: space.md, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={status === 'dead' ? { opacity: 0.45 } : undefined}>{PORTRAITS[id] ? <Portrait id={id} size={52} shape="squircle" /> : <View style={[styles.initials, { backgroundColor: ch.color }]} />}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>{ch.name}</Text>
                  <Text style={[type.uiSmall, { fontSize: 12.5 }]}>{ch.role}</Text>
                </View>
                <Badge label={t(`status.${status}`)} color={STATUS_COLOR[status]} />
              </View>
              {status !== 'dead' && (
                <View>
                  <View style={styles.relTrack}>
                    <View style={styles.relCenter} />
                    <View
                      style={[
                        styles.relFill,
                        rel >= 0 ? { left: '50%', width: `${Math.min(10, rel) * 5}%`, backgroundColor: colors.mossBright } : { right: '50%', width: `${Math.min(10, -rel) * 5}%`, backgroundColor: colors.rustBright },
                      ]}
                    />
                  </View>
                  <Text style={[type.label, { fontSize: 10, marginTop: 5 }]}>{t(relationKey(rel))}</Text>
                </View>
              )}
              {status === 'companion' && content.heroes[id] && (
                <Pressable onPress={() => setPreview(id)} accessibilityRole="button" style={styles.heroLink} hitSlop={6}>
                  <Icon name="person" size={14} color={colors.violet} />
                  <Text style={[type.uiSmall, { color: colors.violet, fontFamily: fonts.uiBold, flex: 1 }]}>{t('char.heroSheet')}</Text>
                  <Icon name="chevron" size={14} color={colors.violet} />
                </Pressable>
              )}
              {status === 'companion' && ch.combatAssist && (
                <Text style={[type.uiSmall, { fontSize: 12.5, color: colors.ice }]}>{t('char.assist', { text: ch.combatAssist.text, n: ch.combatAssist.every })}</Text>
              )}
            </Panel>
          );
        })}
      </View>
      <HeroPreviewSheet game={game} id={preview} onClose={() => setPreview(null)} />
    </ScrollView>
  );
}

/** Fiche de relève : ce que serait ce compagnon s'il devait reprendre la route. */
function HeroPreviewSheet({ game, id, onClose }: { game: GameState; id: string | null; onClose: () => void }) {
  const { content } = useStore();
  const t = useT();
  const sheet = id ? content.heroes[id] : null;
  const hero = sheet ? heroPreview(content, game, sheet) : null;
  const prof = sheet ? content.profiles[sheet.profile] : null;
  const bg = sheet ? content.backgrounds[sheet.background] : null;
  return (
    <Sheet visible={!!sheet} onClose={onClose} title={sheet ? t('char.heroSheetOf', { name: sheet.name }) : ''}>
      {sheet && hero && prof && bg && (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Portrait id={sheet.character} size={64} shape="squircle" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>
                {prof.name} · {t('relay.level', { n: hero.level })}
              </Text>
              <Text style={[type.uiSmall, { fontFamily: fonts.bodyItalic }]}>{prof.tagline}</Text>
            </View>
          </View>
          <Text style={type.bodySmall}>{t(sheet.lastResort ? 'char.heroLastResort' : 'char.heroIntro', { name: sheet.name })}</Text>
          <View style={styles.previewStats}>
            {(Object.keys(hero.stats) as (keyof typeof hero.stats)[]).map((s) => (
              <View key={s} style={styles.previewStat}>
                <Text style={type.label}>{content.statLabels[s]}</Text>
                <Text style={[type.number, { fontSize: 22 }]}>{hero.stats[s]}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 4 }}>
            <Label>{t('char.skills')}</Label>
            <Text style={type.bodySmall}>
              <Text style={{ fontFamily: fonts.uiBold, color: colors.text }}>{prof.skill.name}</Text> — {prof.skill.description}
            </Text>
            {prof.skill2 && (
              <Text style={type.bodySmall}>
                <Text style={{ fontFamily: fonts.uiBold, color: colors.text }}>{prof.skill2.name}</Text> ({t('relay.level', { n: prof.skill2.level })}) — {prof.skill2.description}
              </Text>
            )}
          </View>
          {hero.perks.length > 0 && (
            <View style={{ gap: 4 }}>
              <Label>{t('char.perks')}</Label>
              <Text style={type.bodySmall}>{hero.perks.map((pk) => content.perks[pk]?.name ?? pk).join(' · ')}</Text>
            </View>
          )}
          <View style={{ gap: 4 }}>
            <Label>{bg.name}</Label>
            <Text style={[type.bodySmall, { color: colors.mossBright }]}>+ {bg.advantage}</Text>
            <Text style={[type.bodySmall, { color: colors.rustBright }]}>− {bg.drawback}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Label>{t('char.heroGear')}</Label>
            <Text style={type.bodySmall}>
              {Object.entries(sheet.items)
                .map(([item, qty]) => `${content.items[item]?.name ?? item}${qty > 1 ? ` ×${qty}` : ''}`)
                .join(', ')}
            </Text>
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  previewStats: { flexDirection: 'row', gap: space.sm },
  previewStat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: 14, backgroundColor: 'rgba(255,248,240,0.05)' },
  hero: { flexDirection: 'row', gap: space.lg, alignItems: 'center', padding: space.md },
  bento: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: space.sm },
  tileWide: { flexBasis: '46%', flexGrow: 1, margin: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  statCell: { width: '50%', padding: 4 },
  stat: { padding: space.md, gap: 6, minHeight: 150 },
  statValue: { fontFamily: fonts.title, fontSize: 46, lineHeight: 54, color: colors.text },
  bonus: { fontFamily: fonts.mono, fontSize: 12 },
  pips: { flexDirection: 'row', gap: 3, paddingBottom: 10, flexWrap: 'wrap', flex: 1 },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,248,240,0.15)' },
  plus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: TOUCH - 8, borderRadius: radius.pill, backgroundColor: colors.text, marginTop: 4 },
  plusText: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.bg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  initials: { width: 52, height: 52, borderRadius: 16 },
  relTrack: { height: 4, backgroundColor: 'rgba(255,248,240,0.08)', borderRadius: 2, overflow: 'hidden' },
  relCenter: { position: 'absolute', left: '50%', width: 1, top: 0, bottom: 0, backgroundColor: colors.lineStrong },
  relFill: { position: 'absolute', top: 0, bottom: 0 },
});
