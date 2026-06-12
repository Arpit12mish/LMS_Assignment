import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bookmark, Check, Download, Ellipsis, Play, ChevronLeft, ShieldCheck, Sparkles, WifiOff, RefreshCw } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarInitials, Button, CourseArt, FullScreenState, IconTile, OfflineBanner, ProgressBar } from "@/components/ui";
import { calculateCourseProgress, getNextLesson, textFromUnknown } from "@/services/courses";
import { useAppStore } from "@/store/app-store";
import type { Lesson } from "@/types/lms";

export default function CourseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { courses, bookmarks, enrolled, progress, isOffline, toggleBookmark, enroll, markLessonComplete, downloadLesson, downloads, refreshCourses, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [followingInstructor, setFollowingInstructor] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const course = useMemo(() => courses.find((item) => item.id === id), [courses, id]);

  if (!course) {
    return (
      <View className={`flex-1 items-center justify-center px-5 ${isDark ? "bg-black" : "bg-canvas"}`}>
        <Text className={`text-center text-xl font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Course not found</Text>
        <View className="mt-4 w-full">
          <Button label="Back to Explore" onPress={() => router.replace("/(tabs)/explore")} />
        </View>
      </View>
    );
  }

  const saved = bookmarks.includes(course.id);
  const isEnrolled = enrolled.includes(course.id);
  const percent = calculateCourseProgress(course, progress);
  const nextLesson = getNextLesson(course, progress);
  const instructorName = textFromUnknown(course.instructor.name, "HouseEd mentor");
  const durationLabel = `${Math.floor(course.durationMinutes / 60)}h ${String(course.durationMinutes % 60).padStart(2, "0")}m`;
  const reviewCount = Math.max(120, Math.round(course.rating * 260));
  const learnerCount = `${Math.max(1.2, course.lessons.length * 1.1 + course.rating).toFixed(1)}k`;
  const downloadedLessonIds = new Set(downloads.filter((item) => item.courseId === course.id && item.status === "downloaded").map((item) => item.lessonId));
  const visibleLessons = isOffline ? course.lessons.filter((lesson) => downloadedLessonIds.has(lesson.id)) : course.lessons;
  const activeLesson = isOffline
    ? visibleLessons.find((lesson) => !progress[course.id]?.[lesson.id]) ?? visibleLessons[0] ?? nextLesson
    : nextLesson;

  if (isOffline && visibleLessons.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
          <View style={{ paddingTop: insets.top }}>
            <OfflineBanner label="You are offline - showing saved content" />
          </View>
          <FullScreenState
            icon={WifiOff}
            iconTone="slate"
            title="Course unavailable offline"
            message="None of this course's lessons are downloaded on this device yet."
            primaryAction={
              <Link href="/(tabs)/downloads" asChild>
                <Pressable className="h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] bg-primary">
                  <Download size={16} color="#FFFFFF" strokeWidth={2.3} />
                  <Text className="text-[14px] font-extrabold text-white">Go to Downloads</Text>
                </Pressable>
              </Link>
            }
            secondaryAction={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try loading course again"
                onPress={refreshCourses}
                className={`h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] border ${isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border bg-white"}`}
              >
                <RefreshCw size={15} color="#0F172A" strokeWidth={2.2} />
                <Text className="text-[14px] font-extrabold text-ink">Try again</Text>
              </Pressable>
            }
          />
        </View>
      </>
    );
  }

  const startDownload = async (lesson: Lesson) => {
    setDownloadingId(lesson.id);
    try {
      await downloadLesson(lesson);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}>
        {isOffline ? (
          <View style={{ paddingTop: insets.top }}>
            <OfflineBanner label="You are offline - showing downloaded lessons" />
          </View>
        ) : null}
        <ScrollView contentContainerClassName="pb-32">
          <View className="relative">
            <CourseArt size="hero" uri={course.thumbnail} />
            <View className="absolute left-5 right-5 flex-row justify-between" style={{ top: insets.top + 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className={`h-11 w-11 items-center justify-center rounded-[13px] ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
                <ChevronLeft size={23} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.4} />
              </Pressable>
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={saved ? "Remove bookmark" : "Save course"}
                  onPress={() => { toggleBookmark(course.id).catch(() => undefined); }}
                  className={`h-11 w-11 items-center justify-center rounded-[13px] ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}
                >
                  <Bookmark size={22} color={saved ? "#2563EB" : "#64748B"} fill={saved ? "#2563EB" : "transparent"} strokeWidth={2.4} />
                </Pressable>
                <View className={`h-11 w-11 items-center justify-center rounded-[13px] ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
                  <Ellipsis size={23} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.4} />
                </View>
              </View>
            </View>
          </View>

          <View className={`-mt-8 rounded-t-[26px] px-5 pt-6 ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
            <View className="flex-row gap-2">
              <Text className={`overflow-hidden rounded-full px-3 py-1.5 text-[13px] font-extrabold text-primary ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}>{course.category}</Text>
              <Text className={`overflow-hidden rounded-full px-3 py-1.5 text-[13px] font-extrabold ${isDark ? "bg-[#1B2230] text-[#D1D5DB]" : "bg-slate-50 text-slate"}`}>{course.level}</Text>
            </View>
            <Text className={`mt-4 text-[25px] font-extrabold leading-8 ${isDark ? "text-white" : "text-ink"}`}>{course.title}</Text>
            <Text className={`mt-2 text-[16px] font-medium leading-6 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={descriptionExpanded ? undefined : 2}>
              {course.description}
            </Text>
            {course.description.length > 120 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={descriptionExpanded ? "Show less" : "Read more"}
                onPress={() => setDescriptionExpanded((v) => !v)}
                className="mt-1 self-start"
              >
                <Text className="text-[14px] font-extrabold text-primary">{descriptionExpanded ? "Show less" : "Read more"}</Text>
              </Pressable>
            ) : null}

            <View className="mt-5 flex-row items-center gap-3">
              <AvatarInitials name={instructorName} uri={course.instructor.avatar} size={44} />
              <View className="min-w-0 flex-1">
                <Text className={`text-[16px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{instructorName}</Text>
                <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>
                  {course.instructor.headline} . Instructor
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={followingInstructor ? "Following instructor" : "Follow instructor"}
                onPress={() => setFollowingInstructor((value) => !value)}
                className={`rounded-[13px] border px-4 py-3 ${followingInstructor ? (isDark ? "border-primary bg-[#0B1D45]" : "border-primary bg-softBlue") : isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border bg-white"}`}
              >
                <Text className={`text-[15px] font-extrabold ${followingInstructor ? "text-primary" : "text-ink"}`}>
                  {followingInstructor ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>

            <View className={`mt-5 flex-row border-y py-4 ${isDark ? "border-[#242A36]" : "border-border"}`}>
              <Info value={course.rating.toFixed(1)} label={`${reviewCount} reviews`} isDark={isDark} />
              <Info value={durationLabel} label="Duration" isDark={isDark} />
              <Info value={String(visibleLessons.length)} label="Lessons" isDark={isDark} />
              <Info value={learnerCount} label="Learners" isLast isDark={isDark} />
            </View>

            <View className="mt-5">
              <View className="flex-row justify-between">
                <Text className={`text-[16px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Your progress</Text>
                <Text className="text-[15px] font-extrabold text-primary">{percent}%</Text>
              </View>
              <View className="mt-3">
                <ProgressBar value={percent} />
              </View>
            </View>

            <View className={`mt-6 rounded-[18px] border p-4 ${isDark ? "border-[#242A36] bg-[#1B2230]" : "border-border bg-slate-50"}`}>
              <Text className={`text-[18px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>What you will build</Text>
              <Text className={`mt-2 text-[14px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                A practical learning flow around {course.title.toLowerCase()}, with progress tracking, saved lessons, offline recovery, and a final knowledge check.
              </Text>
              <View className="mt-4 gap-3">
                <Outcome icon={Sparkles} title="Production workflow" description="Plan the feature, implement the core path, and polish edge states." isDark={isDark} />
                <Outcome icon={WifiOff} title="Offline-first thinking" description="Prepare downloadable lessons and graceful recovery for blocked or failed files." isDark={isDark} />
                <Outcome icon={ShieldCheck} title="Review-ready finish" description="Use the checklist and quiz to validate the course outcomes." isDark={isDark} />
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className={`text-[21px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Curriculum</Text>
              <Text className={`text-[14px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                {visibleLessons.length} lessons . {durationLabel}
              </Text>
            </View>
            <Text className={`mt-3 border-b pb-2 text-[13px] font-extrabold uppercase tracking-wide text-primary ${isDark ? "border-[#242A36]" : "border-border"}`}>Complete learning path</Text>

            <View>
              {visibleLessons.map((lesson, index) => {
                const complete = !!progress[course.id]?.[lesson.id];
                const downloaded = downloadedLessonIds.has(lesson.id);
                return (
                  <View key={lesson.id} className={`border-b py-3 ${isDark ? "border-[#242A36]" : "border-border"}`}>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={complete ? "Mark lesson incomplete" : "Mark lesson complete"}
                        onPress={() => { markLessonComplete(course.id, lesson.id, !complete).catch(() => undefined); }}
                      >
                        <IconTile icon={complete ? Check : Play} tone={complete ? "green" : "blue"} size={42} />
                      </Pressable>
                      <Link href={{ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: course.id } }} asChild>
                        <Pressable className="min-w-0 flex-1">
                          <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
                            {String(index + 1).padStart(2, "0")}. {lesson.title}
                          </Text>
                          <Text className={`mt-1 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                            {lesson.type} . {lesson.durationMinutes} min {downloaded ? ". Offline" : ""}
                          </Text>
                        </Pressable>
                      </Link>
                      {lesson.id === activeLesson.id ? <Text className={`overflow-hidden rounded-full px-3 py-1.5 text-[12px] font-extrabold text-primary ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}>Resume</Text> : null}
                      {downloaded ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-green-50 px-2.5 py-1">
                          <Check size={11} color="#16A34A" strokeWidth={2.5} />
                          <Text className="text-[11px] font-extrabold text-success">Saved</Text>
                        </View>
                      ) : lesson.downloadUrl ? (
                        <Pressable
                          accessibilityLabel="Download lesson"
                          onPress={() => startDownload(lesson)}
                          disabled={downloadingId === lesson.id}
                          hitSlop={10}
                        >
                          {downloadingId === lesson.id ? <Ellipsis size={20} color="#64748B" /> : <Download size={18} color="#64748B" strokeWidth={2.2} />}
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View className={`absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t px-5 pb-7 pt-3 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="w-[78px]">
            <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{isEnrolled ? "Enrolled" : "Access"}</Text>
            <Text className={`text-[22px] font-black leading-6 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {course.priceLabel}
            </Text>
          </View>
          {isEnrolled ? (
            <Link href={{ pathname: "/lesson/[id]", params: { id: activeLesson.id, courseId: course.id } }} asChild>
              <Pressable className="h-[58px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-primary">
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.4} />
                <Text className="text-[17px] font-extrabold text-white" numberOfLines={1}>
                  Resume lesson {Math.max(1, course.lessons.findIndex((lesson) => lesson.id === activeLesson.id) + 1)}
                </Text>
              </Pressable>
            </Link>
          ) : (
            <View className="flex-1">
              <Button
                label="Enroll now"
                loading={isEnrolling}
                onPress={() => {
                  setIsEnrolling(true);
                  enroll(course.id)
                    .catch(() => undefined)
                    .finally(() => setIsEnrolling(false));
                }}
              />
            </View>
          )}
        </View>
      </View>
    </>
  );
}

function Outcome({
  icon,
  title,
  description,
  isDark,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  isDark: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <IconTile icon={icon} tone="blue" size={38} />
      <View className="min-w-0 flex-1">
        <Text className={`text-[14px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{title}</Text>
        <Text className={`mt-0.5 text-[12px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{description}</Text>
      </View>
    </View>
  );
}

function Info({ value, label, isLast = false, isDark }: { value: string; label: string; isLast?: boolean; isDark: boolean }) {
  return (
    <View className={`flex-1 items-center ${isLast ? "" : isDark ? "border-r border-[#242A36]" : "border-r border-border"}`}>
      <Text className={`text-[18px] font-black ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className={`mt-1 text-center text-[11px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{label}</Text>
    </View>
  );
}
