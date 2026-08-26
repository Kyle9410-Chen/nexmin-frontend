/**
 * jsdom keeps `document.cookie` for the whole file, so auth tests must reset it
 * between cases or a leftover session leaks into the next one.
 */
export function clearAllCookies(): void {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/** Replaces `window.location` with a URL object, which is close enough: the app
 * only reads `hash`/`pathname`/`search` and assigns `href`. jsdom would
 * otherwise throw "Not implemented: navigation" on the assignment. */
export function setLocation(url: string): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(url),
  });
}
