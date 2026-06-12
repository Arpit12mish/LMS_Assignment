// ─── Gemini API client ────────────────────────────────────────────────────────
// Uses direct fetch for Expo compatibility (no Node SDK).
//
// SECURITY: the API key is passed via the x-goog-api-key header — never in the
// URL query string, never in console logs, never stored outside SecureStore.
//
// Cost / free-tier controls:
//   SESSION_CALL_LIMIT  = 5    max real AI calls per app session (resets on restart)
//   maxOutputTokens     = 1024 keeps response tokens small
//   temperature         = 0.2  deterministic + token-efficient
//   Test calls bypass the session counter (minimal 20-token probe)

import type { GeminiRecommendationResponse, GeminiSearchResponse } from "./ai.types";

// gemini-2.0-flash-lite is the stable free-tier model for AI Studio keys.
// gemini-1.5-flash is deprecated (404 on v1beta as of mid-2026).
// gemini-2.0-flash has per-region quota limits that produce false 429s on new keys.
export const GEMINI_MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ── Session call counter ──────────────────────────────────────────────────────
// Module-level only — never persisted, resets on app restart.
let _sessionCallCount = 0;
const SESSION_CALL_LIMIT = 5;

export function getSessionCallsLeft(): number {
  return Math.max(0, SESSION_CALL_LIMIT - _sessionCallCount);
}

export function getSessionCallCount(): number {
  return _sessionCallCount;
}

// ── Structured Gemini error shape ─────────────────────────────────────────────
interface GeminiErrorEnvelope {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: unknown[];
  };
}

// ── Error parser ──────────────────────────────────────────────────────────────
// Reads the structured JSON error Gemini always returns and maps it to a
// human-readable message.  Only safe fields (status, code, model) are logged.
function parseGeminiError(httpStatus: number, bodyText: string): Error {
  let envelope: GeminiErrorEnvelope = {};
  try {
    envelope = JSON.parse(bodyText) as GeminiErrorEnvelope;
  } catch {
    // body is not JSON — fall through with defaults
  }

  const geminiStatus = envelope.error?.status ?? "";
  const geminiMsg = (envelope.error?.message ?? bodyText).slice(0, 200);

  if (__DEV__) {
    // Safe log — status codes and message only, never the API key or headers
    console.warn("[Gemini]", {
      httpStatus,
      geminiStatus,
      model: GEMINI_MODEL,
      message: geminiMsg,
    });
  }

  // Map by Gemini status string first (most specific), then by HTTP code.
  if (geminiStatus === "PERMISSION_DENIED" || httpStatus === 403) {
    return new Error(
      "Gemini API key is invalid or this key does not have access to the Generative Language API. " +
        "Get a fresh key from aistudio.google.com, or check that the API is enabled in your Google Cloud project."
    );
  }
  if (geminiStatus === "UNAUTHENTICATED" || httpStatus === 401) {
    return new Error(
      "Gemini authentication failed. Your API key may be expired or missing. " +
        "Create a new key at aistudio.google.com."
    );
  }
  if (geminiStatus === "RESOURCE_EXHAUSTED" || httpStatus === 429) {
    return new Error(
      "Gemini quota exhausted for this key. Wait a minute and retry, or check your quota at console.cloud.google.com."
    );
  }
  if (geminiStatus === "FAILED_PRECONDITION") {
    return new Error(
      "Gemini API is not enabled for this Google Cloud project. " +
        "Either use an AI Studio key (aistudio.google.com) or enable 'Generative Language API' in Cloud Console."
    );
  }
  if (geminiStatus === "INVALID_ARGUMENT" || httpStatus === 400) {
    return new Error(`Gemini rejected the request: ${geminiMsg}`);
  }
  if (geminiStatus === "NOT_FOUND" || httpStatus === 404) {
    return new Error(
      `Gemini model '${GEMINI_MODEL}' was not found. ` +
        "The model may not be available for your key tier or region."
    );
  }
  if (httpStatus >= 500) {
    return new Error("Gemini server is temporarily unavailable. Please try again in a moment.");
  }

  return new Error(`Gemini error (HTTP ${httpStatus} / ${geminiStatus || "unknown"}): ${geminiMsg}`);
}

// ── Core fetch — shared by session calls and the key-test probe ───────────────
// apiKey is passed via header only, never logged or put in the URL.
async function rawGeminiFetch(
  apiKey: string,
  prompt: string,
  maxOutputTokens: number
): Promise<string> {
  const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens,
      // Force raw JSON output — prevents Gemini from wrapping the response in
      // markdown code fences (```json ... ```) even when the prompt says not to.
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-goog-api-key": apiKey, // header — not logged, not in URL
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const bodyText = await response.text();
      throw parseGeminiError(response.status, bodyText);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const text = extractText(payload);
    if (!text.trim()) throw new Error("Gemini returned an empty response. Try again.");
    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Gemini request timed out. Check your network connection and try again.");
    }
    throw err;
  }
}

// ── Session-tracked call (counts against the per-session limit) ───────────────
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  if (_sessionCallCount >= SESSION_CALL_LIMIT) {
    throw new Error(
      `Session AI call limit (${SESSION_CALL_LIMIT}) reached. Restart the app to reset the counter.`
    );
  }
  _sessionCallCount += 1;
  return rawGeminiFetch(apiKey, prompt, 1024);
}

// ── Response parsing helpers ──────────────────────────────────────────────────
type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function extractText(payload: Record<string, unknown>): string {
  try {
    return (payload as GeminiPayload).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

/** Strip markdown fences and extract the first JSON object or array. */
function extractJsonBlock(raw: string): string {
  // Handle any fence label (```json, ```JSON, ```js, bare ```, etc.)
  const fenced = raw.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  // Extract first JSON object
  const objStart = raw.indexOf("{");
  const objEnd = raw.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) return raw.slice(objStart, objEnd + 1);
  // Extract first JSON array
  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) return raw.slice(arrStart, arrEnd + 1);
  return raw.trim();
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function callGeminiRecommendations(
  apiKey: string,
  prompt: string
): Promise<GeminiRecommendationResponse> {
  const raw = await callGemini(apiKey, prompt);
  const json = extractJsonBlock(raw);
  let parsed: GeminiRecommendationResponse;
  try {
    parsed = JSON.parse(json) as GeminiRecommendationResponse;
  } catch {
    throw new Error("Gemini response could not be parsed as JSON. Local fallback will be used.");
  }
  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("Gemini returned an unexpected JSON structure for recommendations.");
  }
  return parsed;
}

export async function callGeminiSearch(
  apiKey: string,
  prompt: string
): Promise<GeminiSearchResponse> {
  const raw = await callGemini(apiKey, prompt);
  const json = extractJsonBlock(raw);
  let parsed: GeminiSearchResponse;
  try {
    parsed = JSON.parse(json) as GeminiSearchResponse;
  } catch {
    throw new Error("Gemini response could not be parsed as JSON. Local fallback will be used.");
  }
  if (!Array.isArray(parsed.results)) {
    throw new Error("Gemini returned an unexpected JSON structure for search results.");
  }
  return parsed;
}

/**
 * Validates an API key with a minimal request.
 * Does NOT count against the session call limit.
 * Sends the smallest possible payload (20 tokens max).
 */
export async function testGeminiKey(apiKey: string): Promise<void> {
  const probe = `Reply with only this JSON and nothing else: {"ok":true}`;
  // rawGeminiFetch throws on any non-2xx status — reaching this line means the key
  // authenticated successfully, so treat HTTP 200 as a valid key regardless of
  // whether the model formatted its output exactly as asked.
  const raw = await rawGeminiFetch(apiKey, probe, 20);
  try {
    const json = extractJsonBlock(raw);
    const parsed = JSON.parse(json) as { ok?: unknown };
    if (parsed.ok !== true) {
      // Model responded 200 but didn't follow the JSON instruction — key is valid.
    }
  } catch {
    // JSON parse failed but HTTP 200 was received — key is valid.
  }
}
