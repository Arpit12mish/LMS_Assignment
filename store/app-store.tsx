import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import { colorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  changePassword as changePasswordRequest,
  forgotPassword as forgotPasswordRequest,
  getGoogleLoginUrl,
  login as loginRequest,
  logout as logoutRequest,
  persistSession,
  persistTokenSession,
  refreshCurrentSession,
  register as registerRequest,
  resetForgottenPassword,
  restoreSession,
  verifyEmail,
} from "@/services/auth";
import { calculateCourseProgress, fetchCourses, normalizeCourse } from "@/services/courses";
import { downloadLessonFile } from "@/services/downloads";
import {
  cancelInactivityReminder,
  notifyBookmarkMilestone,
  notifyInactivityReminderNow,
  requestNotificationPermission,
  scheduleInactivityReminder,
  scheduleReminderPreview,
} from "@/services/notifications";
import { readJson, storageKeys, writeJson } from "@/services/storage";
import type { AuthSession, Course, DownloadRecord, Lesson, Preferences, ProgressMap } from "@/types/lms";

interface AppStore {
  isHydrated: boolean;
  session: AuthSession | null;
  courses: Course[];
  isLoadingCourses: boolean;
  courseError: string | null;
  bookmarks: string[];
  enrolled: string[];
  progress: ProgressMap;
  preferences: Preferences;
  downloads: DownloadRecord[];
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  lastOpenedAt: number | null;
  reminderPreviewDueAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  openGoogleLogin: () => Promise<void>;
  handleAuthCallbackUrl: (url: string) => Promise<boolean>;
  refreshAuthSession: () => Promise<string>;
  verifyEmailToken: (verificationToken: string) => Promise<string>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<string>;
  changeCurrentPassword: (oldPassword: string, newPassword: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  syncNow: () => Promise<void>;
  requestNotifications: () => Promise<void>;
  startReminderPreview: () => Promise<void>;
  fireReminderPreviewNow: () => Promise<void>;
  toggleBookmark: (courseId: string) => Promise<void>;
  enroll: (courseId: string) => Promise<void>;
  markLessonComplete: (courseId: string, lessonId: string, complete?: boolean) => Promise<void>;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
  updateAvatar: () => Promise<void>;
  downloadLesson: (lesson: Lesson) => Promise<void>;
}

interface InAppNotification {
  title: string;
  message: string;
  tone: "success" | "info" | "warning";
}

function networkIsOffline(state: { isInternetReachable?: boolean | null; isConnected?: boolean | null }): boolean {
  return state.isInternetReachable === false || state.isConnected === false;
}

const defaultPreferences: Preferences = {
  notificationsEnabled: true,
  darkMode: false,
  wifiOnlyDownloads: true,
};

async function fetchAndCacheCourses(): Promise<{ courses: Course[]; syncedAt: number }> {
  const loaded = (await fetchCourses()).map(normalizeCourse);
  const syncedAt = Date.now();
  await writeJson(storageKeys.coursesCache, loaded);
  await writeJson(storageKeys.lastSyncedAt, syncedAt);
  return { courses: loaded, syncedAt };
}

const AppContext = createContext<AppStore | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);
  const [reminderPreviewDueAt, setReminderPreviewDueAt] = useState<number | null>(null);
  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsEnabledRef = useRef(defaultPreferences.notificationsEnabled);

  const showInAppNotification = useCallback((notification: InAppNotification) => {
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }

    setInAppNotification(notification);
    notificationTimer.current = setTimeout(() => {
      setInAppNotification(null);
      notificationTimer.current = null;
    }, 3600);
  }, []);

  useEffect(() => {
    notificationsEnabledRef.current = preferences.notificationsEnabled;
  }, [preferences.notificationsEnabled]);

  useEffect(() => {
    if (!reminderPreviewDueAt) return undefined;

    const delay = Math.max(0, reminderPreviewDueAt - Date.now());
    const timer = setTimeout(() => {
      setReminderPreviewDueAt(null);
      AsyncStorage.removeItem(storageKeys.reminderPreviewDueAt).catch(() => undefined);
    }, delay + 1000);

    return () => clearTimeout(timer);
  }, [reminderPreviewDueAt]);

  const refreshCourses = useCallback(async () => {
    setIsLoadingCourses(true);
    setCourseError(null);

    try {
      const result = await fetchAndCacheCourses();
      setCourses(result.courses);
      const syncedAt = result.syncedAt;
      setLastSyncedAt(syncedAt);
    } catch (error) {
      const cached = await readJson<Course[]>(storageKeys.coursesCache, []);
      if (cached.length > 0) {
        setCourses(cached.map(normalizeCourse));
        setCourseError("Showing cached courses. Pull to retry.");
      } else {
        setCourseError(error instanceof Error ? error.message : "Could not load courses.");
      }
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const [
        restoredSession,
        savedCourses,
        savedBookmarks,
        savedEnrolled,
        savedProgress,
        savedPreferences,
        savedDownloads,
        savedLastSyncedAt,
        savedLastOpenedAt,
        savedReminderPreviewDueAt,
        networkState,
      ] =
        await Promise.all([
          restoreSession(),
          readJson<Course[]>(storageKeys.coursesCache, []),
          readJson<string[]>(storageKeys.bookmarks, []),
          readJson<string[]>(storageKeys.enrolled, []),
          readJson<ProgressMap>(storageKeys.progress, {}),
          readJson<Preferences>(storageKeys.preferences, defaultPreferences),
          readJson<DownloadRecord[]>(storageKeys.downloads, []),
          readJson<number | null>(storageKeys.lastSyncedAt, null),
          readJson<number | null>(storageKeys.lastOpenedAt, null),
          readJson<number | null>(storageKeys.reminderPreviewDueAt, null),
          Network.getNetworkStateAsync(),
        ]);

      if (!active) return;

      const normalizedSavedCourses = savedCourses.map(normalizeCourse);
      setSession(restoredSession);
      setCourses(normalizedSavedCourses);
      setBookmarks(savedBookmarks);
      setEnrolled(savedEnrolled);
      setProgress(savedProgress);
      setPreferences(savedPreferences);
      const validDownloads = savedDownloads.filter((download) => download.status === "downloaded");
      setDownloads(validDownloads);
      setLastSyncedAt(savedLastSyncedAt);
      setLastOpenedAt(savedLastOpenedAt);
      setReminderPreviewDueAt(savedReminderPreviewDueAt && savedReminderPreviewDueAt > Date.now() ? savedReminderPreviewDueAt : null);
      setIsOffline(networkIsOffline(networkState));
      setIsHydrated(true);

      if (savedReminderPreviewDueAt && savedReminderPreviewDueAt <= Date.now()) {
        await AsyncStorage.removeItem(storageKeys.reminderPreviewDueAt);
      }

      if (validDownloads.length !== savedDownloads.length) {
        await writeJson(storageKeys.downloads, validDownloads);
      }

      if (normalizedSavedCourses.length > 0) {
        await writeJson(storageKeys.coursesCache, normalizedSavedCourses);
      }

      if (savedCourses.length === 0) {
        await refreshCourses();
      }
    }

    hydrate();

    const networkSub = Network.addNetworkStateListener((state) => {
      setIsOffline(networkIsOffline(state));
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        const openedAt = Date.now();
        setLastOpenedAt(openedAt);
        AsyncStorage.setItem(storageKeys.lastOpenedAt, JSON.stringify(openedAt)).catch(() => undefined);
        scheduleInactivityReminder(notificationsEnabledRef.current).catch(() => undefined);
      }

      if (state === "active") {
        cancelInactivityReminder().catch(() => undefined);
      }
    });

    return () => {
      active = false;
      networkSub.remove();
      appStateSub.remove();
    };
  }, [refreshCourses]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password);
    setSession(nextSession);
    if (preferences.notificationsEnabled) {
      await requestNotificationPermission().catch(() => undefined);
    }
  }, [preferences.notificationsEnabled]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const nextSession = await registerRequest(name, email, password);
    setSession(nextSession);
    if (preferences.notificationsEnabled) {
      await requestNotificationPermission().catch(() => undefined);
    }
  }, [preferences.notificationsEnabled]);

  const handleAuthCallbackUrl = useCallback(
    async (url: string): Promise<boolean> => {
      const params = paramsFromUrl(url);
      const accessToken = params.get("accessToken") ?? params.get("access_token") ?? params.get("token");
      const refreshToken = params.get("refreshToken") ?? params.get("refresh_token") ?? undefined;

      if (!accessToken) return false;

      const nextSession = await persistTokenSession(accessToken, refreshToken);
      setSession(nextSession);
      showInAppNotification({
        title: "Google login complete",
        message: "Your tokens were stored securely on this device.",
        tone: "success",
      });
      return true;
    },
    [showInAppNotification],
  );

  useEffect(() => {
    let active = true;

    Linking.getInitialURL()
      .then((url) => {
        if (active && url) {
          handleAuthCallbackUrl(url).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleAuthCallbackUrl(url).catch(() => undefined);
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [handleAuthCallbackUrl]);

  const openGoogleLogin = useCallback(async () => {
    await Linking.openURL(getGoogleLoginUrl());
  }, []);

  const refreshAuthSession = useCallback(async () => {
    if (!session) throw new Error("Sign in before refreshing the access token.");

    const nextSession = await refreshCurrentSession(session);
    setSession(nextSession);
    await persistSession(nextSession);
    showInAppNotification({
      title: "Token refreshed",
      message: "A new access token was stored in SecureStore.",
      tone: "success",
    });
    return "Access token refreshed.";
  }, [session, showInAppNotification]);

  const verifyEmailToken = useCallback(async (verificationToken: string) => {
    const message = await verifyEmail(verificationToken);
    showInAppNotification({
      title: "Email verification",
      message,
      tone: "success",
    });
    return message;
  }, [showInAppNotification]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const message = await forgotPasswordRequest(email);
    showInAppNotification({
      title: "Reset email requested",
      message,
      tone: "success",
    });
    return message;
  }, [showInAppNotification]);

  const resetPassword = useCallback(async (resetToken: string, newPassword: string) => {
    const message = await resetForgottenPassword(resetToken, newPassword);
    showInAppNotification({
      title: "Password reset",
      message,
      tone: "success",
    });
    return message;
  }, [showInAppNotification]);

  const changeCurrentPassword = useCallback(async (oldPassword: string, newPassword: string) => {
    const message = await changePasswordRequest(oldPassword, newPassword);
    showInAppNotification({
      title: "Password changed",
      message,
      tone: "success",
    });
    return message;
  }, [showInAppNotification]);

  const logout = useCallback(async () => {
    await cancelInactivityReminder();
    await logoutRequest();
    setSession(null);
    setBookmarks([]);
    setEnrolled([]);
    setProgress({});
    setDownloads([]);
    setLastSyncedAt(null);
    setReminderPreviewDueAt(null);
    setIsSyncing(false);
    setInAppNotification(null);
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
      notificationTimer.current = null;
    }
    await AsyncStorage.multiRemove([
      storageKeys.bookmarks,
      storageKeys.enrolled,
      storageKeys.progress,
      storageKeys.downloads,
      storageKeys.lastSyncedAt,
      storageKeys.reminderPreviewDueAt,
      storageKeys.bookmarkMilestoneNotified,
    ]);
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkIsOffline(networkState)) {
        setIsOffline(true);
        showInAppNotification({
          title: "Sync unavailable",
          message: "You are offline. Connect to the internet and try again.",
          tone: "warning",
        });
        return;
      }

      const result = await fetchAndCacheCourses();
      setCourses(result.courses);
      setLastSyncedAt(result.syncedAt);
      setCourseError(null);
      setIsOffline(false);
      showInAppNotification({
        title: "Sync complete",
        message: "Your course catalog and local learning state are up to date.",
        tone: "success",
      });
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : "Sync failed. Please try again.");
      showInAppNotification({
        title: "Sync failed",
        message: error instanceof Error ? error.message : "Could not sync right now.",
        tone: "warning",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [showInAppNotification]);

  const toggleBookmark = useCallback(
    async (courseId: string) => {
      const next = bookmarks.includes(courseId) ? bookmarks.filter((id) => id !== courseId) : [...bookmarks, courseId];
      setBookmarks(next);
      await writeJson(storageKeys.bookmarks, next);

      if (!bookmarks.includes(courseId) && bookmarks.length < 5 && next.length >= 5) {
        const alreadyNotified = await readJson<boolean>(storageKeys.bookmarkMilestoneNotified, false);
        if (!alreadyNotified && preferences.notificationsEnabled) {
          await notifyBookmarkMilestone(next.length, preferences.notificationsEnabled);
          await writeJson(storageKeys.bookmarkMilestoneNotified, true);
        }
      }
    },
    [bookmarks, preferences.notificationsEnabled],
  );

  const requestNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission().catch(() => false);
    if (!granted) {
      showInAppNotification({
        title: "Notifications disabled",
        message: "Enable notification permission in system settings to receive reminders.",
        tone: "warning",
      });
      return;
    }

    if (!preferences.notificationsEnabled) {
      const next = { ...preferences, notificationsEnabled: true };
      setPreferences(next);
      await writeJson(storageKeys.preferences, next);
    }

    showInAppNotification({
      title: "Notifications ready",
      message: "Bookmark milestones and lesson reminders can now be delivered.",
      tone: "success",
    });
  }, [preferences, showInAppNotification]);

  const startReminderPreview = useCallback(async () => {
    const previewSeconds = 15;
    const granted = await requestNotificationPermission().catch(() => false);
    if (!granted || !preferences.notificationsEnabled) {
      showInAppNotification({
        title: "Reminder preview blocked",
        message: "Turn on notifications to run the 15-second reminder test.",
        tone: "warning",
      });
      return;
    }

    const dueAt = Date.now() + previewSeconds * 1000;
    setReminderPreviewDueAt(dueAt);
    await writeJson(storageKeys.reminderPreviewDueAt, dueAt);
    await scheduleReminderPreview(true, previewSeconds);
    showInAppNotification({
      title: "Reminder test started",
      message: "A local notification is scheduled for 15 seconds from now.",
      tone: "info",
    });
  }, [preferences.notificationsEnabled, showInAppNotification]);

  const fireReminderPreviewNow = useCallback(async () => {
    const granted = await requestNotificationPermission().catch(() => false);
    if (!granted || !preferences.notificationsEnabled) {
      showInAppNotification({
        title: "Reminder preview blocked",
        message: "Turn on notifications before firing the reminder test.",
        tone: "warning",
      });
      return;
    }

    await cancelInactivityReminder();
    setReminderPreviewDueAt(null);
    await AsyncStorage.removeItem(storageKeys.reminderPreviewDueAt);
    await notifyInactivityReminderNow(true);
    showInAppNotification({
      title: "Reminder sent",
      message: "The same 24-hour reminder notification was fired immediately for review.",
      tone: "success",
    });
  }, [preferences.notificationsEnabled, showInAppNotification]);

  const enroll = useCallback(
    async (courseId: string) => {
      if (enrolled.includes(courseId)) return;
      const next = [...enrolled, courseId];
      setEnrolled(next);
      await writeJson(storageKeys.enrolled, next);
      const course = courses.find((item) => item.id === courseId);
      showInAppNotification({
        title: "Enrolled",
        message: course ? `You're now enrolled in ${course.title}.` : "You're now enrolled in this course.",
        tone: "success",
      });
    },
    [courses, enrolled, showInAppNotification],
  );

  const markLessonComplete = useCallback(
    async (courseId: string, lessonId: string, complete = true) => {
      const courseProgress = progress[courseId] ?? {};
      const next = {
        ...progress,
        [courseId]: {
          ...courseProgress,
          [lessonId]: complete,
        },
      };
      setProgress(next);
      await writeJson(storageKeys.progress, next);

      const course = courses.find((item) => item.id === courseId);
      const courseComplete = complete && course?.lessons.every((lesson) => next[courseId]?.[lesson.id]);
      if (course && courseComplete) {
        showInAppNotification({
          title: "Course complete",
          message: `${course.title} is now marked complete.`,
          tone: "success",
        });
      }
    },
    [courses, progress, showInAppNotification],
  );

  const updatePreference = useCallback(
    async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      if (key === "notificationsEnabled" && value) {
        const granted = await requestNotificationPermission().catch(() => false);
        if (!granted) {
          showInAppNotification({
            title: "Notifications disabled",
            message: "Enable notification permission in system settings to receive reminders.",
            tone: "warning",
          });
          return;
        }
      }

      const next = { ...preferences, [key]: value };
      setPreferences(next);

      try {
        await writeJson(storageKeys.preferences, next);

        if (key === "notificationsEnabled" && !value) {
          await cancelInactivityReminder();
          setReminderPreviewDueAt(null);
          await AsyncStorage.removeItem(storageKeys.reminderPreviewDueAt);
        }
      } catch {
        setPreferences(preferences);
        showInAppNotification({
          title: "Preference not saved",
          message: "Please try again. Your previous setting was restored.",
          tone: "warning",
        });
      }
    },
    [preferences, showInAppNotification],
  );

  const updateAvatar = useCallback(async () => {
    if (!session) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        avatar: result.assets[0].uri,
      },
    };

    setSession(nextSession);
    await persistSession(nextSession);
  }, [session]);

  const downloadLesson = useCallback(
    async (lesson: Lesson) => {
      const networkState = await Network.getNetworkStateAsync();
      const shouldBlockForWifi =
        preferences.wifiOnlyDownloads &&
        networkState.type !== Network.NetworkStateType.WIFI &&
        networkState.type !== Network.NetworkStateType.ETHERNET;

      if (shouldBlockForWifi) {
        showInAppNotification({
          title: "Waiting for Wi-Fi",
          message: "Wi-Fi-only downloads are enabled. Turn it off in Profile or connect to Wi-Fi.",
          tone: "warning",
        });
        return;
      }

      const queued: DownloadRecord = {
        lessonId: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        progress: 0,
        status: "downloading",
      };

      const withoutOld = downloads.filter((item) => item.lessonId !== lesson.id);
      setDownloads([...withoutOld, queued]);

      try {
        const result = await downloadLessonFile(lesson);
        const next = [...withoutOld, result];
        setDownloads(next);
        await writeJson(storageKeys.downloads, next);

        if (result.status === "downloaded") {
          showInAppNotification({
            title: "Download complete",
            message: `${lesson.title} is ready offline.`,
            tone: "success",
          });
        }
      } catch (error) {
        const failed: DownloadRecord = {
          ...queued,
          progress: 0,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Download failed. Please try again.",
        };
        const next = [...withoutOld, failed];
        setDownloads(next);
        await writeJson(storageKeys.downloads, next).catch(() => undefined);
        showInAppNotification({
          title: "Download failed",
          message: failed.errorMessage ?? "This lesson could not be saved offline.",
          tone: "warning",
        });
      }
    },
    [downloads, preferences.wifiOnlyDownloads, showInAppNotification],
  );

  const value = useMemo<AppStore>(
    () => ({
      isHydrated,
      session,
      courses,
      isLoadingCourses,
      courseError,
      bookmarks,
      enrolled,
      progress,
      preferences,
      downloads,
      isOffline,
      isSyncing,
      lastSyncedAt,
      lastOpenedAt,
      reminderPreviewDueAt,
      login,
      register,
      openGoogleLogin,
      handleAuthCallbackUrl,
      refreshAuthSession,
      verifyEmailToken,
      requestPasswordReset,
      resetPassword,
      changeCurrentPassword,
      logout,
      refreshCourses,
      syncNow,
      requestNotifications,
      startReminderPreview,
      fireReminderPreviewNow,
      toggleBookmark,
      enroll,
      markLessonComplete,
      updatePreference,
      updateAvatar,
      downloadLesson,
    }),
    [
      bookmarks,
      courseError,
      courses,
      downloads,
      enroll,
      enrolled,
      isHydrated,
      isLoadingCourses,
      isSyncing,
      isOffline,
      lastSyncedAt,
      lastOpenedAt,
      login,
      logout,
      openGoogleLogin,
      handleAuthCallbackUrl,
      markLessonComplete,
      preferences,
      progress,
      refreshCourses,
      reminderPreviewDueAt,
      register,
      refreshAuthSession,
      requestNotifications,
      requestPasswordReset,
      resetPassword,
      session,
      syncNow,
      startReminderPreview,
      toggleBookmark,
      updateAvatar,
      updatePreference,
      downloadLesson,
      fireReminderPreviewNow,
      verifyEmailToken,
      changeCurrentPassword,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      <DarkModeSync />
      {children}
      {inAppNotification ? (
        <InAppNotificationToast
          notification={inAppNotification}
          onDismiss={() => {
            if (notificationTimer.current) {
              clearTimeout(notificationTimer.current);
              notificationTimer.current = null;
            }
            setInAppNotification(null);
          }}
        />
      ) : null}
    </AppContext.Provider>
  );
}

function paramsFromUrl(url: string): URLSearchParams {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(parsed.search);

    hashParams.forEach((value, key) => {
      if (!searchParams.has(key)) searchParams.set(key, value);
    });

    return searchParams;
  } catch {
    const [, query = ""] = url.split("?");
    return new URLSearchParams(query);
  }
}

function DarkModeSync() {
  const { preferences } = useAppStore();

  useEffect(() => {
    colorScheme.set(preferences.darkMode ? "dark" : "light");
  }, [preferences.darkMode]);

  return null;
}

export function useAppStore(): AppStore {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppProvider");
  }
  return context;
}

export function useCourseProgress(course: Course): number {
  const { progress } = useAppStore();
  return calculateCourseProgress(course, progress);
}

function InAppNotificationToast({
  notification,
  onDismiss,
}: {
  notification: InAppNotification;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  const toneClass = {
    success: "border-green-100 bg-green-50",
    info: "border-blue-100 bg-softBlue",
    warning: "border-orange-100 bg-orange-50",
  }[notification.tone];

  const dotClass = {
    success: "bg-success",
    info: "bg-primary",
    warning: "bg-warning",
  }[notification.tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss notification"
      onPress={onDismiss}
      style={{ top: insets.top + 8 }}
      className={`absolute left-5 right-5 z-50 rounded-[16px] border px-4 py-3 shadow-sm ${toneClass}`}
    >
      <View className="flex-row gap-3">
        <View className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-extrabold text-ink">{notification.title}</Text>
          <Text className="mt-0.5 text-[12px] font-semibold leading-5 text-slate">{notification.message}</Text>
        </View>
      </View>
    </Pressable>
  );
}
