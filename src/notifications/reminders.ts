/**
 * Rappel de reprise (facultatif, désactivé par défaut) : une notification
 * locale, programmée sur l'appareil quand on quitte une partie en cours,
 * annulée dès qu'on revient. Aucun serveur, aucune notification distante.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL = 'rappels';
/** Délai avant le rappel : deux jours sans jouer. */
export const REMINDER_DELAY_HOURS = 48;

/**
 * Ni sur le web, ni dans Expo Go (le module y affiche un avertissement dès son chargement) :
 * les rappels fonctionnent dans les vraies versions de l'application (TestFlight, App Store).
 */
export const remindersSupported = Platform.OS !== 'web' && !isRunningInExpoGo();

/** Chargé seulement au premier usage : rien n'est initialisé au lancement de l'application. */
let loaded: Promise<NotificationsModule> | null = null;
const notifications = () => (loaded ??= import('expo-notifications'));

/** Demande l'autorisation (et crée le canal Android). Renvoie `true` si accordée. */
export async function enableReminders(channelName: string): Promise<boolean> {
  if (!remindersSupported) return false;
  try {
    const Notifications = await notifications();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: channelName, importance: Notifications.AndroidImportance.DEFAULT });
    }
    const current = await Notifications.getPermissionsAsync();
    const res = current.granted ? current : await Notifications.requestPermissionsAsync();
    return res.granted || res.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

/** Programme le rappel (remplace le précédent). */
export async function scheduleReminder(title: string, body: string): Promise<void> {
  if (!remindersSupported) return;
  try {
    const Notifications = await notifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: REMINDER_DELAY_HOURS * 3600, channelId: CHANNEL },
    });
  } catch {
    // Pas d'autorisation ou plateforme indisponible : le rappel est simplement ignoré.
  }
}

export async function cancelReminders(): Promise<void> {
  if (!remindersSupported) return;
  try {
    const Notifications = await notifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Rien à annuler.
  }
}
