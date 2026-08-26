import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import { server } from "@/mocks/server";
import ProfileCard from "@/components/profile/ProfileCard";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { UserProfile } from "@/types/profile";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

const PROFILE: UserProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "alice@nycu.edu.tw",
  name: "Alice Chen",
  nickname: "Ali",
  department: "Computer Science",
  role: "admin",
  createdAt: "2025-09-01T10:00:00Z",
  updatedAt: "2025-09-01T10:00:00Z",
  groups: ["general", "engineering"],
};

function answerProfile(profile: UserProfile = PROFILE) {
  server.use(
    http.get(`${BASE}/api/users/me`, () => HttpResponse.json(profile)),
  );
}

describe("ProfileCard", () => {
  it("shows the profile with its avatar and role", async () => {
    answerProfile();

    renderWithProviders(<ProfileCard />);

    expect(await screen.findByText("Alice Chen")).toBeInTheDocument();
    expect(screen.getAllByText("alice@nycu.edu.tw")).not.toHaveLength(0);
    expect(screen.getAllByText("Admin")).not.toHaveLength(0);
    await waitFor(() =>
      expect(screen.getByAltText("Alice Chen")).toHaveAttribute(
        "src",
        expect.stringContaining("gravatar.com/avatar/"),
      ),
    );
  });

  it("patches only the field that changed", async () => {
    answerProfile();

    let body: unknown = null;
    server.use(
      http.patch(`${BASE}/api/users/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PROFILE, nickname: "Al" });
      }),
    );

    renderWithProviders(<ProfileCard />);

    const nickname = await screen.findByLabelText("Nickname");
    await userEvent.clear(nickname);
    await userEvent.type(nickname, "Al");
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    // Name and department were untouched, so the backend must be left to keep
    // them rather than sent values it would rewrite.
    await waitFor(() => expect(body).toEqual({ nickname: "Al" }));
  });

  it("shows the edited name before the server answers", async () => {
    answerProfile();
    server.use(
      http.patch(`${BASE}/api/users/me`, async () => {
        await delay(50);
        return HttpResponse.json({ ...PROFILE, name: "Alice C" });
      }),
    );

    renderWithProviders(<ProfileCard />);

    const name = await screen.findByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Alice C");
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    // The card heading follows the cache, so it moves before the response.
    expect(screen.getByText("Alice C")).toBeInTheDocument();
    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
  });

  it("puts the old profile back when the backend refuses", async () => {
    answerProfile();
    server.use(
      http.patch(`${BASE}/api/users/me`, () =>
        HttpResponse.json(
          {
            title: "Bad Request",
            status: 400,
            detail: "name must not be empty",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    renderWithProviders(<ProfileCard />);

    const name = await screen.findByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Alice C");
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    expect(
      await screen.findByText("name must not be empty"),
    ).toBeInTheDocument();
    // The heading follows the cache, so it reverts...
    await waitFor(() =>
      expect(screen.queryByText("Alice C")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
    // ...while the form keeps what was typed, so the edit can be corrected and
    // retried rather than having to be entered again.
    expect(screen.getByLabelText("Name")).toHaveValue("Alice C");
  });

  it("refuses an empty name without calling the backend", async () => {
    answerProfile();

    let called = false;
    server.use(
      http.patch(`${BASE}/api/users/me`, () => {
        called = true;
        return HttpResponse.json(PROFILE);
      }),
    );

    renderWithProviders(<ProfileCard />);

    await userEvent.clear(await screen.findByLabelText("Name"));
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    expect(
      await screen.findByText("Name must not be empty"),
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("surfaces the problem+json detail when the backend rejects the change", async () => {
    answerProfile();
    server.use(
      http.patch(`${BASE}/api/users/me`, () =>
        HttpResponse.json(
          {
            title: "Bad Request",
            status: 400,
            detail: "nickname must be at most 50 characters",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    renderWithProviders(<ProfileCard />);

    await userEvent.type(await screen.findByLabelText("Nickname"), "x");
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    expect(
      await screen.findByText("nickname must be at most 50 characters"),
    ).toBeInTheDocument();
  });

  it("shows the error state when the profile fails to load", async () => {
    server.use(
      http.get(`${BASE}/api/users/me`, () =>
        HttpResponse.json(
          { title: "Unauthorized", status: 401, detail: "invalid token" },
          {
            status: 401,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    renderWithProviders(<ProfileCard />);

    expect(await screen.findByText("invalid token")).toBeInTheDocument();
  });
});
