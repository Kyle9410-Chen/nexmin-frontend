import { beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import userEvent from "@testing-library/user-event";
import { server } from "@/mocks/server";
import { useAuth } from "@/lib/auth/authContext";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/lib/token";
import { act, renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { clearAllCookies, setLocation } from "@/test/cookies";
import { makeFakeJwt } from "@/test/tokens";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;
const OLD_REFRESH = "11111111-1111-1111-1111-111111111111";
const NEW_REFRESH = "22222222-2222-2222-2222-222222222222";

function Probe() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span>{isAuthenticated ? "signed in" : "signed out"}</span>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    clearAllCookies();
    setLocation("http://localhost:5173/users");
  });

  it("renews the access token on load when only the refresh token survives", async () => {
    const rotated = makeFakeJwt({ email: "rotated@sdc.nycu.club" });
    const seen: string[] = [];
    server.use(
      http.post(`${BASE}/api/auth/refresh`, async ({ request }) => {
        const body = (await request.json()) as { refreshToken: string };
        seen.push(body.refreshToken);
        return HttpResponse.json({
          accessToken: rotated,
          refreshToken: NEW_REFRESH,
          expiresIn: 900,
        });
      }),
    );
    setRefreshToken(OLD_REFRESH);

    renderWithProviders(<Probe />, { withAuth: true });

    await waitFor(() => expect(getAccessToken()).toBe(rotated));
    // Refresh tokens rotate, so the stored one must be the replacement.
    expect(getRefreshToken()).toBe(NEW_REFRESH);
    expect(seen).toContain(OLD_REFRESH);
    expect(screen.getByText("signed in")).toBeInTheDocument();
  });

  it("clears the session when the refresh token is spent", async () => {
    server.use(
      http.post(`${BASE}/api/auth/refresh`, () =>
        HttpResponse.json(
          {
            title: "Unauthorized",
            status: 401,
            detail: "invalid refresh token",
          },
          {
            status: 401,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );
    setRefreshToken(OLD_REFRESH);

    renderWithProviders(<Probe />, { withAuth: true });

    await waitFor(() =>
      expect(screen.getByText("signed out")).toBeInTheDocument(),
    );
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("leaves a still-valid access token alone", async () => {
    let calls = 0;
    server.use(
      http.post(`${BASE}/api/auth/refresh`, () => {
        calls += 1;
        return HttpResponse.json({
          accessToken: makeFakeJwt(),
          refreshToken: NEW_REFRESH,
          expiresIn: 900,
        });
      }),
    );
    const fresh = makeFakeJwt();
    setAccessToken(fresh);
    setRefreshToken(OLD_REFRESH);

    renderWithProviders(<Probe />, { withAuth: true });

    // Long enough for an immediate refresh to have fired, had one been armed.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    // The timer is armed for ~14 minutes out, not fired now.
    expect(calls).toBe(0);
    expect(getAccessToken()).toBe(fresh);
  });

  it("signs out locally even so, and revokes on the backend", async () => {
    let revoked = false;
    server.use(
      http.post(`${BASE}/api/auth/logout`, () => {
        revoked = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    setAccessToken(makeFakeJwt());
    setRefreshToken(OLD_REFRESH);

    renderWithProviders(<Probe />, { withAuth: true });

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(screen.getByText("signed out")).toBeInTheDocument();
    await waitFor(() => expect(revoked).toBe(true));
  });
});
