import { Cpu, Sparkles } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import type { AiMode } from "../ai.types";
import { getSessionCallsLeft } from "../geminiClient";

interface AiModeBannerProps {
  mode: AiMode;
  isDark: boolean;
}

export function AiModeBanner({ mode, isDark }: AiModeBannerProps) {
  const isGemini = mode === "gemini";
  const callsLeft = getSessionCallsLeft();

  return (
    <View
      className={`mb-4 flex-row items-start gap-3 rounded-[16px] border p-4 ${
        isGemini
          ? isDark
            ? "border-green-900 bg-[#0D2B1A]"
            : "border-green-200 bg-green-50"
          : isDark
          ? "border-orange-900 bg-[#3A2406]"
          : "border-orange-200 bg-orange-50"
      }`}
    >
      {isGemini ? (
        <Sparkles size={20} color="#16A34A" strokeWidth={2.3} />
      ) : (
        <Cpu size={20} color="#F59E0B" strokeWidth={2.3} />
      )}
      <View className="min-w-0 flex-1">
        <Text
          className={`text-[14px] font-extrabold ${
            isGemini ? "text-success" : "text-warning"
          }`}
        >
          {isGemini ? "Gemini AI Active" : "Local AI Active"}
        </Text>
        <Text
          className={`mt-0.5 text-[12px] font-semibold leading-4 ${
            isDark ? "text-[#C8D0DC]" : "text-slate"
          }`}
        >
          {isGemini
            ? `${callsLeft} of 5 session calls remaining · Key stored in SecureStore`
            : "Enter your Gemini API key below to unlock AI-powered features."}
        </Text>
      </View>
    </View>
  );
}
