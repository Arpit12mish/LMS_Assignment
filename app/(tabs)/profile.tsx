import { Bell, BookOpenCheck, Camera, ChevronRight, Clock3, KeyRound, LogOut, Moon, Percent, RefreshCw, Settings, Wifi, type LucideIcon } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { AvatarInitials, Button, IconTile, ScreenHeader } from "@/components/ui";
import { calculateCourseProgress } from "@/services/courses";
import { useAppStore } from "@/store/app-store";

export default function ProfileScreen() {
  const {
    session,
    courses,
    enrolled,
    progress,
    downloads,
    preferences,
    isOffline,
    isSyncing,
    lastSyncedAt,
    reminderPreviewDueAt,
    updatePreference,
    updateAvatar,
    syncNow,
    refreshAuthSession,
    changeCurrentPassword,
    requestNotifications,
    startReminderPreview,
    fireReminderPreviewNow,
    logout,
  } = useAppStore();
  const isDark = preferences.darkMode;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { enrolledCourseCount, average, learnedMinutes, completedLessons, downloadedCourseCount } = useMemo(() => {
    const enrolledIds = new Set(enrolled);
    const enrolledCourses = courses.filter((course) => enrolledIds.has(course.id));
    const averageProgress = enrolledCourses.length
      ? Math.round(enrolledCourses.reduce((sum, course) => sum + calculateCourseProgress(course, progress), 0) / enrolledCourses.length)
      : 0;
    const learned = enrolledCourses.reduce(
      (sum, course) => sum + course.lessons.filter((lesson) => progress[course.id]?.[lesson.id]).reduce((lessonSum, lesson) => lessonSum + lesson.durationMinutes, 0),
      0,
    );
    const completed = enrolledCourses.reduce((sum, course) => sum + course.lessons.filter((lesson) => progress[course.id]?.[lesson.id]).length, 0);
    const downloadedCourseIds = new Set(downloads.filter((download) => download.status === "downloaded").map((download) => download.courseId));

    return {
      enrolledCourseCount: enrolledIds.size,
      average: averageProgress,
      learnedMinutes: learned,
      completedLessons: completed,
      downloadedCourseCount: downloadedCourseIds.size,
    };
  }, [courses, downloads, enrolled, progress]);

  const confirmLogout = () => {
    Alert.alert("Log out?", "This clears your local learning state from this device and returns to sign in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          setLoggingOut(true);
          logout().finally(() => setLoggingOut(false));
        },
      },
    ]);
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <ScreenHeader
        title="Profile"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => setSettingsOpen(true)}
            className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}
          >
            <Settings size={20} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.3} />
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={() => syncNow().catch(() => undefined)} tintColor="#2563EB" />}
      >

      <View className={`mt-5 rounded-[16px] border p-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
        <View className="flex-row items-center gap-4">
          <Pressable accessibilityRole="button" accessibilityLabel="Update profile picture" onPress={updateAvatar}>
            <View>
              <AvatarInitials name={session?.user.name} uri={session?.user.avatar} size={64} />
              <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Camera size={12} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </View>
          </Pressable>
          <View className="flex-1">
            <Text className={`text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{session?.user.name ?? "Learner"}</Text>
            <Text className={`mt-1 text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{session?.user.email ?? "Signed in locally"}</Text>
            <Text className={`mt-2 self-start overflow-hidden rounded-full px-3 py-1 text-[12px] font-extrabold text-primary ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}>Pro learner</Text>
          </View>
          <ChevronRight size={24} color={isDark ? "#D1D5DB" : "#8EA0BC"} strokeWidth={2.1} />
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Stat icon={BookOpenCheck} value={String(enrolledCourseCount)} label="Enrolled" tone="blue" isDark={isDark} />
        <Stat icon={Clock3} value={`${Math.floor(learnedMinutes / 60)}h`} label="Learned" tone="orange" isDark={isDark} />
        <Stat icon={Percent} value={`${average}%`} label="Progress" tone="green" isDark={isDark} />
      </View>

      <Text className={`mt-6 text-[13px] font-extrabold uppercase tracking-wide ${isDark ? "text-primary" : "text-slate"}`}>Preferences</Text>
      <View className={`mt-2 rounded-[16px] border px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
        <SettingsRow
          label="Notifications"
          subtitle="Reminders & new lessons"
          icon={Bell}
          tone="blue"
          value={preferences.notificationsEnabled}
          onValueChange={(value) => updatePreference("notificationsEnabled", value)}
          isDark={isDark}
        />
        <SettingsRow label="Dark mode" subtitle="App theme" icon={Moon} tone="slate" value={preferences.darkMode} onValueChange={(value) => updatePreference("darkMode", value)} isDark={isDark} />
        <SettingsRow
          label="Wi-Fi-only downloads"
          subtitle=""
          icon={Wifi}
          tone="green"
          value={preferences.wifiOnlyDownloads}
          onValueChange={(value) => updatePreference("wifiOnlyDownloads", value)}
          isDark={isDark}
        />
      </View>

      <Text className={`mt-6 text-[13px] font-extrabold uppercase tracking-wide ${isDark ? "text-primary" : "text-slate"}`}>Account</Text>
      <View className={`mt-2 rounded-[16px] border px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sync now"
          disabled={isSyncing}
          onPress={() => syncNow().catch(() => undefined)}
          className={`flex-row items-center gap-3 border-b py-4 ${isDark ? "border-[#242A36]" : "border-border"}`}
        >
          <IconTile icon={RefreshCw} tone="slate" size={42} />
          <View className="min-w-0 flex-1">
            <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Last sync</Text>
            <Text className={`mt-0.5 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{formatSyncLabel(lastSyncedAt)}</Text>
          </View>
          {isSyncing ? <ActivityIndicator color="#2563EB" /> : null}
          <Text className={`text-[13px] font-extrabold ${isOffline ? "text-warning" : "text-success"}`}>
            {isOffline ? "Offline" : isSyncing ? "Syncing" : "Ready"}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Log out" disabled={loggingOut} onPress={confirmLogout} className="flex-row items-center gap-3 py-4">
          <IconTile icon={LogOut} tone="red" size={42} />
          <Text className={`flex-1 text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{loggingOut ? "Logging out..." : "Log out"}</Text>
          <ChevronRight size={22} color={isDark ? "#D1D5DB" : "#8EA0BC"} strokeWidth={2.1} />
        </Pressable>
      </View>
      <Text className={`mt-5 text-center text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>HouseEd . v1.0.0 (24)</Text>
    </ScrollView>
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isSyncing={isSyncing}
        onSyncNow={() => syncNow().catch(() => undefined)}
        onRefreshToken={() => refreshAuthSession()}
        onChangePassword={(oldPassword, newPassword) => changeCurrentPassword(oldPassword, newPassword)}
        reminderPreviewDueAt={reminderPreviewDueAt}
        notificationsEnabled={preferences.notificationsEnabled}
        onRequestNotifications={() => requestNotifications().catch(() => undefined)}
        onStartReminderPreview={() => startReminderPreview().catch(() => undefined)}
        onFireReminderPreviewNow={() => fireReminderPreviewNow().catch(() => undefined)}
        stats={[
          { label: "Completed lessons", value: String(completedLessons) },
          { label: "Offline courses", value: String(downloadedCourseCount) },
          { label: "Last sync", value: formatSyncLabel(lastSyncedAt) },
        ]}
        isDark={isDark}
      />
    </View>
  );
}

function Stat({ icon, value, label, tone, isDark }: { icon: LucideIcon; value: string; label: string; tone: "blue" | "orange" | "green"; isDark: boolean }) {
  return (
    <View className={`flex-1 rounded-[16px] border p-3 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
      <IconTile icon={icon} tone={tone} size={34} />
      <Text className={`mt-3 text-[25px] font-black leading-7 ${isDark ? "text-white" : "text-ink"}`}>{value}</Text>
      <Text className={`mt-1 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  label,
  subtitle,
  icon,
  tone,
  value,
  onValueChange,
  isDark,
}: {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "slate";
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 border-b py-4 last:border-b-0 ${isDark ? "border-[#242A36]" : "border-border"}`}>
      <IconTile icon={icon} tone={tone} size={42} />
      <View className="min-w-0 flex-1">
        <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{label}</Text>
        {subtitle ? <Text className={`mt-0.5 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{subtitle}</Text> : null}
      </View>
      <Switch accessibilityRole="switch" value={value} onValueChange={onValueChange} trackColor={{ true: "#2563EB", false: "#D1D5DB" }} thumbColor={value ? "#FFFFFF" : "#F8FAFC"} />
    </View>
  );
}

function SettingsModal({
  visible,
  onClose,
  isSyncing,
  onSyncNow,
  onRefreshToken,
  onChangePassword,
  reminderPreviewDueAt,
  notificationsEnabled,
  onRequestNotifications,
  onStartReminderPreview,
  onFireReminderPreviewNow,
  stats,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  onRefreshToken: () => Promise<string>;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<string>;
  reminderPreviewDueAt: number | null;
  notificationsEnabled: boolean;
  onRequestNotifications: () => void;
  onStartReminderPreview: () => void;
  onFireReminderPreviewNow: () => void;
  stats: Array<{ label: string; value: string }>;
  isDark: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState<"refresh" | "password" | null>(null);
  const secondsLeft = reminderPreviewDueAt ? Math.max(0, Math.ceil((reminderPreviewDueAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!visible) return;
    setOldPassword("");
    setNewPassword("");
    setSecurityMessage(null);
    setSecurityError(null);
    setSecurityLoading(null);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, reminderPreviewDueAt]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className={`max-h-[92%] rounded-t-[24px] px-5 pb-8 pt-5 ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className={`text-[22px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Settings</Text>
              <Text className={`mt-1 text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Live app state and preferences</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={onClose} className={`rounded-[13px] border px-4 py-3 ${isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border"}`}>
              <Text className="text-[14px] font-extrabold text-ink">Done</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3">
              {stats.map((item) => (
                <View key={item.label} className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3 ${isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"}`}>
                  <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{item.label}</Text>
                  <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View className={`mt-4 rounded-[16px] border p-4 ${isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"}`}>
              <View className="flex-row items-start gap-3">
                <IconTile icon={KeyRound} tone="orange" size={42} />
                <View className="min-w-0 flex-1">
                  <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Security operations</Text>
                  <Text className={`mt-1 text-[12px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                    Refresh the access token or change the current password using authenticated FreeAPI endpoints.
                  </Text>
                </View>
              </View>
              <View className="mt-4 gap-3">
                <Button
                  label="Refresh access token"
                  variant="soft"
                  loading={securityLoading === "refresh"}
                  onPress={() => {
                    setSecurityError(null);
                    setSecurityMessage(null);
                    setSecurityLoading("refresh");
                    onRefreshToken()
                      .then(setSecurityMessage)
                      .catch((err) => setSecurityError(err instanceof Error ? err.message : "Could not refresh token."))
                      .finally(() => setSecurityLoading(null));
                  }}
                />
                <TextInput
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Current password"
                  placeholderTextColor="#8EA0BC"
                  className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
                />
                <TextInput
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#8EA0BC"
                  className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
                />
                <Button
                  label="Change password"
                  loading={securityLoading === "password"}
                  onPress={() => {
                    setSecurityError(null);
                    setSecurityMessage(null);
                    setSecurityLoading("password");
                    onChangePassword(oldPassword, newPassword)
                      .then(setSecurityMessage)
                      .catch((err) => setSecurityError(err instanceof Error ? err.message : "Could not change password."))
                      .finally(() => setSecurityLoading(null));
                  }}
                />
                {securityMessage ? <Text className="text-[12px] font-semibold text-success">{securityMessage}</Text> : null}
                {securityError ? <Text className="text-[12px] font-semibold text-error">{securityError}</Text> : null}
              </View>
            </View>

            <View className={`mt-4 rounded-[16px] border p-4 ${isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"}`}>
              <View className="flex-row items-start gap-3">
                <IconTile icon={Bell} tone="blue" size={42} />
                <View className="min-w-0 flex-1">
                  <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>24h reminder preview</Text>
                  <Text className={`mt-1 text-[12px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                    Reviewer shortcut: the production reminder waits 24 hours after the app goes inactive. This timer uses the same local notification path in 15 seconds.
                  </Text>
                </View>
              </View>
              <View className={`mt-4 rounded-[14px] px-4 py-3 ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
                <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Preview timer</Text>
                <Text className={`mt-1 text-[26px] font-black ${isDark ? "text-white" : "text-ink"}`}>
                  {secondsLeft > 0 ? formatTimer(secondsLeft) : "Not running"}
                </Text>
                <Text className={`mt-1 text-[12px] font-semibold ${notificationsEnabled ? "text-success" : "text-warning"}`}>
                  {notificationsEnabled ? "Notifications preference is on" : "Turn on notifications before testing"}
                </Text>
              </View>
              <View className="mt-4 gap-3">
                <Button label="Request permission" variant="soft" onPress={onRequestNotifications} />
                <Button label="Start 15s timer" onPress={onStartReminderPreview} />
                <Button label="End timer and send now" variant="ghost" onPress={onFireReminderPreviewNow} />
              </View>
            </View>

            <View className="mt-5 gap-3">
              <Button label="Sync now" onPress={onSyncNow} loading={isSyncing} />
              <Button label="Close" variant="ghost" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatSyncLabel(timestamp: number | null) {
  if (!timestamp) return "Not synced yet";

  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
