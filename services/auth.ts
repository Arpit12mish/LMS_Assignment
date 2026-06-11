import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, ApiError, apiFetch, authTokenKey } from "@/services/api";
import { readJson, storageKeys, writeJson } from "@/services/storage";
import type { AuthSession, UserProfile } from "@/types/lms";

interface ApiUserPayload {
  id?: string | number;
  _id?: string | number;
  name?: unknown;
  fullName?: unknown;
  username?: unknown;
  email?: unknown;
  avatar?: string | { url?: string };
  isEmailVerified?: boolean;
}

interface AuthResponse {
  data?: {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
    user?: ApiUserPayload;
    data?: AuthResponse["data"];
  };
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: ApiUserPayload;
}

interface AuthSource {
  accessToken?: unknown;
  token?: unknown;
  refreshToken?: unknown;
  user?: unknown;
}

interface MessageResponse {
  data?: unknown;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

function avatarFromPayload(avatar: ApiUserPayload["avatar"]): string | undefined {
  if (typeof avatar === "string" && avatar.trim()) return avatar;
  if (avatar && typeof avatar === "object" && typeof avatar.url === "string" && avatar.url.trim()) return avatar.url;
  return undefined;
}

function isApiUserPayload(value: unknown): value is ApiUserPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["id", "_id", "email", "username", "name", "fullName"].some((key) => key in record);
}

function flattenAuthPayload(payload: AuthResponse): AuthSource {
  let source: AuthSource = {};
  let current: unknown = payload;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;

    const record = current as Record<string, unknown>;
    source = { ...source, ...record };
    current = record.data;
  }

  return source;
}

function userFromPayload(payload: AuthResponse, source: AuthSource): ApiUserPayload | undefined {
  if (isApiUserPayload(source.user)) return source.user;
  return isApiUserPayload(payload.data) ? payload.data : undefined;
}

function textFromUnknown(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const record = value as { title?: unknown; first?: unknown; last?: unknown; name?: unknown };
    const name = [record.title, record.first, record.last]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ")
      .trim();
    if (name) return name;
    return textFromUnknown(record.name, fallback);
  }
  return fallback;
}

const normalizeUser = (email: string, user?: ApiUserPayload): UserProfile => {
  const resolvedEmail = textFromUnknown(user?.email, email);
  const username = textFromUnknown(user?.username, resolvedEmail.split("@")[0]);

  return {
    id: String(user?._id ?? user?.id ?? username ?? resolvedEmail),
    name: textFromUnknown(user?.fullName) || textFromUnknown(user?.name) || username || resolvedEmail.split("@")[0] || "Learner",
    email: resolvedEmail,
    avatar: avatarFromPayload(user?.avatar),
    username,
    isEmailVerified: !!user?.isEmailVerified,
  };
};

const normalizeSession = (payload: AuthResponse, email: string): AuthSession => {
  const source = flattenAuthPayload(payload);
  const token = textFromUnknown(source.accessToken) || textFromUnknown(source.token);
  const refreshToken = textFromUnknown(source.refreshToken);

  if (!token) {
    throw new ApiError("Authentication succeeded but no access token was returned.");
  }

  return {
    token,
    refreshToken: refreshToken || undefined,
    user: normalizeUser(email, userFromPayload(payload, source)),
  };
};

export async function persistSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(authTokenKey, session.token);
  if (session.refreshToken) {
    await SecureStore.setItemAsync(storageKeys.refreshToken, session.refreshToken);
  } else {
    await SecureStore.deleteItemAsync(storageKeys.refreshToken);
  }
  await writeJson(storageKeys.authUser, session.user);
}

async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(authTokenKey);
  await SecureStore.deleteItemAsync(storageKeys.refreshToken);
  await writeJson<UserProfile | null>(storageKeys.authUser, null);
}

async function refreshSession(email: string, refreshToken: string): Promise<AuthSession> {
  const payload = await apiFetch<AuthResponse>("/api/v1/users/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    retries: 1,
  });
  const session = normalizeSession(payload, email);
  await persistSession(session);
  return session;
}

function deriveUsername(value: string): string {
  return value.includes("@") ? value.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") || value : value.trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(accessToken: string): UserProfile {
  const payload = decodeJwtPayload(accessToken);
  const email = textFromUnknown(payload?.email, "google.user@houseed.app");
  const username = textFromUnknown(payload?.username, deriveUsername(email));
  const id = textFromUnknown(payload?._id) || textFromUnknown(payload?.id) || username || email;

  return {
    id,
    name: username || email.split("@")[0] || "Google learner",
    email,
    username,
  };
}

export async function persistTokenSession(accessToken: string, refreshToken?: string): Promise<AuthSession> {
  const provisionalSession: AuthSession = {
    token: accessToken,
    refreshToken,
    user: userFromToken(accessToken),
  };
  await persistSession(provisionalSession);

  try {
    const validSession = await validateSession(provisionalSession);
    await persistSession(validSession);
    return validSession;
  } catch {
    return provisionalSession;
  }
}

async function validateSession(session: AuthSession): Promise<AuthSession> {
  const payload = await apiFetch<AuthResponse>("/api/v1/users/current-user", {
    auth: true,
    retries: 0,
  });
  const source = flattenAuthPayload(payload);
  const latestToken = (await SecureStore.getItemAsync(authTokenKey)) ?? session.token;
  const latestRefreshToken = (await SecureStore.getItemAsync(storageKeys.refreshToken)) ?? session.refreshToken;

  return {
    ...session,
    token: latestToken,
    refreshToken: latestRefreshToken,
    user: normalizeUser(session.user.email, userFromPayload(payload, source) ?? session.user),
  };
}

export async function restoreSession(): Promise<AuthSession | null> {
  const token = await SecureStore.getItemAsync(authTokenKey);
  if (!token) return null;

  const refreshToken = await SecureStore.getItemAsync(storageKeys.refreshToken);
  const user = await readJson<UserProfile | null>(storageKeys.authUser, null);
  if (!user) {
    await clearSession();
    return null;
  }

  const localSession: AuthSession = { token, refreshToken: refreshToken ?? undefined, user };

  try {
    const validSession = await validateSession(localSession);
    await persistSession(validSession);
    return validSession;
  } catch (error) {
    if (refreshToken && error instanceof ApiError && error.status === 401) {
      try {
        return await refreshSession(user.email, refreshToken);
      } catch {
        await clearSession();
        return null;
      }
    }

    if (error instanceof ApiError && (!error.status || error.status >= 500)) {
      return localSession;
    }

    await clearSession();
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const username = deriveUsername(email);
  const payload = await apiFetch<AuthResponse>("/api/v1/users/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    retries: 1,
  });
  const session = normalizeSession(payload, email);
  await persistSession(session);
  return session;
}

export async function register(name: string, email: string, password: string): Promise<AuthSession> {
  const username = deriveUsername(email);

  try {
    const payload = await apiFetch<AuthResponse>("/api/v1/users/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, role: "USER" }),
      retries: 1,
    });

    try {
      const session = normalizeSession(payload, email);
      await persistSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.message.includes("no access token")) {
        return await login(email, password);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 409 || /already|exist/i.test(error.message))) {
      return await login(email, password);
    }
    throw error;
  }
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE_URL}/api/v1/users/google`;
}

export async function refreshCurrentSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    throw new ApiError("No refresh token is available for this session.");
  }

  return await refreshSession(session.user.email, session.refreshToken);
}

export async function verifyEmail(verificationToken: string): Promise<string> {
  const payload = await apiFetch<MessageResponse>(`/api/v1/users/verify-email/${encodeURIComponent(verificationToken)}`, {
    method: "GET",
    retries: 1,
  });
  return payload.message ?? "Email verified successfully.";
}

export async function forgotPassword(email: string): Promise<string> {
  const payload = await apiFetch<MessageResponse>("/api/v1/users/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    retries: 1,
  });
  return payload.message ?? "Password reset email sent.";
}

export async function resetForgottenPassword(resetToken: string, newPassword: string): Promise<string> {
  const payload = await apiFetch<MessageResponse>(`/api/v1/users/reset-password/${encodeURIComponent(resetToken)}`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
    retries: 1,
  });
  return payload.message ?? "Password reset successfully.";
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<string> {
  const payload = await apiFetch<MessageResponse>("/api/v1/users/change-password", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ oldPassword, newPassword }),
    retries: 1,
  });
  return payload.message ?? "Password changed successfully.";
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/users/logout", {
    method: "POST",
    auth: true,
    retries: 0,
  }).catch(() => undefined);
  await clearSession();
}
