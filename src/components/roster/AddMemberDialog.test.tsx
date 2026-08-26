import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import AddMemberDialog from "@/components/roster/AddMemberDialog";
import { clearAllCookies } from "@/test/cookies";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

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

  it("adds as a plain member by default", async () => {
    const seen = captureAdd();

    open();

    await userEvent.type(screen.getByLabelText("Email"), "new@nycu.edu.tw");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    await waitFor(() =>
      expect(seen).toEqual([{ email: "new@nycu.edu.tw", role: "MEMBER" }]),
    );
  });

  it("warns before handing out admin, then sends the chosen role", async () => {
    const seen = captureAdd();

    open();

    await userEvent.type(screen.getByLabelText("Email"), "boss@nycu.edu.tw");
    await userEvent.click(screen.getByLabelText("Role on the mailing list"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Manager" }),
    );

    // The consequence is on screen before the write, not after it.
    expect(
      await screen.findByText(/administrators of this app/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add member" }));
    await waitFor(() =>
      expect(seen).toEqual([{ email: "boss@nycu.edu.tw", role: "MANAGER" }]),
    );
  });

  it("surfaces the problem+json detail when they are already on the list", async () => {
    server.use(
      http.post(`${BASE}/api/users`, () =>
        HttpResponse.json(
          {
            title: "Conflict",
            status: 409,
            detail: "already a member of the group",
          },
          {
            status: 409,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    open();

    await userEvent.type(screen.getByLabelText("Email"), "old@nycu.edu.tw");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(
      await screen.findByText("already a member of the group"),
    ).toBeInTheDocument();
  });
});
