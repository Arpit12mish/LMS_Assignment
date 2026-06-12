import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { secureStoreOptions, storageKeys } from "@/services/storage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.freeapi.app";

type ApiOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  auth?: boolean;
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function messageFromPayload(payload: unknown): string {
  return payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
    ? payload.message
    : "Request failed. Please try again.";
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text || "Request failed. Please try again." };
  }
}

async function refreshStoredAccessToken(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(storageKeys.refreshToken, secureStoreOptions);
  if (!refreshToken) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/refresh-token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const payload = (await parseResponse(response)) as Record<string, unknown> | null;
    if (!response.ok || !payload) return false;

    // 4-level deep flatten — matches auth.ts::flattenAuthPayload
    let source: Record<string, unknown> = {};
    let current: unknown = payload;
    for (let depth = 0; depth < 4; depth += 1) {
      if (!current || typeof current !== "object") break;
      source = { ...source, ...(current as Record<string, unknown>) };
      current = (current as Record<string, unknown>).data;
    }
    if (!source.accessToken || typeof source.accessToken !== "string") return false;

    await SecureStore.setItemAsync(storageKeys.accessToken, source.accessToken, secureStoreOptions);
    if (source.refreshToken && typeof source.refreshToken === "string") {
      await SecureStore.setItemAsync(storageKeys.refreshToken, source.refreshToken, secureStoreOptions);
    } else {
      // Server did not rotate the refresh token; delete the now-invalidated one
      await SecureStore.deleteItemAsync(storageKeys.refreshToken, secureStoreOptions);
    }
    return true;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

function friendlyNetworkError(error: Error): string {
  if (error.name === "AbortError") {
    return "Request timed out. Please check your internet connection and try again.";
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch") || msg.includes("econnrefused") || msg.includes("enotfound")) {
    return "Unable to connect to the server. Please check your network and try again.";
  }
  return error.message || "Network request failed.";
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { timeoutMs = 30000, retries = 2, auth = false, headers, ...init } = options;
  let lastError: unknown;
  let refreshedForRequest = false;
  const url = `${API_BASE_URL}${path}`;
  const method = (init.method ?? "GET").toUpperCase();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();

    if (__DEV__) {
      console.log(`[API] ${method} ${url} | platform=${Platform.OS} attempt=${attempt + 1}/${retries + 1} timeout=${timeoutMs}ms`);
    }

    try {
      const token = auth ? await SecureStore.getItemAsync(storageKeys.accessToken, secureStoreOptions) : null;
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
          ...headers,
        },
      });

      clearTimeout(timer);

      if (__DEV__) {
        console.log(`[API] ${method} ${url} → HTTP ${response.status} in ${Date.now() - startMs}ms`);
      }

      const payload = await parseResponse(response);

      if (!response.ok) {
        if (auth && response.status === 401 && !refreshedForRequest && (await refreshStoredAccessToken())) {
          refreshedForRequest = true;
          attempt -= 1;
          continue;
        }

        const message = messageFromPayload(payload);
        throw new ApiError(message, response.status);
      }

      return payload as T;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      if (__DEV__) {
        const elapsed = Date.now() - startMs;
        if (error instanceof Error) {
          console.warn(`[API] ${method} ${url} FAILED in ${elapsed}ms | name=${error.name} message=${error.message} platform=${Platform.OS}`);
        }
      }

      if (error instanceof ApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  if (lastError instanceof Error) {
    throw new ApiError(friendlyNetworkError(lastError));
  }

  throw new ApiError("Unable to connect to the server. Please check your network and try again.");
}

