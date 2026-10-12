/**
 * Gestion des sauvegardes : charger, choisir l'emplacement d'une nouvelle
 * partie, copier la partie en cours, supprimer. Toute perte de données
 * demande une confirmation explicite.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatPlaytime } from '../engine/summary';
import type { SlotInfo } from '../persistence/saves';
import { useStore } from '../store/GameStore';
import { EmblemBadge } from '../ui/art/Emblems';
import { ConfirmDialog } from '../ui/components/Sheet';
import { Badge, Button, IconButton, Label, Panel, Screen } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, space, type } from '../ui/theme';
import type { EmblemId } from '../engine/types';

type Pending = { kind: 'overwrite-new' | 'overwrite-copy' | 'delete'; slot: number } | null;

const TITLES = { new: 'Choisir un emplacement', load: 'Charger une partie', copy: 'Copier la partie' };
const HINTS = {
  new: 'La nouvelle partie se sauvegardera automatiquement dans l’emplacement choisi.',
  load: 'Chaque partie est sauvegardée automatiquement après chaque décision.',
  copy: 'Créez une copie de la partie en cours, pour revenir plus tard à ce moment précis. Vous continuerez dans votre emplacement actuel.',
};

function formatDate(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SavesScreen({ initialSlots }: { initialSlots?: SlotInfo[] }) {
  const { saves, model, back, go, loadGame, setPendingSlot, feedback } = useStore();
  const mode = model.savesMode;
  const [slots, setSlots] = useState<SlotInfo[] | null>(initialSlots ?? null);
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!saves) return;
    setSlots(await saves.listSlots());
  }, [saves]);

  useEffect(() => {
    if (initialSlots || !saves) return;
    let alive = true;
    saves
      .listSlots()
      .then((s) => alive && setSlots(s))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [saves, initialSlots]);

  const chooseNew = (slot: number) => {
    setPendingSlot(slot);
    go('create');
  };

  const copyTo = async (slot: number) => {
    if (!saves || !model.game) return;
    setBusy(true);
    try {
      await saves.save(slot, model.game);
      await saves.flush();
      feedback('success');
      setMessage(`Copie enregistrée dans l’emplacement ${slot}.`);
      await refresh();
    } catch (e) {
      setMessage(`Échec de la copie : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onSlot = async (s: SlotInfo) => {
    setMessage(null);
    if (mode === 'new') {
      if (s.status === 'empty') chooseNew(s.slot);
      else setPending({ kind: 'overwrite-new', slot: s.slot });
    } else if (mode === 'copy') {
      if (s.slot === model.slot) return;
      if (s.status === 'empty') copyTo(s.slot);
      else setPending({ kind: 'overwrite-copy', slot: s.slot });
    } else if (s.status !== 'empty') {
      setBusy(true);
      const res = await loadGame(s.slot);
      setBusy(false);
      if (!res.ok) setMessage(res.error ?? 'Chargement impossible.');
    }
  };

  const confirm = async () => {
    if (!pending || !saves) return;
    const p = pending;
    setPending(null);
    if (p.kind === 'delete') {
      await saves.remove(p.slot);
      setMessage(`Emplacement ${p.slot} effacé.`);
      await refresh();
    } else if (p.kind === 'overwrite-new') {
      chooseNew(p.slot);
    } else {
      await copyTo(p.slot);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label="Retour" onPress={back} />
        <Text style={[type.h1, { flex: 1 }]} accessibilityRole="header">
          {TITLES[mode]}
        </Text>
      </View>
      <Text style={[type.bodySmall, { marginBottom: space.lg }]}>{HINTS[mode]}</Text>
      <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
        {!slots && <Text style={type.bodySmall}>Lecture des sauvegardes…</Text>}
        {slots?.map((s) => {
          const current = model.game && s.slot === model.slot;
          const sum = s.summary;
          return (
            <Panel key={s.slot} tone={s.status === 'corrupt' ? 'danger' : current ? 'raised' : 'default'} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {sum ? <EmblemBadge id={sum.emblem as EmblemId} size={48} /> : <View style={styles.emptyBadge}><Icon name={s.status === 'corrupt' ? 'warning' : 'plus'} size={20} color={colors.textFaint} /></View>}
                <View style={{ flex: 1 }}>
                  <Label>Emplacement {s.slot}</Label>
                  {s.status === 'empty' && <Text style={[type.ui, { color: colors.textFaint }]}>Vide</Text>}
                  {s.status === 'corrupt' && <Text style={[type.ui, { color: colors.rustBright }]}>Sauvegarde illisible</Text>}
                  {sum && (
                    <>
                      <Text style={type.ui}>
                        {sum.name} · {sum.profile} · niv. {sum.level}
                      </Text>
                      <Text style={type.uiSmall} numberOfLines={1}>
                        {sum.chapterTitle}
                      </Text>
                      <Text style={type.uiSmall} numberOfLines={1}>
                        {sum.sceneTitle} · {formatPlaytime(sum.playtimeMs)} · {formatDate(s.savedAt)}
                      </Text>
                    </>
                  )}
                </View>
                {current && <Badge label="En cours" color={colors.mossBright} />}
                {sum?.ended && <Badge label={sum.ended === 'death' ? 'Mort' : 'Terminée'} color={sum.ended === 'death' ? colors.blood : colors.amber} />}
              </View>
              {s.error && <Text style={[type.uiSmall, { color: colors.amber }]}>{s.error}</Text>}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {mode === 'load' && s.status !== 'empty' && (
                  <Button label={s.status === 'corrupt' ? 'Tenter' : 'Charger'} compact style={{ flex: 1 }} loading={busy} onPress={() => onSlot(s)} />
                )}
                {mode === 'new' && (
                  <Button label={s.status === 'empty' ? 'Commencer ici' : 'Remplacer'} compact variant={s.status === 'empty' ? 'primary' : 'secondary'} style={{ flex: 1 }} onPress={() => onSlot(s)} />
                )}
                {mode === 'copy' && !current && (
                  <Button label={s.status === 'empty' ? 'Copier ici' : 'Écraser'} compact variant="secondary" style={{ flex: 1 }} loading={busy} onPress={() => onSlot(s)} />
                )}
                {s.status !== 'empty' && !current && (
                  <Button label="Supprimer" compact variant="ghost" icon="trash" onPress={() => setPending({ kind: 'delete', slot: s.slot })} />
                )}
              </View>
            </Panel>
          );
        })}
        {message && <Text style={[type.ui, { color: colors.ice, textAlign: 'center' }]}>{message}</Text>}
        {!saves && <Text style={type.bodySmall}>Mode maquette : la persistance est désactivée.</Text>}
      </ScrollView>

      <ConfirmDialog
        visible={!!pending}
        danger
        title={pending?.kind === 'delete' ? 'Supprimer cette partie ?' : 'Écraser cette sauvegarde ?'}
        message={
          pending?.kind === 'delete'
            ? `La partie de l’emplacement ${pending.slot} et sa copie de secours seront définitivement effacées.`
            : pending?.kind === 'overwrite-new'
              ? `La partie de l’emplacement ${pending?.slot} sera remplacée dès que la nouvelle partie commencera. Cette action est irréversible.`
              : `La partie de l’emplacement ${pending?.slot} sera remplacée par une copie de la partie en cours.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Supprimer définitivement' : 'Écraser'}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  emptyBadge: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
});
