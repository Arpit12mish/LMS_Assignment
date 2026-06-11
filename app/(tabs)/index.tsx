import { Link } from "expo-router";
import { ArrowRight, Bookmark, Check, Clock3, Download, Grid2X2, Layers3, Play } from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { CourseCard } from "@/components/course-card";
import { AvatarInitials, CourseArt, IconTile, OfflineBanner, ProgressBar, ScreenHeader, StatTile } from "@/components/ui";
import { calculateCourseProgress, getNextLesson } from "@/services/courses";
import { useAppStore } from "@/store/app-store";
import type { Course, Lesson } from "@/types/lms";

export default function HomeScreen() {
  const { session, courses, enrolled, bookmarks, progress, downloads, isOffline, lastOpenedAt, reminderPreviewDueAt, refreshCourses, isLoadingCourses, preferences } = useAppStore();
  const isDark = preferences.darkMode;

  const continueCourse = useMemo(() => {
    const enrolledCourse = courses.find((course) => enrolled.includes(course.id));
    return enrolledCourse ?? courses[0];
  }, [courses, enrolled]);

  const { enrolledCourseCount, completedLessons, totalLessons, totalProgress } = useMemo(() => {
    const enrolledIds = new Set(enrolled);
    const enrolledCourses = courses.filter((course) => enrolledIds.has(course.id));
    const completed = enrolledCourses.reduce((sum, course) => sum + course.lessons.filter((lesson) => progress[course.id]?.[lesson.id]).length, 0);
    const total = enrolledCourses.reduce((sum, course) => sum + course.lessons.length, 0);
    const progressPercent = enrolledCourses.length
      ? Math.round(enrolledCourses.reduce((sum, course) => sum + calculateCourseProgress(course, progress), 0) / enrolledCourses.length)
      : 0;

    return { enrolledCourseCount: enrolledIds.size, completedLessons: completed, totalLessons: total, totalProgress: progressPercent };
  }, [courses, enrolled, progress]);
  const offlineLessons = downloads.filter((download) => download.status === "downloaded").length;
  const nextLessons = useMemo(
    () =>
      courses
        .map((course) => ({ course, lesson: getNextLesson(course, progress), percent: calculateCourseProgress(course, progress) }))
        .filter(({ lesson }) => lesson)
        .sort((a, b) => {
          const aEnrolled = enrolled.includes(a.course.id) ? 0 : 1;
          const bEnrolled = enrolled.includes(b.course.id) ? 0 : 1;
          return aEnrolled - bEnrolled || b.percent - a.percent;
        })
        .slice(0, 3),
    [courses, enrolled, progress],
  );
  const categoryStats = useMemo(() => {
    const counts = courses.reduce<Record<string, number>>((acc, course) => {
      acc[course.category] = (acc[course.category] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [courses]);
  const continueCompletedLessons = continueCourse?.lessons.filter((lesson) => progress[continueCourse.id]?.[lesson.id]).length ?? 0;
  const continueNextLesson = continueCourse ? getNextLesson(continueCourse, progress) : undefined;
  const continuePercent = continueCourse ? calculateCourseProgress(continueCourse, progress) : 0;
  const continueRemainingMinutes =
    continueCourse?.lessons
      .filter((lesson) => !progress[continueCourse.id]?.[lesson.id])
      .reduce((sum, lesson) => sum + lesson.durationMinutes, 0) ?? 0;
  const remainingHours = Math.floor(continueRemainingMinutes / 60);
  const remainingMinutes = continueRemainingMinutes % 60;

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      {isOffline ? <OfflineBanner /> : null}
      <ScreenHeader surface="white" withBorder minHeight={82}>
        <View className="min-w-0 flex-row items-center gap-3">
          <AvatarInitials name={session?.user.name} uri={session?.user.avatar} size={52} />
          <View className="min-w-0 flex-1">
            <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Good morning</Text>
            <Text className={`text-[20px] font-extrabold leading-6 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
              {session?.user.name ?? "Learner"}
            </Text>
          </View>
        </View>
      </ScreenHeader>

      <ScrollView
        contentContainerClassName="px-5 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={isLoadingCourses} onRefresh={refreshCourses} tintColor="#2563EB" />}
      >
        {continueCourse && continueNextLesson ? (
          <>
            <Text className={`text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Continue learning</Text>
            <View className="mt-3 rounded-[18px] bg-navy p-4">
              <View className="flex-row items-center gap-4">
                <CourseArt size="small" uri={continueCourse.thumbnail} />
                <View className="min-w-0 flex-1">
                  <Text className="text-[11px] font-extrabold uppercase tracking-wide text-blue-200">
                    Lesson {Math.min(continueCompletedLessons + 1, continueCourse.lessons.length)} of {continueCourse.lessons.length}
                  </Text>
                  <Text className="mt-1 text-[17px] font-extrabold leading-5 text-white" numberOfLines={1}>
                    {continueCourse.title}
                  </Text>
                  <Text className="text-[13px] font-semibold text-white/70" numberOfLines={1}>
                    {continueNextLesson.title}
                  </Text>
                </View>
                <Link href={{ pathname: "/lesson/[id]", params: { id: continueNextLesson.id, courseId: continueCourse.id } }} asChild>
                  <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                    <Play size={24} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.4} />
                  </Pressable>
                </Link>
              </View>
              <View className="mt-5 flex-row items-center justify-between">
                <Text className="text-[13px] font-semibold text-white/80">{continuePercent}% complete</Text>
                <Text className="text-[13px] font-semibold text-white/80">
                  {remainingHours ? `${remainingHours}h ` : ""}{remainingMinutes}m left
                </Text>
              </View>
              <View className="mt-2">
                <ProgressBar value={continuePercent} color="bg-white" />
              </View>
            </View>
          </>
        ) : null}

        <View className="mt-5 flex-row gap-3">
          <StatTile icon={Grid2X2} value={String(enrolledCourseCount)} label="Enrolled" tone="blue" />
          <StatTile icon={Check} value={String(completedLessons)} label="Lessons done" tone="green" />
          <StatTile icon={Bookmark} value={String(bookmarks.length)} label="Saved" tone="purple" />
        </View>

        <View className={`mt-5 rounded-[18px] border p-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="flex-row items-center gap-3">
            <IconTile icon={Clock3} tone="orange" size={42} />
            <View className="min-w-0 flex-1">
              <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Last opened</Text>
              <Text className={`mt-0.5 text-[16px] font-extrabold ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
                {formatRelativeTime(lastOpenedAt)}
              </Text>
            </View>
          </View>
          <View className={`mt-3 rounded-[14px] px-3 py-3 ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}>
            <Text className="text-[12px] font-extrabold uppercase tracking-wide text-primary">24h reminder</Text>
            <Text className={`mt-1 text-[13px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
              {reminderPreviewDueAt && reminderPreviewDueAt > Date.now()
                ? `Preview notification in ${formatDuration(Math.ceil((reminderPreviewDueAt - Date.now()) / 1000))}.`
                : "Production reminder is scheduled when the app goes inactive for 24 hours."}
            </Text>
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className={`text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Recommended for you</Text>
          <Link href="/(tabs)/explore" className="text-[13px] font-extrabold text-primary">
            See all
          </Link>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mr-5">
          {courses.slice(0, 3).map((course) => (
            <CourseCard key={course.id} course={course} variant="poster" />
          ))}
        </ScrollView>

        <View className={`mt-7 rounded-[18px] border p-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className={`text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Learning snapshot</Text>
              <Text className={`mt-1 text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{totalProgress}% overall progress</Text>
            </View>
            <IconTile icon={Layers3} tone="blue" size={44} />
          </View>
          <View className="mt-4">
            <ProgressBar value={totalProgress} />
          </View>
          <View className="mt-4 flex-row gap-3">
            <SnapshotMetric value={`${completedLessons}/${totalLessons}`} label="Lessons" isDark={isDark} />
            <SnapshotMetric value={String(bookmarks.length)} label="Saved" isDark={isDark} />
            <SnapshotMetric value={String(offlineLessons)} label="Offline" isDark={isDark} />
          </View>
        </View>

        {nextLessons.length ? (
          <View className="mt-7">
            <View className="flex-row items-center justify-between">
              <Text className={`text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Next up</Text>
              <Link href="/(tabs)/explore" className="text-[13px] font-extrabold text-primary">
                Browse
              </Link>
            </View>
            <View className={`mt-3 overflow-hidden rounded-[18px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
              {nextLessons.map(({ course, lesson }, index) => (
                <LessonPreviewRow
                  key={`${course.id}-${lesson.id}`}
                  course={course}
                  lesson={lesson}
                  isLast={index === nextLessons.length - 1}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
        ) : null}

        {categoryStats.length ? (
          <View className="mt-7">
            <Text className={`text-[20px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Explore by focus</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {categoryStats.map(([category, count]) => (
                <Link key={category} href="/(tabs)/explore" asChild>
                  <Pressable className={`rounded-full border px-4 py-2.5 active:opacity-80 ${isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border bg-white"}`}>
                    <Text className={`text-[13px] font-extrabold ${isDark ? "text-ink" : "text-ink"}`}>
                      {category} <Text className={isDark ? "text-slate" : "text-slate"}>· {count}</Text>
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "This session";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Less than a minute ago";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function SnapshotMetric({ value, label, isDark }: { value: string; label: string; isDark: boolean }) {
  return (
    <View className={`min-w-0 flex-1 rounded-[14px] px-3 py-3 ${isDark ? "bg-[#1B2230]" : "bg-slate-50"}`}>
      <Text className={`text-[18px] font-black ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <Text className={`mt-1 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function LessonPreviewRow({ course, lesson, isLast, isDark }: { course: Course; lesson: Lesson; isLast: boolean; isDark: boolean }) {
  return (
    <Link href={{ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: course.id } }} asChild>
      <Pressable className={`px-4 py-3 active:opacity-80 ${isLast ? "" : isDark ? "border-b border-[#242A36]" : "border-b border-border"}`}>
        <View className="flex-row items-center gap-3">
          <IconTile icon={lesson.type === "video" ? Play : lesson.type === "resource" ? Download : Check} tone={lesson.type === "quiz" ? "green" : "blue"} size={40} />
          <View className="min-w-0 flex-1">
            <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
              {lesson.title}
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <Text className={`min-w-0 flex-1 text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>
                {course.title}
              </Text>
              <View className="flex-row items-center gap-1">
                <Clock3 size={12} color="#8EA0BC" strokeWidth={2.2} />
                <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{lesson.durationMinutes}m</Text>
              </View>
            </View>
          </View>
          <ArrowRight size={18} color="#8EA0BC" strokeWidth={2.2} />
        </View>
      </Pressable>
    </Link>
  );
}
