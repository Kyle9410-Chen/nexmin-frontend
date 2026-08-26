// =========================
// Auth
//
// Shapes minted by the backend's `internal/jwt`. Access tokens are stateless
// HS256 JWTs (15 min); refresh tokens are opaque row IDs in Postgres (24 h),
// which is what makes revocation possible — never try to decode one.
// =========================

/** Body of `POST /api/auth/refresh`, and the pair the OAuth fragment carries. */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. The JWT's own `exp` is authoritative. */
  expiresIn: number;
}

/**
 * Claims on the access token. `sub` is the user UUID; `email` and `role` come
 * from the caller's membership in the login mailing list at sign-in time.
 */
export interface AccessTokenClaims {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}

/**
 * The `role` claim's admin value, mirroring `RoleAdmin` in the backend's
 * `internal/user/role.go`. It is what `adminMiddleware` requires, so it also
 * decides which controls this app bothers to render.
 */
export const JwtRoleAdmin = "admin";
