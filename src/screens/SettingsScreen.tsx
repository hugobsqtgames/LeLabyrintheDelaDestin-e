/**
 * Paramètres : animations, vibrations, taille du texte. Le jeu n'intègre
 * aucune ressource audio : il n'y a donc pas de réglage sonore factice.
 */
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useStore } from '../store/GameStore';
import { Body, IconButton, Label, Panel, Screen, SectionTitle } from '../ui/components/primitives';
import { colors, fonts, radius, space, TOUCH, type } from '../ui/theme';

const SCALES = [
  { v: 0.9, label: 'Petit' },
  { v: 1, label: 'Normal' },
  { v: 1.15, label: 'Grand' },
  { v: 1.3, label: 'Très grand' },
];

function Toggle({ label, detail, value, onChange, disabled }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={type.ui}>{label}</Text>
        <Text style={type.uiSmall}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.rust }}
        thumbColor={value ? colors.paper : colors.textDim}
      />
    </View>
  );
}

export function SettingsScreen() {
  const { model, setSettings, back } = useStore();
  const s = model.settings;
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label="Retour" onPress={back} />
        <Text style={[type.h1, { flex: 1 }]} accessibilityRole="header">
          Paramètres
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <SectionTitle>Confort</SectionTitle>
        <Panel style={{ paddingVertical: space.xs }}>
          <Toggle
            label="Réduire les animations"
            detail={model.systemReduceMotion ? 'Activé par les réglages d’accessibilité du système.' : 'Supprime les fondus et transitions.'}
            value={s.reduceMotion || model.systemReduceMotion}
            disabled={model.systemReduceMotion}
            onChange={(v) => setSettings({ reduceMotion: v })}
          />
          <View style={styles.sep} />
          <Toggle
            label="Vibrations"
            detail={Platform.OS === 'web' ? 'Indisponibles sur ce support.' : 'Retour haptique lors des choix et des coups reçus.'}
            value={s.haptics}
            disabled={Platform.OS === 'web'}
            onChange={(v) => setSettings({ haptics: v })}
          />
        </Panel>

        <SectionTitle>Taille du texte du récit</SectionTitle>
        <View style={styles.scales}>
          {SCALES.map((x) => (
            <Pressable
              key={x.v}
              accessibilityRole="radio"
              accessibilityState={{ selected: s.textScale === x.v }}
              onPress={() => setSettings({ textScale: x.v })}
              style={[styles.scale, s.textScale === x.v && styles.scaleActive]}
            >
              <Text style={[styles.scaleText, { fontSize: 15 * x.v }, s.textScale === x.v && { color: colors.paper }]}>{x.label}</Text>
            </Pressable>
          ))}
        </View>
        <Panel style={{ marginTop: space.md }}>
          <Body style={{ fontSize: 17 * s.textScale, lineHeight: 27 * s.textScale }}>
            Du toit de la pharmacie Saint-Clair, vous voyez le quartier des Tanneurs comme une carte trempée.
          </Body>
        </Panel>

        <SectionTitle>À propos</SectionTitle>
        <Panel style={{ gap: space.sm }}>
          <Label>Le Labyrinthe de la Destinée</Label>
          <Text style={type.bodySmall}>
            Jeu solo entièrement hors ligne. Aucun compte, aucune publicité, aucun achat, aucune donnée envoyée. Les parties sont stockées uniquement sur cet appareil.
          </Text>
          <Text style={type.bodySmall}>Polices : Special Elite, Spectral, Barlow Condensed (licences libres, incluses dans l’application).</Text>
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH + 16, paddingVertical: space.sm },
  sep: { height: 1, backgroundColor: colors.line },
  scales: { flexDirection: 'row', gap: space.xs },
  scale: { flex: 1, minHeight: TOUCH, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  scaleActive: { backgroundColor: colors.rustDeep, borderColor: colors.rust },
  scaleText: { fontFamily: fonts.uiBold, color: colors.textDim },
});
