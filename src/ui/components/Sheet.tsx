/**
 * Feuille modale et boîte de confirmation personnalisées.
 */
import React, { createContext, useContext } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/GameStore';
import { colors, radius, space, type } from '../theme';
import { Button, IconButton } from './primitives';

/**
 * « inline » : les modales s'affichent dans leur conteneur au lieu de couvrir
 * l'écran (utilisé par la galerie de maquettes, où chaque écran est encadré).
 */
export const ModalModeContext = createContext<'modal' | 'inline'>('modal');

function Layer({ visible, children, onRequestClose, animation }: { visible: boolean; children: React.ReactNode; onRequestClose: () => void; animation: 'none' | 'slide' | 'fade' }) {
  const mode = useContext(ModalModeContext);
  if (mode === 'inline') return visible ? <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>{children}</View> : null;
  return (
    <Modal visible={visible} transparent animationType={animation} onRequestClose={onRequestClose} statusBarTranslucent>
      {children}
    </Modal>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useStore();
  return (
    <Layer visible={visible} animation={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grip} />
          <View style={styles.header}>
            <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">
              {title}
            </Text>
            <IconButton icon="close" label="Fermer" onPress={onClose} />
          </View>
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: space.md }}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Layer>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Layer visible={visible} animation="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { justifyContent: 'center', padding: space.xl }]}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={type.h2} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[type.bodySmall, { marginTop: space.sm, color: colors.text }]}>{message}</Text>
          <View style={{ gap: space.sm, marginTop: space.xl }}>
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Layer>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: space.xl,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
});
