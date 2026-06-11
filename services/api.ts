import * as SecureStore from "expo-secure-store";
import { storageKeys } from "@/services/storage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.freeapi.app";
const AUTH_TOKEN_KEY = "houseed.auth.token";

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
  const refreshToken = await SecureStore.getItemAsync(storageKeys.refreshToken);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/refresh-token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = (await parseResponse(response)) as {
      accessToken?: string;
      refreshToken?: string;
      data?: { accessToken?: string; refreshToken?: string };
    } | null;

    if (!response.ok || !payload) return false;

    const source = { ...payload, ...(payload.data ?? {}) };
    if (!source.accessToken) return false;

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, source.accessToken);
    if (source.refreshToken) {
      await SecureStore.setItemAsync(storageKeys.refreshToken, source.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { timeoutMs = 10000, retries = 2, auth = false, headers, ...init } = options;
  let lastError: unknown;
  let refreshedForRequest = false;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const token = auth ? await SecureStore.getItemAsync(AUTH_TOKEN_KEY) : null;
      const response = await fetch(`${API_BASE_URL}${path}`, {
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

      if (error instanceof ApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  if (lastError instanceof Error) {
    throw new ApiError(lastError.name === "AbortError" ? "The request timed out." : lastError.message);
  }

  throw new ApiError("Network request failed.");
}

export const authTokenKey = AUTH_TOKEN_KEY;
