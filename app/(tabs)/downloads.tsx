import { Link } from "expo-router";
import { Check, Download, Play, Settings, Wifi, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Switch, Text, useWindowDimensions, View } from "react-native";
import { Paths } from "expo-file-system";
import { EmptyState, IconTile, OfflineBanner, ProgressBar, ScreenHeader } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import type { DownloadRecord } from "@/types/lms";

export default function DownloadsScreen() {
  const { downloads, isOffline, preferences, courses, updatePreference, refreshCourses, isLoadingCourses } = useAppStore();
  const isDark = preferences.darkMode;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : 20;
  const disk = getDiskUsage();
  const visibleDownloads = useMemo(() => downloads.filter((item) => item.status !== "failed"), [downloads]);
  const downloadedOnly = useMemo(() => visibleDownloads.filter((item) => item.status === "downloaded"), [visibleDownloads]);
  const houseedBytes = useMemo(() => downloadedOnly.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0), [downloadedOnly]);
  const displayDownloads = isOffline ? downloadedOnly : visibleDownloads;
  const downloadedCount = downloadedOnly.length;

  const groupedDownloads = useMemo(() => {
    const groups = new Map<string, DownloadRecord[]>();

    displayDownloads.forEach((download) => {
      const courseTitle = courses.find((course) => course.id === download.courseId)?.title ?? "Saved lessons";
      const existing = groups.get(courseTitle) ?? [];
      groups.set(courseTitle, [...existing, download]);
    });

    return Array.from(groups.entries()).map(([courseTitle, records]) => ({ courseTitle, records }));
  }, [courses, displayDownloads]);

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <ScreenHeader
        eyebrow="Available offline"
        title="Downloads"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open download settings"
            onPress={() => setSettingsOpen(true)}
            className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}
          >
            <Settings size={20} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.3} />
          </Pressable>
        }
      />
      <View className={isDark ? "bg-black" : "bg-canvas"}>
        {isOffline ? (
          <OfflineBanner label="You are offline - showing saved content" />
        ) : downloadedCount ? (
          <OfflineBanner label={`${downloadedCount} offline ${downloadedCount === 1 ? "lesson" : "lessons"} ready`} />
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 28, paddingTop: 14 }}
        refreshControl={<RefreshControl refreshing={isLoadingCourses} onRefresh={refreshCourses} tintColor="#2563EB" />}
      >
        <View className={`rounded-[16px] border p-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="flex-row items-start justify-between gap-3">
            <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>HouseEd downloads</Text>
            <Text className={`text-right text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>
              {formatBytes(houseedBytes)} <Text className={isDark ? "text-[#C8D0DC]" : "text-slate"}>used</Text>
            </Text>
          </View>
          <View className="mt-2">
            <ProgressBar value={disk.totalBytes > 0 ? Math.min(100, (houseedBytes / disk.totalBytes) * 100) : 0} />
          </View>
          <View className={`mt-3 flex-row items-center justify-between border-t pt-3 ${isDark ? "border-[#242A36]" : "border-border"}`}>
            <View className="flex-row items-center gap-2">
              <Wifi size={13} color="#16A34A" strokeWidth={2.2} />
              <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                Wi-Fi-only {preferences.wifiOnlyDownloads ? "on" : "off"}
              </Text>
            </View>
            <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
              {disk.availableLabel} free of {disk.totalLabel}
            </Text>
          </View>
        </View>

        <View className="mt-5">
          {groupedDownloads.length ? (
            groupedDownloads.map((group) => (
              <View key={group.courseTitle} className="mb-5">
                <Text className={`mb-2 text-[13px] font-extrabold uppercase tracking-wide ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>
                  {group.courseTitle}
                </Text>
                <View className={`overflow-hidden rounded-[16px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
                  {group.records.map((download, index) => (
                    <DownloadRow key={download.lessonId} download={download} isLast={index === group.records.length - 1} isDark={isDark} />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <EmptyState
              title={isOffline ? "No downloaded lessons" : "No offline lessons"}
              message={
                isOffline
                  ? "You're offline and there are no saved lessons on this device yet."
                  : "Download a video or resource lesson from Course Detail and it will appear here."
              }
            />
          )}
        </View>
      </ScrollView>
      <DownloadSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        wifiOnly={preferences.wifiOnlyDownloads}
        downloadedCount={downloadedCount}
        queuedCount={visibleDownloads.filter((item) => item.status === "queued" || item.status === "downloading").length}
        onToggleWifiOnly={(value) => updatePreference("wifiOnlyDownloads", value)}
        isDark={isDark}
      />
    </View>
  );
}

function DownloadRow({ download, isLast, isDark }: { download: DownloadRecord; isLast: boolean; isDark: boolean }) {
  const isDownloading = download.status === "downloading";
  const isDownloaded = download.status === "downloaded";
  const isQueued = download.status === "queued";
  const icon = isDownloading ? Play : isDownloaded ? Check : Download;
  const tone = isDownloading ? "blue" : isDownloaded ? "green" : "slate";

  return (
    <Link href={{ pathname: "/lesson/[id]", params: { id: download.lessonId, courseId: download.courseId } }} asChild>
      <Pressable className={`px-4 py-3 active:opacity-80 ${isLast ? "" : isDark ? "border-b border-[#242A36]" : "border-b border-border"}`}>
        <View className="flex-row items-center gap-3">
          <IconTile icon={icon} tone={tone} size={42} />
          <View className="min-w-0 flex-1">
            <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
              {download.title}
            </Text>
            <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
              {download.status === "failed" ? download.errorMessage ?? "Download failed" : download.sizeLabel ?? "Saved lesson"}
            </Text>
            {isDownloading ? (
              <View className="mt-2">
                <ProgressBar value={download.progress} />
                <Text className="mt-1 text-[12px] font-extrabold text-primary">Downloading . {download.progress}%</Text>
              </View>
            ) : null}
          </View>
          {isDownloading ? (
            <X size={22} color="#8EA0BC" strokeWidth={1.8} />
          ) : (
            <View className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${isQueued ? (isDark ? "bg-[#E5E7EB]" : "bg-slate-50") : isDownloaded ? "bg-green-50" : "bg-red-50"}`}>
              {isDownloaded ? <Check size={12} color="#16A34A" strokeWidth={2.5} /> : null}
              <Text className={`text-[12px] font-extrabold ${isQueued ? "text-slate" : isDownloaded ? "text-success" : "text-error"}`}>
                {isQueued ? "Queued" : isDownloaded ? "Offline" : "Failed"}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

function formatBytes(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${Math.max(1, Math.round(mb))} MB`;
  const kb = bytes / 1024;
  return `${Math.max(0, Math.round(kb))} KB`;
}

function getDiskUsage() {
  try {
    const total = Math.max(Paths.totalDiskSpace, 1);
    const available = Math.min(Math.max(Paths.availableDiskSpace, 0), total);
    const used = Math.max(total - available, 0);
    return {
      totalBytes: total,
      usedLabel: formatBytes(used),
      availableLabel: formatBytes(available),
      totalLabel: formatBytes(total),
      percentUsed: Math.min(100, Math.max(0, (used / total) * 100)),
    };
  } catch {
    return {
      totalBytes: 0,
      usedLabel: "—",
      availableLabel: "—",
      totalLabel: "—",
      percentUsed: 0,
    };
  }
}

function DownloadSettingsModal({
  visible,
  onClose,
  wifiOnly,
  downloadedCount,
  queuedCount,
  onToggleWifiOnly,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  wifiOnly: boolean;
  downloadedCount: number;
  queuedCount: number;
  onToggleWifiOnly: (value: boolean) => void;
  isDark: boolean;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className={`rounded-t-[24px] px-5 pb-8 pt-5 ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className={`text-[22px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Download settings</Text>
              <Text className={`mt-1 text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Offline storage and network rules</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close download settings" onPress={onClose} className={`rounded-[13px] border px-4 py-3 ${isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border"}`}>
              <Text className="text-[14px] font-extrabold text-ink">Done</Text>
            </Pressable>
          </View>

          <View className={`rounded-[16px] border px-4 ${isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"}`}>
            <View className={`flex-row items-center gap-3 border-b py-4 ${isDark ? "border-[#242A36]" : "border-border"}`}>
              <IconTile icon={Wifi} tone="green" size={42} />
              <View className="min-w-0 flex-1">
                <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Wi-Fi-only downloads</Text>
                <Text className={`mt-0.5 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Blocks new downloads on cellular networks.</Text>
              </View>
              <Switch value={wifiOnly} onValueChange={onToggleWifiOnly} trackColor={{ true: "#2563EB", false: "#D1D5DB" }} thumbColor={wifiOnly ? "#FFFFFF" : "#F8FAFC"} />
            </View>
            <View className={`flex-row items-center justify-between border-b py-4 ${isDark ? "border-[#242A36]" : "border-border"}`}>
              <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Offline lessons</Text>
              <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{downloadedCount}</Text>
            </View>
            <View className="flex-row items-center justify-between py-4">
              <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Active queue</Text>
              <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{queuedCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
