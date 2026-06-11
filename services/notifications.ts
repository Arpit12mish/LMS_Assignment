import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureNotificationChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("learning", {
    name: "Learning reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function notifyBookmarkMilestone(count: number, enabled = true): Promise<void> {
  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Saved learning queue ready",
      body: `You have bookmarked ${count} courses. Your saved path is ready when you are.`,
      data: { route: "saved" },
    },
    trigger: null,
  });
}

export async function scheduleInactivityReminder(enabled = true, seconds = 24 * 60 * 60): Promise<void> {
  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.cancelScheduledNotificationAsync("houseed-24h-reminder").catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: "houseed-24h-reminder",
    content: {
      title: "Continue your lesson",
      body: "Your next HouseEd lesson is ready.",
      data: { route: "home" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

export async function scheduleReminderPreview(enabled = true, seconds = 15): Promise<void> {
  await scheduleInactivityReminder(enabled, seconds);
}

export async function notifyInactivityReminderNow(enabled = true): Promise<void> {
  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Continue your lesson",
      body: "Your next HouseEd lesson is ready.",
      data: { route: "home", source: "preview" },
    },
    trigger: null,
  });
}

export async function cancelInactivityReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync("houseed-24h-reminder").catch(() => undefined);
}
