import { Cookies } from "react-cookie";

const cookies = new Cookies();

/**
 * Refresh token lifetime. The backend does not report it — the OAuth fragment
 * carries only `expiresIn` for the access token — so it is mirrored here from
 * `refreshTokenTTL` in the backend's `cmd/backend/main.go`.
 */
export const REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function getAccessToken(): string | null {
  return cookies.get("accessToken") ?? null;
}

export function setAccessToken(token: string, expires?: Date): void {
  cookies.set("accessToken", token, { path: "/", expires });
}

export function clearAccessToken(): void {
  cookies.remove("accessToken", { path: "/" });
}

export function getRefreshToken(): string | null {
  return cookies.get("refreshToken") ?? null;
}

export function setRefreshToken(token: string, expires?: Date): void {
  cookies.set("refreshToken", token, { path: "/", expires });
}

export function clearRefreshToken(): void {
  cookies.remove("refreshToken", { path: "/" });
}

export function clearTokens(): void {
  clearAccessToken();
  clearRefreshToken();
}
