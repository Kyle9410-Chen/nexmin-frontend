import { describe, expect, it } from "vitest";
import { gravatarUrl } from "@/lib/gravatar";

// sha256("foo@example.com")
const FOO_HASH =
  "321ba197033e81286fedb719d60d4ed5cecaed170733cb4a92013811afc0e3b6";

describe("gravatarUrl", () => {
  it("keys the avatar on the SHA-256 of the address", async () => {
    expect(await gravatarUrl("foo@example.com")).toContain(
      `/avatar/${FOO_HASH}`,
    );
  });

  it("lowercases and trims first, as Gravatar specifies", async () => {
    expect(await gravatarUrl("  Foo@Example.COM ")).toBe(
      await gravatarUrl("foo@example.com"),
    );
  });

  it("requests twice the display size and an identicon fallback", async () => {
    const url = new URL(await gravatarUrl("foo@example.com", 40));
    expect(url.searchParams.get("s")).toBe("80");
    // Without a default the URL 404s for an address with no Gravatar.
    expect(url.searchParams.get("d")).toBe("identicon");
  });
});
