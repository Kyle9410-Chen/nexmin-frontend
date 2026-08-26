import type { AccessTokenClaims } from "@/types/auth";

function base64Url(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds a structurally valid but unsigned JWT. `jwtDecode` never verifies a
 * signature, and nothing in the frontend does either — only the backend holds
 * the secret — so a dummy one is enough for tests.
 */
export function makeFakeJwt(claims: AccessTokenClaims = {}): string {
  const payload: AccessTokenClaims = {
    sub: "00000000-0000-0000-0000-000000000001",
    email: "member@sdc.nycu.club",
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
    ...claims,
  };
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(payload)}.signature`;
}
