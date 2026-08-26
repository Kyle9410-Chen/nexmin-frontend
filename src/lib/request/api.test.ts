import { vi, beforeEach, afterEach, describe, expect, it } from "vitest";
import { api } from "./api";
import * as tokenModule from "@/lib/token";

vi.mock("@/lib/token");

const mockFetch = vi.fn();

const mockGetAccessToken = vi.mocked(tokenModule.getAccessToken);

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Assigned per-test, not at module scope: MSW's server.listen() patches
    // globalThis.fetch in a beforeAll that would otherwise clobber this stub.
    global.fetch = mockFetch;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits the Authorization header when there is no token", async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: "ok" }),
    });

    await expect(api("/api/healthz")).resolves.toEqual({ status: "ok" });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("attaches the bearer token when one is stored", async () => {
    mockGetAccessToken.mockReturnValue("jwt-123");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
    });

    await api("/api/groups/all/members");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer jwt-123");
  });

  it("surfaces `detail` from an RFC 9457 problem response", async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({
        status: 503,
        detail: "google group service is not configured",
      }),
    });

    await expect(api("/api/groups/all/members")).rejects.toMatchObject({
      message: "google group service is not configured",
      status: 503,
    });
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("not json")),
    });

    await expect(api("/api/healthz")).rejects.toThrow("API Error (500)");
  });

  it("does not parse a body for 204", async () => {
    mockGetAccessToken.mockReturnValue(null);
    const json = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, status: 204, json });

    await expect(api("/api/healthz")).resolves.toEqual({ message: "success" });
    expect(json).not.toHaveBeenCalled();
  });

  it("carries the status onto the thrown ApiError", async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ status: 401, detail: "unauthorized" }),
    });

    await expect(api("/api/healthz")).rejects.toMatchObject({
      status: 401,
      name: "401",
    });
  });
});
