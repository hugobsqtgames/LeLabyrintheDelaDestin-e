/**
 * Feuille modale et boîte de confirmation personnalisées.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/GameStore';
import { useT } from '../../i18n';
import { colors, CONTINUOUS, NATIVE_DRIVER, radius, space, type } from '../theme';
import { Glass } from './Glass';
import { Button, IconButton } from './primitives';
import { type LayerAnimation, modalGate } from '../modalGate';

/**
 * « inline » : les modales s'affichent dans leur conteneur au lieu de couvrir
 * l'écran (utilisé par la galerie de maquettes, où chaque écran est encadré).
 */
export const ModalModeContext = createContext<'modal' | 'inline'>('modal');

/** Apparition d'une couche en mode « inline » (animation pilotée en JavaScript). */
function InlineLayer({ children, animation }: { children: React.ReactNode; animation: 'none' | 'slide' | 'fade' }) {
  const { reduceMotion } = useStore();
  const [v] = useState(() => new Animated.Value(animation === 'none' || reduceMotion ? 1 : 0));
  useEffect(() => {
    if (animation === 'none' || reduceMotion) return;
    const a = Animated.timing(v, { toValue: 1, duration: animation === 'slide' ? 380 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [v, animation, reduceMotion]);
  const translateY = animation === 'slide' ? v.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) : 0;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: animation === 'slide' ? v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }) : v }]}>
        <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

type LayerProps = { visible: boolean; children: React.ReactNode; onRequestClose: () => void; animation: LayerAnimation };

/** Fenêtre modale native, ouverte seulement quand aucune autre n'est en train de se fermer (voir modalGate). */
function NativeLayer({ visible, children, onRequestClose, animation }: LayerProps) {
  const [ready, setReady] = useState(false);
  const open = visible && ready;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) modalGate.closed(animation);
    wasOpen.current = open;
  }, [open, animation]);
  // Démontée alors qu'elle était ouverte (changement d'écran) : c'est aussi une fermeture.
  useEffect(() => {
    const opened = wasOpen;
    return () => {
      if (opened.current) modalGate.closed(animation);
    };
  }, [animation]);
  useEffect(() => {
    if (!visible) {
      const id = setTimeout(() => setReady(false), 0);
      return () => clearTimeout(id);
    }
    let later: ReturnType<typeof setTimeout> | null = null;
    // Après les autres effets de ce rendu : une fenêtre fermée au même instant est déjà comptée.
    const id = setTimeout(() => {
      const wait = modalGate.wait();
      if (wait > 0) later = setTimeout(() => setReady(true), wait);
      else setReady(true);
    }, 0);
    return () => {
      clearTimeout(id);
      if (later) clearTimeout(later);
    };
  }, [visible]);
  return (
    <Modal visible={open} transparent animationType={animation} onRequestClose={onRequestClose} statusBarTranslucent>
      {children}
    </Modal>
  );
}

export function Layer(props: LayerProps) {
  const mode = useContext(ModalModeContext);
  if (mode === 'inline') return props.visible ? <InlineLayer animation={props.animation}>{props.children}</InlineLayer> : null;
  return <NativeLayer {...props} />;
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
  const { height } = useWindowDimensions();
  const { reduceMotion } = useStore();
  const t = useT();
  // Hauteur du contenu bornée par l'écran : sur un petit iPhone, le titre et le bouton
  // de fermeture restent visibles sous la barre d'état (en-tête, pied et marges ≈ 200 pt).
  const contentMax = Math.max(160, Math.min(560, height - insets.top - insets.bottom - (footer ? 240 : 180)));
  return (
    <Layer visible={visible} animation={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + space.sm, marginTop: insets.top + space.sm }]}>
          <Glass radius={radius.xl} tone="strong" blur={60} style={styles.sheet} floating>
            <View style={styles.grip} />
            <View style={styles.header}>
              <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="close" label={t('common.close')} onPress={onClose} size={18} />
            </View>
            <ScrollView style={{ maxHeight: contentMax }} contentContainerStyle={{ paddingBottom: space.md }}>
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
        <Glass radius={radius.xl} tone="strong" blur={60} style={styles.dialog} floating>
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
