import { Link } from "expo-router";
import { Bookmark, ChevronRight, Download, FileText, Play, Search, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { CourseCard } from "@/components/course-card";
import { FullScreenState, IconTile, OfflineBanner, Pill, ScreenHeader, SearchBox } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

export default function SavedScreen() {
  const { courses, bookmarks, isOffline, refreshCourses, isLoadingCourses, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : 20;
  const [query, setQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  const allSavedCourses = useMemo(() => courses.filter((course) => bookmarks.includes(course.id)), [bookmarks, courses]);
  const savedCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allSavedCourses;
    return allSavedCourses.filter(
      (course) =>
        course.title.toLowerCase().includes(needle) ||
        course.description.toLowerCase().includes(needle) ||
        course.instructor.name.toLowerCase().includes(needle),
    );
  }, [allSavedCourses, query]);

  const savedLessons = useMemo(() => allSavedCourses.flatMap((course) => course.lessons), [allSavedCourses]);
  const savedResources = useMemo(
    () => savedLessons.filter((lesson) => lesson.type === "article" || lesson.type === "resource"),
    [savedLessons],
  );

  const toggleSearch = () => {
    if (searchVisible) {
      setQuery("");
    }
    setSearchVisible((v) => !v);
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <ScreenHeader
        eyebrow="Your bookmarked library"
        title="Saved"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searchVisible ? "Close search" : "Search saved courses"}
            onPress={toggleSearch}
            className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}
          >
            {searchVisible ? <X size={20} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.3} /> : <Search size={21} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.2} />}
          </Pressable>
        }
      >
        {searchVisible ? (
          <View className="mb-3">
            <SearchBox value={query} onChangeText={setQuery} placeholder="Search saved courses..." autoFocus />
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mr-5">
          <View className="mr-2">
            <Pill label={`Courses · ${allSavedCourses.length}`} active />
          </View>
          <View className="mr-2">
            <Pill label={`Lessons · ${savedLessons.length}`} />
          </View>
          <View className="mr-2">
            <Pill label={`Resources · ${savedResources.length}`} />
          </View>
        </ScrollView>
      </ScreenHeader>
      {isOffline ? <OfflineBanner label="You are offline - showing saved content" /> : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 28, paddingTop: 14 }}
        refreshControl={<RefreshControl refreshing={isLoadingCourses} onRefresh={refreshCourses} tintColor="#2563EB" />}
      >
        <View>
          {savedCourses.length ? (
            savedCourses.map((course) => <CourseCard key={course.id} course={course} compact />)
          ) : query.trim() ? (
            <FullScreenState
              icon={Search}
              iconTone="slate"
              title="No matches"
              message={`No saved courses match "${query.trim()}". Try a different search term.`}
            />
          ) : (
            <FullScreenState
              icon={Bookmark}
              iconTone="blue"
              title="Nothing saved yet"
              message={
                isOffline
                  ? "You're offline and there are no bookmarked courses saved on this device."
                  : "Bookmark any course or lesson to keep it here for quick access."
              }
              primaryAction={
                <Link href={isOffline ? "/(tabs)/downloads" : "/(tabs)/explore"} asChild>
                  <Pressable className="h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] bg-primary">
                    {isOffline ? <Download size={16} color="#FFFFFF" strokeWidth={2.3} /> : null}
                    <Text className="text-[14px] font-extrabold text-white">
                      {isOffline ? "Go to Downloads" : "Browse courses"}
                    </Text>
                  </Pressable>
                </Link>
              }
            />
          )}
        </View>

        {savedLessons.length ? (
          <>
            <Text className={`mt-3 text-[16px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Saved lessons</Text>
            <View className={`mt-3 rounded-[16px] border px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
              {savedLessons.slice(0, 6).map((lesson, index) => (
                <Link key={lesson.id} href={{ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: lesson.courseId } }} asChild>
                  <Pressable className={`flex-row items-center gap-3 border-b py-3 last:border-b-0 ${isDark ? "border-[#242A36]" : "border-border"}`}>
                    <IconTile
                      icon={lesson.type === "article" || lesson.type === "resource" ? FileText : Play}
                      tone={lesson.type === "article" || lesson.type === "resource" ? "purple" : "blue"}
                      size={34}
                    />
                    <View className="min-w-0 flex-1">
                      <Text className={`text-[14px] font-extrabold ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1}>
                        {String(index + 1).padStart(2, "0")}. {lesson.title}
                      </Text>
                      <Text className={`text-[11px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
                        {lesson.type} . {lesson.durationMinutes} min
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#8EA0BC" strokeWidth={2.1} />
                  </Pressable>
                </Link>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
