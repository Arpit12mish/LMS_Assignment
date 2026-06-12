// ─── Gemini API key storage ────────────────────────────────────────────────
// The key is stored in Expo SecureStore with the same device-bound, unlock-
// gated options used for auth tokens.  It is never logged, never sent to any
// proxy, and never stored in AsyncStorage or .env files.
//
// ⚠  Production architecture: React Native → Backend Proxy → Gemini API
//    Storing the key on-device is acceptable only for demo / BYOK use.

import * as SecureStore from "expo-secure-store";
import { secureStoreOptions } from "@/services/storage";

const STORE_KEY = "houseed.ai.gemini_key";

export async function loadGeminiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(STORE_KEY, secureStoreOptions);
}

export async function saveGeminiKey(rawKey: string): Promise<void> {
  const trimmed = rawKey.trim();
  if (!trimmed) throw new Error("API key cannot be empty.");
  await SecureStore.setItemAsync(STORE_KEY, trimmed, secureStoreOptions);
}

export async function clearGeminiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY, secureStoreOptions);
}

/** Returns a display-safe masked version — never expose the real key in UI */
export function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}${"•".repeat(Math.min(24, key.length - 8))}${key.slice(-4)}`;
}

/**
 * Gemini AI Studio keys always start with "AIza".
 * Returns false for Cloud API keys or random strings — used to show a format
 * warning before the user wastes a network call.
 */
export function looksLikeGeminiKey(key: string): boolean {
  return key.trim().startsWith("AIza");
}
