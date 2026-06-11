import { Link } from "expo-router";
import { Bookmark, Clock3, Star } from "lucide-react-native";
import React, { memo } from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";
import { CourseArt } from "@/components/ui";
import { calculateCourseProgress, textFromUnknown } from "@/services/courses";
import { useAppStore } from "@/store/app-store";
import type { Course } from "@/types/lms";

interface CourseCardProps {
  course: Course;
  compact?: boolean;
  variant?: "row" | "poster";
}

function BookmarkButton({ saved, onToggle, className, iconSize, color }: { saved: boolean; onToggle: () => void; className: string; iconSize: number; color: string }) {
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggle();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove bookmark" : "Save course"}
      hitSlop={12}
      onPress={handlePress}
      className={className}
    >
      <Bookmark size={iconSize} color={saved ? "#2563EB" : color} fill={saved ? "#2563EB" : "transparent"} strokeWidth={2.4} />
    </Pressable>
  );
}

function CourseMetaRow({ rating, duration, isDark }: { rating: number; duration: string; isDark: boolean }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-row items-center gap-1">
        <Star size={14} color="#F59E0B" fill="#F59E0B" />
        <Text className={`text-[13px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{rating.toFixed(1)}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Clock3 size={13} color="#8EA0BC" />
        <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{duration}</Text>
      </View>
    </View>
  );
}

function CourseCardBase({ course, compact = false, variant = "row" }: CourseCardProps) {
  const { bookmarks, toggleBookmark, progress, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const saved = bookmarks.includes(course.id);
  const percent = calculateCourseProgress(course, progress);
  const instructorName = textFromUnknown(course.instructor.name, "HouseEd mentor");
  const duration = `${Math.floor(course.durationMinutes / 60)}h ${String(course.durationMinutes % 60).padStart(2, "0")}m`;

  const handleBookmark = () => {
    toggleBookmark(course.id).catch(() => undefined);
  };

  if (variant === "poster" && !compact) {
    const posterIconColor = isDark ? "#F1F5F9" : "#0F172A";
    return (
      <Link href={{ pathname: "/course/[id]", params: { id: course.id } }} asChild>
        <Pressable className={`mr-4 w-[222px] overflow-hidden rounded-[16px] border active:opacity-90 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View>
            <CourseArt size="medium" label={course.category} uri={course.thumbnail} />
            <BookmarkButton
              saved={saved}
              onToggle={handleBookmark}
              className={`absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-[13px] ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}
              iconSize={22}
              color={posterIconColor}
            />
          </View>
          <View className="p-4">
            <Text className={`text-[16px] font-extrabold leading-5 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={2}>
              {course.title}
            </Text>
            <View className="mt-4 flex-row items-center justify-between">
              <CourseMetaRow rating={course.rating} duration={duration} isDark={isDark} />
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={{ pathname: "/course/[id]", params: { id: course.id } }} asChild>
      <Pressable className={`mb-3 rounded-[16px] border p-3 active:opacity-90 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
        <View className="flex-row gap-3">
          <CourseArt size="small" uri={course.thumbnail} />
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-extrabold uppercase tracking-wide text-primary" numberOfLines={1}>
                  {course.category}
                </Text>
                <Text className={`mt-1 text-[16px] font-extrabold leading-5 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={2}>
                  {course.title}
                </Text>
                <Text className={`mt-1 text-[13px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>
                  {instructorName}
                </Text>
                <Text className={`mt-2 text-[12px] font-medium leading-4 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={2}>
                  {course.description}
                </Text>
              </View>
              <BookmarkButton
                saved={saved}
                onToggle={handleBookmark}
                className="h-8 w-8 items-center justify-center rounded-full"
                iconSize={20}
                color="#8EA0BC"
              />
            </View>
            <View className="mt-3">
              <CourseMetaRow rating={course.rating} duration={duration} isDark={isDark} />
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <Text className={`overflow-hidden rounded-full px-2 py-1 text-[11px] font-bold ${isDark ? "bg-[#1B2230] text-[#D1D5DB]" : "bg-slate-50 text-slate"}`}>{course.level}</Text>
              {percent > 0 ? <Text className="text-[11px] font-bold text-primary">{percent}% complete</Text> : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export const CourseCard = memo(CourseCardBase);
