import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import AddMemberDialog from "@/components/roster/AddMemberDialog";
import { clearAllCookies } from "@/test/cookies";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { MailingListGroup } from "@/types/mailingList";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

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

/** The lists offered alongside the club list itself. */
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
        ],
        totalItems: 2,
      }),
    ),
  );
}

function open() {
  return renderWithProviders(<AddMemberDialog open onOpenChange={() => {}} />);
}

/** Captures the POST body, answering as the backend does with a 201 entry. */
function captureAdd() {
  const seen: unknown[] = [];
  server.use(
    http.post(`${BASE}/api/users`, async ({ request }) => {
      const body = await request.json();
      seen.push(body);
      return HttpResponse.json(
        { ...(body as object), groups: ["general"], profile: null },
        { status: 201 },
      );
    }),
  );
  return seen;
}

afterEach(clearAllCookies);

describe("AddMemberDialog", () => {
  it("refuses a missing or malformed address without calling the backend", async () => {
    const seen = captureAdd();

    open();

    await userEvent.click(screen.getByRole("button", { name: "Add member" }));
    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Email"), "not-an-address");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(seen).toHaveLength(0);
  });

  it("names no list of its own: the login group is written either way", async () => {
    const seen = captureAdd();

    open();

    await userEvent.type(screen.getByLabelText("Email"), "new@nycu.edu.tw");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    await waitFor(() =>
      expect(seen).toEqual([{ email: "new@nycu.edu.tw", groups: [] }]),
    );
  });

  it("warns before handing out admin, then names that list in the write", async () => {
    const seen = captureAdd();
    answerGroups();

    open();

    await userEvent.type(screen.getByLabelText("Email"), "boss@nycu.edu.tw");
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "General" }),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "Role in General" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Manager" }),
    );

    // The consequence is on screen before the write, not after it.
    expect(
      await screen.findByText(/administrators of this app/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    // Naming the login group is how a role is set on it, so this is one
    // request rather than an add followed by a role change.
    await waitFor(() =>
      expect(seen).toEqual([
        {
          email: "boss@nycu.edu.tw",
          groups: [{ key: "general", role: "MANAGER" }],
        },
      ]),
    );
  });

  it("surfaces the problem+json detail when a key names no list", async () => {
    // Keys are checked before the first write, so a typo costs nothing — which
    // is the whole reason this answer is worth showing verbatim.
    server.use(
      http.post(`${BASE}/api/users`, () =>
        HttpResponse.json(
          {
            title: "Bad Request",
            status: 400,
            detail: "no mailing list with this key exists",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    open();

    await userEvent.type(screen.getByLabelText("Email"), "new@nycu.edu.tw");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(
      await screen.findByText("no mailing list with this key exists"),
    ).toBeInTheDocument();
  });

  it("carries every picked list, each with its own role, in one request", async () => {
    const seen = captureAdd();
    answerGroups();

    // No second request: the roster endpoint writes the lists itself now.
    let joined = false;
    server.use(
      http.post(`${BASE}/api/groups/:groupKey/members`, () => {
        joined = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    open();

    await userEvent.type(screen.getByLabelText("Email"), "new@nycu.edu.tw");
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "Role in Engineering" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Manager" }),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "General" }));
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    await waitFor(() =>
      expect(seen).toEqual([
        {
          email: "new@nycu.edu.tw",
          // Click order, which is the order the picker ticked them in.
          groups: [
            { key: "engineering", role: "MANAGER" },
            { key: "general", role: "MEMBER" },
          ],
        },
      ]),
    );
    expect(joined).toBe(false);
  });

  it("leaves the write alone when the group list will not load", async () => {
    const seen = captureAdd();
    server.use(
      http.get(`${BASE}/api/groups`, () =>
        HttpResponse.json(
          { title: "Service Unavailable", status: 503, detail: "unavailable" },
          {
            status: 503,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    open();

    expect(await screen.findByText("unavailable")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Email"), "new@nycu.edu.tw");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    await waitFor(() =>
      expect(seen).toEqual([{ email: "new@nycu.edu.tw", groups: [] }]),
    );
  });
});
