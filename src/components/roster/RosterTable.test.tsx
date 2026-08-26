import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import RosterTable from "@/components/roster/RosterTable";
import { setAccessToken } from "@/lib/token";
import { clearAllCookies } from "@/test/cookies";
import { makeFakeJwt } from "@/test/tokens";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { MailingListGroup } from "@/types/mailingList";
import type { RosterEntry } from "@/types/roster";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

const ALICE: RosterEntry = {
  email: "alice@nycu.edu.tw",
  role: "admin",
  groups: ["general", "engineering"],
  profile: {
    id: "u1",
    name: "Alice Chen",
    nickname: "Ali",
    department: "CS",
    createdAt: "2025-09-01T10:00:00Z",
    updatedAt: "2025-09-01T10:00:00Z",
  },
};

/** On the mailing list, but has never signed in here. */
const BOB: RosterEntry = {
  email: "bob@gmail.com",
  role: "member",
  groups: ["general"],
  profile: null,
};

function group(overrides: Partial<MailingListGroup> = {}): MailingListGroup {
  return {
    id: "gid-1",
    email: "general",
    name: "NYCU SDC General",
    displayName: "General",
    section: { key: "all", name: "All Members" },
    description: "",
    directMembersCount: 80,
    aliases: null,
    adminCreated: true,
    ...overrides,
  };
}

/** The group list is what turns the roster's bare keys into names and sections. */
function answerGroups() {
  server.use(
    http.get(`${BASE}/api/groups`, () =>
      HttpResponse.json({
        items: [
          group(),
          group({
            id: "gid-2",
            email: "engineering",
            displayName: "Engineering",
            section: { key: "departments", name: "Departments" },
          }),
          group({
            id: "gid-3",
            email: "branding",
            displayName: "Branding",
            section: { key: "departments", name: "Departments" },
          }),
        ],
        totalItems: 3,
      }),
    ),
  );
}

function answerRoster(items: RosterEntry[] = [ALICE, BOB]) {
  const list = [...items];

  server.use(
    http.get(`${BASE}/api/users`, () =>
      HttpResponse.json({ items: list, totalItems: list.length }),
    ),
  );

  return list;
}

afterEach(clearAllCookies);

describe("RosterTable", () => {
  it("shows a signed-in member's name and a bare address for everyone else", async () => {
    answerRoster();

    renderWithProviders(<RosterTable />);

    expect(await screen.findAllByText("Alice Chen (Ali)")).not.toHaveLength(0);
    expect(screen.getAllByText("alice@nycu.edu.tw")).not.toHaveLength(0);
    expect(screen.getAllByText("bob@gmail.com")).not.toHaveLength(0);
    expect(screen.getAllByText("Admin")).not.toHaveLength(0);
    expect(screen.getAllByText("Member")).not.toHaveLength(0);
  });

  it("reveals a member's groups, under their section, when the row expands", async () => {
    answerRoster([ALICE]);
    answerGroups();

    renderWithProviders(<RosterTable />);

    const toggle = (
      await screen.findAllByRole("button", { name: /2 lists/ })
    )[0];
    expect(screen.queryByRole("link", { name: "Engineering" })).toBeNull();

    await userEvent.click(toggle);

    // The club's own name and classification, not the bare key.
    const link = (
      await screen.findAllByRole("link", { name: "Engineering" })
    )[0];
    expect(link).toHaveAttribute("href", "/mailing-lists/engineering");
    expect(screen.getAllByText("Departments")).not.toHaveLength(0);
    expect(screen.getAllByText("All Members")).not.toHaveLength(0);

    await userEvent.click(toggle);
    expect(screen.queryByRole("link", { name: "Engineering" })).toBeNull();
  });

  it("falls back to the raw keys when the group list is unavailable", async () => {
    answerRoster([ALICE]);
    server.use(
      http.get(`${BASE}/api/groups`, () =>
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
    );

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      (await screen.findAllByRole("button", { name: /2 lists/ }))[0],
    );

    // Nothing to resolve names against, so the keys still render rather than
    // the row coming up empty.
    expect(
      (await screen.findAllByRole("link", { name: "engineering" }))[0],
    ).toHaveAttribute("href", "/mailing-lists/engineering");
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("filters client-side, since the endpoint takes no query params", async () => {
    answerRoster();

    renderWithProviders(<RosterTable />);

    await screen.findAllByText("Alice Chen (Ali)");
    await userEvent.type(screen.getByLabelText("Search the roster"), "bob");

    await waitFor(() =>
      expect(screen.queryByText("Alice Chen (Ali)")).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText("bob@gmail.com")).not.toHaveLength(0);
  });

  it("offers the edit action to an admin only", async () => {
    setAccessToken(makeFakeJwt({ role: "member" }));
    answerRoster([ALICE]);

    renderWithProviders(<RosterTable />);

    await screen.findAllByText("Alice Chen (Ali)");
    expect(
      screen.queryByRole("button", {
        name: `Edit groups for ${ALICE.email}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("moves the group count before the server answers", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerRoster([ALICE]);
    answerGroups();
    // Gated rather than timed: the assertion below provably runs while the
    // request is still unresolved.
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${BASE}/api/groups/:groupKey/members`, async () => {
        await gate;
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Edit groups for ${ALICE.email}`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Branding" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    // `hidden` because the dialog is modal: Radix marks the rest of the app
    // aria-hidden while it is open, and the row is behind it.
    expect(
      await screen.findAllByRole("button", { name: /3 lists/, hidden: true }),
    ).not.toHaveLength(0);

    release();
    expect(await screen.findByText("Groups updated")).toBeInTheDocument();
  });

  it("resyncs the count when a removal is refused", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerRoster([ALICE]);
    answerGroups();
    server.use(
      // A list reached through a nested group: there is no direct membership to
      // delete, so the optimistic removal has to be corrected.
      http.delete(`${BASE}/api/groups/:groupKey/members/:memberKey`, () =>
        HttpResponse.json(
          { title: "Not Found", status: 404, detail: "member not found" },
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Edit groups for ${ALICE.email}`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    expect(
      await screen.findByText(/Could not update engineering/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /2 lists/ }),
      ).not.toHaveLength(0),
    );
  });

  it("shows a newly added member before the server answers", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerRoster([ALICE]);

    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${BASE}/api/users`, async () => {
        await gate;
        return HttpResponse.json(
          {
            email: "new@nycu.edu.tw",
            role: "member",
            groups: ["general"],
            profile: null,
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: /add member/i }),
    );
    await userEvent.type(
      await screen.findByLabelText("Email"),
      "new@nycu.edu.tw",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    // Modal, so the table behind it is aria-hidden while the write is open.
    expect(
      await screen.findAllByText("new@nycu.edu.tw", undefined, {
        timeout: 2000,
      }),
    ).not.toHaveLength(0);

    release();
    expect(
      await screen.findByText("new@nycu.edu.tw added to the club"),
    ).toBeInTheDocument();
  });

  it("removes a member after the confirmation", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    const list = answerRoster([ALICE, BOB]);
    server.use(
      http.delete(`${BASE}/api/users/:email`, ({ params }) => {
        const i = list.findIndex((entry) => entry.email === params.email);
        if (i !== -1) list.splice(i, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Remove ${BOB.email} from the club`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove" }),
    );

    await waitFor(() =>
      expect(screen.queryAllByText(BOB.email)).toHaveLength(0),
    );
    expect(screen.getAllByText("Alice Chen (Ali)")).not.toHaveLength(0);
  });

  it("warns when the row being removed is your own account", async () => {
    setAccessToken(makeFakeJwt({ role: "admin", email: ALICE.email }));
    answerRoster([ALICE]);

    renderWithProviders(<RosterTable />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Remove ${ALICE.email} from the club`,
        })
      )[0],
    );

    // The backend allows it, so the UI explains rather than blocks.
    expect(
      await screen.findByText(/you will not be able to sign back in/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove myself" }),
    ).toBeInTheDocument();
  });

  it("surfaces the problem+json detail when the roster is refused", async () => {
    server.use(
      http.get(`${BASE}/api/users`, () =>
        HttpResponse.json(
          {
            title: "Forbidden",
            status: 403,
            detail: "insufficient permissions",
          },
          {
            status: 403,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    renderWithProviders(<RosterTable />);

    expect(
      await screen.findByText("insufficient permissions"),
    ).toBeInTheDocument();
  });
});
