import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenHeader } from "@/components/ui";
import type { AiMode, RecommendationInput } from "@/features/ai/ai.types";
import { AiKeySetupCard } from "@/features/ai/components/AiKeySetupCard";
import { AiModeBanner } from "@/features/ai/components/AiModeBanner";
import { AiRecommendationCard, AiSearchResultCard } from "@/features/ai/components/AiRecommendationCard";
import { AiSmartSearchBox } from "@/features/ai/components/AiSmartSearchBox";
import { useAiRecommendations } from "@/features/ai/useAiRecommendations";
import { useAiSmartSearch } from "@/features/ai/useAiSmartSearch";
import { useAppStore } from "@/store/app-store";

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type SkillLevel = (typeof SKILL_LEVELS)[number];

export default function AiScreen() {
  const { courses, bookmarks, enrolled, preferences } = useAppStore();
  const isDark = preferences.darkMode;

  // ── AI mode — updated by AiKeySetupCard on save / clear ───────────────────
  const [aiMode, setAiMode] = useState<AiMode>("local");

  // ── Smart search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Recommendation form state ─────────────────────────────────────────────
  const [goal, setGoal] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Beginner");
  const [interestsRaw, setInterestsRaw] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { result: searchResult, search } = useAiSmartSearch(courses);
  const { result: recResult, recommend } = useAiRecommendations(courses);

  const handleKeyChanged = useCallback((hasKey: boolean) => {
    setAiMode(hasKey ? "gemini" : "local");
  }, []);

  const handleSearch = useCallback(() => {
    search(searchQuery).catch(() => undefined);
  }, [search, searchQuery]);

  const handleRecommend = useCallback(() => {
    const interests = interestsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const input: RecommendationInput = {
      goal: goal.trim().slice(0, 200),
      skillLevel,
      interests,
      hoursPerWeek: Math.max(1, parseInt(hoursPerWeek, 10) || 5),
      bookmarkedIds: bookmarks,
      enrolledIds: enrolled,
      recentSearches: searchQuery ? [searchQuery] : [],
    };
    recommend(input).catch(() => undefined);
  }, [goal, skillLevel, interestsRaw, hoursPerWeek, bookmarks, enrolled, searchQuery, recommend]);

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <ScreenHeader eyebrow="Gemini BYOK · Demo mode" title="AI Assistant" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 pb-14 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Mode banner ──────────────────────────────────────────────── */}
          <AiModeBanner mode={aiMode} isDark={isDark} />

          {/* ── Key setup ────────────────────────────────────────────────── */}
          <AiKeySetupCard isDark={isDark} onKeyChanged={handleKeyChanged} />

          {/* ── Smart search ─────────────────────────────────────────────── */}
          <SectionLabel label="AI Smart Search" isDark={isDark} />
          <Text
            className={`mb-3 text-[13px] font-semibold leading-5 ${
              isDark ? "text-[#C8D0DC]" : "text-slate"
            }`}
          >
            Describe what you want to learn in plain English.
          </Text>

          <AiSmartSearchBox
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSearch={handleSearch}
            loading={searchResult.status === "loading"}
            isDark={isDark}
          />

          {searchResult.status !== "idle" && searchResult.status !== "loading" ? (
            <View className="mt-4">
              <AiResultMeta
                mode={searchResult.mode}
                error={searchResult.error}
                isDark={isDark}
              />
              {searchResult.data?.length === 0 ? (
                <EmptyResults
                  message="No matching courses found. Try a different query."
                  isDark={isDark}
                />
              ) : (
                searchResult.data?.map((item) => (
                  <AiSearchResultCard key={item.courseId} item={item} isDark={isDark} />
                ))
              )}
            </View>
          ) : null}

          {/* ── Recommendations ──────────────────────────────────────────── */}
          <SectionLabel label="Course Recommendations" isDark={isDark} />
          <Text
            className={`mb-4 text-[13px] font-semibold leading-5 ${
              isDark ? "text-[#C8D0DC]" : "text-slate"
            }`}
          >
            Fill in your learning profile and get personalized course picks.
          </Text>

          <View className="gap-3">
            {/* Goal */}
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="My learning goal (e.g. get a frontend job in 3 months)"
              placeholderTextColor="#8EA0BC"
              multiline
              maxLength={200}
              numberOfLines={3}
              textAlignVertical="top"
              className={`min-h-[80px] rounded-[14px] border px-4 py-3 text-[14px] font-semibold ${
                isDark
                  ? "border-[#242A36] bg-[#0B0D12] text-white"
                  : "border-border bg-white text-ink"
              }`}
            />

            {/* Skill level */}
            <View>
              <Text
                className={`mb-2 text-[12px] font-extrabold uppercase tracking-wide ${
                  isDark ? "text-primary" : "text-slate"
                }`}
              >
                Skill Level
              </Text>
              <View className="flex-row gap-2">
                {SKILL_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${level}`}
                    onPress={() => setSkillLevel(level)}
                    className={`flex-1 items-center rounded-[12px] border py-3 ${
                      skillLevel === level
                        ? "border-primary bg-primary"
                        : isDark
                        ? "border-[#242A36] bg-[#0B0D12]"
                        : "border-border bg-white"
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-extrabold ${
                        skillLevel === level
                          ? "text-white"
                          : isDark
                          ? "text-[#C8D0DC]"
                          : "text-slate"
                      }`}
                    >
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Interests */}
            <TextInput
              value={interestsRaw}
              onChangeText={setInterestsRaw}
              placeholder="Interests, comma-separated (e.g. React, APIs, UI)"
              placeholderTextColor="#8EA0BC"
              maxLength={200}
              className={`h-[50px] rounded-[14px] border px-4 text-[14px] font-semibold ${
                isDark
                  ? "border-[#242A36] bg-[#0B0D12] text-white"
                  : "border-border bg-white text-ink"
              }`}
            />

            {/* Hours per week */}
            <TextInput
              value={hoursPerWeek}
              onChangeText={setHoursPerWeek}
              placeholder="Available hours per week (e.g. 5)"
              placeholderTextColor="#8EA0BC"
              keyboardType="numeric"
              maxLength={3}
              className={`h-[50px] rounded-[14px] border px-4 text-[14px] font-semibold ${
                isDark
                  ? "border-[#242A36] bg-[#0B0D12] text-white"
                  : "border-border bg-white text-ink"
              }`}
            />

            {/* Submit */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get AI course recommendations"
              disabled={recResult.status === "loading"}
              onPress={handleRecommend}
              className={`h-[52px] items-center justify-center rounded-[14px] bg-primary ${
                recResult.status === "loading" ? "opacity-60" : ""
              }`}
            >
              {recResult.status === "loading" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[15px] font-extrabold text-white">
                  Get Recommendations
                </Text>
              )}
            </Pressable>
          </View>

          {recResult.status !== "idle" && recResult.status !== "loading" ? (
            <View className="mt-4">
              <AiResultMeta
                mode={recResult.mode}
                error={recResult.error}
                isDark={isDark}
              />
              {recResult.data?.length === 0 ? (
                <EmptyResults
                  message="No recommendations matched your profile. Try updating your goal or interests."
                  isDark={isDark}
                />
              ) : (
                recResult.data?.map((item) => (
                  <AiRecommendationCard
                    key={item.courseId}
                    item={item}
                    isDark={isDark}
                  />
                ))
              )}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Small local helpers ───────────────────────────────────────────────────────

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Text
      className={`mb-1 mt-7 text-[20px] font-extrabold ${
        isDark ? "text-white" : "text-ink"
      }`}
    >
      {label}
    </Text>
  );
}

function AiResultMeta({
  mode,
  error,
  isDark,
}: {
  mode: AiMode;
  error: string | null;
  isDark: boolean;
}) {
  const isGemini = mode === "gemini";
  return (
    <View className="mb-3 gap-1">
      <View
        className={`flex-row items-center gap-2 self-start rounded-full px-3 py-1.5 ${
          isGemini
            ? isDark
              ? "bg-[#0D2B1A]"
              : "bg-green-50"
            : isDark
            ? "bg-[#3A2406]"
            : "bg-orange-50"
        }`}
      >
        <View
          className={`h-2 w-2 rounded-full ${
            isGemini ? "bg-success" : "bg-warning"
          }`}
        />
        <Text
          className={`text-[11px] font-extrabold ${
            isGemini ? "text-success" : "text-warning"
          }`}
        >
          {isGemini ? "Gemini AI results" : "Local AI fallback active"}
        </Text>
      </View>
      {error ? (
        <Text className="text-[11px] font-semibold leading-4 text-warning">
          {error} — showing local results instead.
        </Text>
      ) : null}
    </View>
  );
}

function EmptyResults({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <View
      className={`items-center rounded-[16px] border p-6 ${
        isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"
      }`}
    >
      <Text
        className={`text-center text-[14px] font-semibold ${
          isDark ? "text-[#C8D0DC]" : "text-slate"
        }`}
      >
        {message}
      </Text>
    </View>
  );
}
