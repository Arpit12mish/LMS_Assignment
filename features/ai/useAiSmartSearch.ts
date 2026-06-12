// ─── AI smart search hook ─────────────────────────────────────────────────────
// Calls Gemini when a key is available and there are session calls left;
// otherwise falls back silently to the local keyword engine.
// search() is called explicitly on button press, not on every keystroke.

import { useCallback, useState } from "react";
import type { Course } from "@/types/lms";
import type { AiResult, AiSearchResult } from "./ai.types";
import { loadGeminiKey } from "./aiKeyStorage";
import { buildSmartSearchPrompt } from "./aiPromptBuilder";
import { callGeminiSearch, getSessionCallsLeft } from "./geminiClient";
import { localSmartSearch } from "./localSmartSearchEngine";

const IDLE: AiResult<AiSearchResult[]> = {
  data: null,
  status: "idle",
  error: null,
  mode: "local",
};

export function useAiSmartSearch(courses: Course[]) {
  const [result, setResult] = useState<AiResult<AiSearchResult[]>>(IDLE);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim().slice(0, 300);
      if (!trimmed) {
        setResult(IDLE);
        return;
      }

      setResult((prev) => ({ ...prev, status: "loading", error: null }));

      // ── Try Gemini ──────────────────────────────────────────────────────────
      try {
        const apiKey = await loadGeminiKey();
        if (apiKey && getSessionCallsLeft() > 0) {
          const prompt = buildSmartSearchPrompt(trimmed, courses);
          const response = await callGeminiSearch(apiKey, prompt);
          setResult({ data: response.results ?? [], status: "success", error: null, mode: "gemini" });
          return;
        }
      } catch (err) {
        // Gemini failed — fall back to local and surface the error message
        const message = err instanceof Error ? err.message : "Gemini unavailable.";
        const local = localSmartSearch(trimmed, courses);
        setResult({ data: local, status: "fallback", error: message, mode: "local" });
        return;
      }

      // ── Local fallback (no key or calls exhausted) ──────────────────────────
      const local = localSmartSearch(trimmed, courses);
      setResult({ data: local, status: "fallback", error: null, mode: "local" });
    },
    [courses]
  );

  const reset = useCallback(() => setResult(IDLE), []);

  return { result, search, reset };
}
