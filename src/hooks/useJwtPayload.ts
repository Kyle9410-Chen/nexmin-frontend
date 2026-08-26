import { useMemo } from "react";
import { useCookies } from "react-cookie";
import { jwtDecode } from "jwt-decode";
import type { AccessTokenClaims } from "@/types/auth";

/** Reads the cookie through `useCookies` so it re-renders when the token changes. */
export function useJwtPayload(): AccessTokenClaims | null {
  const [cookies] = useCookies(["accessToken"]);
  const token: string | undefined = cookies.accessToken;

  return useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode<AccessTokenClaims>(token);
    } catch {
      // A malformed cookie should not take the whole app down.
      return null;
    }
  }, [token]);
}
