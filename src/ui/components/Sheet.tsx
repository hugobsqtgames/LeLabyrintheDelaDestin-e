/**
 * Feuille modale et boîte de confirmation personnalisées.
 */
import React, { createContext, useContext } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/GameStore';
import { useT } from '../../i18n';
import { colors, CONTINUOUS, radius, space, type } from '../theme';
import { Glass } from './Glass';
import { Button, IconButton } from './primitives';

/**
 * « inline » : les modales s'affichent dans leur conteneur au lieu de couvrir
 * l'écran (utilisé par la galerie de maquettes, où chaque écran est encadré).
 */
export const ModalModeContext = createContext<'modal' | 'inline'>('modal');

export function Layer({ visible, children, onRequestClose, animation }: { visible: boolean; children: React.ReactNode; onRequestClose: () => void; animation: 'none' | 'slide' | 'fade' }) {
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
  const t = useT();
  return (
    <Layer visible={visible} animation={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + space.sm }]}>
          <Glass radius={radius.xl} tone="strong" blur={60} style={styles.sheet}>
            <View style={styles.grip} />
            <View style={styles.header}>
              <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="close" label={t('common.close')} onPress={onClose} size={18} />
            </View>
            <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ paddingBottom: space.md }}>
              {children}
            </ScrollView>
            {footer}
          </Glass>
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
  cancelLabel,
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
  const t = useT();
  return (
    <Layer visible={visible} animation="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { justifyContent: 'center', padding: space.xl }]}>
        <Glass radius={radius.xl} tone="strong" blur={60} style={styles.dialog}>
          <View accessibilityViewIsModal>
            <Text style={type.h2} accessibilityRole="header">
              {title}
            </Text>
            <Text style={[type.bodySmall, { marginTop: space.sm, color: colors.text }]}>{message}</Text>
            <View style={{ gap: space.sm, marginTop: space.xl }}>
              <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
              <Button label={cancelLabel ?? t('common.cancel')} variant="secondary" onPress={onCancel} />
            </View>
          </View>
        </Glass>
      </View>
    </Layer>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheetWrap: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space.sm },
  sheet: { paddingHorizontal: space.lg + 2, paddingTop: space.sm, ...CONTINUOUS },
  grip: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,248,240,0.25)', marginBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, gap: space.sm },
  dialog: { padding: space.xl, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
