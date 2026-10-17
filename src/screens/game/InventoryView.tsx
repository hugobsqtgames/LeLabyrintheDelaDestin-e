/**
 * Sac et atelier.
 * - Sac : charge, équipement (avec usure), objets, objets au sol, et
 *   comparaison avec l'objet porté avant d'équiper.
 * - Atelier : recettes de fabrication et de réparation, chacune coûte du temps.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { weaponDurability } from '../../engine/combat';
import {
  abandonGround,
  canCraft,
  canDrop,
  canEquip,
  canUseOutOfCombat,
  capacity,
  compareWithEquipped,
  consumeItemOutOfCombat,
  craft,
  currentWeight,
  dropItem,
  EQUIP_SLOTS,
  equip,
  itemCount,
  pickUp,
  unequip,
} from '../../engine/inventory';
import type { GameContent, GameState, ItemCategory, ItemDef, StatId } from '../../engine/types';
import { type T, useT } from '../../i18n';
import { useStore } from '../../store/GameStore';
import { ItemIcon } from '../../ui/art/ItemIcon';
import { Glass } from '../../ui/components/Glass';
import { ClockChip, useChrome } from '../../ui/components/Hud';
import { Sheet } from '../../ui/components/Sheet';
import { Badge, Bar, Button, Label, Panel, PressableCard, SectionTitle, Segmented } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, MAX_SCALE_UI, radius, space, type } from '../../ui/theme';
import { ContextHint } from '../../ui/components/ContextHint';

const FILTERS: { id: string; cats: ItemCategory[] }[] = [
  { id: 'all', cats: [] },
  { id: 'weapons', cats: ['melee', 'ranged', 'ammo'] },
  { id: 'care', cats: ['consumable'] },
  { id: 'gear', cats: ['armor', 'accessory'] },
  { id: 'tools', cats: ['tool', 'material'] },
  { id: 'quest', cats: ['quest'] },
];

function itemStats(def: ItemDef, content: GameContent, t: T): string[] {
  const out: string[] = [];
  if (def.damage) out.push(t('item.damage', { a: def.damage[0], b: def.damage[1] }));
  if (def.staminaCost) out.push(t('item.stamina', { n: def.staminaCost }));
  if (def.ammo) out.push(t('item.ammo', { name: content.items[def.ammo]?.name ?? def.ammo }));
  if (def.accuracy) out.push(t('item.accuracy', { n: `${def.accuracy > 0 ? '+' : ''}${Math.round(def.accuracy * 100)}` }));
  if (def.finesse) out.push(t('item.finesse'));
  if (def.loud) out.push(t('item.loud'));
  if (def.armor) out.push(t('item.armor', { n: def.armor }));
  if (def.capacityBonus) out.push(t('item.capacity', { n: def.capacityBonus }));
  for (const [s, v] of Object.entries(def.statBonus ?? {})) out.push(`${content.statLabels[s as StatId]} ${v! > 0 ? '+' : ''}${v}`);
  if (def.use?.heal) out.push(t('item.heal', { n: def.use.heal }));
  if (def.use?.stamina) out.push(t('item.restore', { n: def.use.stamina }));
  if (def.use?.cureInfection) out.push(t('item.cure'));
  if (def.use?.combatDamage) out.push(t('item.damage', { a: def.use.combatDamage[0], b: def.use.combatDamage[1] }));
  out.push(`${def.weight} kg`);
  return out;
}

function DurabilityBar({ content, game, id }: { content: GameContent; game: GameState; id: string }) {
  const d = weaponDurability(content, game, id);
  if (!d) return null;
  const r = d.current / d.max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={styles.duraTrack}>
        <View style={[styles.duraFill, { width: `${r * 100}%`, backgroundColor: r <= 0 ? colors.blood : r < 0.3 ? colors.amber : colors.mossBright }]} />
      </View>
      <Text style={styles.duraText}>
        {d.current}/{d.max}
      </Text>
    </View>
  );
}

function Compare({ content, game, id, t }: { content: GameContent; game: GameState; id: string; t: T }) {
  const cmp = compareWithEquipped(content, game, id);
  if (!cmp || cmp.rows.length === 0) return null;
  const label = (k: string) => (k in content.statLabels ? content.statLabels[k as StatId] : t(`compare.${k}`));
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <Glass radius={radius.md} style={{ padding: space.md, gap: 8 }}>
      <Label>{cmp.equipped ? t('compare.vs', { name: content.items[cmp.equipped]?.name ?? '' }) : t('compare.empty')}</Label>
      {cmp.rows.map((r) => (
        <View key={r.key} style={styles.cmpRow}>
          <Text style={[type.uiSmall, { flex: 1, color: colors.text }]}>{label(r.key)}</Text>
          <Text style={[styles.cmpNum, { color: colors.textFaint }]}>{fmt(r.current)}</Text>
          <Icon name="chevron" size={12} color={colors.textFaint} />
          <Text style={[styles.cmpNum, { color: r.delta > 0 ? colors.mossBright : r.delta < 0 ? colors.blood : colors.text }]}>{fmt(r.candidate)}</Text>
          <Icon name={r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : 'check'} size={12} color={r.delta > 0 ? colors.mossBright : r.delta < 0 ? colors.blood : colors.textFaint} strokeWidth={2.4} />
        </View>
      ))}
    </Glass>
  );
}

function Workshop({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const t = useT();
  const recipes = Object.values(content.recipes);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
        <Text style={[type.bodySmall, { flex: 1 }]}>{t('craft.intro')}</Text>
        <ClockChip clock={game.clock} compact />
      </View>
      {recipes.map((r) => {
        const can = canCraft(content, game, r.id);
        const out = r.output ? content.items[r.output.item] : null;
        return (
          <Panel key={r.id} style={{ gap: space.sm, padding: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              {out ? <ItemIcon icon={out.icon} category={out.category} size={44} /> : <View style={styles.repairIcon}><Icon name="wrench" size={20} color={colors.amber} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={[type.h3]}>
                  {r.name}
                  {r.output && r.output.qty > 1 ? <Text style={{ color: colors.textDim }}> ×{r.output.qty}</Text> : null}
                </Text>
                <Text style={type.uiSmall}>{r.description}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(r.inputs).map(([id, qty]) => {
                const have = itemCount(game, id);
                return <Badge key={id} label={`${content.items[id]?.name ?? id} ${have}/${qty}`} color={have >= qty ? colors.mossBright : colors.textFaint} />;
              })}
              <Badge icon="clock" label={t('choice.hours', { h: r.time })} color={colors.textDim} />
            </View>
            {!can.ok && <Text style={[type.uiSmall, { color: colors.textFaint }]}>{can.reason}</Text>}
            <Button
              label={r.repair ? t('craft.repair') : t('craft.make')}
              compact
              variant={can.ok ? 'primary' : 'secondary'}
              disabled={!can.ok}
              onPress={() => {
                feedback('success');
                update((g) => craft(content, g, r.id));
              }}
            />
          </Panel>
        );
      })}
    </View>
  );
}

export function InventoryView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
  const t = useT();
  const chrome = useChrome();
  const [mode, setMode] = useState<'bag' | 'craft'>('bag');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const weight = currentWeight(content, game);
  const cap = capacity(content, game);
  const cats = FILTERS.find((f) => f.id === filter)!.cats;
  const items = Object.entries(game.inventory)
    .filter(([id]) => content.items[id] && (cats.length === 0 || cats.includes(content.items[id].category)))
    .sort(([a], [b]) => content.items[a].category.localeCompare(content.items[b].category) || content.items[a].name.localeCompare(content.items[b].name));
  const equipped = new Set(Object.values(game.equipment).filter(Boolean));
  const ground = Object.entries(game.ground);
  const open = openId ? content.items[openId] : null;
  const owned = openId ? game.inventory[openId] ?? 0 : 0;
  const craftable = Object.values(content.recipes).filter((r) => canCraft(content, game, r.id).ok).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: chrome.top + space.xs, paddingBottom: chrome.bottom }}>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { id: 'bag', label: t('bag.title') },
            { id: 'craft', label: t('craft.title'), badge: craftable || undefined },
          ]}
        />
        <ContextHint id={mode === 'craft' ? 'workshop' : 'bag'} style={{ marginTop: space.md }} />
        {mode === 'craft' ? (
          <Workshop game={game} />
        ) : (
          <>
            <Glass radius={radius.lg} style={{ padding: space.md, marginTop: space.md, gap: 6 }}>
              <Bar label={t('bag.load')} value={weight} max={cap} color={weight > cap * 0.85 ? colors.amber : colors.ice} showValue />
              <Text style={[type.uiSmall, { fontSize: 12.5 }]}>{t('bag.free', { kg: Math.max(0, Math.round((cap - weight) * 10) / 10) })}</Text>
            </Glass>

            {ground.length > 0 && (
              <>
                <SectionTitle>{t('bag.ground')}</SectionTitle>
                <Panel tone="danger" style={{ gap: space.sm }}>
                  <Text style={[type.bodySmall, { color: colors.text }]}>{t('bag.groundHelp')}</Text>
                  {ground.map(([id, qty]) => {
                    const def = content.items[id];
                    return (
                      <View key={id} style={styles.row}>
                        <ItemIcon icon={def.icon} category={def.category} size={40} />
                        <View style={{ flex: 1 }}>
                          <Text style={type.ui}>
                            {def.name} {qty > 1 ? `×${qty}` : ''}
                          </Text>
                          <Text style={type.uiSmall}>{def.weight * qty} kg</Text>
                        </View>
                        <Button label={t('bag.take')} compact onPress={() => update((g) => pickUp(content, g, id))} />
                        <Button label={t('bag.leave')} compact variant="ghost" onPress={() => update((g) => abandonGround(g, id))} />
                      </View>
                    );
                  })}
                </Panel>
              </>
            )}

            <SectionTitle>{t('bag.equipment')}</SectionTitle>
            <View style={styles.slots}>
              {EQUIP_SLOTS.map((slot) => {
                const id = game.equipment[slot];
                const def = id ? content.items[id] : null;
                return (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`slot.${slot}`)} : ${def?.name ?? t('bag.emptySlot')}`}
                    onPress={() => id && setOpenId(id)}
                    style={({ pressed }) => [styles.slotCell, pressed && { transform: [{ scale: 0.97 }] }]}
                  >
                    <Glass radius={radius.lg} style={styles.slot}>
                      {def ? <ItemIcon icon={def.icon} category={def.category} size={40} /> : <View style={styles.emptySlot} />}
                      <Text style={[type.label, { fontSize: 10, marginTop: space.sm }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
                        {t(`slot.${slot}`)}
                      </Text>
                      <Text style={[styles.slotName, !def && { color: colors.textFaint }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE_UI}>
                        {def?.name ?? t('bag.emptySlot')}
                      </Text>
                      {id && <DurabilityBar content={content} game={game} id={id} />}
                    </Glass>
                  </Pressable>
                );
              })}
            </View>

            <SectionTitle>{t('bag.items')}</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: space.md }}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.id }}
                  onPress={() => setFilter(f.id)}
                  style={[styles.chip, filter === f.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filter === f.id && { color: colors.bg }]} maxFontSizeMultiplier={MAX_SCALE_UI}>
                    {t(`filter.${f.id}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {items.length === 0 && (
              <Panel style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
                <Icon name="bag" size={32} color={colors.textFaint} />
                <Text style={[type.bodySmall, { textAlign: 'center' }]}>{filter === 'all' ? t('bag.empty') : t('bag.emptyFilter')}</Text>
              </Panel>
            )}
            <View style={{ gap: 6 }}>
              {items.map(([id, qty]) => {
                const def = content.items[id];
                return (
                  <PressableCard
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`${def.name}, ×${qty}${equipped.has(id) ? `, ${t('bag.equipped')}` : ''}`}
                    onPress={() => setOpenId(id)}
                    style={styles.itemRow}
                  >
                    <ItemIcon icon={def.icon} category={def.category} size={44} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[type.ui, { fontFamily: fonts.uiBold }]} numberOfLines={1}>
                        {def.name}
                      </Text>
                      <Text style={[type.uiSmall, { fontSize: 12.5 }]}>{t(`cat.${def.category}`)}</Text>
                      {def.durability && <DurabilityBar content={content} game={game} id={id} />}
                    </View>
                    {equipped.has(id) && <Badge label={t('bag.equipped')} color={colors.mossBright} />}
                    {def.rarity !== 'commun' && <Badge label={t(`rarity.${def.rarity}`)} color={colors.violet} />}
                    <Text style={styles.qty}>×{qty}</Text>
                  </PressableCard>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''}>
        {open && openId && (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <ItemIcon icon={open.icon} category={open.category} size={72} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label>{t(`cat.${open.category}`)}</Label>
                <Text style={type.uiSmall}>{t('bag.quantity', { n: owned })}</Text>
                {open.durability && <DurabilityBar content={content} game={game} id={openId} />}
              </View>
            </View>
            <Text style={type.body}>{open.description}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {itemStats(open, content, t).map((s) => (
                <Badge key={s} label={s} color={colors.textDim} />
              ))}
            </View>
            {owned > 0 && <Compare content={content} game={game} id={openId} t={t} />}
            {owned > 0 && (
              <View style={{ gap: space.sm, marginTop: space.xs }}>
                {open.slot &&
                  (game.equipment[open.slot] === openId ? (
                    <Button label={t('bag.unequip')} variant="secondary" icon="close" onPress={() => update((g) => unequip(content, g, open.slot!))} />
                  ) : (
                    <>
                      <Button label={t('bag.equip')} icon="check" onPress={() => update((g) => equip(content, g, openId))} />
                      {canEquip(content, game, openId).reason && <Text style={[type.uiSmall, { color: colors.amber }]}>{canEquip(content, game, openId).reason}</Text>}
                    </>
                  ))}
                {open.use?.outOfCombat && (
                  <>
                    <Button
                      label={t('bag.use')}
                      icon="plus"
                      variant="secondary"
                      disabled={!canUseOutOfCombat(content, game, openId).ok}
                      onPress={() => {
                        feedback('success');
                        update((g) => consumeItemOutOfCombat(content, g, openId));
                      }}
                    />
                    {!canUseOutOfCombat(content, game, openId).ok && <Text style={type.uiSmall}>{canUseOutOfCombat(content, game, openId).reason}</Text>}
                  </>
                )}
                {canDrop(content, game, openId).ok ? (
                  <Button label={t('bag.drop')} icon="trash" variant="ghost" onPress={() => update((g) => dropItem(content, g, openId, 1))} />
                ) : (
                  <Text style={[type.uiSmall, { color: colors.textFaint }]}>{canDrop(content, game, openId).reason}</Text>
                )}
              </View>
            )}
            {game.notices.length > 0 && <Text style={[type.uiSmall, { color: colors.ice }]}>{game.notices[game.notices.length - 1].text}</Text>}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  slots: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  slotCell: { width: '50%', padding: 4 },
  slot: { padding: space.md, minHeight: 128, gap: 3 },
  slotName: { fontFamily: fonts.uiBold, fontSize: 15, color: colors.text, letterSpacing: -0.2 },
  emptySlot: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.md + 2, paddingVertical: 8, minHeight: 36, backgroundColor: 'rgba(255,248,240,0.06)', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13.5, color: colors.textDim },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm + 2 },
  qty: { fontFamily: fonts.mono, fontSize: 14, color: colors.textDim, minWidth: 30, textAlign: 'right' },
  duraTrack: { flex: 1, maxWidth: 90, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.1)', overflow: 'hidden' },
  duraFill: { height: '100%', borderRadius: 2 },
  duraText: { fontFamily: fonts.mono, fontSize: 10, color: colors.textDim },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cmpNum: { fontFamily: fonts.mono, fontSize: 13, minWidth: 30, textAlign: 'right' },
  repairIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,196,107,0.12)', alignItems: 'center', justifyContent: 'center' },
});
