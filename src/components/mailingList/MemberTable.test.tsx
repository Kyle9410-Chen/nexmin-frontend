import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, delay, http } from "msw";
import { server } from "@/mocks/server";
import MemberTable from "@/components/mailingList/MemberTable";
import { setAccessToken } from "@/lib/token";
import { clearAllCookies } from "@/test/cookies";
import { makeFakeJwt } from "@/test/tokens";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { MailingListMember } from "@/types/mailingList";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;
const GROUP_KEY = "all@sdc.nycu.club";

const ALICE: MailingListMember = {
  id: "m1",
  email: "alice@nycu.edu.tw",
  role: "MEMBER",
  type: "USER",
  status: "ACTIVE",
  profile: null,
};

/** Serves the member list from a mutable array, so a PATCH can move it. */
function answerMembers(items: MailingListMember[] = [ALICE]) {
  const list = [...items];

  server.use(
    http.get(`${BASE}/api/groups/:groupKey/members`, () =>
      HttpResponse.json({ items: list, totalItems: list.length }),
    ),
    http.get(`${BASE}/api/groups`, () =>
      HttpResponse.json({ items: [], totalItems: 0 }),
    ),
  );

  return list;
}

afterEach(clearAllCookies);

describe("MemberTable", () => {
  it("lists each member's email and role", async () => {
    answerMembers([
      ALICE,
      { ...ALICE, id: "m2", email: "bob@gmail.com", role: "OWNER" },
    ]);

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    expect(await screen.findAllByText("alice@nycu.edu.tw")).not.toHaveLength(0);
    expect(screen.getAllByText("bob@gmail.com")).not.toHaveLength(0);
    expect(screen.getAllByText("Owner")).not.toHaveLength(0);
  });

  it("shows a signed-in member's name over their address", async () => {
    answerMembers([
      {
        ...ALICE,
        profile: { name: "Alice Chen", nickname: "Ali", department: "CS" },
      },
      { ...ALICE, id: "m2", email: "bob@gmail.com", profile: null },
    ]);

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    expect(await screen.findAllByText("Alice Chen (Ali)")).not.toHaveLength(0);
    expect(screen.getAllByText("alice@nycu.edu.tw")).not.toHaveLength(0);
    // Never signed in here, so the address is all there is.
    expect(screen.getAllByText("bob@gmail.com")).not.toHaveLength(0);
  });

  it("patches the role an admin picks, then shows the new one", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    const list = answerMembers();

    let body: unknown = null;
    server.use(
      http.patch(
        `${BASE}/api/groups/:groupKey/members/:memberKey`,
        async ({ request, params }) => {
          body = await request.json();
          expect(params.memberKey).toBe(ALICE.email);
          list[0] = { ...ALICE, role: "MANAGER" };
          return HttpResponse.json(list[0]);
        },
      ),
    );

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    const trigger = (
      await screen.findAllByRole("button", {
        name: `Change role for ${ALICE.email}`,
      })
    )[0];
    await userEvent.click(trigger);
    await userEvent.click(
      (await screen.findAllByRole("menuitemcheckbox", { name: "Manager" }))[0],
    );

    await waitFor(() => expect(body).toEqual({ role: "MANAGER" }));
    // The list refetches, so the trigger ends up labelled with the new role.
    await waitFor(() =>
      expect(screen.getAllByText("Manager")).not.toHaveLength(0),
    );
  });

  it("shows the new role before the server answers, and keeps it", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    const list = answerMembers();

    server.use(
      http.patch(
        `${BASE}/api/groups/:groupKey/members/:memberKey`,
        async () => {
          // Held open, so the assertion below runs while the write is in flight.
          await delay(50);
          list[0] = { ...ALICE, role: "MANAGER" };
          return HttpResponse.json(list[0]);
        },
      ),
    );

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Change role for ${ALICE.email}`,
        })
      )[0],
    );
    await userEvent.click(
      (await screen.findAllByRole("menuitemcheckbox", { name: "Manager" }))[0],
    );

    expect(screen.getAllByText("Manager")).not.toHaveLength(0);
    expect(await screen.findByText("Role updated")).toBeInTheDocument();
    expect(screen.getAllByText("Manager")).not.toHaveLength(0);
  });

  it("puts the old role back when the change is refused", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerMembers();

    server.use(
      http.patch(`${BASE}/api/groups/:groupKey/members/:memberKey`, () =>
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

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Change role for ${ALICE.email}`,
        })
      )[0],
    );
    await userEvent.click(
      (await screen.findAllByRole("menuitemcheckbox", { name: "Owner" }))[0],
    );

    expect(
      await screen.findByText("insufficient permissions"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Owner")).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText("Member")).not.toHaveLength(0);
  });

  it("shows a non-admin the role as plain text, with no control", async () => {
    setAccessToken(makeFakeJwt({ role: "member" }));
    answerMembers();

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    expect(await screen.findAllByText("Member")).not.toHaveLength(0);
    expect(
      screen.queryByRole("button", {
        name: `Change role for ${ALICE.email}`,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Remove ${ALICE.email} from this group`,
      }),
    ).not.toBeInTheDocument();
  });

  it("deletes only the member an admin confirms, and drops the row", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    const list = answerMembers([
      ALICE,
      { ...ALICE, id: "m2", email: "bob@gmail.com" },
    ]);

    let deleted: string | undefined;
    server.use(
      http.delete(
        `${BASE}/api/groups/:groupKey/members/:memberKey`,
        ({ params }) => {
          deleted = String(params.memberKey);
          list.splice(0, 1);
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Remove ${ALICE.email} from this group`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove" }),
    );

    await waitFor(() => expect(deleted).toBe(ALICE.email));
    await waitFor(() =>
      expect(screen.queryByText(ALICE.email)).not.toBeInTheDocument(),
    );
    // The other member is untouched.
    expect(screen.getAllByText("bob@gmail.com")).not.toHaveLength(0);
  });

  it("leaves the member in place when the removal is cancelled", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerMembers();

    let called = false;
    server.use(
      http.delete(`${BASE}/api/groups/:groupKey/members/:memberKey`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Remove ${ALICE.email} from this group`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );

    expect(called).toBe(false);
    expect(screen.getAllByText(ALICE.email)).not.toHaveLength(0);
  });

  it("surfaces the problem+json detail when the backend refuses the change", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerMembers();

    server.use(
      http.patch(`${BASE}/api/groups/:groupKey/members/:memberKey`, () =>
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

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Change role for ${ALICE.email}`,
        })
      )[0],
    );
    await userEvent.click(
      (await screen.findAllByRole("menuitemcheckbox", { name: "Owner" }))[0],
    );

    expect(
      await screen.findByText("insufficient permissions"),
    ).toBeInTheDocument();
  });

  it("puts the row back when the removal is refused", async () => {
    setAccessToken(makeFakeJwt({ role: "admin" }));
    answerMembers();

    server.use(
      http.delete(`${BASE}/api/groups/:groupKey/members/:memberKey`, () =>
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

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    await userEvent.click(
      (
        await screen.findAllByRole("button", {
          name: `Remove ${ALICE.email} from this group`,
        })
      )[0],
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Remove" }),
    );

    // findAll, not find: sonner's store outlives a single render, so the
    // role-refusal test's toast can still be on screen under its own id.
    expect(
      await screen.findAllByText("insufficient permissions"),
    ).not.toHaveLength(0);
    expect(screen.getAllByText(ALICE.email)).not.toHaveLength(0);
  });

  it("shows the error state when the member list fails to load", async () => {
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

    renderWithProviders(<MemberTable groupKey={GROUP_KEY} />);

    expect(
      await screen.findByText("google group service is not configured"),
    ).toBeInTheDocument();
  });
});
