import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import GroupTable from "@/components/mailingList/GroupTable";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { MailingListGroup } from "@/types/mailingList";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

function group(overrides: Partial<MailingListGroup> = {}): MailingListGroup {
  return {
    id: "gid-1",
    email: "all@sdc.nycu.club",
    name: "NYCU SDC All Members",
    displayName: "All Members",
    section: { key: "all", name: "All Members Section" },
    description: "Everyone in the club",
    directMembersCount: 128,
    aliases: null,
    adminCreated: true,
    ...overrides,
  };
}

function answerWith(items: MailingListGroup[]) {
  server.use(
    http.get(`${BASE}/api/groups`, () =>
      HttpResponse.json({ items, totalItems: items.length }),
    ),
  );
}

describe("GroupTable", () => {
  it("lists each group with its email and member count", async () => {
    answerWith([
      group(),
      group({
        id: "gid-2",
        email: "core@sdc.nycu.club",
        name: "NYCU SDC Core Team",
        displayName: "Core Team",
        directMembersCount: 12,
      }),
    ]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(screen.getAllByText("All Members")).not.toHaveLength(0),
    );
    expect(screen.getAllByText("core@sdc.nycu.club")).not.toHaveLength(0);
    // The club's own name, not the "NYCU SDC …" one from the Google console.
    expect(screen.getAllByText("Core Team")).not.toHaveLength(0);
    expect(screen.queryByText("NYCU SDC Core Team")).not.toBeInTheDocument();
    expect(screen.getAllByText("12")).not.toHaveLength(0);
    expect(screen.getByText("2 groups")).toBeInTheDocument();
  });

  it("links each group to its member page, encoding the email key", async () => {
    answerWith([group()]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "All Members" }),
      ).not.toHaveLength(0),
    );
    expect(
      screen.getAllByRole("link", { name: "All Members" })[0],
    ).toHaveAttribute("href", "/mailing-lists/all%40sdc.nycu.club");
  });

  it("does not render the group description", async () => {
    answerWith([group()]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(screen.getAllByText("All Members")).not.toHaveLength(0),
    );
    expect(screen.queryByText("Everyone in the club")).not.toBeInTheDocument();
  });

  it("renders a group whose aliases came back as null", async () => {
    answerWith([group({ aliases: null })]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(screen.getAllByText("All Members")).not.toHaveLength(0),
    );
  });

  it("surfaces the problem+json detail when Google is not configured", async () => {
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

    renderWithProviders(<GroupTable />);

    expect(
      await screen.findByText("google group service is not configured"),
    ).toBeInTheDocument();
  });

  it("collapses one section without touching the others", async () => {
    answerWith([
      group(),
      group({
        id: "gid-2",
        email: "core@sdc.nycu.club",
        displayName: "Core Team",
        section: { key: "project", name: "Project Team" },
      }),
    ]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(screen.getAllByText("All Members")).not.toHaveLength(0),
    );

    // Both breakpoints render, so each heading has a desktop and a mobile copy.
    const heading = screen.getAllByRole("button", {
      name: /All Members Section/,
    })[0];
    expect(heading).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(heading);

    expect(
      screen.queryByRole("link", { name: "All Members" }),
    ).not.toBeInTheDocument();
    // The other section is untouched.
    expect(screen.getAllByText("Core Team")).not.toHaveLength(0);
    expect(
      screen.getAllByRole("button", { name: /All Members Section/ })[0],
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("expands a section again when its heading is clicked twice", async () => {
    answerWith([group()]);

    renderWithProviders(<GroupTable />);

    await waitFor(() =>
      expect(screen.getAllByText("All Members")).not.toHaveLength(0),
    );

    const heading = () =>
      screen.getAllByRole("button", { name: /All Members Section/ })[0];
    await userEvent.click(heading());
    await userEvent.click(heading());

    expect(
      screen.getAllByRole("link", { name: "All Members" }),
    ).not.toHaveLength(0);
  });

  it("shows an empty state when the account has no groups", async () => {
    answerWith([]);

    renderWithProviders(<GroupTable />);

    expect(
      await screen.findByText("No mailing lists found."),
    ).toBeInTheDocument();
  });
});
