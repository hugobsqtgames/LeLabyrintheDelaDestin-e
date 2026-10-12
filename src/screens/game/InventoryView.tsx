/**
 * Sac : charge, emplacements d'équipement, objets, objets au sol.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  abandonGround,
  canDrop,
  canEquip,
  canUseOutOfCombat,
  capacity,
  currentWeight,
  dropItem,
  EQUIP_SLOTS,
  equip,
  pickUp,
  SLOT_LABELS,
  unequip,
  consumeItemOutOfCombat,
} from '../../engine/inventory';
import { STAT_LABELS } from '../../engine/rules';
import type { GameState, ItemCategory, ItemDef, StatId } from '../../engine/types';
import { useStore } from '../../store/GameStore';
import { ItemIcon } from '../../ui/art/ItemIcon';
import { Sheet } from '../../ui/components/Sheet';
import { Badge, Bar, Button, Label, Panel, SectionTitle } from '../../ui/components/primitives';
import { Icon } from '../../ui/icons';
import { colors, fonts, radius, space, type } from '../../ui/theme';

const FILTERS: { id: string; label: string; cats: ItemCategory[] }[] = [
  { id: 'all', label: 'Tout', cats: [] },
  { id: 'weapons', label: 'Armes', cats: ['melee', 'ranged', 'ammo'] },
  { id: 'care', label: 'Soins & vivres', cats: ['consumable'] },
  { id: 'gear', label: 'Protections', cats: ['armor', 'accessory'] },
  { id: 'tools', label: 'Outils', cats: ['tool', 'material'] },
  { id: 'quest', label: 'Quête', cats: ['quest'] },
];

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  melee: 'Arme de mêlée',
  ranged: 'Arme à distance',
  ammo: 'Munitions',
  consumable: 'Consommable',
  armor: 'Protection',
  accessory: 'Accessoire',
  tool: 'Outil',
  material: 'Matériau',
  quest: 'Objet de quête',
};

function itemStats(def: ItemDef, content: ReturnType<typeof useStore>['content']): string[] {
  const out: string[] = [];
  if (def.damage) out.push(`Dégâts ${def.damage[0]}–${def.damage[1]}`);
  if (def.staminaCost) out.push(`Endurance −${def.staminaCost}`);
  if (def.ammo) out.push(`Munition : ${content.items[def.ammo]?.name}`);
  if (def.accuracy) out.push(`Précision ${def.accuracy > 0 ? '+' : ''}${Math.round(def.accuracy * 100)} %`);
  if (def.finesse) out.push('Finesse');
  if (def.loud) out.push('Bruyant');
  if (def.armor) out.push(`Armure +${def.armor}`);
  if (def.capacityBonus) out.push(`Capacité +${def.capacityBonus} kg`);
  for (const [s, v] of Object.entries(def.statBonus ?? {})) out.push(`${STAT_LABELS[s as StatId]} ${v! > 0 ? '+' : ''}${v}`);
  if (def.use?.heal) out.push(`Soin +${def.use.heal}`);
  if (def.use?.stamina) out.push(`Endurance +${def.use.stamina}`);
  if (def.use?.cureInfection) out.push('Soigne l’infection');
  if (def.use?.combatDamage) out.push(`Dégâts ${def.use.combatDamage[0]}–${def.use.combatDamage[1]}`);
  out.push(`${def.weight} kg`);
  return out;
}

export function InventoryView({ game }: { game: GameState }) {
  const { content, update, feedback } = useStore();
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <Bar label="Charge" value={weight} max={cap} color={weight > cap * 0.85 ? colors.amber : colors.ice} showValue />
        <Text style={[type.uiSmall, { marginTop: 4 }]}>
          {Math.max(0, Math.round((cap - weight) * 10) / 10)} kg libres. Les objets de quête ne pèsent rien et ne peuvent pas être perdus.
        </Text>

        {ground.length > 0 && (
          <>
            <SectionTitle>Au sol</SectionTitle>
            <Panel tone="danger" style={{ gap: space.sm }}>
              <Text style={[type.bodySmall, { color: colors.text }]}>
                Trop lourd pour votre sac. Posez quelque chose pour faire de la place, ou abandonnez l’objet. Ils seront perdus en quittant la scène.
              </Text>
              {ground.map(([id, qty]) => {
                const def = content.items[id];
                return (
                  <View key={id} style={styles.row}>
                    <ItemIcon icon={def.icon} category={def.category} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.ui}>
                        {def.name} {qty > 1 ? `×${qty}` : ''}
                      </Text>
                      <Text style={type.uiSmall}>{def.weight * qty} kg</Text>
                    </View>
                    <Button label="Prendre" compact onPress={() => update((g) => pickUp(content, g, id))} />
                    <Button label="Laisser" compact variant="ghost" onPress={() => update((g) => abandonGround(g, id))} />
                  </View>
                );
              })}
            </Panel>
          </>
        )}

        <SectionTitle>Équipement</SectionTitle>
        <View style={styles.slots}>
          {EQUIP_SLOTS.map((slot) => {
            const id = game.equipment[slot];
            const def = id ? content.items[id] : null;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={`${SLOT_LABELS[slot]} : ${def?.name ?? 'vide'}`}
                onPress={() => id && setOpenId(id)}
                style={({ pressed }) => [styles.slot, pressed && { backgroundColor: colors.panelPressed }]}
              >
                {def ? <ItemIcon icon={def.icon} category={def.category} size={36} /> : <View style={styles.emptySlot} />}
                <View style={{ flex: 1 }}>
                  <Text style={[type.label, { fontSize: 11 }]}>{SLOT_LABELS[slot]}</Text>
                  <Text style={[type.ui, !def && { color: colors.textFaint }]} numberOfLines={1}>
                    {def?.name ?? 'Vide'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Objets</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingBottom: space.md }}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.id }}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, filter === f.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.id && { color: colors.paper }]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {items.length === 0 && (
          <Panel style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
            <Icon name="bag" size={32} color={colors.textFaint} />
            <Text style={[type.bodySmall, { textAlign: 'center' }]}>
              {filter === 'all' ? 'Votre sac est vide. Fouillez, troquez, survivez.' : 'Rien dans cette catégorie.'}
            </Text>
          </Panel>
        )}
        <View style={{ gap: space.xs }}>
          {items.map(([id, qty]) => {
            const def = content.items[id];
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${def.name}, quantité ${qty}${equipped.has(id) ? ', équipé' : ''}`}
                onPress={() => setOpenId(id)}
                style={({ pressed }) => [styles.itemRow, pressed && { backgroundColor: colors.panelPressed }]}
              >
                <ItemIcon icon={def.icon} category={def.category} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={type.ui} numberOfLines={1}>
                    {def.name}
                  </Text>
                  <Text style={type.uiSmall}>{CATEGORY_LABEL[def.category]}</Text>
                </View>
                {equipped.has(id) && <Badge label="Équipé" color={colors.mossBright} />}
                {def.rarity !== 'commun' && <Badge label={def.rarity} color={colors.amber} />}
                <Text style={styles.qty}>×{qty}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''}>
        {open && openId && (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <ItemIcon icon={open.icon} category={open.category} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label>{CATEGORY_LABEL[open.category]}</Label>
                <Text style={type.uiSmall}>Quantité : {owned}</Text>
              </View>
            </View>
            <Text style={type.body}>{open.description}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {itemStats(open, content).map((s) => (
                <Badge key={s} label={s} color={colors.textDim} />
              ))}
            </View>
            {owned > 0 && (
              <View style={{ gap: space.sm, marginTop: space.sm }}>
                {open.slot &&
                  (game.equipment[open.slot] === openId ? (
                    <Button label="Ranger" variant="secondary" icon="close" onPress={() => update((g) => unequip(content, g, open.slot!))} />
                  ) : (
                    <>
                      <Button label="Équiper" icon="check" onPress={() => update((g) => equip(content, g, openId))} />
                      {canEquip(content, game, openId).reason && <Text style={[type.uiSmall, { color: colors.amber }]}>{canEquip(content, game, openId).reason}</Text>}
                    </>
                  ))}
                {open.use?.outOfCombat && (
                  <>
                    <Button
                      label="Utiliser"
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
                  <Button label="Poser au sol" icon="trash" variant="ghost" onPress={() => update((g) => dropItem(content, g, openId, 1))} />
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
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  slot: { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, minHeight: 56 },
  emptySlot: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8, minHeight: 36 },
  chipActive: { backgroundColor: colors.rustDeep, borderColor: colors.rust },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  qty: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.textDim, minWidth: 30, textAlign: 'right' },
});
