import { beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router";
import { server } from "@/mocks/server";
import ProtectedRoute from "@/components/ProtectedRoute";
import { renderWithProviders, screen } from "@/test/test-utils";
import { clearAllCookies, setLocation } from "@/test/cookies";
import { setAccessToken, setRefreshToken } from "@/lib/token";
import { makeFakeJwt } from "@/test/tokens";

function renderGatedApp() {
  return renderWithProviders(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<p>members only</p>} />
      </Route>
    </Routes>,
    { withAuth: true },
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    clearAllCookies();
    setLocation("http://localhost:5173/");
  });

  it("shows the login dialog instead of the page when signed out", () => {
    renderGatedApp();

    expect(
      screen.getByRole("heading", { name: "Sign in to Nexmin" }),
    ).toBeInTheDocument();
    // Rendering the gate *instead of* the route is what keeps protected
    // queries from firing and 401ing.
    expect(screen.queryByText("members only")).not.toBeInTheDocument();
  });

  it("renders the page once there is a session", () => {
    setAccessToken(makeFakeJwt());
    setRefreshToken("11111111-1111-1111-1111-111111111111");

    renderGatedApp();

    expect(screen.getByText("members only")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sign in to Nexmin" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the session while only the access token is gone", () => {
    // The refresh token is the session; AuthProvider renews the access token in
    // the background rather than ejecting the user. Answered here only so the
    // background renewal stays off the network.
    server.use(
      http.post(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/refresh`,
        () =>
          HttpResponse.json({
            accessToken: makeFakeJwt(),
            refreshToken: "22222222-2222-2222-2222-222222222222",
            expiresIn: 900,
          }),
      ),
    );
    setRefreshToken("11111111-1111-1111-1111-111111111111");

    renderGatedApp();

    expect(screen.getByText("members only")).toBeInTheDocument();
  });
});
