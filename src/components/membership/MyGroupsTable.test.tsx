import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { server } from "@/mocks/server";
import MyGroupsTable from "@/components/membership/MyGroupsTable";
import { renderWithProviders, screen } from "@/test/test-utils";
import type { MembershipItem, MyGroupsResponse } from "@/types/membership";

const BASE = import.meta.env.VITE_BACKEND_BASE_URL;

function item(overrides: Partial<MembershipItem> = {}): MembershipItem {
  return {
    key: "branding",
    name: "品牌部",
    memberCount: 16,
    direct: true,
    via: null,
    ownerRole: null,
    ...overrides,
  };
}

const RESPONSE: MyGroupsResponse = {
  sections: [
    {
      key: "departments",
      name: "主要部門",
      items: [
        item(),
        item({
          key: "design",
          name: "設計組",
          memberCount: 11,
          direct: false,
          via: ["branding"],
          ownerRole: { key: "branding_vp", name: "品牌副社長" },
        }),
      ],
    },
  ],
  totalItems: 2,
  leadership: false,
};

function answerWith(body: MyGroupsResponse = RESPONSE) {
  server.use(
    http.get(`${BASE}/api/users/me/groups`, () => HttpResponse.json(body)),
  );
}

describe("MyGroupsTable", () => {
  it("groups the lists under their section, and links each one", async () => {
    answerWith();

    renderWithProviders(<MyGroupsTable />);

    expect(await screen.findAllByText("主要部門")).not.toHaveLength(0);
    expect(screen.getAllByText("品牌部")).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /品牌部/ })[0]).toHaveAttribute(
      "href",
      "/mailing-lists/branding",
    );
    expect(screen.getByText("2 lists, direct and nested")).toBeInTheDocument();
  });

  it("separates a direct membership from one reached through a nested group", async () => {
    answerWith();

    renderWithProviders(<MyGroupsTable />);

    expect(await screen.findAllByText("Direct")).not.toHaveLength(0);
    // `via` is what makes an indirect entry explainable.
    expect(screen.getAllByText("via branding")).not.toHaveLength(0);
    expect(screen.getAllByText(/品牌副社長/)).not.toHaveLength(0);
  });

  it("collapses a section when its heading is clicked", async () => {
    answerWith();

    renderWithProviders(<MyGroupsTable />);

    await screen.findAllByText("品牌部");
    await userEvent.click(
      screen.getAllByRole("button", { name: /主要部門/ })[0],
    );

    expect(screen.queryByText("品牌部")).not.toBeInTheDocument();
  });

  it("flags an office holder, without claiming which office", async () => {
    answerWith({ ...RESPONSE, leadership: true });

    renderWithProviders(<MyGroupsTable />);

    expect(await screen.findByText("Officer")).toBeInTheDocument();
  });

  it("does not flag a member who holds no office", async () => {
    answerWith();

    renderWithProviders(<MyGroupsTable />);

    expect(await screen.findAllByText("品牌部")).not.toHaveLength(0);
    expect(screen.queryByText("Officer")).not.toBeInTheDocument();
  });

  it("shows an empty state when the caller is on no lists", async () => {
    answerWith({ sections: [], totalItems: 0, leadership: false });

    renderWithProviders(<MyGroupsTable />);

    expect(
      await screen.findByText("You are not on any mailing lists."),
    ).toBeInTheDocument();
  });

  it("surfaces the problem+json detail when Google is unavailable", async () => {
    server.use(
      http.get(`${BASE}/api/users/me/groups`, () =>
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

    renderWithProviders(<MyGroupsTable />);

    expect(
      await screen.findByText("google group service is not configured"),
    ).toBeInTheDocument();
  });
});
