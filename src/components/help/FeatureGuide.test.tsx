import { afterEach, describe, expect, it } from "vitest";
import FeatureGuide from "@/components/help/FeatureGuide";
import { setAccessToken } from "@/lib/token";
import { clearAllCookies } from "@/test/cookies";
import { makeFakeJwt } from "@/test/tokens";
import { renderWithProviders, screen } from "@/test/test-utils";

afterEach(clearAllCookies);

describe("FeatureGuide", () => {
  it("describes every feature area and links to it", () => {
    renderWithProviders(<FeatureGuide />);

    for (const title of [
      "Signing in",
      "Your profile",
      "Mailing lists",
      "Club roster",
      "Backend status",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }

    expect(
      screen.getByRole("link", { name: /open mailing lists/i }),
    ).toHaveAttribute("href", "/mailing-lists");
    expect(
      screen.getByRole("link", { name: /open your profile/i }),
    ).toHaveAttribute("href", "/profile");
  });

  it("says which account is signed in and with what access", () => {
    setAccessToken(makeFakeJwt({ email: "alice@nycu.edu.tw", role: "member" }));

    renderWithProviders(<FeatureGuide />);

    expect(
      screen.getByText(/alice@nycu\.edu\.tw, with member access/),
    ).toBeInTheDocument();
  });

  it("says the roster is admin-only", () => {
    renderWithProviders(<FeatureGuide />);

    expect(
      screen.getByText(/Admins can add someone to the club/i),
    ).toBeInTheDocument();
    // Nothing is mock data any more.
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });
});
