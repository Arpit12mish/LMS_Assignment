// ─── AI feature types ───────────────────────────────────────────────────────
// No API keys, no secrets.  All runtime secrets live in SecureStore only.

export type AiMode = "gemini" | "local";

export type AiCallStatus = "idle" | "loading" | "success" | "error" | "fallback";

// Gemini API response shapes ─────────────────────────────────────────────────

export interface AiRecommendation {
  courseId: string;
  title: string;
  reason: string;
  /** 0–100 */
  confidence: number;
  tags: string[];
}

export interface AiSearchResult {
  courseId: string;
  title: string;
  matchReason: string;
  /** 0–100 */
  score: number;
  matchedTopics: string[];
}

export interface GeminiRecommendationResponse {
  recommendations: AiRecommendation[];
}

export interface GeminiSearchResponse {
  results: AiSearchResult[];
}

// Hook input / output ─────────────────────────────────────────────────────────

export interface RecommendationInput {
  goal: string;
  skillLevel: "Beginner" | "Intermediate" | "Advanced";
  /** Max 5, enforced before sending to Gemini */
  interests: string[];
  hoursPerWeek: number;
  bookmarkedIds: string[];
  enrolledIds: string[];
  recentSearches: string[];
}

export interface AiResult<T> {
  data: T | null;
  status: AiCallStatus;
  /** Non-null on error or when Gemini fell back to local */
  error: string | null;
  mode: AiMode;
}
