/**
 * Rappel de reprise (facultatif, désactivé par défaut) : une notification
 * locale, programmée sur l'appareil quand on quitte une partie en cours,
 * annulée dès qu'on revient. Aucun serveur, aucune notification distante.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL = 'rappels';
/** Délai avant le rappel : deux jours sans jouer. */
export const REMINDER_DELAY_HOURS = 48;

export const remindersSupported = Platform.OS !== 'web';

/** Demande l'autorisation (et crée le canal Android). Renvoie `true` si accordée. */
export async function enableReminders(channelName: string): Promise<boolean> {
  if (!remindersSupported) return false;
  try {
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
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Rien à annuler.
  }
}
