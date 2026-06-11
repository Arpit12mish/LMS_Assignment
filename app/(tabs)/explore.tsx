import { Link } from "expo-router";
import { LegendList, type LegendListRenderItemProps } from "@legendapp/list/react-native";
import { Download, RefreshCw, SlidersHorizontal, WifiOff } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CourseCard } from "@/components/course-card";
import { EmptyState, FullScreenState, OfflineBanner, Pill, ScreenHeader, SearchBox, SkeletonCourseCard } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import type { Course } from "@/types/lms";

export default function ExploreScreen() {
  const { courses, refreshCourses, isLoadingCourses, courseError, isOffline, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(courses.map((course) => course.category))).slice(0, 6)], [courses]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery =
        !needle ||
        course.title.toLowerCase().includes(needle) ||
        course.description.toLowerCase().includes(needle) ||
        String(course.instructor.name).toLowerCase().includes(needle);
      const matchesCategory = category === "All" || course.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, courses, query]);

  const renderItem = useCallback(({ item }: LegendListRenderItemProps<Course>) => <CourseCard course={item} />, []);

  if (isOffline) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`} edges={["top"]}>
        <OfflineBanner label="You are offline - downloaded lessons are still available" />
        <FullScreenState
          icon={WifiOff}
          iconTone="slate"
          title="You're offline"
          message="We can't reach the catalog right now. Your downloaded lessons are still available."
          primaryAction={
            <Link href="/(tabs)/downloads" asChild>
              <Pressable className="h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] bg-primary">
                <Download size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text className="text-[14px] font-extrabold text-white">Go to Downloads</Text>
              </Pressable>
            </Link>
          }
          secondaryAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try loading catalog again"
              onPress={refreshCourses}
              className={`h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] border ${isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border bg-white"}`}
            >
              <RefreshCw size={15} color="#0F172A" strokeWidth={2.2} />
              <Text className="text-[14px] font-extrabold text-ink">Try again</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <ScreenHeader
        eyebrow="Find your next course"
        title="Explore"
        right={
          <Pressable className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
            <SlidersHorizontal size={20} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.3} />
          </Pressable>
        }
      >
        <View>
          <SearchBox value={query} onChangeText={setQuery} placeholder="Search courses, topics..." rightLabel="Sort" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mr-5">
          {categories.map((item) => (
            <View key={item} className="mr-2">
              <Pill
                label={item}
                active={item === category}
                onPress={() => setCategory(item)}
              />
            </View>
          ))}
        </ScrollView>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className={`text-[14px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{filtered.length} courses</Text>
          <Text className={`text-[14px] font-bold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>▥ Most popular</Text>
        </View>
        {courseError ? <Text className="mt-2 text-[13px] font-semibold text-warning">{courseError}</Text> : null}
      </ScreenHeader>
      {isLoadingCourses && courses.length === 0 ? (
        <View className="px-5 pt-4">
          <SkeletonCourseCard />
          <SkeletonCourseCard />
          <SkeletonCourseCard />
        </View>
      ) : (
        <LegendList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          recycleItems
          maintainVisibleContentPosition
          estimatedItemSize={128}
          refreshControl={<RefreshControl refreshing={isLoadingCourses} onRefresh={refreshCourses} tintColor="#2563EB" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 }}
          ListEmptyComponent={
            <EmptyState
              title="No courses found"
              message="Try a different search term or refresh the catalog when your connection is back."
            />
          }
        />
      )}
    </View>
  );
}
