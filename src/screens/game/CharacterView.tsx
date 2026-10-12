/**
 * Fiche du personnage : caractéristiques, progression, compétences, relations.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { armorValue, choosePerk, effectiveStat, equipmentBonuses, maxHp, maxStamina, spendStatPoint } from '../../engine/character';
import { capacity, currentWeight } from '../../engine/inventory';
import { LEVEL_MAX, STAT_DESCRIPTIONS, STAT_IDS, STAT_LABELS, STAT_MAX, xpToNext } from '../../engine/rules';
import type { CompanionStatus, GameState, PerkId } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { EmblemBadge } from '../../ui/art/Emblems';
import { ProfileArt } from '../../ui/art/Figures';
import { Badge, Bar, Label, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, radius, space, TOUCH, type } from '../../ui/theme';

const STATUS_TEXT: Record<CompanionStatus, { label: string; color: string }> = {
  unknown: { label: 'Inconnu', color: colors.textFaint },
  met: { label: 'Rencontré', color: colors.textDim },
  companion: { label: 'Avec vous', color: colors.mossBright },
  away: { label: 'Séparés', color: colors.steel },
  captured: { label: 'Prisonnier', color: colors.amber },
  dead: { label: 'Mort', color: colors.blood },
};

function relationLabel(v: number): string {
  if (v >= 7) return 'Loyauté totale';
  if (v >= 4) return 'Confiance';
  if (v >= 1) return 'Sympathie';
  if (v === 0) return 'Neutre';
  if (v >= -3) return 'Méfiance';
  return 'Hostilité';
}

export function CharacterView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const p = game.player;
  const profile = content.profiles[p.profile];
  const bg = content.backgrounds[p.background];
  const bonus = equipmentBonuses(content, game);
  const people = Object.entries(game.companions).filter(([, s]) => s !== 'unknown');
  const atMax = p.level >= LEVEL_MAX;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <ProfileArt id={profile.art} width={96} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <EmblemBadge id={p.emblem} size={30} />
            <Text style={type.h1} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
          <Text style={[type.ui, { color: colors.rustBright }]}>{profile.name}</Text>
          <Text style={type.uiSmall}>{bg.name}</Text>
          <Label style={{ marginTop: space.sm }}>Niveau {p.level}</Label>
          <Bar value={atMax ? 1 : p.xp} max={atMax ? 1 : xpToNext(p.level)} color={colors.amber} height={6} />
          <Text style={[type.uiSmall, { fontSize: 12 }]}>{atMax ? 'Niveau maximal' : `${p.xp} / ${xpToNext(p.level)} XP`}</Text>
        </View>
      </View>

      <View style={styles.vitals}>
        {[
          { icon: 'heart' as const, label: 'Santé', value: `${p.hp}/${maxHp(content, game)}`, color: colors.rustBright },
          { icon: 'bolt' as const, label: 'Endurance', value: `${p.stamina}/${maxStamina(content, game)}`, color: colors.amber },
          { icon: 'shield' as const, label: 'Armure', value: `${armorValue(content, game)}`, color: colors.steel },
          { icon: 'weight' as const, label: 'Charge', value: `${currentWeight(content, game)}/${capacity(content, game)} kg`, color: colors.ice },
        ].map((v) => (
          <View key={v.label} style={styles.vital}>
            <Icon name={v.icon} size={16} color={v.color} />
            <Text style={styles.vitalValue}>{v.value}</Text>
            <Text style={styles.vitalLabel}>{v.label}</Text>
          </View>
        ))}
      </View>

      {p.infection > 0 && (
        <Panel tone="danger" style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.md }}>
          <Icon name="biohazard" size={20} color={colors.mossBright} />
          <Text style={[type.bodySmall, { color: colors.text, flex: 1 }]}>
            Infection stade {p.infection}/3 : santé maximale −{p.infection * 3}. Elle s’aggravera au prochain chapitre. Des antibiotiques la soignent.
          </Text>
        </Panel>
      )}

      <SectionTitle right={p.unspentStatPoints > 0 ? <Badge label={`${p.unspentStatPoints} point${p.unspentStatPoints > 1 ? 's' : ''}`} color={colors.amber} filled /> : undefined}>
        Caractéristiques
      </SectionTitle>
      {STAT_IDS.map((s) => {
        const eff = effectiveStat(content, game, s);
        const canSpend = p.unspentStatPoints > 0 && p.stats[s] < STAT_MAX;
        return (
          <View key={s} style={styles.statRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                <Text style={type.ui}>{STAT_LABELS[s]}</Text>
                {bonus[s] !== 0 && (
                  <Text style={[type.uiSmall, { color: bonus[s] > 0 ? colors.mossBright : colors.rustBright }]}>
                    {bonus[s] > 0 ? `+${bonus[s]}` : bonus[s]} équipement
                  </Text>
                )}
              </View>
              <Text style={[type.uiSmall, { fontSize: 13 }]}>{STAT_DESCRIPTIONS[s]}</Text>
            </View>
            <Text style={styles.statValue}>{eff}</Text>
            {canSpend && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Augmenter ${STAT_LABELS[s]}`}
                onPress={() => {
                  feedback('success');
                  update((g) => spendStatPoint(content, g, s));
                }}
                style={styles.plus}
              >
                <Icon name="plus" size={18} color={colors.paper} />
              </Pressable>
            )}
          </View>
        );
      })}

      <SectionTitle>Profil et passé</SectionTitle>
      <Panel>
        <Label color={colors.amber}>Compétence de combat · {profile.skill.name}</Label>
        <Text style={[type.bodySmall, { marginBottom: space.md }]}>{profile.skill.description}</Text>
        <Label color={colors.mossBright}>{bg.name}</Label>
        <Text style={type.bodySmall}>+ {bg.advantage}</Text>
        <Text style={[type.bodySmall, { color: colors.rustBright }]}>− {bg.drawback}</Text>
      </Panel>

      <SectionTitle right={p.unspentPerks > 0 ? <Badge label="Compétence à choisir" color={colors.amber} filled /> : undefined}>Compétences</SectionTitle>
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
              accessibilityLabel={`${perk.name}. ${perk.description}${owned ? '. Acquise.' : ''}`}
              onPress={() => {
                feedback('success');
                update((g) => choosePerk(content, g, id));
              }}
              style={({ pressed }) => [styles.perk, owned && styles.perkOwned, pressed && { backgroundColor: colors.panelPressed }]}
            >
              <Icon name={owned ? 'check' : 'plus'} size={18} color={owned ? colors.mossBright : colors.amber} />
              <View style={{ flex: 1 }}>
                <Text style={type.ui}>{perk.name}</Text>
                <Text style={type.uiSmall}>{perk.description}</Text>
              </View>
            </Pressable>
          );
        })}
        {p.perks.length === 0 && p.unspentPerks === 0 && (
          <Text style={type.bodySmall}>Aucune compétence pour l’instant. Les niveaux 2, 4 et 6 en accordent une.</Text>
        )}
      </View>

      <SectionTitle>Rencontres</SectionTitle>
      {people.length === 0 && <Text style={type.bodySmall}>Vous n’avez encore croisé personne.</Text>}
      <View style={{ gap: space.sm }}>
        {people.map(([id, status]) => {
          const ch = content.characters[id];
          const rel = game.relations[id] ?? 0;
          const st = STATUS_TEXT[status];
          return (
            <Panel key={id} style={{ padding: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={[styles.initials, { backgroundColor: ch.color }]}>
                  <Text style={styles.initialsText}>{ch.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.ui}>{ch.name}</Text>
                  <Text style={type.uiSmall}>{ch.role}</Text>
                </View>
                <Badge label={st.label} color={st.color} />
              </View>
              {status !== 'dead' && (
                <View style={{ marginTop: space.sm }}>
                  <View style={styles.relTrack}>
                    <View style={styles.relCenter} />
                    <View
                      style={[
                        styles.relFill,
                        rel >= 0 ? { left: '50%', width: `${rel * 5}%`, backgroundColor: colors.mossBright } : { right: '50%', width: `${-rel * 5}%`, backgroundColor: colors.rustBright },
                      ]}
                    />
                  </View>
                  <Text style={[type.uiSmall, { fontSize: 12, marginTop: 2 }]}>{relationLabel(rel)}</Text>
                </View>
              )}
              {status === 'companion' && ch.combatAssist && (
                <Text style={[type.uiSmall, { fontSize: 12, color: colors.ice }]}>
                  En combat : {ch.combatAssist.text} (tous les {ch.combatAssist.every} tours).
                </Text>
              )}
            </Panel>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  vitals: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  vital: { flex: 1, alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingVertical: space.sm, gap: 2 },
  vitalValue: { fontFamily: fonts.uiBold, fontSize: 15, color: colors.text },
  vitalLabel: { fontFamily: fonts.ui, fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  statValue: { fontFamily: fonts.title, fontSize: 26, color: colors.paper, minWidth: 28, textAlign: 'center' },
  plus: { width: TOUCH, height: TOUCH, borderRadius: radius.md, backgroundColor: colors.rust, alignItems: 'center', justifyContent: 'center' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.amberDim, backgroundColor: colors.panel },
  perkOwned: { borderColor: colors.line },
  initials: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: fonts.uiBold, color: colors.bgDeep, fontSize: 13 },
  relTrack: { height: 6, backgroundColor: colors.bgDeep, borderRadius: 3, overflow: 'hidden' },
  relCenter: { position: 'absolute', left: '50%', width: 1, top: 0, bottom: 0, backgroundColor: colors.lineStrong },
  relFill: { position: 'absolute', top: 0, bottom: 0 },
});
