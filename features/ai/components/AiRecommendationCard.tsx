// Contains two export:
//   AiRecommendationCard  — for recommendation results
//   AiSearchResultCard    — for smart search results

import { Link } from "expo-router";
import { ChevronRight, Star } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AiRecommendation, AiSearchResult } from "../ai.types";

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Tag({ label, isDark, tone = "neutral" }: { label: string; isDark: boolean; tone?: "blue" | "neutral" }) {
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${
        tone === "blue"
          ? isDark
            ? "bg-[#0B1D45]"
            : "bg-softBlue"
          : isDark
          ? "bg-[#1B2230]"
          : "bg-slate-50"
      }`}
    >
      <Text
        className={`text-[10px] font-bold ${
          tone === "blue" ? "text-primary" : isDark ? "text-[#D1D5DB]" : "text-slate"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

function ConfidenceBadge({ value, isDark }: { value: number; isDark: boolean }) {
  const isHigh = value >= 80;
  const isMed = value >= 55;
  const color = isHigh ? "text-success" : isMed ? "text-primary" : "text-warning";
  const bg = isHigh
    ? isDark
      ? "bg-[#0D2B1A]"
      : "bg-green-50"
    : isMed
    ? isDark
      ? "bg-[#0B1D45]"
      : "bg-softBlue"
    : isDark
    ? "bg-[#3A2406]"
    : "bg-orange-50";

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-[11px] font-extrabold ${color}`}>{value}%</Text>
    </View>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────────

interface RecommendationCardProps {
  item: AiRecommendation;
  isDark: boolean;
}

export function AiRecommendationCard({ item, isDark }: RecommendationCardProps) {
  return (
    <Link href={{ pathname: "/course/[id]", params: { id: item.courseId } }} asChild>
      <Pressable
        accessibilityRole="button"
        className={`mb-3 rounded-[16px] border p-4 active:opacity-80 ${
          isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className={`text-[15px] font-extrabold leading-5 ${
                isDark ? "text-white" : "text-ink"
              }`}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text
              className={`mt-2 text-[12px] font-semibold leading-4 ${
                isDark ? "text-[#C8D0DC]" : "text-slate"
              }`}
              numberOfLines={3}
            >
              {item.reason}
            </Text>
            {item.tags.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {item.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} label={tag} isDark={isDark} />
                ))}
              </View>
            ) : null}
          </View>
          <View className="items-end gap-2 pl-1">
            <ConfidenceBadge value={item.confidence} isDark={isDark} />
            <ChevronRight size={18} color="#8EA0BC" strokeWidth={2.1} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ── Search result card ─────────────────────────────────────────────────────────

interface SearchResultCardProps {
  item: AiSearchResult;
  isDark: boolean;
}

export function AiSearchResultCard({ item, isDark }: SearchResultCardProps) {
  return (
    <Link href={{ pathname: "/course/[id]", params: { id: item.courseId } }} asChild>
      <Pressable
        accessibilityRole="button"
        className={`mb-3 rounded-[16px] border p-4 active:opacity-80 ${
          isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-[11px] font-extrabold text-warning">
                {item.score}% match
              </Text>
            </View>
            <Text
              className={`mt-1.5 text-[15px] font-extrabold leading-5 ${
                isDark ? "text-white" : "text-ink"
              }`}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text
              className={`mt-1.5 text-[12px] font-semibold leading-4 ${
                isDark ? "text-[#C8D0DC]" : "text-slate"
              }`}
              numberOfLines={2}
            >
              {item.matchReason}
            </Text>
            {item.matchedTopics.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {item.matchedTopics.slice(0, 4).map((topic) => (
                  <Tag key={topic} label={topic} isDark={isDark} tone="blue" />
                ))}
              </View>
            ) : null}
          </View>
          <ChevronRight size={18} color="#8EA0BC" strokeWidth={2.1} />
        </View>
      </Pressable>
    </Link>
  );
}
