import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeAuthFragment } from "@/lib/auth/authFragment";
import { getAccessToken, getRefreshToken } from "@/lib/token";
import { clearAllCookies, setLocation } from "@/test/cookies";
import { makeFakeJwt } from "@/test/tokens";

const REFRESH_ID = "11111111-1111-1111-1111-111111111111";

describe("consumeAuthFragment", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearAllCookies();
    replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores both tokens and navigates to the round-tripped redirect", () => {
    const accessToken = makeFakeJwt();
    setLocation(
      `http://localhost:5173/#accessToken=${accessToken}&refreshToken=${REFRESH_ID}&expiresIn=900&redirect=%2Fusers`,
    );

    expect(consumeAuthFragment()).toEqual({ error: null });
    expect(getAccessToken()).toBe(accessToken);
    expect(getRefreshToken()).toBe(REFRESH_ID);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/users");
  });

  it("falls back to the root when the fragment carries no redirect", () => {
    setLocation(
      `http://localhost:5173/#accessToken=${makeFakeJwt()}&refreshToken=${REFRESH_ID}&expiresIn=900`,
    );

    expect(consumeAuthFragment()).toEqual({ error: null });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
  });

  it("reports the backend's error reason and stores nothing", () => {
    setLocation("http://localhost:5173/#error=not_a_member");

    expect(consumeAuthFragment()).toEqual({ error: "not_a_member" });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    // The reason must not linger in the URL through a reload.
    expect(replaceState).toHaveBeenCalledWith(null, "", "/");
  });

  it("leaves an ordinary anchor fragment alone", () => {
    setLocation("http://localhost:5173/docs#installation");

    expect(consumeAuthFragment()).toEqual({ error: null });
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("does nothing when there is no fragment at all", () => {
    setLocation("http://localhost:5173/users");

    expect(consumeAuthFragment()).toEqual({ error: null });
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("rejects an undecodable access token rather than storing it", () => {
    setLocation(
      `http://localhost:5173/#accessToken=not-a-jwt&refreshToken=${REFRESH_ID}`,
    );

    expect(consumeAuthFragment()).toEqual({ error: "server_error" });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("rejects a half-populated fragment", () => {
    setLocation(`http://localhost:5173/#accessToken=${makeFakeJwt()}`);

    expect(consumeAuthFragment()).toEqual({ error: "server_error" });
    expect(getAccessToken()).toBeNull();
  });
});
