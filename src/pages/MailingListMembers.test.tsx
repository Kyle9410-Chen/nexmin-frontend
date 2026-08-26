import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router";
import { server } from "@/mocks/server";
import MailingListMembers from "@/pages/MailingListMembers";
import { renderWithProviders, screen } from "@/test/test-utils";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;
const GROUP_KEY = "all@sdc.nycu.club";

const MEMBERS = {
  items: [
    {
      id: "m1",
      email: "alice@nycu.edu.tw",
      role: "OWNER",
      type: "USER",
      status: "",
      profile: { name: "Alice Chen", nickname: "Ali", department: "CS" },
    },
    {
      id: "m2",
      email: "bob@gmail.com",
      role: "MEMBER",
      type: "USER",
      status: "ACTIVE",
      profile: null,
    },
  ],
  totalItems: 2,
};

function answerMembers() {
  server.use(
    http.get(`${BASE}/api/groups/:groupKey/members`, () =>
      HttpResponse.json(MEMBERS),
    ),
  );
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/mailing-lists/:groupKey" element={<MailingListMembers />} />
    </Routes>,
    { initialEntries: [`/mailing-lists/${encodeURIComponent(GROUP_KEY)}`] },
  );
}

describe("MailingListMembers", () => {
  it("titles the page with the resolved group name, not the raw key", async () => {
    answerMembers();
    server.use(
      http.get(`${BASE}/api/groups`, () =>
        HttpResponse.json({
          items: [
            {
              id: "gid-1",
              email: GROUP_KEY,
              name: "NYCU SDC All Members",
              displayName: "All Members",
              section: { key: "all", name: "All Members Section" },
              description: "",
              directMembersCount: 2,
              aliases: null,
              adminCreated: true,
            },
          ],
          totalItems: 1,
        }),
      ),
    );

    renderPage();

    // The group name is the CardTitle now, which is a div, not a heading.
    expect(await screen.findByText("All Members")).toBeInTheDocument();
    // Both breakpoints render, so every member value appears twice.
    // A member who has signed in here shows their name, with the address beneath.
    expect(await screen.findAllByText("Alice Chen (Ali)")).not.toHaveLength(0);
    expect(screen.getAllByText("alice@nycu.edu.tw")).not.toHaveLength(0);
    expect(screen.getAllByText("Owner")).not.toHaveLength(0);
    expect(
      screen.getByRole("link", { name: /back to mailing lists/i }),
    ).toHaveAttribute("href", "/mailing-lists");
  });

  it("falls back to the raw key when the group list does not resolve it", async () => {
    answerMembers();
    server.use(
      http.get(`${BASE}/api/groups`, () =>
        HttpResponse.json({ items: [], totalItems: 0 }),
      ),
    );

    renderPage();

    // The members list must not wait on the group lookup.
    expect(await screen.findAllByText("bob@gmail.com")).not.toHaveLength(0);
    expect(screen.getByText(GROUP_KEY)).toBeInTheDocument();
  });

  it("shows the member error without losing the way back", async () => {
    server.use(
      http.get(`${BASE}/api/groups/:groupKey/members`, () =>
        HttpResponse.json(
          {
            title: "Service Unavailable",
            status: 503,
            detail: "google group service is not configured",
          },
          {
            status: 503,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
      http.get(`${BASE}/api/groups`, () =>
        HttpResponse.json({ items: [], totalItems: 0 }),
      ),
    );

    renderPage();

    expect(
      await screen.findByText("google group service is not configured"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to mailing lists/i }),
    ).toBeInTheDocument();
  });
});
