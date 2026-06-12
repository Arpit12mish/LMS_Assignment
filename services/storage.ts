import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const storageKeys = {
  accessToken: "houseed.auth.token",
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

// Tokens are accessible only when the device is unlocked and are device-bound
// (not transferred via iCloud or iTunes backup). Users who change devices must
// sign in again — this is an intentional security trade-off.
export const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
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
