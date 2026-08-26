import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import LoginDialog from "@/components/auth/LoginDialog";
import { renderWithProviders, screen } from "@/test/test-utils";
import { clearAllCookies, setLocation } from "@/test/cookies";

describe("LoginDialog", () => {
  beforeEach(() => {
    clearAllCookies();
    setLocation("http://localhost:5173/users?page=2");
  });

  it("offers Google as the only way in, and cannot be dismissed", async () => {
    renderWithProviders(<LoginDialog />, { withAuth: true });

    expect(
      screen.getByRole("heading", { name: "Sign in to SDC Manager" }),
    ).toBeInTheDocument();
    // No close affordance: there is nothing behind the dialog to reach.
    expect(
      screen.queryByRole("button", { name: /close/i }),
    ).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(
      screen.getByRole("heading", { name: "Sign in to SDC Manager" }),
    ).toBeInTheDocument();
  });

  it("sends the browser to the backend login route, carrying the current path", async () => {
    renderWithProviders(<LoginDialog />, { withAuth: true });

    await userEvent.click(
      screen.getByRole("button", { name: /sign in with google/i }),
    );

    // A full-page navigation, since the endpoint 302s to Google.
    expect(window.location.href).toBe(
      `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/google/login?redirect=${encodeURIComponent("/users?page=2")}`,
    );
  });

  it("explains a rejected sign-in", () => {
    renderWithProviders(<LoginDialog />, {
      withAuth: true,
      loginError: "not_a_member",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /not on the club mailing list/i,
    );
  });

  it("falls back to generic copy for an unrecognised reason", () => {
    renderWithProviders(<LoginDialog />, {
      withAuth: true,
      loginError: "something_new",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/sign-in failed/i);
  });
});
