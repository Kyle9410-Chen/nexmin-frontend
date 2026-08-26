import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import EditGroupsDialog from "@/components/roster/EditGroupsDialog";
import { clearAllCookies } from "@/test/cookies";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { MailingListGroup, MailingListMember } from "@/types/mailingList";
import type { RosterEntry } from "@/types/roster";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

const ENTRY: RosterEntry = {
  email: "alice@nycu.edu.tw",
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

function member(overrides: Partial<MailingListMember> = {}): MailingListMember {
  return {
    id: "m1",
    email: ENTRY.email,
    role: "MEMBER",
    type: "USER",
    status: "",
    profile: null,
    ...overrides,
  };
}

/**
 * The roster carries no roles, so the dialog reads them from each list the
 * person is on. Without this the role is unknown, which is its own case below.
 */
function answerMembers(role = "MEMBER") {
  server.use(
    http.get(`${BASE}/api/groups/:groupKey/members`, () =>
      HttpResponse.json({ items: [member({ role })], totalItems: 1 }),
    ),
  );
}

function open() {
  return renderWithProviders(
    <EditGroupsDialog entry={ENTRY} open onOpenChange={() => {}} />,
  );
}

afterEach(clearAllCookies);

describe("EditGroupsDialog", () => {
  it("checks the lists the person is already on", async () => {
    answerGroups();

    open();

    expect(
      await screen.findByRole("checkbox", { name: "General" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Engineering" }),
    ).not.toBeChecked();
  });

  it("adds and removes only what changed", async () => {
    answerGroups();

    const posted: string[] = [];
    const deleted: string[] = [];
    server.use(
      http.post(
        `${BASE}/api/groups/:groupKey/members`,
        async ({ params, request }) => {
          posted.push(String(params.groupKey));
          expect(await request.json()).toEqual({
            email: ENTRY.email,
            role: "MEMBER",
          });
          return HttpResponse.json({}, { status: 201 });
        },
      ),
      http.delete(
        `${BASE}/api/groups/:groupKey/members/:memberKey`,
        ({ params }) => {
          deleted.push(String(params.groupKey));
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    open();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "General" }));
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => expect(posted).toEqual(["engineering"]));
    expect(deleted).toEqual(["general"]);
  });

  it("names the group that could not be removed, and still applies the rest", async () => {
    answerGroups();

    let added = false;
    server.use(
      http.post(`${BASE}/api/groups/:groupKey/members`, () => {
        added = true;
        return HttpResponse.json({}, { status: 201 });
      }),
      // A list reached through a nested group: Google has no direct membership
      // to delete.
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

    open();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "General" }));
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    expect(
      await screen.findByText(/Could not update general/),
    ).toBeInTheDocument();
    expect(added).toBe(true);
  });

  it("selects and clears a whole section at once", async () => {
    answerGroups();

    open();

    const selectAll = await screen.findByRole("checkbox", {
      name: "Select all in Departments",
    });
    expect(selectAll).not.toBeChecked();

    await userEvent.click(selectAll);
    expect(screen.getByRole("checkbox", { name: "Engineering" })).toBeChecked();
    // The other section is untouched.
    expect(screen.getByRole("checkbox", { name: "General" })).toBeChecked();

    await userEvent.click(selectAll);
    expect(
      screen.getByRole("checkbox", { name: "Engineering" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "General" })).toBeChecked();
  });

  it("shows a section as fully selected once every group in it is checked", async () => {
    answerGroups();

    open();

    // "All Members" holds only General, which the entry is already on.
    expect(
      await screen.findByRole("checkbox", {
        name: "Select all in All Members",
      }),
    ).toBeChecked();
  });

  it("shows the role the person actually holds, not the default", async () => {
    answerGroups();
    answerMembers("MANAGER");

    open();

    // "General" is the one list ENTRY is on.
    expect(
      await screen.findByRole("combobox", { name: "Role in General" }),
    ).toHaveTextContent("Manager");
    expect(
      screen.getByRole("combobox", { name: "Role in Engineering" }),
    ).toHaveTextContent("Member");
  });

  it("patches only the group whose role changed", async () => {
    answerGroups();
    answerMembers("MEMBER");

    const patched: { groupKey: string; body: unknown }[] = [];
    server.use(
      http.patch(
        `${BASE}/api/groups/:groupKey/members/:memberKey`,
        async ({ params, request }) => {
          patched.push({
            groupKey: String(params.groupKey),
            body: await request.json(),
          });
          return HttpResponse.json(member({ role: "OWNER" }));
        },
      ),
    );

    open();

    await userEvent.click(
      await screen.findByRole("combobox", { name: "Role in General" }),
    );
    await userEvent.click(await screen.findByRole("option", { name: "Owner" }));
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() =>
      expect(patched).toEqual([
        { groupKey: "general", body: { role: "OWNER" } },
      ]),
    );
  });

  it("adds a group with the role picked for it", async () => {
    answerGroups();
    answerMembers();

    let body: unknown = null;
    server.use(
      http.post(`${BASE}/api/groups/:groupKey/members`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    open();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "Role in Engineering" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Manager" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    await waitFor(() =>
      expect(body).toEqual({ email: ENTRY.email, role: "MANAGER" }),
    );
  });

  it("sends no role change when the current role could not be read", async () => {
    answerGroups();
    server.use(
      http.get(`${BASE}/api/groups/:groupKey/members`, () =>
        HttpResponse.json(
          { title: "Service Unavailable", status: 503, detail: "unavailable" },
          {
            status: 503,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    let patched = false;
    let added = false;
    server.use(
      http.patch(`${BASE}/api/groups/:groupKey/members/:memberKey`, () => {
        patched = true;
        return HttpResponse.json(member());
      }),
      http.post(`${BASE}/api/groups/:groupKey/members`, () => {
        added = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    open();

    // Falls back to Member, but that is a guess — picking it must not be read
    // as "demote them to Member".
    expect(
      await screen.findByRole("combobox", { name: "Role in General" }),
    ).toHaveTextContent("Member");

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Engineering" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /save changes/i }),
    );

    // The add lands, so the save definitely ran — and still no role change.
    await waitFor(() => expect(added).toBe(true));
    expect(patched).toBe(false);
  });

  it("collapses a section", async () => {
    answerGroups();

    open();

    await screen.findByRole("checkbox", { name: "Engineering" });
    await userEvent.click(screen.getByRole("button", { name: /Departments/ }));

    expect(
      screen.queryByRole("checkbox", { name: "Engineering" }),
    ).not.toBeInTheDocument();
  });
});
