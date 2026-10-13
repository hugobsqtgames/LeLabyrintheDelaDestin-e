/**
 * Gestion des sauvegardes : charger, choisir l'emplacement d'une nouvelle
 * partie, copier la partie en cours, supprimer. Toute perte de données
 * demande une confirmation explicite.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatPlaytime } from '../engine/summary';
import type { SlotInfo } from '../persistence/saves';
import { translateSaveMessage, useT } from '../i18n';
import { useStore } from '../store/GameStore';
import { PlayerPortrait } from '../ui/art/Portraits';
import { EmblemBadge } from '../ui/art/Emblems';
import { ConfirmDialog } from '../ui/components/Sheet';
import { Badge, Button, IconButton, Label, Panel, Screen } from '../ui/components/primitives';
import { Icon } from '../ui/icons';
import { colors, fonts, radius, space, type } from '../ui/theme';
import type { EmblemId } from '../engine/types';

type Pending = { kind: 'overwrite-new' | 'overwrite-copy' | 'delete'; slot: number } | null;


function formatDate(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SavesScreen({ initialSlots }: { initialSlots?: SlotInfo[] }) {
  const { saves, model, back, go, loadGame, setPendingSlot, feedback, content, lang } = useStore();
  const t = useT();
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
      setMessage(t('saves.copied', { slot }));
      await refresh();
    } catch (e) {
      setMessage(t('saves.copyFailed', { error: (e as Error).message }));
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
      if (!res.ok) setMessage(res.error ? translateSaveMessage(lang, res.error) : t('saves.loadFailed'));
    }
  };

  const confirm = async () => {
    if (!pending || !saves) return;
    const p = pending;
    setPending(null);
    if (p.kind === 'delete') {
      await saves.remove(p.slot);
      setMessage(t('saves.deleted', { slot: p.slot }));
      await refresh();
    } else if (p.kind === 'overwrite-new') {
      chooseNew(p.slot);
    } else {
      await copyTo(p.slot);
    }
  };

  return (
    <Screen aura="neutral">
      <View style={styles.header}>
        <IconButton icon="back" label={t('common.back')} onPress={back} />
        <Text style={[type.h1, { flex: 1 }]} accessibilityRole="header">
          {t(`saves.title.${mode}`)}
        </Text>
      </View>
      <Text style={[type.bodySmall, { marginBottom: space.lg }]}>{t(`saves.hint.${mode}`)}</Text>
      <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.xl }}>
        {!slots && <Text style={type.bodySmall}>{t('saves.reading')}</Text>}
        {slots?.map((s) => {
          const current = model.game && s.slot === model.slot;
          const sum = s.summary;
          return (
            <Panel key={s.slot} tone={s.status === 'corrupt' ? 'danger' : current ? 'raised' : 'default'} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                {sum ? (
                  <View>
                    <PlayerPortrait profile={sum.profileId ?? 'guerrier'} size={56} shape="squircle" />
                    <View style={styles.emblem}>
                      <EmblemBadge id={sum.emblem as EmblemId} size={22} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyBadge}>
                    <Icon name={s.status === 'corrupt' ? 'warning' : 'plus'} size={20} color={colors.textFaint} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Label>{t('saves.slot', { slot: s.slot })}</Label>
                  {s.status === 'empty' && <Text style={[type.ui, { color: colors.textFaint }]}>{t('saves.empty')}</Text>}
                  {s.status === 'corrupt' && <Text style={[type.ui, { color: colors.rustBright }]}>{t('saves.corrupt')}</Text>}
                  {sum && (
                    <>
                      <Text style={[type.ui, { fontFamily: fonts.uiBold }]}>
                        {sum.name} · {sum.profile} · {t('hud.level', { n: sum.level })}
                      </Text>
                      <Text style={type.uiSmall} numberOfLines={1}>
                        {sum.chapterTitle}
                      </Text>
                      <Text style={type.uiSmall} numberOfLines={1}>
                        {sum.sceneTitle} · {formatPlaytime(content, sum.playtimeMs)} · {formatDate(s.savedAt)}
                      </Text>
                    </>
                  )}
                </View>
                {current && <Badge label={t('saves.current')} color={colors.mossBright} />}
                {sum?.ended && <Badge label={sum.ended === 'death' ? t('saves.dead') : t('saves.ended')} color={sum.ended === 'death' ? colors.blood : colors.amber} />}
              </View>
              {s.error && <Text style={[type.uiSmall, { color: colors.amber }]}>{translateSaveMessage(lang, s.error)}</Text>}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {mode === 'load' && s.status !== 'empty' && (
                  <Button label={s.status === 'corrupt' ? t('saves.try') : t('saves.load')} compact style={{ flex: 1 }} loading={busy} onPress={() => onSlot(s)} />
                )}
                {mode === 'new' && (
                  <Button label={s.status === 'empty' ? t('saves.startHere') : t('saves.replace')} compact variant={s.status === 'empty' ? 'primary' : 'secondary'} style={{ flex: 1 }} onPress={() => onSlot(s)} />
                )}
                {mode === 'copy' && !current && (
                  <Button label={s.status === 'empty' ? t('saves.copyHere') : t('saves.overwrite')} compact variant="secondary" style={{ flex: 1 }} loading={busy} onPress={() => onSlot(s)} />
                )}
                {s.status !== 'empty' && !current && (
                  <Button label={t('saves.delete')} compact variant="ghost" icon="trash" onPress={() => setPending({ kind: 'delete', slot: s.slot })} />
                )}
              </View>
            </Panel>
          );
        })}
        {message && <Text style={[type.ui, { color: colors.ice, textAlign: 'center' }]}>{message}</Text>}
        {!saves && <Text style={type.bodySmall}>{t('saves.mock')}</Text>}
      </ScrollView>

      <ConfirmDialog
        visible={!!pending}
        danger
        title={pending?.kind === 'delete' ? t('saves.confirmDelete') : t('saves.confirmOverwrite')}
        message={t(`saves.confirm.${pending?.kind ?? 'delete'}`, { slot: pending?.slot ?? '' })}
        confirmLabel={pending?.kind === 'delete' ? t('saves.deleteForever') : t('saves.overwrite')}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  emptyBadge: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emblem: { position: 'absolute', right: -6, bottom: -6 },
});
