const GRAVATAR_BASE = "https://www.gravatar.com/avatar";

/**
 * Gravatar keys avatars on the SHA-256 of the lowercased, trimmed address.
 *
 * `d=identicon` means the URL always resolves — an address with no Gravatar
 * gets a generated identicon rather than a 404 — so callers need no fallback.
 * The image is requested at twice its display size to stay sharp on a retina
 * screen.
 */
export async function gravatarUrl(email: string, size = 160): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return `${GRAVATAR_BASE}/${hash}?s=${size * 2}&d=identicon`;
}
