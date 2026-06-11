import AsyncStorage from "@react-native-async-storage/async-storage";

export const storageKeys = {
  authUser: "houseed.auth.user",
  refreshToken: "houseed.auth.refresh",
  coursesCache: "houseed.courses.cache",
  bookmarks: "houseed.bookmarks",
  enrolled: "houseed.enrolled",
  progress: "houseed.progress",
  preferences: "houseed.preferences",
  downloads: "houseed.downloads",
  lastOpenedAt: "houseed.lastOpenedAt",
  lastSyncedAt: "houseed.lastSyncedAt",
  reminderPreviewDueAt: "houseed.reminderPreviewDueAt",
  bookmarkMilestoneNotified: "houseed.bookmarkMilestoneNotified",
};

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
