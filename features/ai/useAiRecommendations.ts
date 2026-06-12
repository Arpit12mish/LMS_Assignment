// ─── AI recommendations hook ──────────────────────────────────────────────────
// Calls Gemini when a key is available; falls back to the local engine silently.
// recommend() is called explicitly on button press.

import { useCallback, useState } from "react";
import type { Course } from "@/types/lms";
import type { AiRecommendation, AiResult, RecommendationInput } from "./ai.types";
import { loadGeminiKey } from "./aiKeyStorage";
import { buildRecommendationPrompt } from "./aiPromptBuilder";
import { callGeminiRecommendations, getSessionCallsLeft } from "./geminiClient";
import { localRecommend } from "./localRecommendationEngine";

const IDLE: AiResult<AiRecommendation[]> = {
  data: null,
  status: "idle",
  error: null,
  mode: "local",
};

export function useAiRecommendations(courses: Course[]) {
  const [result, setResult] = useState<AiResult<AiRecommendation[]>>(IDLE);

  const recommend = useCallback(
    async (input: RecommendationInput) => {
      setResult((prev) => ({ ...prev, status: "loading", error: null }));

      // ── Try Gemini ──────────────────────────────────────────────────────────
      try {
        const apiKey = await loadGeminiKey();
        if (apiKey && getSessionCallsLeft() > 0) {
          const prompt = buildRecommendationPrompt(input, courses);
          const response = await callGeminiRecommendations(apiKey, prompt);
          setResult({ data: response.recommendations ?? [], status: "success", error: null, mode: "gemini" });
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gemini unavailable.";
        const local = localRecommend(input, courses);
        setResult({ data: local, status: "fallback", error: message, mode: "local" });
        return;
      }

      // ── Local fallback ──────────────────────────────────────────────────────
      const local = localRecommend(input, courses);
      setResult({ data: local, status: "fallback", error: null, mode: "local" });
    },
    [courses]
  );

  const reset = useCallback(() => setResult(IDLE), []);

  return { result, recommend, reset };
}
